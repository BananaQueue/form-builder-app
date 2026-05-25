import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from './apiBase'
import FormList from './FormList'

function UserManagement({ showToast, showConfirm }) {
  const navigate = useNavigate()

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
        headers: { 'Content-Type': 'application/json' },
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
    showConfirm(
      `Delete "${user.username}"? Their forms will remain in the database unassigned.`,
      async () => {
        try {
          const res    = await fetch(apiUrl('/delete_user.php'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
          onViewForm={formId => { /* read-only drill-down; navigate if needed */ }}
          onEditForm={() => {}}
          onViewResponses={() => {}}
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
          <input
            className="um-input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
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
                        <button
                          className="um-action-btn um-action-btn--view"
                          onClick={() => setViewingUser({ id: user.id, username: user.username })}
                        >
                          View Forms
                        </button>
                        <button
                          className="um-action-btn um-action-btn--pw"
                          onClick={() => { setPwModal({ id: user.id, username: user.username }); setNewPw('') }}
                        >
                          Change Password
                        </button>
                        <button
                          className="um-action-btn um-action-btn--delete"
                          onClick={() => handleDeleteUser(user)}
                        >
                          Delete
                        </button>
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
              <input
                className="um-input"
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                autoFocus
                autoComplete="new-password"
              />
              <div className="um-modal-actions">
                <button
                  type="submit"
                  disabled={savingPw || newPw.length < 6}
                  className={`um-add-btn${savingPw || newPw.length < 6 ? ' um-add-btn--disabled' : ''}`}
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
    </div>
  )
}

export default UserManagement
