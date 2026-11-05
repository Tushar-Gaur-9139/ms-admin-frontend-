export const navigation = [
  { section: 'WORKSPACE', items: ['Overview', 'Orders', 'Products', 'Inventory', 'Customers'] },
  { section: 'MANAGEMENT', items: ['Roles', 'Users', 'Reports', 'Settings'] },
]

export const pagePaths = {
  Overview: '/',
  Orders: '/orders',
  Products: '/products',
  Inventory: '/inventory',
  Customers: '/customers',
  Roles: '/roles',
  Users: '/users',
  Reports: '/reports',
  Settings: '/settings',
}

export const pagePermissions = {
  Overview: 'overview.view',
  Orders: 'orders.view',
  Products: 'products.view',
  Inventory: 'inventory.view',
  Customers: 'customers.view',
  Reports: 'reports.view',
  Settings: 'settings.view',
}

export function pageFromPath(pathname) {
  return Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] ?? null
}

export function canManageRoles(user) {
  return ['admin', 'super_admin'].includes(user?.role)
}

export function canViewPage(user, page) {
  if (page === 'Roles' || page === 'Users') {
    return canManageRoles(user)
  }

  return Boolean(user.permissions?.includes(pagePermissions[page]))
}

export const metrics = [
  { label: 'Total sales', value: '—', note: 'Waiting for store data' },
  { label: 'Orders', value: '—', note: 'Waiting for store data' },
  { label: 'Products', value: '—', note: 'Waiting for catalogue data' },
  { label: 'Low stock items', value: '—', note: 'Waiting for inventory data' },
]
