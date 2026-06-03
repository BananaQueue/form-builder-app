import { useState, useEffect, useRef } from "react";
import { apiUrl } from "./apiBase";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function NotificationGate({ showToast, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const ackButtonRef = useRef(null);

  const current = queue[currentIndex] ?? null;

  useEffect(() => {
    async function loadPending() {
      try {
        const res = await fetch(apiUrl("/get_pending_notifications.php"), {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && data.notifications?.length > 0) {
          setQueue(data.notifications);
        } else {
          onComplete();
        }
      } catch {
        onComplete();
      } finally {
        setLoading(false);
      }
    }
    loadPending();
  }, [onComplete]);

  useEffect(() => {
    if (!current) return undefined;
    ackButtonRef.current?.focus();

    function blockEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("keydown", blockEscape, true);
    return () => window.removeEventListener("keydown", blockEscape, true);
  }, [current]);

  async function handleAcknowledge() {
    if (!current || acknowledging) return;
    setAcknowledging(true);

    try {
      const res = await fetch(apiUrl("/acknowledge_notification.php"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: current.id }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast("Could not acknowledge notification.", "error");
        setAcknowledging(false);
        return;
      }

      if (current.type === "FORM_EDITED") {
        showToast(
          `Your form "${current.formTitle}" was edited by a Super Administrator.`,
          "info"
        );
      } else {
        showToast(
          `Your form "${current.formTitle}" was deleted. Reason: ${current.deletionReason || "Not provided"}`,
          "warning"
        );
      }

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
        setAcknowledging(false);
      } else {
        onComplete();
      }
    } catch {
      showToast("Could not connect to server.", "error");
      setAcknowledging(false);
    }
  }

  if (loading) {
    return (
      <div className="ng-shell">
        <p className="ng-loading">Checking notifications…</p>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  const isDeleted = current.type === "FORM_DELETED";
  const progressLabel =
    queue.length > 1
      ? `Notification ${currentIndex + 1} of ${queue.length}`
      : null;

  return (
    <div className="notif-overlay notif-overlay--blocking" role="presentation">
      <div
        className="notif-modal notif-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-gate-title"
        onClick={(e) => e.stopPropagation()}
      >
        {progressLabel && (
          <p className="notif-modal__progress">{progressLabel}</p>
        )}

        <h2 id="notification-gate-title" className="notif-modal__title">
          {isDeleted ? "Form Removed" : "Form Updated"}
        </h2>

        <p className="notif-modal__message">
          {isDeleted
            ? "One of your forms has been removed by a Super Administrator."
            : "One of your forms has been modified by a Super Administrator."}
        </p>

        <dl className="notif-modal__details">
          <div className="notif-modal__detail-row">
            <dt>Form name</dt>
            <dd>{current.formTitle}</dd>
          </div>
          <div className="notif-modal__detail-row">
            <dt>{isDeleted ? "Date deleted" : "Modification date"}</dt>
            <dd>{formatDateTime(current.createdAt)}</dd>
          </div>
          {current.adminName && (
            <div className="notif-modal__detail-row">
              <dt>Administrator</dt>
              <dd>{current.adminName}</dd>
            </div>
          )}
          {isDeleted && (
            <div className="notif-modal__detail-row">
              <dt>Deletion reason</dt>
              <dd>{current.deletionReason || "Not provided"}</dd>
            </div>
          )}
        </dl>

        <p className="notif-modal__hint">{current.message}</p>

        <div className="notif-modal__actions notif-modal__actions--single">
          <button
            ref={ackButtonRef}
            type="button"
            className="notif-modal__btn notif-modal__btn--confirm"
            onClick={handleAcknowledge}
            disabled={acknowledging}
          >
            {acknowledging ? "Saving…" : "Acknowledge & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
