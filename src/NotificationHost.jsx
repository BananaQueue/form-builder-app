// src/NotificationHost.jsx
//
// WHAT CHANGED FROM THE ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────────
// 1. All inline style={{ ... }} replaced with CSS class names.
//    The toast banner and confirm modal now use the .notif-* namespace.
//
// 2. Toast type styles (success/error/warning/info) moved from the
//    TOAST_STYLES JavaScript object into CSS classes (.notif-toast--success,
//    .notif-toast--error, etc.). This is the right place for visual rules.
//
//    BEFORE: a JS object with background/borderColor/icon values, applied
//            via inline style. Mixing data (icon) and appearance (background).
//
//    AFTER:  icon stays in JS (it's data), appearance moves to CSS classes.
//            The JS object only needs to map type → icon character now.
//
// 3. The confirm modal overlay uses backdrop-filter blur from CSS,
//    matching the premium glass aesthetic of the rest of the app.
//
// ALL LOGIC IS IDENTICAL TO THE ORIGINAL:
// - handleConfirmYes() and handleConfirmNo() are unchanged
// - hideToast / hideConfirm prop wiring is unchanged
// - toast / confirm state shapes are unchanged
// ─────────────────────────────────────────────────────────────────────────────

// ── Toast icons ────────────────────────────────────────────────────────────
// We keep the icon mapping in JavaScript because it's DATA, not appearance.
// The icon character tells the user WHAT kind of notification this is.
// The color and background (appearance) belong in CSS.
//
// This is the "separation of concerns" principle applied at a granular level:
// even within a component, ask yourself "is this data or style?"
// Icons/text = data (JS). Colors/spacing = style (CSS).
const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

function NotificationHost({ toast, confirm, hideToast, hideConfirm }) {

  // ── Confirm handlers (unchanged) ──────────────────────────────────────────
  function handleConfirmYes() {
    if (confirm?.onConfirm) confirm.onConfirm()
    hideConfirm()
  }

  function handleConfirmNo() {
    hideConfirm()
  }

  // The type to use if somehow an unknown type arrives.
  // Defensive programming: always have a fallback.
  const toastType = toast?.type ?? 'info'
  const toastIcon = TOAST_ICONS[toastType] ?? TOAST_ICONS.info

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          TOAST BANNER
          ══════════════════════════════════════════════════════════════════════

          The toast uses two class names:
          1. .notif-toast          — base styles (position, layout, animation)
          2. .notif-toast--{type}  — type-specific color (success/error/etc.)

          This "base + modifier" pattern (BEM) means we write the shared
          styles once and only override what differs per type.

          BEFORE (all inline):
            <div style={{
              position: 'fixed', top: '20px', left: '50%',
              transform: 'translate(-50%, 0)', zIndex: 9000,
              maxWidth: '480px', background: toastStyle.background,
              border: `1px solid ${toastStyle.borderColor}`,
              borderRadius: '14px', padding: '14px 18px',
              ...etc (15 more properties)
            }}>

          AFTER (class names):
            <div className={`notif-toast notif-toast--${toastType}`}>

          The animation (toastSlideDown) stays in index.css exactly as before.
          We reference it in the .notif-toast class via animation property.
      ════════════════════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          className={`notif-toast notif-toast--${toastType}`}
          role="alert"
          // role="alert" is an ARIA attribute. Screen readers announce
          // the contents of role="alert" elements immediately when they
          // appear, without the user having to navigate to them.
          // This makes toasts accessible to users who can't see the screen.
        >
          {/* Icon circle */}
          <span className="notif-toast__icon">
            {toastIcon}
          </span>

          {/* Message text */}
          <span className="notif-toast__message">
            {toast.message}
          </span>

          {/* Dismiss button */}
          <button
            className="notif-toast__close"
            onClick={hideToast}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIRM MODAL
          ══════════════════════════════════════════════════════════════════════

          The confirm modal has three layers:
          1. .notif-overlay    — the dark backdrop that covers the whole page
          2. .notif-modal      — the white card in the center
          3. Inside the card:  icon, message, Cancel button, Confirm button

          Clicking the overlay calls handleConfirmNo (same as Cancel).
          Clicking inside the card uses e.stopPropagation() so the click
          doesn't bubble up to the overlay and accidentally close the modal.

          WHY stopPropagation():
          In the DOM, click events "bubble" upward through parent elements.
          If you click inside the card, the click fires on the card AND on
          every parent including the overlay. stopPropagation() cuts the
          bubble at the card — the overlay's onClick never fires.
      ════════════════════════════════════════════════════════════════════════ */}
      {confirm && (
        <div
          className="notif-overlay"
          onClick={handleConfirmNo}
        >
          <div
            className="notif-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Danger icon */}
            <div className="notif-modal__icon-wrap">
              <span className="notif-modal__icon">⚠</span>
            </div>

            {/* The question being asked */}
            <p className="notif-modal__message">
              {confirm.message}
            </p>

            {/* Action buttons */}
            <div className="notif-modal__actions">
              <button
                className="notif-modal__btn notif-modal__btn--cancel"
                onClick={handleConfirmNo}
              >
                Cancel
              </button>
              <button
                className="notif-modal__btn notif-modal__btn--confirm"
                onClick={handleConfirmYes}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default NotificationHost