import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Info,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TablePageSizeSelect from '../../components/tables/TablePageSizeSelect'
import TablePagination from '../../components/tables/TablePagination'
import { useAuth } from '../../context/AuthContext'
import { customerManagementApi, sanitizeErrorMessage } from '../../lib/api'
import { confirmAction } from '../../lib/confirmAction'
import { formatDate } from '../../lib/formatDate'

// Real-time validation regexes
const VALIDATION = {
  phoneRegex: /^[6-9]\d{9}$/,
  emailRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  gstinRegex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  panRegex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  pincodeRegex: /^[1-9][0-9]{5}$/,
}

const emptyForm = {
  customer_code: '',
  customer_type: '', // Empty initially to show 'Select'
  classification: 'new',
  first_name: '',
  last_name: '',
  name: '',
  phone: '',
  alternate_phone: '',
  email: '',
  date_of_birth: '',
  gender: '',
  source: 'Direct',
  street_address: '',
  country: 'India',
  state: 'Delhi NCR',
  city: 'New Delhi',
  pincode: '',
  gst_number: '',
  pan_number: '',
  segment: 'Retail',
  stage: 'New Customer',
  primary_manager: 'Admin Staff',
  preferred_language: 'English',
  notes: '',

  // B2B specific
  company_name: '',
  legal_name: '',
  trade_name: '',
  registration_number: '',
  industry: 'Appliance Repair & Spares',
  company_size: '1-10',
  company_type: 'Proprietorship',
  website: '',
  annual_revenue: '10-50 Lakhs',
  job_title: '',
  department: 'Spares Procurement',
  billing_email: '',
  customer_priority: 'Medium',
  payment_terms: 'Immediate / Advance',
  preferred_currency: 'INR',
  credit_limit: '',
}

export default function CustomerManagement() {
  const { user: currentUser } = useAuth()
  const canEditOrDelete = ['admin', 'super_admin'].includes(currentUser?.role)

  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
  const [stats, setStats] = useState({ total: 0, b2c: 0, b2b: 0, new: 0, existing: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Collapsible Filters
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [classificationFilter, setClassificationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterId, setFilterId] = useState('')
  const [filterManager, setFilterManager] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Selection
  const [selectedIds, setSelectedIds] = useState([])
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  // Bulk Import States
  const fileInputRef = useRef(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreviewRows, setImportPreviewRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  // Dialog & View States
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState(null)
  const [activeOrderCustomer, setActiveOrderCustomer] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [formValues, setFormValues] = useState(emptyForm)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [clientErrors, setClientErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})
  const [busyCustomerId, setBusyCustomerId] = useState(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await customerManagementApi.getCustomers({
        search,
        type: typeFilter,
        classification: classificationFilter,
        status: statusFilter,
        page,
        per_page: pageSize,
      })
      setCustomers(data.customers ?? [])
      if (data.pagination) setPagination(data.pagination)
      if (data.stats) setStats(data.stats)
    } catch (err) {
      setError(sanitizeErrorMessage(err.message || 'Failed to load customers.'))
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, classificationFilter, statusFilter, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers()
    }, 250)
    return () => clearTimeout(timer)
  }, [loadCustomers])

  // Open modal for registration
  function openCreateDialog(type = '') {
    setEditingCustomer(null)
    setFormValues({
      ...emptyForm,
      customer_type: type,
      classification: 'new',
      stage: 'New Customer',
      customer_code: 'Auto-generated on save',
    })
    setFormErrors({})
    setClientErrors({})
    setTouchedFields({})
    setDialogOpen(true)
  }

  // Open modal for editing (Strict Admin Only)
  function openEditDialog(customer) {
    if (!canEditOrDelete) {
      setError('Only administrators and super administrators are authorized to edit saved customer records.')
      return
    }
    setEditingCustomer(customer)
    setFormValues({
      ...emptyForm,
      customer_code: customer.customer_code || `MSE${String(customer.id).padStart(7, '0')}`,
      customer_type: customer.customer_type || 'b2c',
      classification: customer.classification || 'new',
      first_name: customer.first_name || (customer.name ? customer.name.split(' ')[0] : ''),
      last_name: customer.last_name || (customer.name ? customer.name.split(' ').slice(1).join(' ') : ''),
      name: customer.name || '',
      phone: customer.phone || '',
      alternate_phone: customer.alternate_phone || '',
      email: customer.email || '',
      date_of_birth: customer.date_of_birth || '',
      gender: customer.gender || '',
      source: customer.source || 'Direct',
      street_address: customer.address_line1 || '',
      country: customer.country || 'India',
      state: customer.state || 'Delhi NCR',
      city: customer.city || 'New Delhi',
      pincode: customer.pincode || '',
      gst_number: customer.gst_number || '',
      pan_number: customer.pan_number || '',
      segment: customer.segment || (customer.customer_type === 'b2b' ? 'Wholesale' : 'Retail'),
      stage: customer.stage || (customer.classification === 'existing' ? 'Old / Existing Customer' : 'New Customer'),
      primary_manager: customer.primary_manager || 'Admin Staff',
      preferred_language: customer.preferred_language || 'English',
      notes: customer.notes || '',

      // B2B
      company_name: customer.business_name || '',
      legal_name: customer.legal_name || '',
      trade_name: customer.trade_name || '',
      registration_number: customer.registration_number || '',
      industry: customer.industry || 'Appliance Repair & Spares',
      company_size: customer.company_size || '1-10',
      company_type: customer.company_type || 'Proprietorship',
      website: customer.website || '',
      annual_revenue: customer.annual_revenue || '10-50 Lakhs',
      job_title: customer.job_title || '',
      department: customer.department || 'Spares Procurement',
      billing_email: customer.billing_email || '',
      customer_priority: customer.customer_priority || 'Medium',
      payment_terms: customer.payment_terms || 'Immediate / Advance',
      preferred_currency: customer.preferred_currency || 'INR',
      credit_limit: customer.credit_limit ? String(customer.credit_limit) : '',
    })
    setFormErrors({})
    setClientErrors({})
    setTouchedFields({})
    setDialogOpen(true)
    setActiveMenuId(null)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingCustomer(null)
    setFormValues(emptyForm)
    setFormErrors({})
    setClientErrors({})
    setTouchedFields({})
  }

  function handleUseForNewOrder(customer) {
    setActiveOrderCustomer(customer)
    setActiveMenuId(null)
  }

  // Handle switching customer type
  function handleCustomerTypeChange(type) {
    setFormValues((curr) => {
      const nextSegment = type === 'b2b' ? 'Wholesale' : 'Retail'
      const nextStage = curr.stage || 'New Customer'
      return {
        ...curr,
        customer_type: type,
        segment: curr.segment && curr.segment !== 'Retail' && curr.segment !== 'Wholesale' ? curr.segment : nextSegment,
        stage: nextStage,
      }
    })
    setTouchedFields((prev) => ({ ...prev, customer_type: true }))
    setFormErrors({})
  }

  // Single field validator for real-time edge-case checks
  const validateField = useCallback((field, val, allValues) => {
    const isB2b = allValues.customer_type === 'b2b'

    switch (field) {
      case 'phone': {
        const cleaned = String(val || '').replace(/\D/g, '')
        if (!cleaned) return 'Mobile phone is required.'
        if (cleaned.length !== 10) return `Must be exactly 10 digits (currently ${cleaned.length}).`
        if (!/^[6-9]/.test(cleaned)) return 'Indian mobile numbers must start with 6, 7, 8, or 9.'

        // Real-time duplicate check against existing customers list
        const dup = customers.find(
          (c) => c.phone === cleaned && c.id !== editingCustomer?.id
        )
        if (dup) {
          return `Phone already registered to ${dup.name || dup.business_name} (${dup.customer_code || 'MSE'}).`
        }
        return ''
      }

      case 'alternate_phone': {
        const cleaned = String(val || '').replace(/\D/g, '')
        if (!cleaned) return '' // optional
        if (cleaned.length !== 10) return `Must be 10 digits (currently ${cleaned.length}).`
        if (!/^[6-9]/.test(cleaned)) return 'Indian mobile numbers must start with 6, 7, 8, or 9.'
        const primaryCleaned = String(allValues.phone || '').replace(/\D/g, '')
        if (cleaned === primaryCleaned) return 'Alternative phone cannot be identical to primary phone.'
        return ''
      }

      case 'email': {
        const trimmed = String(val || '').trim()
        if (!isB2b && !trimmed) return 'Email address is required.'
        if (trimmed && !VALIDATION.emailRegex.test(trimmed)) return 'Please enter a valid email address (e.g. client@email.com).'
        return ''
      }

      case 'billing_email': {
        const trimmed = String(val || '').trim()
        if (trimmed && !VALIDATION.emailRegex.test(trimmed)) return 'Please enter a valid billing email address.'
        return ''
      }

      case 'first_name': {
        const trimmed = String(val || '').trim()
        if (!trimmed) return isB2b ? 'Contact person name is required.' : 'First name is required.'
        if (trimmed.length < 2) return 'Must be at least 2 characters.'
        return ''
      }

      case 'last_name': {
        if (!isB2b) {
          const trimmed = String(val || '').trim()
          if (!trimmed) return 'Last name is required.'
        }
        return ''
      }

      case 'company_name': {
        if (isB2b) {
          const trimmed = String(val || '').trim()
          if (!trimmed) return 'Company / Business name is required.'
          if (trimmed.length < 2) return 'Company name must be at least 2 characters.'
        }
        return ''
      }

      case 'gst_number': {
        const cleaned = String(val || '').toUpperCase().trim()
        if (!cleaned) return '' // optional for B2C, optional or required for B2B if registering
        if (cleaned.length !== 15) return `GSTIN must be 15 characters (currently ${cleaned.length}).`
        if (!VALIDATION.gstinRegex.test(cleaned)) return 'Invalid GSTIN format. Example: 07AAAAA0000A1Z5'
        return ''
      }

      case 'pan_number': {
        const cleaned = String(val || '').toUpperCase().trim()
        if (!cleaned) return ''
        if (cleaned.length !== 10) return `PAN must be 10 characters (currently ${cleaned.length}).`
        if (!VALIDATION.panRegex.test(cleaned)) return 'Invalid PAN format. Example: ABCDE1234F'

        // Check consistency with GSTIN if entered
        const gstin = String(allValues.gst_number || '').toUpperCase().trim()
        if (gstin.length === 15 && VALIDATION.gstinRegex.test(gstin)) {
          const gstinPan = gstin.slice(2, 12)
          if (cleaned !== gstinPan) {
            return `PAN (${cleaned}) does not match GSTIN PAN entity (${gstinPan}).`
          }
        }
        return ''
      }

      case 'street_address': {
        const trimmed = String(val || '').trim()
        if (!trimmed) return 'Street address is required.'
        if (trimmed.length < 5) return 'Please provide a complete street address.'
        return ''
      }

      case 'city': {
        const trimmed = String(val || '').trim()
        if (!trimmed) return 'City is required.'
        return ''
      }

      case 'state': {
        const trimmed = String(val || '').trim()
        if (!trimmed) return 'State is required.'
        return ''
      }

      case 'pincode': {
        const cleaned = String(val || '').replace(/\D/g, '')
        if (!cleaned) return '6-digit PIN code is required.'
        if (cleaned.length !== 6) return `PIN must be 6 digits (currently ${cleaned.length}).`
        if (!VALIDATION.pincodeRegex.test(cleaned)) return 'PIN code cannot start with 0.'
        return ''
      }

      case 'credit_limit': {
        if (val !== '' && val !== null && val !== undefined) {
          const num = Number(val)
          if (isNaN(num) || num < 0) return 'Credit limit must be a valid positive amount.'
        }
        return ''
      }

      case 'website': {
        const trimmed = String(val || '').trim()
        if (trimmed && !/^(https?:\/\/)?[\w.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
          return 'Please enter a valid website URL.'
        }
        return ''
      }

      default:
        return ''
    }
  }, [customers, editingCustomer])

  // Real-time input change handler with auto-formatting and auto-derivation
  function handleFieldChange(field, rawValue) {
    let sanitized = rawValue

    // Normalizations
    if (field === 'phone' || field === 'alternate_phone') {
      sanitized = rawValue.replace(/\D/g, '').slice(0, 10)
    } else if (field === 'pincode') {
      sanitized = rawValue.replace(/\D/g, '').slice(0, 6)
    } else if (field === 'gst_number') {
      sanitized = rawValue.toUpperCase().replace(/\s/g, '').slice(0, 15)
    } else if (field === 'pan_number') {
      sanitized = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    }

    setFormValues((prev) => {
      const updated = { ...prev, [field]: sanitized }

      // Smart Feature: Auto-derive PAN from GSTIN if 15 chars or 12+ chars
      if (field === 'gst_number' && sanitized.length >= 12) {
        const derivedPan = sanitized.slice(2, 12)
        if (VALIDATION.panRegex.test(derivedPan)) {
          // If PAN is empty or previously derived, automatically set it
          if (!prev.pan_number || prev.pan_number === prev.gst_number?.slice(2, 12)) {
            updated.pan_number = derivedPan
          }
        }
      }

      // Sync Classification with Stage (New vs Old / Existing)
      if (field === 'stage') {
        const isOld = sanitized.toLowerCase().includes('old') || sanitized.toLowerCase().includes('exist')
        updated.classification = isOld ? 'existing' : 'new'
      }

      return updated
    })

    // Mark touched
    setTouchedFields((prev) => ({ ...prev, [field]: true }))

    // Real-time validation computation
    const nextValues = { ...formValues, [field]: sanitized }
    const errorMsg = validateField(field, sanitized, nextValues)

    setClientErrors((prev) => {
      const next = { ...prev }
      if (errorMsg) next[field] = errorMsg
      else delete next[field]
      return next
    })

    // If GSTIN changed, re-validate PAN to check cross-matching
    if (field === 'gst_number' && formValues.pan_number) {
      const panErr = validateField('pan_number', formValues.pan_number, { ...nextValues, [field]: sanitized })
      setClientErrors((prev) => {
        const next = { ...prev }
        if (panErr) next.pan_number = panErr
        else delete next.pan_number
        return next
      })
    }
  }

  function handleFieldBlur(field) {
    setTouchedFields((prev) => ({ ...prev, [field]: true }))
    const errorMsg = validateField(field, formValues[field], formValues)
    setClientErrors((prev) => {
      const next = { ...prev }
      if (errorMsg) next[field] = errorMsg
      else delete next[field]
      return next
    })
  }

  // Validate entire form before submission
  function validateEntireForm() {
    const isB2b = formValues.customer_type === 'b2b'
    const fieldsToValidate = isB2b
      ? ['company_name', 'first_name', 'phone', 'street_address', 'city', 'state', 'pincode', 'gst_number', 'pan_number', 'billing_email', 'credit_limit', 'alternate_phone']
      : ['first_name', 'last_name', 'email', 'phone', 'street_address', 'city', 'state', 'pincode', 'gst_number', 'pan_number', 'alternate_phone']

    const newErrors = {}
    const newTouched = {}

    fieldsToValidate.forEach((f) => {
      newTouched[f] = true
      const err = validateField(f, formValues[f], formValues)
      if (err) newErrors[f] = err
    })

    setTouchedFields((prev) => ({ ...prev, ...newTouched }))
    setClientErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  // Save customer handler
  async function handleSaveCustomer(event) {
    event.preventDefault()

    if (!formValues.customer_type) {
      setError('Please select a customer type (B2C or B2B) before saving.')
      return
    }

    if (!validateEntireForm()) {
      setError('Please resolve all validation errors in the form before saving.')
      return
    }

    setSavingCustomer(true)
    setFormErrors({})

    const isB2b = formValues.customer_type === 'b2b'
    const isOld = formValues.stage.toLowerCase().includes('old') || formValues.stage.toLowerCase().includes('exist')

    const payload = {
      ...formValues,
      business_name: isB2b ? (formValues.company_name || formValues.business_name) : null,
      classification: isOld ? 'existing' : 'new',
      credit_limit: formValues.credit_limit ? Number(formValues.credit_limit) : 0,
      address_line1: formValues.street_address,
      pincode: formValues.pincode,
    }

    try {
      if (editingCustomer) {
        const response = await customerManagementApi.updateCustomer(editingCustomer.id, payload)
        setCustomers((curr) => curr.map((c) => (c.id === editingCustomer.id ? response.customer : c)))
      } else {
        await customerManagementApi.createCustomer(payload)
        loadCustomers()
      }
      closeDialog()
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors)
      } else {
        setError(sanitizeErrorMessage(err.message || 'Failed to save customer.'))
      }
    } finally {
      setSavingCustomer(false)
    }
  }

  // Delete Customer (Strict Admin Only)
  async function handleDeleteCustomer(customer) {
    if (!canEditOrDelete) {
      setError('Only administrators and super administrators are authorized to delete customer records.')
      return
    }

    const confirm = await confirmAction({
      title: `Delete customer ${customer.name || customer.business_name}?`,
      text: 'This customer record will be removed permanently.',
      confirmButtonText: 'Yes, delete customer',
      destructive: true,
    })
    if (!confirm.isConfirmed) return

    setBusyCustomerId(customer.id)
    try {
      await customerManagementApi.deleteCustomer(customer.id)
      setCustomers((curr) => curr.filter((c) => c.id !== customer.id))
      loadCustomers()
    } catch (err) {
      setError(sanitizeErrorMessage(err.message || 'Failed to delete customer.'))
    } finally {
      setBusyCustomerId(null)
      setActiveMenuId(null)
    }
  }

  const selectedCustomers = useMemo(() => {
    return customers.filter((c) => selectedIds.includes(c.id))
  }, [customers, selectedIds])

  // Selective or Complete Export to CSV/Excel
  function downloadData(mode = 'auto') {
    const targetList = mode === 'selected' || (mode === 'auto' && selectedCustomers.length > 0)
      ? selectedCustomers
      : customers

    if (!targetList.length) {
      alert('No customer records available to export.')
      return
    }

    const headers = [
      'Customer ID',
      'Type',
      'Classification',
      'Name',
      'Company Name',
      'Contact Mobile',
      'Alternative Phone',
      'Email',
      'Street Address',
      'City',
      'State',
      'PIN Code',
      'GSTIN',
      'PAN',
      'Segment',
      'Stage',
      'Total Orders',
      'Total Spent (INR)',
      'Registered Date',
    ]

    const rows = targetList.map((c) => [
      c.customer_code || `MSE${String(c.id).padStart(7, '0')}`,
      c.customer_type?.toUpperCase() || 'B2C',
      c.classification === 'existing' ? 'Old / Existing' : 'New',
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.business_name || '').replace(/"/g, '""')}"`,
      c.phone || '',
      c.alternate_phone || '',
      c.email || '',
      `"${(c.address_line1 || c.street_address || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.state || '').replace(/"/g, '""')}"`,
      c.pincode || '',
      c.gst_number || '',
      c.pan_number || '',
      c.segment || '',
      c.stage || '',
      c.orders_count || 0,
      c.total_spent || 0,
      c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    const suffix = targetList.length === selectedCustomers.length && selectedCustomers.length > 0
      ? `selected-${selectedCustomers.length}`
      : 'all'
    link.setAttribute('download', `ms-customers-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate Printable PDF / Print Summary
  function printCustomerReport(targetList = null) {
    const list = targetList && targetList.length > 0
      ? targetList
      : (selectedCustomers.length > 0 ? selectedCustomers : customers)

    if (!list.length) {
      alert('No customer records to print / export.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to generate the printable PDF report.')
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Directory Report - M.S. Enterprises</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2860c8; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
          .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 8px 6px; font-size: 10px; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; }
          .badge { padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; display: inline-block; }
          .b2c { background: #fef3c7; color: #92400e; }
          .b2b { background: #dbeafe; color: #1e40af; }
          .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">M.S. ENTERPRISES — CUSTOMER DIRECTORY</h1>
            <div class="subtitle">Spare Parts &amp; Appliances Division · Confidential Customer Record</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Total Records: ${list.length}</strong></div>
            <div class="subtitle">Generated: ${new Date().toLocaleString('en-IN')}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer ID</th>
              <th>Type</th>
              <th>Name / Company</th>
              <th>Contact Mobile</th>
              <th>Email</th>
              <th>City / State</th>
              <th>GSTIN</th>
              <th>Stage</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${c.customer_code || `MSE${String(c.id).padStart(7, '0')}`}</strong></td>
                <td><span class="badge ${c.customer_type}">${c.customer_type?.toUpperCase()}</span></td>
                <td><strong>${c.name}</strong>${c.business_name ? `<br/><small style="color:#64748b">${c.business_name}</small>` : ''}</td>
                <td>${c.phone}</td>
                <td>${c.email || '-'}</td>
                <td>${c.city || '-'}${c.state ? `, ${c.state}` : ''}</td>
                <td><code style="font-size:10px">${c.gst_number || '-'}</code></td>
                <td>${c.classification === 'existing' ? 'Old / Existing' : 'New'}</td>
                <td>${c.orders_count || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          M.S. Enterprises Admin Portal · Printed by ${currentUser?.name || 'Admin'} · Page 1 of 1
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  // Bulk Delete Selected Customers (Strict Admin Only)
  async function handleBulkDelete() {
    if (!canEditOrDelete) {
      setError('Only administrators and super administrators are authorized to delete customer records.')
      return
    }

    if (!selectedIds.length) return

    const confirm = await confirmAction({
      title: `Delete ${selectedIds.length} customer records?`,
      text: 'Selected customer records without past orders will be removed permanently.',
      confirmButtonText: `Yes, delete ${selectedIds.length} customers`,
      destructive: true,
    })
    if (!confirm.isConfirmed) return

    setLoading(true)
    try {
      await customerManagementApi.bulkDeleteCustomers(selectedIds)
      setSelectedIds([])
      await loadCustomers()
    } catch (err) {
      setError(sanitizeErrorMessage(err.message || 'Failed to delete selected customers.'))
    } finally {
      setLoading(false)
    }
  }

  // Download Sample CSV Template
  function downloadSampleTemplate() {
    const csvContent = `customer_type,name,first_name,last_name,business_name,phone,email,address,city,state,pincode,gst_number,pan_number,classification,notes
b2c,Aakash Sharma,Aakash,Sharma,,9811223344,aakash@example.com,Flat 202 Mayur Vihar,New Delhi,Delhi NCR,110091,,,new,Sample Retail Client
b2b,Mohit Gupta,Mohit,Gupta,Shree Ram Aircon Solutions,9876543210,mohit@shreeramaircon.com,Shop 14 Sector 18,Noida,Uttar Pradesh,201301,07AAAAA0000A1Z5,AAAAA0000A,new,Sample Wholesale Partner`

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'ms-customers-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Parse CSV text and validate each row
  function parseCSVText(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      setImportErrors(['Uploaded file is empty or does not contain header and data rows.'])
      setImportPreviewRows([])
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
    const parsedRows = []
    const seenPhones = new Set()

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',')
      const row = {}

      headers.forEach((h, colIndex) => {
        let val = values[colIndex] ? values[colIndex].trim().replace(/^["']|["']$/g, '') : ''
        row[h] = val
      })

      const rawPhone = row.phone || row.mobile || row.contact || ''
      const phoneDigits = rawPhone.replace(/\D/g, '').slice(0, 10)
      const isPhoneValid = /^[6-9]\d{9}$/.test(phoneDigits)
      const isDuplicateInFile = seenPhones.has(phoneDigits)
      if (phoneDigits) seenPhones.add(phoneDigits)

      const isB2b = (row.customer_type || row.type || '').toLowerCase() === 'b2b'

      let errorMsg = ''
      if (!phoneDigits) errorMsg = 'Missing mobile number'
      else if (!isPhoneValid) errorMsg = 'Invalid 10-digit mobile (must start with 6-9)'
      else if (isDuplicateInFile) errorMsg = 'Duplicate mobile inside upload file'

      const mapped = {
        customer_type: isB2b ? 'b2b' : 'b2c',
        name: row.name || (row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : (isB2b ? row.business_name || row.company_name : 'Customer')),
        first_name: row.first_name || (row.name ? row.name.split(' ')[0] : ''),
        last_name: row.last_name || (row.name ? row.name.split(' ').slice(1).join(' ') : ''),
        business_name: isB2b ? (row.business_name || row.company_name || row.name || '') : null,
        phone: phoneDigits,
        email: row.email || '',
        address: row.address || row.address_line1 || row.street_address || '',
        city: row.city || 'New Delhi',
        state: row.state || 'Delhi NCR',
        pincode: (row.pincode || row.pin || '').replace(/\D/g, '').slice(0, 6),
        gst_number: (row.gst_number || row.gstin || row.gst || '').toUpperCase(),
        pan_number: (row.pan_number || row.pan || '').toUpperCase(),
        classification: (row.classification || row.stage || '').toLowerCase().includes('old') || (row.classification || '').toLowerCase() === 'existing' ? 'existing' : 'new',
        notes: row.notes || 'Imported via bulk customer upload.',
        isValid: isPhoneValid && !isDuplicateInFile,
        error: errorMsg,
      }

      parsedRows.push(mapped)
    }

    setImportPreviewRows(parsedRows)
  }

  function handleFileSelected(file) {
    if (!file) return
    setImportFile(file)
    setImportErrors([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      if (typeof text === 'string') {
        parseCSVText(text)
      }
    }
    reader.readAsText(file)
  }

  async function handleConfirmImport() {
    const validRows = importPreviewRows.filter((r) => r.isValid)
    if (!validRows.length) {
      alert('No valid customer records found to import. Please check phone numbers.')
      return
    }

    setImporting(true)
    try {
      const response = await customerManagementApi.bulkImportCustomers(validRows)
      setImportModalOpen(false)
      setImportFile(null)
      setImportPreviewRows([])
      await loadCustomers()
    } catch (err) {
      setImportErrors([sanitizeErrorMessage(err.message || 'Bulk import failed.')])
    } finally {
      setImporting(false)
    }
  }

  const allSelected = customers.length > 0 && selectedIds.length === customers.length

  function toggleSelectAll() {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(customers.map((c) => c.id))
  }

  function toggleSelectOne(id) {
    setSelectedIds((curr) => (curr.includes(id) ? curr.filter((i) => i !== id) : [...curr, id]))
  }

  // Helper for rendering input class with validation
  function getInputClass(field) {
    if (clientErrors[field] && touchedFields[field]) return 'input-invalid'
    if (touchedFields[field] && !clientErrors[field] && formValues[field]) return 'input-valid'
    return ''
  }

  return (
    <div className="mahatta-customers-page" onClick={() => setActiveMenuId(null)}>
      {error && !dialogOpen && <p className="role-feedback role-feedback-error" role="alert">{error}</p>}

      {/* Top Header */}
      <div className="mahatta-header">
        <div>
          <h1 className="mahatta-title">Customers</h1>
          <p className="mahatta-subtitle">
            {stats.total} customers · {new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)} — {new Date().toISOString().slice(0, 10)}
          </p>
        </div>

        <div className="mahatta-header-actions" style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="mahatta-btn-secondary"
              onClick={(e) => {
                e.stopPropagation()
                setExportDropdownOpen((o) => !o)
              }}
            >
              <Download size={14} /> Download Data {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>

            {exportDropdownOpen && (
              <div
                className="mahatta-dropdown-menu"
                style={{ top: '42px', right: 0, minWidth: '220px', zIndex: 100 }}
                onClick={(e) => e.stopPropagation()}
              >
                {selectedIds.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        downloadData('selected')
                        setExportDropdownOpen(false)
                      }}
                    >
                      <Download size={14} /> Export Selected ({selectedIds.length}) CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        printCustomerReport(selectedCustomers)
                        setExportDropdownOpen(false)
                      }}
                    >
                      <Printer size={14} /> Print / Save PDF ({selectedIds.length})
                    </button>
                    <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    downloadData('all')
                    setExportDropdownOpen(false)
                  }}
                >
                  <Download size={14} /> Export All ({customers.length}) CSV/Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printCustomerReport(customers)
                    setExportDropdownOpen(false)
                  }}
                >
                  <Printer size={14} /> Print / Save as PDF (All)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="mahatta-btn-secondary"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload size={14} /> Upload File
          </button>
          <button type="button" className="mahatta-btn-primary" onClick={() => openCreateDialog('')}>
            <Plus size={15} /> Add Customer
          </button>
        </div>
      </div>

      {/* Active Order Customer Session Banner (Matching Reference) */}
      {activeOrderCustomer && (
        <div className="mahatta-active-order-banner">
          <ShoppingCart size={15} />
          <span>
            Active Session: <strong>ORDER FOR {activeOrderCustomer.name || activeOrderCustomer.business_name}</strong>
          </span>
          <span className={`mahatta-badge-type badge-${activeOrderCustomer.customer_type}`}>
            {activeOrderCustomer.customer_type?.toUpperCase()}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            ({activeOrderCustomer.customer_code || `MSE${String(activeOrderCustomer.id).padStart(7, '0')}`})
          </span>
          <button
            type="button"
            className="active-order-clear-btn"
            onClick={() => setActiveOrderCustomer(null)}
            title="Dismiss active order customer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Collapsible Filter Panel */}
      <div className="mahatta-filters-card">
        <div className="mahatta-filters-header" onClick={() => setFiltersOpen((o) => !o)}>
          <div className="mahatta-filters-title">
            <Filter size={15} />
            <span>Filters</span>
          </div>
          <button type="button" className="mahatta-chevron-btn" aria-label="Toggle filters">
            {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {filtersOpen && (
          <div className="mahatta-filters-body">
            <div className="mahatta-filters-grid">
              <div>
                <label>FROM</label>
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              </div>
              <div>
                <label>TO</label>
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
              </div>
              <div>
                <label>CUSTOMER ID</label>
                <input
                  type="text"
                  placeholder="e.g. MSE0051125"
                  value={filterId}
                  onChange={(e) => { setFilterId(e.target.value); setSearch(e.target.value) }}
                />
              </div>
              <div>
                <label>CUSTOMER TYPE</label>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
                  <option value="all">All Types</option>
                  <option value="b2c">B2C</option>
                  <option value="b2b">B2B</option>
                </select>
              </div>
              <div>
                <label>STAGE / STATUS</label>
                <select value={classificationFilter} onChange={(e) => { setClassificationFilter(e.target.value); setPage(1) }}>
                  <option value="all">All Stages</option>
                  <option value="new">🆕 New Customer</option>
                  <option value="existing">🔄 Old / Existing Customer</option>
                </select>
              </div>
              <div>
                <label>RELATIONSHIP MANAGER</label>
                <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
                  <option value="all">All Managers</option>
                  <option value="Admin Staff">Admin Staff</option>
                </select>
              </div>
            </div>

            <div className="mahatta-filters-footer">
              <button
                type="button"
                className="mahatta-btn-text"
                onClick={() => {
                  setFilterFrom('')
                  setFilterTo('')
                  setFilterId('')
                  setTypeFilter('all')
                  setClassificationFilter('all')
                  setStatusFilter('all')
                  setSearch('')
                  setPage(1)
                }}
              >
                Reset Filters
              </button>
              <button type="button" className="mahatta-btn-primary" onClick={loadCustomers}>
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="mahatta-selection-bar">
          <div className="selection-info">
            <CheckSquare size={16} />
            <span>
              <strong>{selectedIds.length}</strong> of {customers.length} customer{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="selection-actions">
            <button
              type="button"
              className="mahatta-btn-selection"
              onClick={() => downloadData('selected')}
            >
              <Download size={13} /> Export CSV / Excel ({selectedIds.length})
            </button>
            <button
              type="button"
              className="mahatta-btn-selection"
              onClick={() => printCustomerReport(selectedCustomers)}
            >
              <Printer size={13} /> Printable PDF Report
            </button>
            {canEditOrDelete && (
              <button
                type="button"
                className="mahatta-btn-selection-danger"
                onClick={handleBulkDelete}
              >
                <Trash2 size={13} /> Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              type="button"
              className="mahatta-btn-text"
              onClick={() => setSelectedIds([])}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Quick Search Bar & Page Controls */}
      <div className="mahatta-table-controls">
        <div className="mahatta-search-bar">
          <Search size={15} className="mahatta-search-icon" />
          <input
            type="search"
            placeholder="Quick search name, email, mobile or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TablePageSizeSelect value={pageSize} onChange={(val) => { setPageSize(val); setPage(1) }} />
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="mahatta-table-container">
        {loading ? (
          <div className="mahatta-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Loading customers…</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="mahatta-empty-state">
            <Users size={40} />
            <p>No customers found matching your criteria.</p>
            <button type="button" className="mahatta-btn-primary" onClick={() => openCreateDialog('')}>
              <Plus size={14} /> Register First Customer
            </button>
          </div>
        ) : (
          <div className="mahatta-table-responsive">
            <table className="mahatta-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', minWidth: '40px' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all customers"
                    />
                  </th>
                  <th style={{ minWidth: '180px' }}>CUSTOMER</th>
                  <th style={{ minWidth: '170px' }}>LAST NAME / COMPANY</th>
                  <th style={{ minWidth: '130px' }}>CONTACT</th>
                  <th style={{ minWidth: '85px' }}>TYPE</th>
                  <th style={{ minWidth: '200px' }}>EMAIL</th>
                  <th style={{ minWidth: '110px' }}>CITY</th>
                  <th style={{ minWidth: '120px' }}>STATE</th>
                  <th style={{ minWidth: '150px' }}>GSTIN</th>
                  <th style={{ minWidth: '145px' }}>STAGE / GUEST</th>
                  <th style={{ minWidth: '110px' }}>REGISTERED</th>
                  <th style={{ minWidth: '110px' }}>LAST INVOICE</th>
                  <th style={{ minWidth: '110px' }}>UPDATED</th>
                  <th className="th-sticky-action" style={{ width: '48px', minWidth: '48px' }}></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, index) => {
                  const isSelected = selectedIds.includes(c.id)
                  const isOld = c.classification === 'existing'
                  const isB2b = c.customer_type === 'b2b'
                  const isNearBottom = index >= customers.length - 2 && customers.length > 2

                  return (
                    <tr key={c.id} className={isSelected ? 'selected-row' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td>
                        <div className="mahatta-cell-customer">
                          <span className="customer-name" title={c.name || c.business_name}>
                            {c.name || c.business_name}
                          </span>
                          <span className="customer-code">
                            {c.customer_code || `MSE${String(c.id).padStart(7, '0')}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span title={isB2b ? (c.business_name || '-') : (c.last_name || '-')}>
                          {isB2b ? (c.business_name || '-') : (c.last_name || '-')}
                        </span>
                      </td>
                      <td>
                        <a href={`tel:${c.phone}`} className="mahatta-cell-phone">
                          {c.phone}
                        </a>
                      </td>
                      <td>
                        <span className={`mahatta-badge-type badge-${c.customer_type}`}>
                          {c.customer_type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="mahatta-cell-email" title={c.email || '-'}>
                        {c.email || '-'}
                      </td>
                      <td>{c.city || '-'}</td>
                      <td>{c.state || '-'}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                          {c.gst_number || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`mahatta-badge-stage ${isOld ? 'stage-old' : 'stage-new'}`}>
                          {isOld ? '🔄 Old / Existing' : '🆕 New Customer'}
                        </span>
                      </td>
                      <td className="mahatta-cell-date">{formatDate(c.created_at)}</td>
                      <td className="mahatta-cell-date">
                        {c.orders_count ? `${c.orders_count} inv` : '—'}
                      </td>
                      <td className="mahatta-cell-date">{formatDate(c.updated_at)}</td>
                      <td
                        className={`td-sticky-action ${activeMenuId === c.id ? 'menu-active-cell' : ''}`}
                        style={{
                          position: 'sticky',
                          right: 0,
                          zIndex: activeMenuId === c.id ? 100 : 5,
                        }}
                      >
                        <button
                          type="button"
                          className="mahatta-menu-dots-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId((curr) => (curr === c.id ? null : c.id))
                          }}
                          aria-label="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === c.id && (
                          <div
                            className={`mahatta-dropdown-menu ${isNearBottom ? 'dropdown-dropup' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleUseForNewOrder(c)}
                            >
                              <ShoppingCart size={14} /> Use for new order
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingCustomer(c)
                                setActiveMenuId(null)
                              }}
                            >
                              <Eye size={14} /> View
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                onClick={() => openEditDialog(c)}
                              >
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOrderHistoryCustomer(c)
                                setActiveMenuId(null)
                              }}
                            >
                              <History size={14} /> View Order History
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                className="menu-delete-action"
                                onClick={() => handleDeleteCustomer(c)}
                                disabled={busyCustomerId === c.id}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={pagination.current_page || page}
          pageSize={pageSize}
          total={pagination.total ?? stats.total ?? customers.length}
          onPageChange={setPage}
        />
      </div>

      {/* NEW / EDIT CUSTOMER MODAL (Exact match to reference screenshots) */}
      {dialogOpen && (
        <div className="mahatta-modal-backdrop" onClick={closeDialog}>
          <div className="mahatta-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mahatta-modal-header">
              <h2>{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
              <button type="button" className="mahatta-modal-close" onClick={closeDialog} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="mahatta-modal-form" noValidate>
              {/* Top Row: Customer ID & Customer Type (Screenshot 3) */}
              <div className="mahatta-form-row">
                <div className="mahatta-form-group">
                  <label>CUSTOMER ID</label>
                  <input
                    type="text"
                    disabled
                    value={formValues.customer_code || 'Auto-generated on save'}
                    className="input-disabled"
                  />
                </div>

                <div className="mahatta-form-group">
                  <label>
                    CUSTOMER TYPE <span className="req">*</span>
                  </label>
                  <select
                    required
                    value={formValues.customer_type}
                    onChange={(e) => handleCustomerTypeChange(e.target.value)}
                    className={touchedFields.customer_type && !formValues.customer_type ? 'input-invalid' : ''}
                  >
                    <option value="">Select</option>
                    <option value="b2c">B2C</option>
                    <option value="b2b">B2B</option>
                  </select>
                  {touchedFields.customer_type && !formValues.customer_type && (
                    <span className="mahatta-field-error">
                      <AlertCircle size={12} /> Please select a customer type.
                    </span>
                  )}
                </div>
              </div>

              {/* WHEN 'Select' IS CHOSEN (No type chosen yet - Screenshot 3 layout) */}
              {!formValues.customer_type && (
                <div className="type-prompt-card">
                  <div style={{ display: 'inline-flex', padding: '12px', background: '#eff6ff', borderRadius: '50%', color: '#2860c8', marginBottom: '10px' }}>
                    <Users size={26} />
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#1e293b' }}>Select Customer Type to Begin</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
                    Choose between retail direct consumer (B2C) or business / wholesale partner (B2B) to open the registration form.
                  </p>

                  <div className="type-prompt-options">
                    <button
                      type="button"
                      className="type-option-box"
                      onClick={() => handleCustomerTypeChange('b2c')}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center' }}>
                        <UserRound size={20} />
                      </div>
                      <strong style={{ fontSize: '13px', marginTop: '4px' }}>B2C (Retail Customer)</strong>
                      <p>Individual homeowners &amp; technicians. Direct contact info, shipping address, optional GSTIN.</p>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#2860c8', marginTop: '4px' }}>Select B2C &rarr;</span>
                    </button>

                    <button
                      type="button"
                      className="type-option-box"
                      onClick={() => handleCustomerTypeChange('b2b')}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dbeafe', color: '#1e40af', display: 'grid', placeItems: 'center' }}>
                        <Building2 size={20} />
                      </div>
                      <strong style={{ fontSize: '13px', marginTop: '4px' }}>B2B (Business / Wholesale)</strong>
                      <p>Commercial workshops, dealers, corporate accounts. GSTIN, PAN, company profile &amp; credit terms.</p>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#2860c8', marginTop: '4px' }}>Select B2B &rarr;</span>
                    </button>
                  </div>
                </div>
              )}

              {/* B2C FORM FIELDS (Reference Screenshots 1 & 2) */}
              {formValues.customer_type === 'b2c' && (
                <>
                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        FIRST NAME <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="First name"
                        value={formValues.first_name}
                        onChange={(e) => handleFieldChange('first_name', e.target.value)}
                        onBlur={() => handleFieldBlur('first_name')}
                        className={getInputClass('first_name')}
                      />
                      {clientErrors.first_name && touchedFields.first_name && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.first_name}</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        LAST NAME <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Last name"
                        value={formValues.last_name}
                        onChange={(e) => handleFieldChange('last_name', e.target.value)}
                        onBlur={() => handleFieldBlur('last_name')}
                        className={getInputClass('last_name')}
                      />
                      {clientErrors.last_name && touchedFields.last_name && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.last_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        EMAIL <span className="req">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="client@email.com"
                        value={formValues.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        onBlur={() => handleFieldBlur('email')}
                        className={getInputClass('email')}
                      />
                      {clientErrors.email && touchedFields.email && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.email}</span>
                      )}
                      {!clientErrors.email && touchedFields.email && formValues.email && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid email</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        PHONE <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        value={formValues.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        onBlur={() => handleFieldBlur('phone')}
                        className={getInputClass('phone')}
                        maxLength={10}
                      />
                      {clientErrors.phone && touchedFields.phone && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.phone}</span>
                      )}
                      {!clientErrors.phone && touchedFields.phone && formValues.phone.length === 10 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid 10-digit mobile</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>ALTERNATIVE PHONE</label>
                      <input
                        type="tel"
                        placeholder="Optional"
                        value={formValues.alternate_phone}
                        onChange={(e) => handleFieldChange('alternate_phone', e.target.value)}
                        onBlur={() => handleFieldBlur('alternate_phone')}
                        className={getInputClass('alternate_phone')}
                        maxLength={10}
                      />
                      {clientErrors.alternate_phone && touchedFields.alternate_phone && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.alternate_phone}</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>DATE OF BIRTH</label>
                      <input
                        type="date"
                        value={formValues.date_of_birth}
                        onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>GENDER</label>
                      <select
                        value={formValues.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>SOURCE</label>
                      <select
                        value={formValues.source}
                        onChange={(e) => handleFieldChange('source', e.target.value)}
                      >
                        <option value="Direct">Direct</option>
                        <option value="Website">Website</option>
                        <option value="Store Walk-in">Store Walk-in</option>
                        <option value="Referral">Referral</option>
                        <option value="Phone Call">Phone Call</option>
                      </select>
                    </div>
                  </div>

                  {/* Street Address */}
                  <div className="mahatta-form-group full-width">
                    <label>
                      STREET ADDRESS <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123 Main Street, Apt 4B"
                      value={formValues.street_address}
                      onChange={(e) => handleFieldChange('street_address', e.target.value)}
                      onBlur={() => handleFieldBlur('street_address')}
                      className={getInputClass('street_address')}
                    />
                    {clientErrors.street_address && touchedFields.street_address && (
                      <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.street_address}</span>
                    )}
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        COUNTRY <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.country}
                        onChange={(e) => handleFieldChange('country', e.target.value)}
                      >
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        STATE <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="State / Region (e.g. Delhi NCR)"
                        value={formValues.state}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        onBlur={() => handleFieldBlur('state')}
                        className={getInputClass('state')}
                      />
                      {clientErrors.state && touchedFields.state && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        CITY <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="City (e.g. New Delhi)"
                        value={formValues.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        onBlur={() => handleFieldBlur('city')}
                        className={getInputClass('city')}
                      />
                      {clientErrors.city && touchedFields.city && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.city}</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        ZIP / POSTAL CODE <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="6-digit PIN"
                        value={formValues.pincode}
                        onChange={(e) => handleFieldChange('pincode', e.target.value)}
                        onBlur={() => handleFieldBlur('pincode')}
                        className={getInputClass('pincode')}
                        maxLength={6}
                      />
                      {clientErrors.pincode && touchedFields.pincode && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.pincode}</span>
                      )}
                      {!clientErrors.pincode && touchedFields.pincode && formValues.pincode.length === 6 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid 6-digit PIN</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>GSTIN (OPTIONAL)</label>
                      <input
                        type="text"
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        value={formValues.gst_number}
                        onChange={(e) => handleFieldChange('gst_number', e.target.value)}
                        onBlur={() => handleFieldBlur('gst_number')}
                        className={getInputClass('gst_number')}
                        maxLength={15}
                      />
                      {clientErrors.gst_number && touchedFields.gst_number && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.gst_number}</span>
                      )}
                      {!clientErrors.gst_number && touchedFields.gst_number && formValues.gst_number.length === 15 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid GSTIN (PAN auto-linked)</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>PAN (OPTIONAL)</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={formValues.pan_number}
                        onChange={(e) => handleFieldChange('pan_number', e.target.value)}
                        onBlur={() => handleFieldBlur('pan_number')}
                        className={getInputClass('pan_number')}
                        maxLength={10}
                      />
                      {clientErrors.pan_number && touchedFields.pan_number && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.pan_number}</span>
                      )}
                      {!clientErrors.pan_number && touchedFields.pan_number && formValues.pan_number.length === 10 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid PAN</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        SEGMENT <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.segment}
                        onChange={(e) => handleFieldChange('segment', e.target.value)}
                      >
                        <option value="Retail">Retail</option>
                        <option value="VIP">VIP</option>
                        <option value="Regular Buyer">Regular Buyer</option>
                        <option value="Technician / Mechanic">Technician / Mechanic</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        STAGE / CLASSIFICATION <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.stage}
                        onChange={(e) => handleFieldChange('stage', e.target.value)}
                      >
                        <option value="New Customer">🆕 New Customer</option>
                        <option value="Old / Existing Customer">🔄 Old / Existing Customer</option>
                        <option value="Active Repeat">Active Repeat</option>
                        <option value="Lead / Prospect">Lead / Prospect</option>
                      </select>
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        PRIMARY MANAGER <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.primary_manager}
                        onChange={(e) => handleFieldChange('primary_manager', e.target.value)}
                      >
                        <option value="Admin Staff">Admin Staff</option>
                        <option value="Store Manager">Store Manager</option>
                        <option value="Accounts Team">Accounts Team</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>PREFERRED LANGUAGE</label>
                      <select
                        value={formValues.preferred_language}
                        onChange={(e) => handleFieldChange('preferred_language', e.target.value)}
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Punjabi">Punjabi</option>
                        <option value="Bengali">Bengali</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* B2B FORM FIELDS (Reference Screenshots 4 & 5) */}
              {formValues.customer_type === 'b2b' && (
                <>
                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        COMPANY NAME <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Acme Corporation"
                        value={formValues.company_name}
                        onChange={(e) => handleFieldChange('company_name', e.target.value)}
                        onBlur={() => handleFieldBlur('company_name')}
                        className={getInputClass('company_name')}
                      />
                      {clientErrors.company_name && touchedFields.company_name && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.company_name}</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>LEGAL / REGISTERED NAME</label>
                      <input
                        type="text"
                        placeholder="Acme Corp LLC"
                        value={formValues.legal_name}
                        onChange={(e) => handleFieldChange('legal_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>TRADE NAME / DBA</label>
                      <input
                        type="text"
                        placeholder="Acme Solutions"
                        value={formValues.trade_name}
                        onChange={(e) => handleFieldChange('trade_name', e.target.value)}
                      />
                    </div>

                    <div className="mahatta-form-group">
                      <label>GSTIN</label>
                      <input
                        type="text"
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        value={formValues.gst_number}
                        onChange={(e) => handleFieldChange('gst_number', e.target.value)}
                        onBlur={() => handleFieldBlur('gst_number')}
                        className={getInputClass('gst_number')}
                        maxLength={15}
                      />
                      {clientErrors.gst_number && touchedFields.gst_number && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.gst_number}</span>
                      )}
                      {!clientErrors.gst_number && touchedFields.gst_number && formValues.gst_number.length === 15 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid GSTIN (Auto-filled PAN below)</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>PAN</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={formValues.pan_number}
                        onChange={(e) => handleFieldChange('pan_number', e.target.value)}
                        onBlur={() => handleFieldBlur('pan_number')}
                        className={getInputClass('pan_number')}
                        maxLength={10}
                      />
                      {clientErrors.pan_number && touchedFields.pan_number && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.pan_number}</span>
                      )}
                      {!clientErrors.pan_number && touchedFields.pan_number && formValues.pan_number.length === 10 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid PAN</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>REGISTRATION NUMBER</label>
                      <input
                        type="text"
                        placeholder="e.g. RC-123156 / CIN"
                        value={formValues.registration_number}
                        onChange={(e) => handleFieldChange('registration_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        INDUSTRY <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.industry}
                        onChange={(e) => handleFieldChange('industry', e.target.value)}
                      >
                        <option value="Appliance Repair & Spares">Appliance Repair &amp; Spares</option>
                        <option value="HVAC / Air Conditioning">HVAC / Air Conditioning</option>
                        <option value="Wholesale Dealer">Wholesale Dealer</option>
                        <option value="Electrical Contractor">Electrical Contractor</option>
                        <option value="Authorized Service Center">Authorized Service Center</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>COMPANY SIZE</label>
                      <select
                        value={formValues.company_size}
                        onChange={(e) => handleFieldChange('company_size', e.target.value)}
                      >
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="200+">200+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>COMPANY TYPE</label>
                      <select
                        value={formValues.company_type}
                        onChange={(e) => handleFieldChange('company_type', e.target.value)}
                      >
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="LLP">LLP</option>
                        <option value="Public Limited">Public Limited</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>WEBSITE</label>
                      <input
                        type="url"
                        placeholder="https://www.acme.com"
                        value={formValues.website}
                        onChange={(e) => handleFieldChange('website', e.target.value)}
                        onBlur={() => handleFieldBlur('website')}
                        className={getInputClass('website')}
                      />
                      {clientErrors.website && touchedFields.website && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.website}</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>ANNUAL REVENUE</label>
                      <select
                        value={formValues.annual_revenue}
                        onChange={(e) => handleFieldChange('annual_revenue', e.target.value)}
                      >
                        <option value="< 10 Lakhs">&lt; 10 Lakhs</option>
                        <option value="10-50 Lakhs">10-50 Lakhs</option>
                        <option value="50 Lakhs - 1 Cr">50 Lakhs - 1 Cr</option>
                        <option value="1 Cr+">1 Cr+</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        CONTACT PERSON / FIRST NAME <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contact person name"
                        value={formValues.first_name}
                        onChange={(e) => handleFieldChange('first_name', e.target.value)}
                        onBlur={() => handleFieldBlur('first_name')}
                        className={getInputClass('first_name')}
                      />
                      {clientErrors.first_name && touchedFields.first_name && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.first_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        PHONE <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        value={formValues.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        onBlur={() => handleFieldBlur('phone')}
                        className={getInputClass('phone')}
                        maxLength={10}
                      />
                      {clientErrors.phone && touchedFields.phone && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.phone}</span>
                      )}
                      {!clientErrors.phone && touchedFields.phone && formValues.phone.length === 10 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid 10-digit mobile</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>JOB TITLE</label>
                      <input
                        type="text"
                        placeholder="Procurement Manager"
                        value={formValues.job_title}
                        onChange={(e) => handleFieldChange('job_title', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mahatta-form-group full-width">
                    <label>
                      STREET ADDRESS <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="456 Commerce Blvd, Suite 200"
                      value={formValues.street_address}
                      onChange={(e) => handleFieldChange('street_address', e.target.value)}
                      onBlur={() => handleFieldBlur('street_address')}
                      className={getInputClass('street_address')}
                    />
                    {clientErrors.street_address && touchedFields.street_address && (
                      <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.street_address}</span>
                    )}
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        COUNTRY <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.country}
                        onChange={(e) => handleFieldChange('country', e.target.value)}
                      >
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        STATE <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="State / Region (e.g. Delhi NCR)"
                        value={formValues.state}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        onBlur={() => handleFieldBlur('state')}
                        className={getInputClass('state')}
                      />
                      {clientErrors.state && touchedFields.state && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        CITY <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={formValues.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        onBlur={() => handleFieldBlur('city')}
                        className={getInputClass('city')}
                      />
                      {clientErrors.city && touchedFields.city && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.city}</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        ZIP / POSTAL CODE <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="6-digit PIN"
                        value={formValues.pincode}
                        onChange={(e) => handleFieldChange('pincode', e.target.value)}
                        onBlur={() => handleFieldBlur('pincode')}
                        className={getInputClass('pincode')}
                        maxLength={6}
                      />
                      {clientErrors.pincode && touchedFields.pincode && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.pincode}</span>
                      )}
                      {!clientErrors.pincode && touchedFields.pincode && formValues.pincode.length === 6 && (
                        <span className="mahatta-field-success"><CircleCheck size={12} /> Valid PIN</span>
                      )}
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>DEPARTMENT</label>
                      <select
                        value={formValues.department}
                        onChange={(e) => handleFieldChange('department', e.target.value)}
                      >
                        <option value="Spares Procurement">Spares Procurement</option>
                        <option value="Service & Repairs">Service &amp; Repairs</option>
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        SEGMENT <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.segment}
                        onChange={(e) => handleFieldChange('segment', e.target.value)}
                      >
                        <option value="Wholesale">Wholesale</option>
                        <option value="Authorized Service Center">Authorized Service Center</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Key Account">Key Account</option>
                      </select>
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>
                        STAGE / CLASSIFICATION <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.stage}
                        onChange={(e) => handleFieldChange('stage', e.target.value)}
                      >
                        <option value="New Customer">🆕 New Customer</option>
                        <option value="Old / Existing Customer">🔄 Old / Existing Customer</option>
                        <option value="Active Partner">Active Partner</option>
                        <option value="Preferred Vendor">Preferred Vendor</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>
                        PRIMARY MANAGER <span className="req">*</span>
                      </label>
                      <select
                        value={formValues.primary_manager}
                        onChange={(e) => handleFieldChange('primary_manager', e.target.value)}
                      >
                        <option value="Admin Staff">Admin Staff</option>
                        <option value="Corporate Sales">Corporate Sales</option>
                        <option value="Accounts Team">Accounts Team</option>
                      </select>
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>SOURCE</label>
                      <select
                        value={formValues.source}
                        onChange={(e) => handleFieldChange('source', e.target.value)}
                      >
                        <option value="Direct">Direct</option>
                        <option value="Website">Website</option>
                        <option value="Trade Exhibition">Trade Exhibition</option>
                        <option value="Referral">Referral</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>CUSTOMER PRIORITY</label>
                      <select
                        value={formValues.customer_priority}
                        onChange={(e) => handleFieldChange('customer_priority', e.target.value)}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>BILLING EMAIL</label>
                      <input
                        type="email"
                        placeholder="billing@acme.com"
                        value={formValues.billing_email}
                        onChange={(e) => handleFieldChange('billing_email', e.target.value)}
                        onBlur={() => handleFieldBlur('billing_email')}
                        className={getInputClass('billing_email')}
                      />
                      {clientErrors.billing_email && touchedFields.billing_email && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.billing_email}</span>
                      )}
                    </div>

                    <div className="mahatta-form-group">
                      <label>PAYMENT TERMS</label>
                      <select
                        value={formValues.payment_terms}
                        onChange={(e) => handleFieldChange('payment_terms', e.target.value)}
                      >
                        <option value="Immediate / Advance">Immediate / Advance</option>
                        <option value="15 Days Credit">15 Days Credit</option>
                        <option value="30 Days Credit">30 Days Credit</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                      </select>
                    </div>
                  </div>

                  <div className="mahatta-form-row">
                    <div className="mahatta-form-group">
                      <label>PREFERRED CURRENCY</label>
                      <select
                        value={formValues.preferred_currency}
                        onChange={(e) => handleFieldChange('preferred_currency', e.target.value)}
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>

                    <div className="mahatta-form-group">
                      <label>CREDIT LIMIT (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000.00"
                        value={formValues.credit_limit}
                        onChange={(e) => handleFieldChange('credit_limit', e.target.value)}
                        onBlur={() => handleFieldBlur('credit_limit')}
                        className={getInputClass('credit_limit')}
                        min={0}
                        step="1000"
                      />
                      {clientErrors.credit_limit && touchedFields.credit_limit && (
                        <span className="mahatta-field-error"><AlertCircle size={12} /> {clientErrors.credit_limit}</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notes - Visible once customer type is selected */}
              {formValues.customer_type && (
                <div className="mahatta-form-group full-width">
                  <label>NOTES</label>
                  <textarea
                    rows={3}
                    placeholder="Any additional notes..."
                    value={formValues.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                  />
                </div>
              )}

              {/* Modal Action Buttons - STRICT THEME BLUE */}
              <div className="mahatta-modal-actions">
                <button type="button" className="mahatta-btn-cancel" onClick={closeDialog}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mahatta-btn-save"
                  disabled={savingCustomer || !formValues.customer_type || Object.keys(clientErrors).length > 0}
                  title={!formValues.customer_type ? 'Please select a Customer Type above' : ''}
                >
                  {savingCustomer ? 'Saving…' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER DETAILS MODAL */}
      {viewingCustomer && (
        <div className="mahatta-modal-backdrop" onClick={() => setViewingCustomer(null)}>
          <div className="mahatta-modal-dialog mahatta-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mahatta-modal-header">
              <div>
                <h2>{viewingCustomer.name}</h2>
                <p className="mahatta-subtitle">
                  {viewingCustomer.customer_code || `MSE${String(viewingCustomer.id).padStart(7, '0')}`} · {viewingCustomer.customer_type?.toUpperCase()}
                </p>
              </div>
              <button type="button" className="mahatta-modal-close" onClick={() => setViewingCustomer(null)} aria-label="Close details">
                <X size={18} />
              </button>
            </div>

            <div className="mahatta-detail-body">
              <div className="mahatta-detail-badges">
                <span className={`mahatta-badge-type badge-${viewingCustomer.customer_type}`}>
                  {viewingCustomer.customer_type?.toUpperCase()}
                </span>
                <span className={`mahatta-badge-stage ${viewingCustomer.classification === 'existing' ? 'stage-old' : 'stage-new'}`}>
                  {viewingCustomer.classification === 'existing' ? '🔄 Old / Existing' : '🆕 New Customer'}
                </span>
                <span className={`status-pill ${viewingCustomer.is_active ? 'status-pill-active' : 'status-pill-inactive'}`}>
                  {viewingCustomer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {viewingCustomer.customer_type === 'b2b' && (
                <div className="mahatta-detail-card">
                  <h4>Business Profile</h4>
                  <div className="mahatta-detail-grid">
                    <div>
                      <span className="label">Company Name</span>
                      <strong>{viewingCustomer.business_name || '-'}</strong>
                    </div>
                    <div>
                      <span className="label">Legal Name</span>
                      <strong>{viewingCustomer.legal_name || '-'}</strong>
                    </div>
                    <div>
                      <span className="label">Industry</span>
                      <strong>{viewingCustomer.industry || '-'}</strong>
                    </div>
                    <div>
                      <span className="label">Company Type</span>
                      <strong>{viewingCustomer.company_type || '-'}</strong>
                    </div>
                    <div>
                      <span className="label">GSTIN</span>
                      <strong>{viewingCustomer.gst_number || '-'}</strong>
                    </div>
                    <div>
                      <span className="label">PAN</span>
                      <strong>{viewingCustomer.pan_number || '-'}</strong>
                    </div>
                    <div>
                      <span className="label">Credit Limit</span>
                      <strong>₹{Number(viewingCustomer.credit_limit || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="label">Payment Terms</span>
                      <strong>{viewingCustomer.payment_terms || '-'}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="mahatta-detail-card">
                <h4>Contact &amp; Personal Info</h4>
                <div className="mahatta-detail-grid">
                  <div>
                    <span className="label">Phone</span>
                    <strong>{viewingCustomer.phone || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Alternative Phone</span>
                    <strong>{viewingCustomer.alternate_phone || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Email</span>
                    <strong>{viewingCustomer.email || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Date of Birth</span>
                    <strong>{viewingCustomer.date_of_birth || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Gender</span>
                    <strong>{viewingCustomer.gender || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Preferred Language</span>
                    <strong>{viewingCustomer.preferred_language || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="mahatta-detail-card">
                <h4>Address &amp; Location</h4>
                <div className="mahatta-detail-grid">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className="label">Street Address</span>
                    <strong>{viewingCustomer.address_line1 || viewingCustomer.street_address || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">City</span>
                    <strong>{viewingCustomer.city || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">State</span>
                    <strong>{viewingCustomer.state || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">PIN Code</span>
                    <strong>{viewingCustomer.pincode || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Country</span>
                    <strong>{viewingCustomer.country || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="mahatta-detail-card">
                <h4>Account Management</h4>
                <div className="mahatta-detail-grid">
                  <div>
                    <span className="label">Primary Manager</span>
                    <strong>{viewingCustomer.primary_manager || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Segment</span>
                    <strong>{viewingCustomer.segment || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Stage</span>
                    <strong>{viewingCustomer.stage || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Source</span>
                    <strong>{viewingCustomer.source || '-'}</strong>
                  </div>
                  <div>
                    <span className="label">Total Orders</span>
                    <strong>{viewingCustomer.orders_count || 0}</strong>
                  </div>
                  <div>
                    <span className="label">Total Spent</span>
                    <strong>₹{Number(viewingCustomer.total_spent || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {viewingCustomer.notes && (
                <div className="mahatta-detail-card">
                  <h4>Notes</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {viewingCustomer.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mahatta-modal-actions">
              {canEditOrDelete && (
                <button
                  type="button"
                  className="mahatta-btn-primary"
                  onClick={() => {
                    setViewingCustomer(null)
                    openEditDialog(viewingCustomer)
                  }}
                >
                  <Pencil size={14} /> Edit Customer
                </button>
              )}
              <button type="button" className="mahatta-btn-cancel" onClick={() => setViewingCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CUSTOMER IMPORT MODAL */}
      {importModalOpen && (
        <div className="mahatta-modal-backdrop" onClick={() => !importing && setImportModalOpen(false)}>
          <div className="mahatta-modal-dialog mahatta-import-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mahatta-modal-header">
              <div>
                <h2>Bulk Customer Import</h2>
                <p className="mahatta-subtitle">Upload Excel (.xlsx, .csv), PDF, or text document with customer records</p>
              </div>
              <button
                type="button"
                className="mahatta-modal-close"
                onClick={() => !importing && setImportModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mahatta-detail-body">
              {/* Template Download Card */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block' }}>Need the format template?</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Download our standard CSV format template with sample B2C &amp; B2B rows.</span>
                </div>
                <button
                  type="button"
                  className="mahatta-btn-secondary"
                  onClick={downloadSampleTemplate}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Download size={13} /> Sample Template
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div
                className={`import-dropzone ${isDragging ? 'drag-active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFileSelected(file)
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".csv,.xlsx,.xls,.txt,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelected(file)
                  }}
                />
                <div className="import-dropzone-icon">
                  <Upload size={22} />
                </div>
                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                  {importFile ? importFile.name : 'Click to select or drag & drop customer file'}
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Supports CSV, Excel (.xlsx, .xls), or PDF documents (Up to 500 records per upload)
                </p>
              </div>

              {/* Validation Summary & Preview */}
              {importPreviewRows.length > 0 && (
                <>
                  <div className="import-stats-grid">
                    <div className="import-stat-box">
                      <span className="label">Total Records</span>
                      <strong>{importPreviewRows.length}</strong>
                    </div>
                    <div className="import-stat-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <span className="label" style={{ color: '#166534' }}>Ready to Import</span>
                      <strong style={{ color: '#15803d' }}>{importPreviewRows.filter((r) => r.isValid).length}</strong>
                    </div>
                    <div className="import-stat-box" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                      <span className="label" style={{ color: '#991b1b' }}>Issues / Skipped</span>
                      <strong style={{ color: '#dc2626' }}>{importPreviewRows.filter((r) => !r.isValid).length}</strong>
                    </div>
                  </div>

                  {importErrors.length > 0 && (
                    <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '12px', marginBottom: '12px' }}>
                      {importErrors.map((err, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={13} /> {err}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        Preview (First {Math.min(5, importPreviewRows.length)} rows)
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {importPreviewRows.filter((r) => r.isValid).length} valid records will be imported
                      </span>
                    </div>

                    <div className="import-preview-table-wrapper">
                      <table className="import-preview-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Name / Company</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>City</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreviewRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} style={{ background: row.isValid ? '#ffffff' : '#fff5f5' }}>
                              <td>
                                <span className={`mahatta-badge-type badge-${row.customer_type}`}>
                                  {row.customer_type.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <strong>{row.name}</strong>
                                {row.business_name && row.business_name !== row.name && (
                                  <div style={{ fontSize: '10px', color: '#64748b' }}>{row.business_name}</div>
                                )}
                              </td>
                              <td>{row.phone || '-'}</td>
                              <td>{row.email || '-'}</td>
                              <td>{row.city || '-'}</td>
                              <td>
                                {row.isValid ? (
                                  <span style={{ color: '#15803d', fontWeight: 600, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <CircleCheck size={11} /> Ready
                                  </span>
                                ) : (
                                  <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <AlertCircle size={11} /> {row.error || 'Invalid'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mahatta-modal-actions">
              <button
                type="button"
                className="mahatta-btn-cancel"
                onClick={() => setImportModalOpen(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mahatta-btn-save"
                onClick={handleConfirmImport}
                disabled={importing || importPreviewRows.filter((r) => r.isValid).length === 0}
              >
                {importing ? 'Importing…' : `Confirm & Import (${importPreviewRows.filter((r) => r.isValid).length} Customers)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
