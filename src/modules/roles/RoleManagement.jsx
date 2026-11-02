import { useEffect, useState } from 'react'
import { Check, KeyRound, LockKeyhole, Pencil, Plus, Search, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react'
import { roleManagementApi } from '../../lib/api'
import { confirmAction } from '../../lib/confirmAction'
import { formatDate } from '../../lib/formatDate'
import TablePageSizeSelect from '../../components/tables/TablePageSizeSelect'
import TablePagination from '../../components/tables/TablePagination'

const emptyRoleForm = { name: '', permissions: ['overview.view'] }

function RoleManagement() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [roleForm, setRoleForm] = useState(emptyRoleForm)
  const [editingSlug, setEditingSlug] = useState(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [savingRole, setSavingRole] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadRoles() {
      try {
        const payload = await roleManagementApi.getRoles()
        if (!active) return
        setRoles(payload.roles)
        setPermissions(payload.permissions)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRoles()
    return () => { active = false }
  }, [])

  function closeRoleDialog() {
    setRoleForm(emptyRoleForm)
    setEditingSlug(null)
    setRoleDialogOpen(false)
    setError('')
  }

  function createRole() {
    setRoleForm(emptyRoleForm)
    setEditingSlug(null)
    setError('')
    setRoleDialogOpen(true)
  }

  async function editRole(role) {
    const confirmation = await confirmAction({
      title: 'Edit role access?',
      text: `Changes to ${role.name} will affect every account assigned to this role.`,
      confirmButtonText: 'Edit',
    })
    if (!confirmation.isConfirmed) return

    setRoleForm({ name: role.name, permissions: role.permissions })
    setEditingSlug(role.slug)
    setError('')
    setRoleDialogOpen(true)
  }

  function togglePermission(permission) {
    if (permission.required) return

    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission.key)
        ? current.permissions.filter((key) => key !== permission.key)
        : [...current.permissions, permission.key],
    }))
  }

  async function saveRole(event) {
    event.preventDefault()
    setSavingRole(true)
    setError('')

    try {
      const payload = { name: roleForm.name, permissions: roleForm.permissions }
      const response = editingSlug
        ? await roleManagementApi.updateRole(editingSlug, payload)
        : await roleManagementApi.createRole(payload)

      setRoles((current) => editingSlug
        ? current.map((role) => role.slug === editingSlug ? { ...role, ...response.role } : role)
        : [...current, { ...response.role, users_count: 0 }].sort((first, second) => first.name.localeCompare(second.name)))
      closeRoleDialog()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingRole(false)
    }
  }

  async function deleteRole(role) {
    if (role.users_count > 0) {
      await confirmAction({
        title: 'Role is in use',
        text: `Reassign the ${role.users_count} accounts using ${role.name} before deleting it.`,
        confirmButtonText: 'Got it',
        showCancelButton: false,
      })
      return
    }
    const confirmation = await confirmAction({
      title: `Delete ${role.name}?`,
      text: 'This action cannot be undone.',
      confirmButtonText: 'Delete role',
      destructive: true,
    })
    if (!confirmation.isConfirmed) return

    setDeletingSlug(role.slug)
    setError('')

    try {
      await roleManagementApi.deleteRole(role.slug)
      setRoles((current) => current.filter((item) => item.slug !== role.slug))
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeletingSlug(null)
    }
  }

  const filteredRoles = roles.filter((role) => `${role.name} ${role.slug}`.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleRoles = filteredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="role-management">
      {error && !roleDialogOpen && <p className="role-feedback role-feedback-error" role="alert">{error}</p>}

      <div className="role-access-intro">
        <span className="role-access-mark"><ShieldCheck size={19} aria-hidden="true" /></span>
        <div className="role-access-intro-copy">
          <span>ACCESS CONTROL</span>
          <strong>Roles &amp; permissions</strong>
        </div>
        <span className="role-access-intro-count">{roles.length} roles</span>
      </div>

      <section className="panel role-table-panel">
        <div className="role-table-toolbar">
          <div className="role-table-heading">
            <UsersRound size={17} aria-hidden="true" />
            <div>
              <h2>Roles</h2>
              <p>Manage role access across the admin workspace.</p>
            </div>
          </div>
          <div className="role-table-actions">
            <TablePageSizeSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1) }} />
            <label className="user-search-wrap">
              <Search size={14} aria-hidden="true" />
              <input aria-label="Search roles" className="user-search" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search roles" type="search" value={search} />
            </label>
            <button className="role-primary-button" onClick={createRole} type="button"><Plus size={15} aria-hidden="true" /> Create role</button>
          </div>
        </div>
        {loading ? <p className="role-empty">Loading roles…</p> : filteredRoles.length === 0 ? (
          <p className="role-empty">No matching roles.</p>
        ) : (
          <div className="role-table-scroll">
            <table className="role-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Module access</th>
                  <th scope="col">Users</th>
                  <th scope="col">Type</th>
                  <th scope="col">Created by</th>
                  <th scope="col">Created date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoles.map((role) => (
                  <tr key={role.slug}>
                    <th scope="row">
                      <span className="role-table-name">{role.name}</span>
                      <span className="role-table-slug">{role.slug}</span>
                    </th>
                    <td>
                      <div className="role-access-summary">
                        <strong>{role.permissions.length} modules</strong>
                        <span>{role.permissions.slice(0, 3).map((key) => permissions.find((item) => item.key === key)?.label ?? key).join(', ')}{role.permissions.length > 3 ? ` +${role.permissions.length - 3}` : ''}</span>
                      </div>
                    </td>
                    <td>{role.users_count}</td>
                    <td>{role.is_system ? <span className="role-system-tag"><LockKeyhole size={11} aria-hidden="true" /> System</span> : <span className="role-custom-tag">Custom</span>}</td>
                    <td>{role.created_by ?? 'System'}</td>
                    <td>{formatDate(role.created_at)}</td>
                    <td>
                      <div className="role-row-actions">
                        <button aria-label={`Edit ${role.name}`} className="role-icon-button" onClick={() => editRole(role)} title="Edit role" type="button"><Pencil size={14} aria-hidden="true" /></button>
                        <button aria-label={`Delete ${role.name}`} className="role-icon-button role-delete-button" disabled={deletingSlug === role.slug} onClick={() => deleteRole(role)} title="Delete role" type="button">
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredRoles.length > 0 && <TablePagination page={currentPage} pageSize={pageSize} total={filteredRoles.length} onPageChange={setPage} />}
      </section>

      {roleDialogOpen && (
        <div className="role-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRoleDialog() }}>
          <section aria-labelledby="role-dialog-title" aria-modal="true" className="role-dialog" onKeyDown={(event) => { if (event.key === 'Escape') closeRoleDialog() }} role="dialog" tabIndex={-1}>
            <div className="role-dialog-heading">
              <span className="role-heading-icon role-heading-icon-blue"><ShieldCheck size={17} aria-hidden="true" /></span>
              <div>
                <h2 id="role-dialog-title">{editingSlug ? 'Edit role' : 'Create role'}</h2>
                <p>Set a name and choose the modules this role can access.</p>
              </div>
              <button aria-label="Close dialog" className="role-icon-button" onClick={closeRoleDialog} type="button"><X size={15} aria-hidden="true" /></button>
            </div>
            {error && <p className="role-feedback role-feedback-error" role="alert">{error}</p>}
            <form className="role-form" onSubmit={saveRole}>
              <label className="role-field">
                <span>Role name</span>
                <input autoFocus maxLength={80} minLength={2} onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))} required value={roleForm.name} />
              </label>
              <fieldset className="permission-fieldset">
                <legend><KeyRound size={13} aria-hidden="true" /> Module access</legend>
                <div className="permission-grid">
                  {permissions.map((permission) => (
                    <label className="permission-option" key={permission.key}>
                      <input checked={roleForm.permissions.includes(permission.key)} disabled={permission.required} onChange={() => togglePermission(permission)} type="checkbox" />
                      <span>{permission.label}</span>
                      {permission.required && <small><LockKeyhole size={11} aria-hidden="true" /> Required</small>}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="role-form-actions">
                <button className="role-primary-button" disabled={savingRole} type="submit">
                  {editingSlug ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  {savingRole ? 'Saving…' : editingSlug ? 'Save role' : 'Create role'}
                </button>
                <button className="quiet-button" onClick={closeRoleDialog} type="button">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default RoleManagement