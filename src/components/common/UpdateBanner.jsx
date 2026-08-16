import React, { useEffect, useState } from 'react'
import { openExternalUrl } from '../../lib/db'

const CURRENT_VERSION = '0.1.0'
const REPO_URL = 'https://github.com/NayrolfRdgs/KeyFolio'
const GITHUB_API_RELEASE_URL = 'https://api.github.com/repos/NayrolfRdgs/KeyFolio/releases/latest'

export default function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkUpdates()
  }, [])

  const checkUpdates = async () => {
    try {
      if (localStorage.getItem('enable_update_notifs') === 'false') {
        return
      }

      // Vérification hebdomadaire ou forcée au démarrage si aucune vérification récente
      const lastCheck = localStorage.getItem('keyfolio_last_update_check')
      const now = Date.now()

      // Vérifier au moins une fois par jour
      if (lastCheck && now - parseInt(lastCheck, 10) < 24 * 60 * 60 * 1000) {
        const cached = localStorage.getItem('keyfolio_update_cached')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && isNewerVersion(parsed.latestVersion, CURRENT_VERSION)) {
            setUpdateInfo(parsed)
          }
        }
        return
      }

      const res = await fetch(GITHUB_API_RELEASE_URL, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      })

      if (!res.ok) return

      const data = await res.json()
      const latestVersion = (data.tag_name || '').replace(/^v/, '')

      localStorage.setItem('keyfolio_last_update_check', String(now))

      if (latestVersion && isNewerVersion(latestVersion, CURRENT_VERSION)) {
        const info = {
          hasUpdate: true,
          latestVersion,
          releaseNotes: data.body || '',
          downloadUrl: data.html_url || `${REPO_URL}/releases/latest`
        }
        localStorage.setItem('keyfolio_update_cached', JSON.stringify(info))
        setUpdateInfo(info)
      } else {
        localStorage.removeItem('keyfolio_update_cached')
      }
    } catch (e) {
      console.log('Update check skipped:', e)
    }
  }

  // Comparaison sémantique simplifiée de versions (ex: 0.2.0 > 0.1.0)
  const isNewerVersion = (latest, current) => {
    const pLatest = latest.split('.').map(n => parseInt(n, 10) || 0)
    const pCurrent = current.split('.').map(n => parseInt(n, 10) || 0)

    for (let i = 0; i < Math.max(pLatest.length, pCurrent.length); i++) {
      const vL = pLatest[i] || 0
      const vC = pCurrent[i] || 0
      if (vL > vC) return true
      if (vL < vC) return false
    }
    return false
  }

  const handleOpenRelease = () => {
    const url = updateInfo?.downloadUrl || `${REPO_URL}/releases/latest`
    try {
      openExternalUrl(url)
    } catch (e) {
      window.open(url, '_blank')
    }
  }

  if (!updateInfo || dismissed) return null

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)',
        color: '#ffffff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        borderBottom: '1px solid #4338ca',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: 13,
        fontWeight: 500,
        position: 'relative',
        zIndex: 9999
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🚀</span>
        <div>
          <strong>KeyFolio v{updateInfo.latestVersion} est disponible !</strong>
          <span style={{ opacity: 0.9, marginLeft: 8, fontSize: 12 }}>
            (Vous utilisez actuellement la version v{CURRENT_VERSION})
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-sm"
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: 12,
            padding: '5px 12px',
            borderRadius: 6
          }}
          onClick={handleOpenRelease}
        >
          📥 Télécharger la mise à jour
        </button>

        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a5b4fc',
            cursor: 'pointer',
            fontSize: 16,
            padding: '2px 6px'
          }}
          onClick={() => setDismissed(true)}
          title="Masquer la notification"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
