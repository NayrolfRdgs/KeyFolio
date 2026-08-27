export function applyTheme(themeChoice) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const chosen = themeChoice || (typeof localStorage !== 'undefined' ? localStorage.getItem('app_theme') : null) || 'system'
  let isDark = false

  if (chosen === 'dark') {
    isDark = true
  } else if (chosen === 'light') {
    isDark = false
  } else {
    // Mode système par défaut : suit automatiquement la préférence OS
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  if (document.documentElement) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }

  if (document.body) {
    if (isDark) {
      document.body.classList.add('theme-dark')
      document.body.classList.remove('theme-light')
    } else {
      document.body.classList.add('theme-light')
      document.body.classList.remove('theme-dark')
    }
  }
}

export function initThemeListener() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  applyTheme()
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const currentChoice = typeof localStorage !== 'undefined' ? (localStorage.getItem('app_theme') || 'system') : 'system'
      if (currentChoice === 'system') {
        applyTheme('system')
      }
    }
    try {
      mediaQuery.addEventListener('change', handler)
    } catch(e) {
      if (mediaQuery.addListener) {
        mediaQuery.addListener(handler)
      }
    }
  }
}
