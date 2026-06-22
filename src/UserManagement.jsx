import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { apiUrl, csrfHeaders } from './apiBase'
import FormList from './FormList'
import PasswordInput from './PasswordInput'

function UserManagement({ showToast, showConfirm, onViewForm, onEditForm, onViewResponses, isSuperAdmin = false, currentUser = '' }) {

  // ── User list state ────────────────────────────────────────────────────────
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)

  // ── Drill-down state ───────────────────────────────────────────────────────
  const [viewingUser, setViewingUser] = useState(null) // { id, username }

  // ── Add user form state ────────────────────────────────────────────────────
  const [newUsername, setNewUsername]   = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [newRole, setNewRole]           = useState('user')
  const [addingUser, setAddingUser]     = useState(false)

  // ── Change password modal state ────────────────────────────────────────────
  const [pwModal, setPwModal]       = useState(null) // { id, username }
  const [newPw, setNewPw]           = useState('')
  const [savingPw, setSavingPw]     = useState(false)
  const [pinModal, setPinModal]     = useState(null) // { id, username }
  const [pinInput, setPinInput]     = useState('')
  const [pinError, setPinError]     = useState('')
  const location = useLocation()

  // Restore the drill-down user if we navigated back here from FormViewer
  // (FormViewer sets location.state.viewingUser when its Back is clicked)
  useEffect(() => {
    const returning = location.state?.viewingUser
    if (returning) {
      setViewingUser(returning)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res    = await fetch(apiUrl('/get_users.php'), { credentials: 'include' })
      const result = await res.json()
      if (result.success) setUsers(result.users)
      else showToast(result.error || 'Failed to load users.', 'error')
    } catch {
      showToast('Could not connect to server.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast('Username and password are required.', 'warning')
      return
    }
    setAddingUser(true)
    try {
      const res    = await fetch(apiUrl('/create_user_api.php'), {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      })
      const result = await res.json()
      if (result.success) {
        showToast('User created.', 'success')
        setNewUsername('')
        setNewPassword('')
        setNewRole('user')
        fetchUsers()
      } else {
        showToast(result.error || 'Failed to create user.', 'error')
      }
    } catch {
      showToast('Could not connect to server.', 'error')
    } finally {
      setAddingUser(false)
    }
  }

  function handleDeleteUser(user) {
    if (user.username === currentUser) {
      showToast('You cannot delete your own account.', 'warning')
      return
    }

    const roleLabel = user.role === 'super_admin' ? 'Super Admin' : 'user'
    showConfirm(
      `Delete ${roleLabel} "${user.username}"? Their forms will remain in the database unassigned.`,
      async () => {
        try {
          const res    = await fetch(apiUrl('/delete_user.php'), {
            method: 'POST',
            credentials: 'include',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ user_id: user.id }),
          })
          const result = await res.json()
          if (result.success) {
            showToast(`"${user.username}" deleted.`, 'success')
            fetchUsers()
          } else {
            showToast(result.error || 'Delete failed.', 'error')
          }
        } catch {
          showToast('Could not connect to server.', 'error')
        }
      }
    )
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!newPw.trim()) return
    setSavingPw(true)
    try {
      const res    = await fetch(apiUrl('/change_password.php'), {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ user_id: pwModal.id, new_password: newPw }),
      })
      const result = await res.json()
      if (result.success) {
        showToast(`Password updated for "${pwModal.username}".`, 'success')
        setPwModal(null)
        setNewPw('')
      } else {
        showToast(result.error || 'Failed to update password.', 'error')
      }
    } catch {
      showToast('Could not connect to server.', 'error')
    } finally {
      setSavingPw(false)
    }
  }

  function handlePasswordAction(user) {
    if (user.role === 'super_admin') {
      setPinModal({ id: user.id, username: user.username })
      setPinInput('')
      setPinError('')
      return
    }

    setPwModal({ id: user.id, username: user.username })
    setNewPw('')
  }

  function handlePinSubmit(e) {
    e.preventDefault()
    if (pinInput !== '0000') {
      setPinError('Incorrect PIN. Please enter the correct Super Admin PIN.')
      return
    }
    setPwModal({ id: pinModal.id, username: pinModal.username })
    setNewPw('')
    setPinModal(null)
    setPinInput('')
  }

  // ── Drill-down: view a user's forms ───────────────────────────────────────
  if (viewingUser) {
    return (
      <div className="um-shell">
        <div className="um-breadcrumb">
          <button className="um-back-btn" onClick={() => setViewingUser(null)}>
            ← Users
          </button>
          <span className="um-breadcrumb-sep">/</span>
          <span className="um-breadcrumb-name">{viewingUser.username}</span>
        </div>
        <FormList
          scopedUserId={viewingUser.id}
          showToast={showToast}
          showConfirm={showConfirm}
          // Already correct — passes viewingUser context so FormViewer
          // can navigate back here
          onViewForm={(formId) => onViewForm(formId, viewingUser.id, viewingUser.username)}
          onEditForm={onEditForm}
          // FIX: wrap to pass viewingUser alongside formId.
          // AdminLayout.handleViewResponses(formId, fromUser) uses this
          // second argument to attach route state, so ResponseList's Back
          // button knows to return to /users instead of /.
          onViewResponses={(formId) => onViewResponses(formId, viewingUser)}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    )
  }

  // ── Main user management view ──────────────────────────────────────────────
  return (
    <div className="um-shell">
      <h2 className="um-heading">User Management</h2>

      {/* ── Add user form ──────────────────────────────────────────────────── */}
      <div className="um-card">
        <h3 className="um-card-title">Add New User</h3>
        <form className="um-add-form" onSubmit={handleAddUser}>
          <input
            className="um-input"
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            autoComplete="off"
          />
          <PasswordInput
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Password (min 12 chars)"
            autoComplete="new-password"
            className="um-input"
          />
          <select
            className="um-select"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
          >
            <option value="user">User</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button
            type="submit"
            disabled={addingUser}
            className={`um-add-btn${addingUser ? ' um-add-btn--disabled' : ''}`}
          >
            {addingUser ? 'Adding…' : '+ Add User'}
          </button>
        </form>
      </div>

      {/* ── User table ────────────────────────────────────────────────────── */}
      <div className="um-card">
        <h3 className="um-card-title">All Accounts</h3>
        {loading ? (
          <p className="um-meta">Loading…</p>
        ) : users.length === 0 ? (
          <p className="um-meta">No users found.</p>
        ) : (
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Forms</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="um-td-username">{user.username}</td>
                    <td>
                      <span className={`um-role-badge um-role-badge--${user.role}`}>
                        {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                      </span>
                    </td>
                    <td className="um-td-center">{user.form_count}</td>
                    <td className="um-td-date">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="um-actions">
                        {user.role !== 'super_admin' && (
                          <button
                            className="um-action-btn um-action-btn--view"
                            onClick={() => setViewingUser({ id: user.id, username: user.username })}
                          >
                            View Forms
                          </button>
                        )}
                        <button
                          className="um-action-btn um-action-btn--pw"
                          onClick={() => handlePasswordAction(user)}
                        >
                          Change Password
                        </button>
                        {user.username !== currentUser && (
                          <button
                            className="um-action-btn um-action-btn--delete"
                            onClick={() => handleDeleteUser(user)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Change password modal ──────────────────────────────────────────── */}
      {pwModal && (
        <div className="um-modal-overlay" onClick={() => setPwModal(null)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <h3 className="um-modal-title">Change Password</h3>
            <p className="um-modal-sub">Setting new password for <strong>{pwModal.username}</strong></p>
            <form onSubmit={handleChangePassword}>
              <PasswordInput
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password (min 12 chars)"
                autoFocus
                autoComplete="new-password"
                className="um-input"
              />
              <div className="um-modal-actions">
                <button
                  type="submit"
                  disabled={savingPw || newPw.length < 12}
                  className={`um-add-btn${savingPw || newPw.length < 12 ? ' um-add-btn--disabled' : ''}`}
                >
                  {savingPw ? 'Saving…' : 'Save Password'}
                </button>
                <button
                  type="button"
                  className="um-cancel-btn"
                  onClick={() => setPwModal(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Super Admin PIN modal ──────────────────────────────────────────── */}
      {pinModal && (
        <div className="um-modal-overlay" onClick={() => setPinModal(null)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <h3 className="um-modal-title">Protected Super Admin Account</h3>
            <p className="um-modal-sub">
              This is a protected Super Admin account. <br /> Enter the Super Admin PIN to confirm the request.
            </p>
            <form onSubmit={handlePinSubmit}>
              <input
                className="um-input"
                type="password"
                placeholder="Enter Super Admin PIN"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value)
                  setPinError('')
                }}
                autoFocus
                autoComplete="one-time-code"
              />
              {pinError && <p className="um-modal-error">{pinError}</p>}
              <div className="um-modal-actions">
                <button
                  type="submit"
                  className="um-add-btn"
                >
                  Confirm PIN
                </button>
                <button
                  type="button"
                  className="um-cancel-btn"
                  onClick={() => setPinModal(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
