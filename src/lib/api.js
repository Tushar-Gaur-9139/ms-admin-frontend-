const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
export const API_REQUEST_STATE_EVENT = 'admin:api-request-state'
export const API_NOTIFICATION_EVENT = 'admin:api-notification'

let activeRequestCount = 0

/**
 * Sanitizes any error message from APIs or exceptions to prevent
 * database leakage, SQL query exposure, or internal schema disclosure.
 */
export function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred. Please try again.'
  }

  // Detect SQL query leaks, driver errors, table/column names, or stack traces
  const isSqlLeak =
    /sqlstate|pdoexception|queryexception|syntax error|database error|duplicate entry|foreign key|constraint|column\s+['"`]|table\s+['"`]|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|connection:\s*mysql/i.test(message)

  if (isSqlLeak) {
    if (/duplicate entry/i.test(message)) {
      return 'A record with matching unique details (phone, email, or code) already exists.'
    }
    return 'A database error occurred while processing your request. Please try again or contact support.'
  }

  return message
}

function updateApiRequestCount(change) {
  activeRequestCount = Math.max(0, activeRequestCount + change)
  window.dispatchEvent(new CustomEvent(API_REQUEST_STATE_EVENT, {
    detail: { loading: activeRequestCount > 0 },
  }))
}

export function notifyApi(icon, message) {
  window.dispatchEvent(new CustomEvent(API_NOTIFICATION_EVENT, {
    detail: { icon, message },
  }))
}

async function request(path, options = {}, { trackLoading = true, silentStatuses = [] } = {}) {
  if (trackLoading) updateApiRequestCount(1)

  try {
  const { headers: optionHeaders, ...requestOptions } = options
  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestOptions,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
        ...optionHeaders,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      const connectionError = new Error('We could not connect to the account service. Check your connection and try again.')
      notifyApi('error', connectionError.message)
      throw connectionError
    }
    throw error
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    let message = payload?.message
      ?? (response.status === 404
        ? 'The account API route was not found. Restart the Laravel backend and try again.'
        : response.status === 419
          ? 'Your session expired. Refresh the page and try again.'
          : 'The request could not be completed. Please try again.')

    // Security check: Mask raw SQL or database leaks
    message = sanitizeErrorMessage(message)

    // Sanitize any field-specific validation errors
    const sanitizedErrors = {}
    if (payload?.errors && typeof payload.errors === 'object') {
      for (const [key, errList] of Object.entries(payload.errors)) {
        if (Array.isArray(errList)) {
          sanitizedErrors[key] = errList.map((e) => sanitizeErrorMessage(e))
        } else if (typeof errList === 'string') {
          sanitizedErrors[key] = [sanitizeErrorMessage(errList)]
        }
      }
    }

    const error = new Error(message)
    error.status = response.status
    error.errors = sanitizedErrors
    if (!silentStatuses.includes(response.status)) notifyApi('error', message)
    throw error
  }

  return payload
  } finally {
    if (trackLoading) updateApiRequestCount(-1)
  }
}

async function mutate(method, path, body, successMessage = 'Changes saved.') {
  updateApiRequestCount(1)
  try {
    await request('/sanctum/csrf-cookie', { method: 'GET' }, { trackLoading: false })
    const csrfToken = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
      ?.slice('XSRF-TOKEN='.length)

    const payload = await request(path, {
      method,
      body: JSON.stringify(body),
      headers: csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {},
    }, { trackLoading: false })
    notifyApi('success', payload?.message ?? successMessage)
    return payload
  } finally {
    updateApiRequestCount(-1)
  }
}

async function post(path, body, successMessage) {
  return mutate('POST', path, body, successMessage)
}

export const authApi = {
  currentUser: () => request('/api/v1/auth/me', {}, { silentStatuses: [401] }),
  login: (credentials) => post('/api/v1/auth/login', credentials, 'Signed in successfully.'),
  register: (details) => post('/api/v1/auth/register', details),
  logout: () => post('/api/v1/auth/logout', {}, 'You have been signed out.'),
  forgotPassword: (details) => post('/api/v1/auth/forgot-password', details),
  resetPassword: (details) => post('/api/v1/auth/reset-password', details),
}

export const roleManagementApi = {
  getRoles: () => request('/api/v1/admin/roles'),
  createRole: (details) => post('/api/v1/admin/roles', details, 'Role created.'),
  updateRole: (slug, details) => mutate('PUT', `/api/v1/admin/roles/${encodeURIComponent(slug)}`, details, 'Role updated.'),
  deleteRole: (slug) => mutate('DELETE', `/api/v1/admin/roles/${encodeURIComponent(slug)}`, undefined, 'Role deleted.'),
}

export const userManagementApi = {
  getUsers: () => request('/api/v1/admin/users'),
  createUser: (details) => post('/api/v1/admin/users', details, 'User account created.'),
  updateUser: (userId, details) => mutate('PUT', `/api/v1/admin/users/${userId}`, details, 'User account updated.'),
  assignRole: (userId, role) => mutate('PATCH', `/api/v1/admin/users/${userId}/role`, { role }, 'User role updated.'),
  setUserStatus: (userId, isActive) => mutate('PATCH', `/api/v1/admin/users/${userId}/status`, { is_active: isActive }),
  deleteUser: (userId) => mutate('DELETE', `/api/v1/admin/users/${userId}`, undefined, 'User account deleted.'),
}

export const customerManagementApi = {
  getCustomers: (params = {}) => {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.type && params.type !== 'all') searchParams.set('type', params.type)
    if (params.classification && params.classification !== 'all') searchParams.set('classification', params.classification)
    if (params.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params.page) searchParams.set('page', params.page)
    if (params.per_page) searchParams.set('per_page', params.per_page)
    const queryString = searchParams.toString()
    return request(`/api/v1/admin/customers${queryString ? `?${queryString}` : ''}`)
  },
  createCustomer: (details) => post('/api/v1/admin/customers', details, 'Customer registered successfully.'),
  getCustomer: (customerId) => request(`/api/v1/admin/customers/${customerId}`),
  updateCustomer: (customerId, details) => mutate('PUT', `/api/v1/admin/customers/${customerId}`, details, 'Customer updated successfully.'),
  setCustomerStatus: (customerId, isActive) => mutate('PATCH', `/api/v1/admin/customers/${customerId}/status`, { is_active: isActive }),
  deleteCustomer: (customerId) => mutate('DELETE', `/api/v1/admin/customers/${customerId}`, undefined, 'Customer removed.'),
  bulkImportCustomers: (customers) => post('/api/v1/admin/customers/bulk-import', { customers }, 'Bulk customers imported successfully.'),
  bulkDeleteCustomers: (ids) => post('/api/v1/admin/customers/bulk-delete', { ids }, 'Selected customers removed successfully.'),
}

