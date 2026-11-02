export const navigation = [
  { section: 'WORKSPACE', items: ['Overview', 'Orders', 'Products', 'Inventory', 'Customers'] },
  { section: 'MANAGEMENT', items: ['Roles', 'Users', 'Reports', 'Settings'] },
]

export const pagePermissions = {
  Overview: 'overview.view',
  Orders: 'orders.view',
  Products: 'products.view',
  Inventory: 'inventory.view',
  Customers: 'customers.view',
  Reports: 'reports.view',
  Settings: 'settings.view',
}

export const metrics = [
  { label: 'Total sales', value: '—', note: 'Waiting for store data' },
  { label: 'Orders', value: '—', note: 'Waiting for store data' },
  { label: 'Products', value: '—', note: 'Waiting for catalogue data' },
  { label: 'Low stock items', value: '—', note: 'Waiting for inventory data' },
]
