import { useState, useEffect } from "react";
import { apiUrl, csrfHeaders } from "./apiBase";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "FORM_EDITED", label: "Edited Forms" },
  { id: "FORM_DELETED", label: "Deleted Forms" },
];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function NotificationCenter({ showToast }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchNotifications(activeFilter = filter) {
    setLoading(true);
    try {
      const query =
        activeFilter === "all"
          ? ""
          : `?type=${encodeURIComponent(activeFilter)}`;
      const res = await fetch(apiUrl(`/get_notifications.php${query}`), {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unread_count ?? 0);
      } else {
        showToast(data.error || "Failed to load notifications.", "error");
      }
    } catch {
      showToast("Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function markRead(notificationId) {
    try {
      const res = await fetch(apiUrl("/mark_notification_read.php"), {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ notification_id: notificationId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, read: true } : item
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      showToast("Could not mark notification as read.", "error");
    }
  }

  return (
    <div className="nc-shell">
      <div className="nc-header">
        <div>
          <h1 className="nc-title">Notifications</h1>
          <p className="nc-subtitle">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "Review administrator actions on your forms"}
          </p>
        </div>
        <button
          type="button"
          className="glass-button"
          onClick={() => fetchNotifications(filter)}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="nc-filters" role="tablist" aria-label="Notification filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`nc-filter-btn ${filter === item.id ? "nc-filter-btn--active" : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="nc-meta">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="nc-empty glass-card">
          <p className="nc-empty__title">No notifications yet</p>
          <p className="nc-empty__message">
            You will be notified here when a Super Administrator edits or
            removes one of your forms.
          </p>
        </div>
      ) : (
        <div className="nc-list">
          {notifications.map((item) => {
            const isDeleted = item.type === "FORM_DELETED";
            return (
              <article
                key={item.id}
                className={`nc-card glass-card ${item.read ? "" : "nc-card--unread"}`}
              >
                <div className="nc-card__top">
                  <span
                    className={`nc-badge ${isDeleted ? "nc-badge--deleted" : "nc-badge--edited"}`}
                  >
                    {isDeleted ? "Form Removed" : "Form Updated"}
                  </span>
                  <time className="nc-card__date" dateTime={item.createdAt}>
                    {formatDateTime(item.createdAt)}
                  </time>
                </div>

                <h2 className="nc-card__title">{item.formTitle}</h2>
                <p className="nc-card__message">{item.message}</p>

                <dl className="nc-card__details">
                  {item.adminName && (
                    <div>
                      <dt>Administrator</dt>
                      <dd>{item.adminName}</dd>
                    </div>
                  )}
                  {isDeleted && item.deletionReason && (
                    <div>
                      <dt>Deletion reason</dt>
                      <dd>{item.deletionReason}</dd>
                    </div>
                  )}
                </dl>

                {!item.read && (
                  <button
                    type="button"
                    className="glass-button nc-card__read-btn"
                    onClick={() => markRead(item.id)}
                  >
                    Mark as read
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
