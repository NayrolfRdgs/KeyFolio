export function applyTheme(themeChoice) {
  const chosen = themeChoice || localStorage.getItem('app_theme') || 'system'
  let isDark = false

  if (chosen === 'dark') {
    isDark = true
  } else if (chosen === 'light') {
    isDark = false
  } else {
    // Mode système par défaut : suit automatiquement la préférence OS
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.body.classList.add('theme-dark')
    document.body.classList.remove('theme-light')
  } else {
    document.documentElement.setAttribute('data-theme', 'light')
    document.body.classList.add('theme-light')
    document.body.classList.remove('theme-dark')
  }
}

export function initThemeListener() {
  applyTheme()
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const currentChoice = localStorage.getItem('app_theme') || 'system'
      if (currentChoice === 'system') {
        applyTheme('system')
      }
    }
    try {
      mediaQuery.addEventListener('change', handler)
    } catch(e) {
      mediaQuery.addListener(handler)
    }
  }
}
