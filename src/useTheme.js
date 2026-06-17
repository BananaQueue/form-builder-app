import { useEffect, useState } from 'react'

const STORAGE_KEY = 'formbuilder-theme'

const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
}

function getSystemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? THEMES.DARK
      : THEMES.LIGHT
  } catch {
    return THEMES.DARK
  }
}

function getStoredTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === THEMES.DARK || saved === THEMES.LIGHT ? saved : null
  } catch {
    return null
  }
}

export function useTheme() {
  const [themeState, setThemeState] = useState(() => {
    const storedTheme = getStoredTheme()
    return storedTheme
      ? { theme: storedTheme, source: 'stored' }
      : { theme: getSystemTheme(), source: 'system' }
  })

  const { theme, source } = themeState

  useEffect(() => {
    // The active route owns the data-theme scope so unauthenticated screens
    // like LoginPage can stay visually independent.
    delete document.documentElement.dataset.theme
  }, [theme])

  useEffect(() => {
    if (source !== 'system') return undefined

    let mediaQuery
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return undefined
    }

    const handleSystemThemeChange = (event) => {
      setThemeState({
        theme: event.matches ? THEMES.DARK : THEMES.LIGHT,
        source: 'system',
      })
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [source])

  function toggleTheme() {
    setThemeState(prev => {
      const nextTheme = prev.theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK

      try {
        localStorage.setItem(STORAGE_KEY, nextTheme)
      } catch {
        // Ignore storage errors silently.
      }

      return { theme: nextTheme, source: 'stored' }
    })
  }

  return {
    theme,
    toggleTheme,
    isDark: theme === THEMES.DARK,
    isLight: theme === THEMES.LIGHT,
  }
}

export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  useEffect(() => {
    let mediaQuery
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return undefined
    }

    const handleSystemThemeChange = (event) => {
      setSystemTheme(event.matches ? THEMES.DARK : THEMES.LIGHT)
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  return systemTheme
}
