import { useEffect, useState } from 'react'
import { Check, LockKeyhole, Pencil, Plus, Search, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { canManageRoles } from '../../lib/adminConfig'
import { roleManagementApi } from '../../lib/api'
import { confirmAction } from '../../lib/confirmAction'
import { formatDate } from '../../lib/formatDate'
import TablePageSizeSelect from '../../components/tables/TablePageSizeSelect'
import TablePagination from '../../components/tables/TablePagination'

function RoleManagement() {
  const { user } = useAuth()
  const canCreateRoles = canManageRoles(user)
  const [roles, setRoles] = useState([])
  const [roleName, setRoleName] = useState('')
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
    setRoleName('')
    setEditingSlug(null)
    setRoleDialogOpen(false)
    setError('')
  }

  function createRole() {
    if (!canCreateRoles) return
    setRoleName('')
    setEditingSlug(null)
    setError('')
    setRoleDialogOpen(true)
  }

  async function editRole(role) {
    const confirmation = await confirmAction({
      title: 'Edit this role?',
      text: `Changes to ${role.name} will affect every account assigned to this role.`,
      confirmButtonText: 'Edit',
    })
    if (!confirmation.isConfirmed) return

    setRoleName(role.name)
    setEditingSlug(role.slug)
    setError('')
    setRoleDialogOpen(true)
  }

  async function saveRole(event) {
    event.preventDefault()
    setSavingRole(true)
    setError('')

    try {
      const payload = { name: roleName }
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
          <strong>Roles</strong>
        </div>
        <span className="role-access-intro-count">{roles.length} roles</span>
      </div>

      <section className="panel role-table-panel">
        <div className="role-table-toolbar">
          <div className="role-table-heading">
            <UsersRound size={17} aria-hidden="true" />
            <div>
              <h2>Roles</h2>
              <p>Create and manage staff roles for the admin workspace.</p>
            </div>
          </div>
          <div className="role-table-actions">
            <TablePageSizeSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1) }} />
            <label className="user-search-wrap">
              <Search size={14} aria-hidden="true" />
              <input aria-label="Search roles" className="user-search" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search roles" type="search" value={search} />
            </label>
            {canCreateRoles && <button className="role-primary-button" onClick={createRole} type="button"><Plus size={15} aria-hidden="true" /> Create role</button>}
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
                    <td>{role.users_count}</td>
                    <td>{role.is_system ? <span className="role-system-tag"><LockKeyhole size={11} aria-hidden="true" /> System</span> : <span className="role-custom-tag">Custom</span>}</td>
                    <td>{role.created_by ?? 'System'}</td>
                    <td>{formatDate(role.created_at)}</td>
                    <td>
                      {canCreateRoles && (
                        <div className="role-row-actions">
                          <button aria-label={`Edit ${role.name}`} className="role-icon-button" onClick={() => editRole(role)} title="Edit role" type="button"><Pencil size={14} aria-hidden="true" /></button>
                          <button aria-label={`Delete ${role.name}`} className="role-icon-button role-delete-button" disabled={deletingSlug === role.slug} onClick={() => deleteRole(role)} title="Delete role" type="button">
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      )}
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
              <span className="role-heading-icon role-heading-icon-blue"><ShieldCheck size={16} aria-hidden="true" /></span>
              <div className="role-heading-copy">
                <h2 id="role-dialog-title">{editingSlug ? 'Edit role' : 'Create role'}</h2>
                <p>{editingSlug ? 'Update the role name.' : 'Enter a name for this role.'}</p>
              </div>
              <button aria-label="Close dialog" className="role-icon-button" onClick={closeRoleDialog} type="button"><X size={16} aria-hidden="true" /></button>
            </div>
            {error && <p className="role-feedback role-feedback-error" role="alert">{error}</p>}
            <form className="role-form" onSubmit={saveRole}>
              <label className="role-field">
                <span>Role name</span>
                <input autoFocus maxLength={80} minLength={2} onChange={(event) => setRoleName(event.target.value)} required value={roleName} />
              </label>
              <div className="role-form-actions">
                <button className="role-primary-button" disabled={savingRole} type="submit">
                  {editingSlug ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
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
