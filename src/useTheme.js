// src/useTheme.js
//
// This hook manages the light/dark theme for the entire application.
//
// ── WHAT IT DOES ───────────────────────────────────────────────────────────
//
// 1. On startup: reads the saved preference from localStorage.
//    If none is saved, it respects the user's OS preference
//    (Settings > Display on phone, or System Preferences on Mac).
//
// 2. Provides a `toggleTheme()` function that:
//    - Flips between 'dark' and 'light'
//    - Applies the theme to the page immediately
//    - Saves the preference for next time
//
// 3. Provides the current `theme` string ('dark' or 'light')
//    so components can read it (e.g., to show the right icon)
//
//
// ── HOW THE THEME IS APPLIED ───────────────────────────────────────────────
//
// We set `document.documentElement.dataset.theme = theme`.
//
// `document.documentElement` is the <html> element at the root of the page.
// `.dataset.theme` sets/reads the `data-theme` attribute on that element.
//
// So `document.documentElement.dataset.theme = "light"` produces:
//   <html data-theme="light">
//
// This triggers the [data-theme="light"] CSS block in THEME_ADDITIONS.css,
// which overrides all the CSS custom properties (variables).
// Every component on the page automatically gets the new colors —
// no React re-render required for the CSS variables to take effect.
//
// (React re-renders only because we call setTheme() to update state,
// which is needed to re-render the toggle button's icon.)
//
//
// ── LOCAL STORAGE ──────────────────────────────────────────────────────────
//
// localStorage is a browser API that stores key-value pairs of strings.
// It persists across page refreshes and browser restarts (unlike sessionStorage).
// It's synchronous, so reads happen instantly.
//
// We use the key 'formbuilder-theme' to avoid clashing with other apps.
//
//
// ── SYSTEM PREFERENCE ──────────────────────────────────────────────────────
//
// window.matchMedia('(prefers-color-scheme: dark)') asks the browser
// whether the OS is in dark mode. This is the CSS media query as a JS call.
// .matches returns true if the user's OS is in dark mode.
// This lets us respect the user's preferences even on first visit.

import { useState, useEffect } from 'react'

// The localStorage key we use to save the preference.
// Using a namespaced key prevents collisions with other things
// the browser might store.
const STORAGE_KEY = 'formbuilder-theme'

// The two valid theme values. Using constants prevents typos.
const THEMES = {
  DARK:  'dark',
  LIGHT: 'light',
}

export function useTheme() {
  // ── Determine the initial theme ──────────────────────────────────────────
  //
  // useState accepts an "initializer function" (a function that returns
  // the initial value). React calls this function only once — on first
  // render. This is called "lazy initialization."
  //
  // Why lazy initialization instead of just useState(getSavedTheme())?
  // Because getSavedTheme() would run on EVERY render if we wrote it inline.
  // Wrapping it in a function tells React: "only compute this once."
  //
  // Priority order:
  //   1. Saved preference in localStorage (user previously toggled manually)
  //   2. OS/system preference (never visited before)
  //   3. Default to 'dark' (our app's default visual identity)
  const [theme, setTheme] = useState(() => {
    try {
      // Try to read the saved preference
      const saved = localStorage.getItem(STORAGE_KEY)

      // If there's a valid saved value, use it
      if (saved === THEMES.DARK || saved === THEMES.LIGHT) {
        return saved
      }

      // No saved preference — check OS setting
      // window.matchMedia is available in all modern browsers
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? THEMES.DARK : THEMES.LIGHT

    } catch {
      // localStorage can throw in private browsing or when storage is full.
      // We catch silently and fall back to dark mode.
      return THEMES.DARK
    }
  })

  // ── Apply the theme whenever it changes ──────────────────────────────────
  //
  // useEffect runs AFTER React renders the component.
  // We use it here to sync the React state (theme) with the real DOM
  // (document.documentElement.dataset.theme).
  //
  // The [theme] dependency array means: "re-run this effect whenever
  // `theme` changes." This handles both the initial render AND subsequent
  // toggles.
  //
  // WHY not just do this inside toggleTheme()?
  // If we did it only in toggleTheme(), the theme wouldn't be applied on
  // initial page load (because toggleTheme is only called when the user
  // clicks the button). useEffect with [theme] guarantees it runs
  // on mount and on every change.
  useEffect(() => {
    // The active route owns the data-theme scope so unauthenticated screens
    // like LoginPage can stay visually independent.
    delete document.documentElement.dataset.theme

    // Save to localStorage for persistence
    // We do this in useEffect rather than in toggleTheme() so that
    // even if the theme changes from some other source in the future,
    // it will always be persisted.
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage errors silently
    }
  }, [theme])

  // ── Toggle function ───────────────────────────────────────────────────────
  //
  // This is what the button calls.
  // We use the functional form of setTheme: setTheme(prev => nextValue)
  // This is safer than setTheme(theme === 'dark' ? 'light' : 'dark')
  // because the functional form always reads the LATEST value of theme,
  // even if React batches multiple updates together.
  // (This matters in React 18's concurrent mode.)
  function toggleTheme() {
    setTheme(prev => prev === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK)
  }

  // ── Return value ──────────────────────────────────────────────────────────
  // Return everything the consuming component needs.
  return {
    theme,          // current theme string: 'dark' or 'light'
    toggleTheme,    // function to call when toggle button is clicked
    isDark:  theme === THEMES.DARK,
    isLight: theme === THEMES.LIGHT,
  }
}
