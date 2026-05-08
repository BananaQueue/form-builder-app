// src/NotificationHost.jsx
//
// This component is the "stage" for all notifications.
// It renders two things:
//   1. The toast banner (top of screen, auto-dismisses)
//   2. The confirm modal (centered, waits for user input)
//
// It lives in App.jsx, above everything else, so it always sits on top
// of the page visually (via CSS z-index and position: fixed).
//
// PROPS it receives (passed down from App.jsx):
//   toast      — the current toast object, or null
//   confirm    — the current confirm object, or null
//   hideToast  — function to dismiss the toast early
//   hideConfirm — function to dismiss the modal
//
// It renders nothing when both toast and confirm are null.

// ── TOAST TYPE STYLES ──────────────────────────────────────────────────────
// Each toast "type" gets its own color so the user immediately understands
// the severity at a glance, without reading the message.
//
// We define these as a plain object (a lookup table / map).
// The keys match the `type` string we pass to showToast().
// Each value is an object with the CSS properties for that type.
const TOAST_STYLES = {
  success: {
    background: 'rgba(39, 174, 96, 0.96)',   // green
    borderColor: 'rgba(255,255,255,0.25)',
    icon: '✓',
  },
  error: {
    background: 'rgba(192, 57, 43, 0.96)',   // red
    borderColor: 'rgba(255,255,255,0.25)',
    icon: '✕',
  },
  warning: {
    background: 'rgba(243, 156, 18, 0.96)',  // amber
    borderColor: 'rgba(255,255,255,0.25)',
    icon: '⚠',
  },
  info: {
    background: 'rgba(41, 128, 185, 0.96)',  // blue
    borderColor: 'rgba(255,255,255,0.25)',
    icon: 'ℹ',
  },
}

function NotificationHost({ toast, confirm, hideToast, hideConfirm }) {

  // ── CONFIRM HANDLERS ───────────────────────────────────────────────────────
  // When the user clicks "Yes / Confirm":
  //   1. Run whatever callback was stored in confirm.onConfirm
  //   2. Close the modal
  function handleConfirmYes() {
    if (confirm?.onConfirm) {
      confirm.onConfirm()      // run the stored action (e.g. deleteForm)
    }
    hideConfirm()              // close the modal regardless
  }

  // When the user clicks "Cancel": just close. Don't run anything.
  function handleConfirmNo() {
    hideConfirm()
  }

  // Look up the style for the current toast type.
  // If the type is somehow unknown, fall back to 'info'.
  const toastStyle = toast ? (TOAST_STYLES[toast.type] ?? TOAST_STYLES.info) : null

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════
          TOAST BANNER
          position: fixed — stays pinned to the viewport even when scrolling
          top / left / right — positions it at the top-center of the screen
          zIndex: 9000 — sits above everything, including the QR modal (1000)
          The banner only renders when toast is not null.
      ════════════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',

            // translate(-50%, 0) shifts the element left by 50% of its OWN
            // width. Combined with left: 50% (which is 50% of the PARENT),
            // this perfectly centers it horizontally regardless of its width.
            transform: 'translate(-50%, 0)',

            zIndex: 9000,

            // We cap the width so it looks like a neat pill on wide screens,
            // but allow it to shrink on mobile.
            maxWidth: '480px',
            width: 'calc(100% - 40px)',  // 20px padding on each side on small screens

            background: toastStyle.background,
            border: `1px solid ${toastStyle.borderColor}`,
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',  // Safari prefix

            display: 'flex',
            alignItems: 'center',
            gap: '12px',

            // CSS animation — we define this in index.css below.
            // 'slideDown' makes the banner drop in from above.
            animation: 'toastSlideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            // cubic-bezier(0.34, 1.56, 0.64, 1) is a "spring" easing —
            // it overshoots slightly before settling, giving a satisfying bounce.
          }}
          role="alert"
          // role="alert" is an accessibility attribute. Screen readers will
          // announce this element's content immediately when it appears.
        >
          {/* Icon circle on the left */}
          <span style={{
            flexShrink: 0,          // don't let it compress if text is long
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#fff',
            fontWeight: '700',
          }}>
            {toastStyle.icon}
          </span>

          {/* Message text */}
          <span style={{
            flex: 1,                // take up all remaining horizontal space
            fontSize: '0.92em',
            color: '#fff',
            fontWeight: '500',
            lineHeight: '1.4',
          }}>
            {toast.message}
          </span>

          {/* Dismiss (×) button on the right */}
          <button
            onClick={hideToast}
            aria-label="Dismiss notification"
            // aria-label explains the button to screen readers since it has
            // no visible text, just the × character.
            style={{
              flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.30)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          >
            ×
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CONFIRM MODAL
          Same overlay + card pattern used by the privacy notice modal
          in FormDisplay.jsx. Consistent UX throughout the app.
          Only renders when confirm is not null.
      ════════════════════════════════════════════════════════════════ */}
      {confirm && (
        <div
          // Dark overlay behind the modal
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9001,   // one higher than toast so it covers it if both appear
            padding: '20px',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={handleConfirmNo}
          // Clicking the overlay (outside the card) = Cancel
        >
          <div
            // The white card
            style={{
              background: '#fff',
              borderRadius: '18px',
              padding: '32px 28px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              animation: 'modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={e => e.stopPropagation()}
            // stopPropagation prevents clicks INSIDE the card from
            // triggering the overlay's onClick (which would close the modal).
          >
            {/* Warning icon at the top */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fdecea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              marginBottom: '16px',
            }}>
              ⚠️
            </div>

            {/* The question */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '1em',
              color: '#1a1a2e',
              fontWeight: '600',
              lineHeight: '1.5',
            }}>
              {confirm.message}
            </p>

            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: '10px' }}>

              {/* Cancel — left, muted style */}
              <button
                onClick={handleConfirmNo}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '0.95em',
                  background: '#f0f0f0',
                  color: '#555',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e4e4e4'}
                onMouseLeave={e => e.currentTarget.style.background = '#f0f0f0'}
              >
                Cancel
              </button>

              {/* Confirm — right, red (destructive action) */}
              <button
                onClick={handleConfirmYes}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '0.95em',
                  background: '#c0392b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#a93226'}
                onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    // The <> </> is a React Fragment — a wrapper that renders no actual HTML
    // element. We need it because JSX requires a single root element, but
    // we're returning two siblings (toast + modal) with nothing wrapping them.
  )
}

export default NotificationHost