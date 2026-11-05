import { Ban, Check, CircleCheck, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import TablePageSizeSelect from '../../components/tables/TablePageSizeSelect'
import TablePagination from '../../components/tables/TablePagination'
import { userManagementApi } from '../../lib/api'
import { confirmAction } from '../../lib/confirmAction'
import { formatDate, formatDateTime } from '../../lib/formatDate'

const emptyUserForm = { name: '', email: '', role: '', password: '' }
const privilegedRoles = ['admin', 'super_admin']
const actionLabels = {
  created: 'Created',
  updated: 'Updated',
  role_changed: 'Role changed',
  blocked: 'Blocked',
  unblocked: 'Unblocked',
  deleted: 'Deleted',
}

function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [activity, setActivity] = useState([])
  const [assignments, setAssignments] = useState({})
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [editingUser, setEditingUser] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [savingRoleId, setSavingRoleId] = useState(null)
  const [busyUserId, setBusyUserId] = useState(null)
  const [error, setError] = useState('')
  const isSuperAdmin = currentUser.role === 'super_admin'

  useEffect(() => {
    let active = true

    async function loadUsers() {
      try {
        const payload = await userManagementApi.getUsers()
        if (!active) return
        setUsers(payload.users)
        setRoles(payload.roles)
        setActivity(payload.activity ?? [])
        setAssignments(Object.fromEntries(payload.users.map((user) => [user.id, user.role])))
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUsers()
    return () => { active = false }
  }, [])

  function rememberActivity(entry) {
    if (!entry) return
    setActivity((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 50))
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingUser(null)
    setUserForm(emptyUserForm)
    setError('')
  }

  function startCreateUser() {
    setEditingUser(null)
    setUserForm({ ...emptyUserForm, role: roles.find((role) => role.slug === 'customer')?.slug ?? roles[0]?.slug ?? '' })
    setError('')
    setDialogOpen(true)
  }

  async function startEditUser(user) {
    const confirmation = await confirmAction({
      title: 'Edit user account?',
      text: `You can update ${user.name}'s profile and role assignment.`,
      confirmButtonText: 'Continue to edit',
    })
    if (!confirmation.isConfirmed) return

    setEditingUser(user)
    setUserForm({ name: user.name, email: user.email, role: user.role, password: '' })
    setError('')
    setDialogOpen(true)
  }

  async function saveUser(event) {
    event.preventDefault()
    setSavingUser(true)
    setError('')

    try {
      const payload = { name: userForm.name, email: userForm.email, role: userForm.role }
      if (userForm.password) payload.password = userForm.password

      const response = editingUser
        ? await userManagementApi.updateUser(editingUser.id, payload)
        : await userManagementApi.createUser(payload)
      const savedUser = response.user

      setUsers((current) => editingUser
        ? current.map((user) => user.id === editingUser.id ? savedUser : user)
        : [...current, savedUser].sort((first, second) => first.name.localeCompare(second.name)))
      setAssignments((current) => ({ ...current, [savedUser.id]: savedUser.role }))
      rememberActivity(response.activity)
      closeDialog()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingUser(false)
    }
  }

  async function saveAssignedRole(user) {
    const role = assignments[user.id] ?? user.role
    if (role === user.role) return

    setSavingRoleId(user.id)
    setError('')

    try {
      const response = await userManagementApi.assignRole(user.id, role)
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item))
      setAssignments((current) => ({ ...current, [user.id]: response.user.role }))
      rememberActivity(response.activity)
    } catch (saveError) {
      setError(saveError.message)
      setAssignments((current) => ({ ...current, [user.id]: user.role }))
    } finally {
      setSavingRoleId(null)
    }
  }

  async function toggleUserStatus(user) {
    const nextStatus = !user.is_active
    const confirmation = await confirmAction({
      title: `${nextStatus ? 'Unblock' : 'Block'} ${user.name}?`,
      text: nextStatus
        ? 'This account will be able to sign in again.'
        : 'This account will lose access until it is unblocked.',
      confirmButtonText: nextStatus ? 'Unblock account' : 'Block account',
      destructive: !nextStatus,
    })
    if (!confirmation.isConfirmed) return

    setBusyUserId(user.id)
    setError('')

    try {
      const response = await userManagementApi.setUserStatus(user.id, nextStatus)
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item))
      rememberActivity(response.activity)
    } catch (statusError) {
      setError(statusError.message)
    } finally {
      setBusyUserId(null)
    }
  }

  async function deleteUser(user) {
    const confirmation = await confirmAction({
      title: `Delete ${user.name}'s account?`,
      text: 'This permanently removes the account and cannot be undone.',
      confirmButtonText: 'Delete account',
      destructive: true,
    })
    if (!confirmation.isConfirmed) return

    setBusyUserId(user.id)
    setError('')

    try {
      const response = await userManagementApi.deleteUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      rememberActivity(response.activity)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusyUserId(null)
    }
  }

  const filteredUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const availableRoles = roles.filter((role) => isSuperAdmin || !privilegedRoles.includes(role.slug) || role.slug === editingUser?.role)
  const roleCounts = users.reduce((counts, user) => {
    counts[user.role] = (counts[user.role] ?? 0) + 1
    return counts
  }, {})

  return (
    <div className="role-management">
      {error && !dialogOpen && <p className="role-feedback role-feedback-error" role="alert">{error}</p>}

      <div className="role-access-intro">
        <span className="role-access-mark"><UserRound size={19} aria-hidden="true" /></span>
        <div className="role-access-intro-copy">
          <span>ACCOUNT MANAGEMENT</span>
          <strong>Users &amp; access</strong>
        </div>
        <span className="role-access-intro-count">{users.length} accounts</span>
      </div>

      <div className="role-share-list" aria-label="Accounts in each role">
        {roles.map((role) => (
          <span className="role-custom-tag" key={role.slug}>{role.name} · {roleCounts[role.slug] ?? 0}</span>
        ))}
      </div>

      <section className="panel role-table-panel user-access-panel">
        <div className="role-table-toolbar">
          <div className="role-table-heading">
            <UserRound size={17} aria-hidden="true" />
            <div>
              <h2>User accounts</h2>
              <p>Create, update, block, or remove accounts.</p>
            </div>
          </div>
          <div className="role-table-actions">
            <TablePageSizeSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1) }} />
            <label className="user-search-wrap">
              <Search size={14} aria-hidden="true" />
              <input aria-label="Search users" className="user-search" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search people" type="search" value={search} />
            </label>
            <button className="role-primary-button" onClick={startCreateUser} type="button"><Plus size={15} aria-hidden="true" /> Create user</button>
          </div>
        </div>
        {loading ? <p className="role-empty">Loading users…</p> : filteredUsers.length === 0 ? (
          <p className="role-empty">No matching users.</p>
        ) : (
          <div className="role-table-scroll">
            <table className="role-table user-role-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created by</th>
                  <th scope="col">Created date</th>
                  <th scope="col">Last changed by</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const selectedRole = assignments[user.id] ?? user.role
                  const protectedUser = !isSuperAdmin && privilegedRoles.includes(user.role)
                  const protectedRole = !isSuperAdmin && privilegedRoles.includes(selectedRole)
                  const isSelf = user.id === currentUser.id
                  const rowBusy = busyUserId === user.id

                  return (
                    <tr key={user.id}>
                      <th scope="row">
                        <span className="role-table-name">{user.name}</span>
                        <span className="role-table-slug">{user.email}</span>
                      </th>
                      <td>
                        <div className="user-role-editor">
                          <select
                            aria-label={`Role for ${user.name}`}
                            className="role-table-select"
                            disabled={isSelf || protectedUser}
                            onChange={(event) => setAssignments((current) => ({ ...current, [user.id]: event.target.value }))}
                            value={selectedRole}
                          >
                            {roles.filter((role) => isSuperAdmin || !privilegedRoles.includes(role.slug) || role.slug === user.role).map((role) => (
                              <option key={role.slug} value={role.slug}>{role.name}</option>
                            ))}
                          </select>
                          <button aria-label={`Save role for ${user.name}`} className="role-icon-button" disabled={selectedRole === user.role || savingRoleId === user.id || isSelf || protectedUser || protectedRole} onClick={() => saveAssignedRole(user)} title="Save role" type="button"><Check size={14} aria-hidden="true" /></button>
                        </div>
                      </td>
                      <td><span className={`user-status-tag${user.is_active ? ' user-status-active' : ' user-status-blocked'}`}>{user.is_active ? 'Active' : 'Blocked'}</span></td>
                      <td>{user.created_by ?? 'Self registration'}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <span className="role-table-name">{user.last_changed_by ?? '—'}</span>
                        <span className="role-table-slug">{user.last_changed_at ? formatDateTime(user.last_changed_at) : 'No later changes'}</span>
                      </td>
                      <td>
                        <div className="role-row-actions">
                          <button aria-label={`Edit ${user.name}`} className="role-icon-button" disabled={rowBusy || protectedUser} onClick={() => startEditUser(user)} title="Edit user" type="button"><Pencil size={14} aria-hidden="true" /></button>
                          <button aria-label={`${user.is_active ? 'Block' : 'Unblock'} ${user.name}`} className="role-icon-button" disabled={rowBusy || isSelf || protectedUser} onClick={() => toggleUserStatus(user)} title={user.is_active ? 'Block user' : 'Unblock user'} type="button">
                            {user.is_active ? <Ban size={14} aria-hidden="true" /> : <CircleCheck size={14} aria-hidden="true" />}
                          </button>
                          <button aria-label={`Delete ${user.name}`} className="role-icon-button role-delete-button" disabled={rowBusy || isSelf || protectedUser} onClick={() => deleteUser(user)} title="Delete user" type="button"><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredUsers.length > 0 && <TablePagination page={currentPage} pageSize={pageSize} total={filteredUsers.length} onPageChange={setPage} />}
      </section>

      <section className="panel role-table-panel">
        <div className="role-table-toolbar">
          <div className="role-table-heading">
            <UserRound size={17} aria-hidden="true" />
            <div>
              <h2>Activity history</h2>
              <p>Every account change stays recorded with the person who made it.</p>
            </div>
          </div>
        </div>
        {loading ? <p className="role-empty">Loading activity…</p> : activity.length === 0 ? (
          <p className="role-empty">No account changes recorded yet.</p>
        ) : (
          <div className="role-table-scroll">
            <table className="role-table user-activity-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Performed by</th>
                  <th scope="col">Action</th>
                  <th scope="col">Account</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <th scope="row">
                      <span className="role-table-name">{entry.actor_name}</span>
                      <span className="role-table-slug">{entry.actor_role}</span>
                    </th>
                    <td>{actionLabels[entry.action] ?? entry.action}</td>
                    <td>
                      <span className="role-table-name">{entry.subject_name}</span>
                      <span className="role-table-slug">{entry.subject_email}</span>
                    </td>
                    <td>{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialogOpen && (
        <div className="role-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
          <section aria-labelledby="user-dialog-title" aria-modal="true" className="role-dialog" onKeyDown={(event) => { if (event.key === 'Escape') closeDialog() }} role="dialog" tabIndex={-1}>
            <div className="role-dialog-heading">
              <span className="role-heading-icon role-heading-icon-green"><UserRound size={16} aria-hidden="true" /></span>
              <div className="role-heading-copy">
                <h2 id="user-dialog-title">{editingUser ? 'Edit user' : 'Create user'}</h2>
                <p>{editingUser ? 'Update account details and role.' : 'Create an account and choose its role.'}</p>
              </div>
              <button aria-label="Close dialog" className="role-icon-button" onClick={closeDialog} type="button"><X size={16} aria-hidden="true" /></button>
            </div>
            {error && <p className="role-feedback role-feedback-error" role="alert">{error}</p>}
            <form className="role-form" onSubmit={saveUser}>
              <label className="role-field">
                <span>Full name</span>
                <input autoFocus maxLength={255} minLength={2} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} required value={userForm.name} />
              </label>
              <label className="role-field">
                <span>Email address</span>
                <input autoComplete="email" maxLength={255} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} required type="email" value={userForm.email} />
              </label>
              <label className="role-field">
                <span>Role</span>
                <select disabled={editingUser?.id === currentUser.id} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))} required value={userForm.role}>
                  {availableRoles.map((role) => <option key={role.slug} value={role.slug}>{role.name}</option>)}
                </select>
              </label>
              <label className="role-field">
                <span>{editingUser ? 'New password (optional)' : 'Temporary password'}</span>
                <input autoComplete="new-password" minLength={8} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} required={!editingUser} type="password" value={userForm.password} />
              </label>
              <div className="role-form-actions">
                <button className="role-primary-button" disabled={savingUser} type="submit">
                  {savingUser ? 'Saving…' : editingUser ? 'Save changes' : 'Create user'}
                </button>
                <button className="quiet-button" onClick={closeDialog} type="button">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default UserManagement