// src/useIsMobile.js
//
// A "hook" is a special function that React components can call to tap into
// React's internal machinery — things like state, side-effects, and context.
// The rule is: hook names MUST start with "use". That tells React (and ESLint)
// to treat this function differently from regular functions.
//
// This hook answers one question: "Is the current viewport narrower than
// MOBILE_BREAKPOINT pixels?" and keeps the answer up to date whenever the
// user resizes their browser window.

import { useState, useEffect } from 'react'

// 768px is the most common "phone vs tablet/desktop" boundary.
// Everything below this is treated as mobile.
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // useState gives us a piece of reactive memory.
  // The function inside is the "initialiser" — it runs ONCE when the component
  // first loads to set the starting value. We check the current window width
  // right away so we never have a flicker where the desktop layout flashes
  // before swapping to mobile.
  //
  // window.innerWidth is the browser's current viewport width in CSS pixels.
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  )

  // useEffect runs *after* React has rendered the component to the screen.
  // We use it here to set up a listener for resize events.
  //
  // The function we pass to useEffect is called the "effect".
  // The empty array [] at the end is the "dependency array" — an empty array
  // means "run this effect ONCE after the first render, and never again".
  useEffect(() => {
    // This is the function that runs every time the browser window is resized.
    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // addEventListener tells the browser: "whenever the window is resized,
    // please call handleResize".
    window.addEventListener('resize', handleResize)

    // The RETURN value of a useEffect is called the "cleanup function".
    // React calls it when the component is removed from the screen.
    // Without this, the listener would keep running even after the component
    // is gone — a "memory leak". removeEventListener undoes the addEventListener.
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, []) // <-- the empty array: "set up once, tear down when component unmounts"

  // Return the boolean so any component that calls useIsMobile() gets it.
  return isMobile
}