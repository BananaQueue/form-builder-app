// src/useNotification.js
//
// This file creates a custom React hook called useNotification.
//
// WHAT IS A HOOK?
// A hook is just a JavaScript function whose name starts with "use".
// That naming rule is how React knows to treat it specially — it can
// hold state and side-effects just like a component, but it has no JSX.
// You call it inside a component, and it hands back values and functions
// that the component can use.
//
// WHAT DOES THIS HOOK DO?
// It manages two pieces of notification state:
//   1. toast   — the top-banner message (info, success, error, warning)
//   2. confirm — the modal dialog (yes/no question)
//
// It also returns the functions to trigger those notifications:
//   showToast(message, type)              — show a banner
//   showConfirm(message, onConfirm)       — show a modal, run onConfirm if Yes
//   hideToast()                           — dismiss the banner early
//   hideConfirm()                         — dismiss the modal
//
// WHY PUT THIS IN A HOOK?
// We want multiple components (FormBuilder, FormList, FormDisplay…) to be
// able to show notifications. Instead of copying the same useState/logic
// into every file, we write it once here and share it.

import { useState, useCallback } from 'react'

// useCallback is like useMemo but for functions.
// Without it, every time the component re-renders, React would create a
// brand new function object for showToast, showConfirm, etc. That's
// harmless but wasteful. useCallback says "only recreate this function
// if its dependencies change" — here they never change, so it's created once.

export function useNotification() {

  // ── TOAST STATE ───────────────────────────────────────────────────────────
  // We store the toast as an object so we can carry both the message text
  // AND the type (success / error / warning / info) together.
  // null means "no toast is currently showing".
  //
  // Shape when active:  { message: "Saved!", type: "success" }
  // Shape when hidden:  null
  const [toast, setToast] = useState(null)

  // ── CONFIRM STATE ─────────────────────────────────────────────────────────
  // The confirm modal needs to know:
  //   message   — the question to ask the user ("Delete this form?")
  //   onConfirm — the function to run if the user clicks Yes
  //
  // null means "no modal is currently showing".
  //
  // Shape when active:  { message: "Delete?", onConfirm: fn }
  // Shape when hidden:  null
  const [confirm, setConfirm] = useState(null)

  // ── showToast ─────────────────────────────────────────────────────────────
  // Call this anywhere you'd previously call alert() for a simple message.
  //
  // Parameters:
  //   message (string) — what to display
  //   type    (string) — "success" | "error" | "warning" | "info"
  //                      defaults to "info" if you don't pass one
  //
  // Example:  showToast("Form saved!", "success")
  //           showToast("Something went wrong.", "error")
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })

    // Auto-dismiss after 3.5 seconds.
    // setTimeout schedules a function to run after a delay (in milliseconds).
    // 3500ms = 3.5 seconds.
    // After that time, we set toast back to null, which makes the banner
    // disappear. The CSS handles the fade-out animation.
    setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])
  // The empty [] dependency array means: never recreate this function.
  // It's safe because setToast (from useState) is always stable.

  // ── hideToast ─────────────────────────────────────────────────────────────
  // Lets the user dismiss the banner early by clicking an X button.
  // We just set toast back to null.
  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  // ── showConfirm ───────────────────────────────────────────────────────────
  // Call this anywhere you'd previously call:
  //   if (window.confirm("Are you sure?")) { doThing() }
  //
  // Parameters:
  //   message   (string)   — the question to display
  //   onConfirm (function) — what to run if the user clicks "Yes"
  //
  // Example:
  //   showConfirm(`Delete "${title}"?`, () => deleteForm(id))
  //
  // The onConfirm is stored in state. When the user clicks Yes in the modal,
  // the NotificationHost component calls confirm.onConfirm() then closes.
  const showConfirm = useCallback((message, onConfirm) => {
    setConfirm({ message, onConfirm })
  }, [])

  // ── hideConfirm ───────────────────────────────────────────────────────────
  // Closes the modal without doing anything. Used when user clicks "Cancel".
  const hideConfirm = useCallback(() => {
    setConfirm(null)
  }, [])

  // ── Return value ──────────────────────────────────────────────────────────
  // Everything the calling component needs, bundled into one object.
  // The component that calls useNotification() destructures this:
  //
  //   const { toast, confirm, showToast, showConfirm, hideToast, hideConfirm }
  //     = useNotification()
  return {
    toast,         // current toast state (null or { message, type })
    confirm,       // current confirm state (null or { message, onConfirm })
    showToast,     // function: show a banner
    showConfirm,   // function: show a modal
    hideToast,     // function: dismiss the banner
    hideConfirm,   // function: dismiss the modal
  }
}