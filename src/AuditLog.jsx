import { useEffect, useMemo, useState } from 'react'
import { apiUrl } from './apiBase'

const PAGE_SIZE = 25

function formatAction(action) {
  return String(action || '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value, unixSeconds) {
  const timestamp = Number(unixSeconds)
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp * 1000).toLocaleString()
  }

  if (!value) return 'Unknown'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function parseMetadata(value) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function formatMetadataKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatMetadataValue(value) {
  if (Array.isArray(value)) return value.join('; ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getChanges(metadata) {
  return Array.isArray(metadata?.changes)
    ? metadata.changes.map((change) => String(change)).filter(Boolean)
    : []
}

function AuditMetadataDetails({ metadata, expanded, onToggle }) {
  if (!metadata) {
    return <span className="al-muted">No details</span>
  }

  const changes = getChanges(metadata)
  const otherEntries = Object.entries(metadata).filter(([key]) => key !== 'changes')

  return (
    <div className="al-detail-stack">
      {otherEntries.map(([key, value]) => (
        <span key={key} className="al-detail-pill">
          {formatMetadataKey(key)}: {formatMetadataValue(value)}
        </span>
      ))}

      {changes.length > 0 && (
        <div className="al-change-summary">
          <span className="al-detail-pill al-detail-pill--summary">
            Changes: {changes.length === 1 ? changes[0] : `${changes.length} changes`}
          </span>
          {changes.length > 1 && (
            <button className="al-detail-toggle" type="button" onClick={onToggle}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          {expanded && changes.length > 1 && (
            <ul className="al-change-list">
              {changes.map((change, index) => (
                <li key={`${change}-${index}`}>{change}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function AuditLog({ showToast }) {
  const [logs, setLogs] = useState([])
  const [actions, setActions] = useState([])
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [expandedLogIds, setExpandedLogIds] = useState(() => new Set())
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: PAGE_SIZE,
    total: 0,
    total_pages: 1,
  })
  const [loading, setLoading] = useState(true)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('page_size', String(PAGE_SIZE))
    if (action) params.set('action', action)
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }, [action, page, search])

  useEffect(() => {
    let cancelled = false

    async function fetchAuditLogs() {
      setLoading(true)
      try {
        const response = await fetch(apiUrl(`/api/admin/audit-logs?${queryString}`), {
          credentials: 'include',
        })
        const result = await response.json()

        if (cancelled) return

        if (result.success) {
          setLogs(Array.isArray(result.logs) ? result.logs : [])
          setActions(Array.isArray(result.actions) ? result.actions : [])
          setPagination(result.pagination || pagination)
        } else {
          showToast?.(result.error || 'Failed to load audit logs', 'error')
        }
      } catch (error) {
        if (!cancelled) {
          showToast?.(`Failed to load audit logs: ${error.message}`, 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAuditLogs()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  function handleSearchChange(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  function handleActionChange(event) {
    setAction(event.target.value)
    setPage(1)
  }

  function toggleLogDetails(logId) {
    setExpandedLogIds((current) => {
      const next = new Set(current)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  const totalPages = Math.max(1, Number(pagination.total_pages) || 1)
  const total = Number(pagination.total) || 0

  return (
    <section className="al-shell">
      <header className="al-header">
        <div>
          <h1 className="al-title">Audit Logs</h1>
          <p className="al-subtitle">Review administrative and sensitive system activity.</p>
        </div>
      </header>

      <div className="al-toolbar">
        <div className="al-search-wrap">
          <input
            type="search"
            className="al-search-input"
            placeholder="Search actor, action, entity, or IP"
            value={search}
            onChange={handleSearchChange}
          />
          {search && (
            <button className="al-search-clear" type="button" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>

        <select className="glass-select al-action-select" value={action} onChange={handleActionChange}>
          <option value="">All actions</option>
          {actions.map((item) => (
            <option key={item} value={item}>
              {formatAction(item)}
            </option>
          ))}
        </select>
      </div>

      <div className="al-table-wrap">
        <table className="al-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="al-td-state" colSpan="6">Loading audit logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td className="al-td-state" colSpan="6">No audit logs found.</td>
              </tr>
            ) : (
              logs.map((log) => {
                const metadata = parseMetadata(log.metadata)
                const isExpanded = expandedLogIds.has(log.id)

                return (
                  <tr key={log.id} className="al-tr">
                    <td className="al-td-date">{formatDate(log.created_at, log.created_at_unix)}</td>
                    <td>
                      <span className="al-actor">{log.actor_username || 'System'}</span>
                      <span className="al-muted">{log.actor_role || 'unknown'}</span>
                    </td>
                    <td>
                      <span className="al-action-badge">{formatAction(log.action)}</span>
                    </td>
                    <td>
                      <span className="al-entity-label">{log.entity_label || 'None'}</span>
                      <span className="al-muted">
                        {[log.entity_type, log.entity_id].filter(Boolean).join(' #') || 'No entity'}
                      </span>
                    </td>
                    <td className="al-td-details">
                      <AuditMetadataDetails
                        metadata={metadata}
                        expanded={isExpanded}
                        onToggle={() => toggleLogDetails(log.id)}
                      />
                    </td>
                    <td className="al-td-ip">{log.ip_address || 'unknown'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="al-pagination">
        <button
          className="al-page-btn"
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span className="al-results-count">
          Page {page} of {totalPages} | {total} entries
        </span>
        <button
          className="al-page-btn"
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default AuditLog
