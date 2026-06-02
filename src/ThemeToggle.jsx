// src/ThemeToggle.jsx
//
// A single button that switches between dark and light mode.
//
// ── DESIGN DECISIONS ──────────────────────────────────────────────────────
//
// Icon choice:
//   🌙  (moon)  =  currently in DARK mode, click to go LIGHT
//   ☀️  (sun)   =  currently in LIGHT mode, click to go DARK
//
//   The icon shows the CURRENT state, not the destination.
//   This is the most common convention (VS Code, macOS, GitHub all do this).
//
// Tooltip:
//   The `title` attribute gives a native browser tooltip on hover.
//   This tells the user what will happen when they click — important
//   because the icon meaning can be ambiguous to new users.
//
// Accessibility:
//   The `aria-label` attribute is read by screen readers.
//   A screen reader user will hear "Switch to light mode" or
//   "Switch to dark mode" when they tab to the button.
//   Without aria-label, they'd hear nothing (or just "button").
//
// ── PROPS ─────────────────────────────────────────────────────────────────
//
// theme        (string)    — current theme: 'dark' or 'light'
// toggleTheme  (function)  — called when the button is clicked
//
// These are passed down from App.jsx, which gets them from useTheme().

function ThemeToggle({ theme, toggleTheme }) {
  const isDark = theme === 'dark'

  // The icon and label change based on the current theme.
  const icon        = isDark ? '🌙' : '☀️'
  const label       = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      // glass-button gives us the base nav button appearance (padding,
      // border, backdrop-filter, transitions) for free.
      // theme-toggle adds the icon-specific sizing and the colored tint
      // that changes per theme (defined in THEME_ADDITIONS.css).
      className="glass-button theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {/* The span lets us apply the rotation animation to just the icon,
          not the entire button. Without it, the button's border would
          rotate too, which looks broken. */}
      <span className="theme-toggle__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}

export default ThemeToggle