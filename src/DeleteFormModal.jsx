import { useState, useEffect, useRef } from "react";

const PRESET_REASONS = [
  "Duplicate form",
  "Inappropriate content",
  "Invalid submission",
  "Policy violation",
  "Other",
];

export default function DeleteFormModal({ form, onCancel, onConfirm }) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function handleEscape(event) {
      event.preventDefault();
      event.stopPropagation();
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, []);

  const finalReason =
    selectedReason === "Other" ? customReason.trim() : selectedReason;
  const canSubmit = finalReason.length > 0 && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(finalReason);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="notif-overlay notif-overlay--blocking" role="presentation">
      <div
        className="notif-modal notif-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-form-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-form-modal-title" className="notif-modal__title">
          Delete Form
        </h2>
        <p className="notif-modal__message">
          You are about to permanently delete{" "}
          <strong>&ldquo;{form.title}&rdquo;</strong>. A deletion reason is
          required and will be shared with the form owner if applicable.
        </p>

        <form className="notif-modal__form" onSubmit={handleSubmit}>
          <label className="notif-modal__label" htmlFor="delete-reason-select">
            Deletion reason
          </label>
          <select
            id="delete-reason-select"
            className="glass-select notif-modal__select"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
          >
            {PRESET_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>

          {selectedReason === "Other" && (
            <>
              <label className="notif-modal__label" htmlFor="delete-custom-reason">
                Custom reason
              </label>
              <textarea
                id="delete-custom-reason"
                className="notif-modal__textarea"
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe why this form is being removed…"
                required
              />
            </>
          )}

          <div className="notif-modal__actions">
            <button
              type="button"
              className="notif-modal__btn notif-modal__btn--cancel"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="submit"
              className="notif-modal__btn notif-modal__btn--confirm"
              disabled={!canSubmit}
            >
              {submitting ? "Deleting…" : "Delete Form"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
