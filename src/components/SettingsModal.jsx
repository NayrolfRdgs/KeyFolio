import React, { useState, useEffect } from 'react'
import { applyTheme } from '../lib/theme'

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // Settings State — 'system' par défaut
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'system')
  const [googleClientId, setGoogleClientId] = useState(localStorage.getItem('google_client_id') || '')
  const [googleClientSecret, setGoogleClientSecret] = useState(localStorage.getItem('google_client_secret') || '')
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('google_api_key') || '')
  const [currency, setCurrency] = useState(localStorage.getItem('app_currency') || '€')
  const [enableAlerts, setEnableAlerts] = useState(localStorage.getItem('enable_alerts') !== 'false')
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accent_color') || '#6366f1')

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  if (!isOpen) return null

  const handleSave = () => {
    setSaving(true)
    try {
      localStorage.setItem('app_theme', theme)
      localStorage.setItem('google_client_id', googleClientId)
      localStorage.setItem('google_client_secret', googleClientSecret)
      localStorage.setItem('google_api_key', googleApiKey)
      localStorage.setItem('app_currency', currency)
      localStorage.setItem('enable_alerts', String(enableAlerts))
      localStorage.setItem('accent_color', accentColor)

      setMsg('✅ Options enregistrées avec succès !')
      setTimeout(() => {
        setMsg(null)
        onClose()
      }, 1200)
    } catch (err) {
      alert(`Erreur d'enregistrement : ${err}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-content card"
        style={{ maxWidth: 680, width: '92%', padding: 0, overflow: 'hidden', borderRadius: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Options Générales & Réglages</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Thème, identifiants Google Client ID et préférences de l'application</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--color-surface)' }}>
          <button
            className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 16px', fontSize: 13, borderBottom: activeTab === 'general' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('general')}
          >
            ⚙️ Général & Devise
          </button>
          <button
            className={`btn ${activeTab === 'theme' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 16px', fontSize: 13, borderBottom: activeTab === 'theme' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('theme')}
          >
            🎨 Thème & Apparence
          </button>
          <button
            className={`btn ${activeTab === 'google' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 16px', fontSize: 13, borderBottom: activeTab === 'google' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('google')}
          >
            🔑 Identifiants Google & API
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, maxHeight: '65vh', overflowY: 'auto' }}>
          {msg && (
            <div style={{ marginBottom: 16, padding: '10px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              {msg}
            </div>
          )}

          {/* Tab 1: Général */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Monnaie / Devise d'affichage</label>
                <select className="form-control" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="€">€ (Euro - EUR)</option>
                  <option value="$">$ (Dollar - USD)</option>
                  <option value="CHF">CHF (Franc Suisse)</option>
                  <option value="£">£ (Livre Sterling - GBP)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Alertes & Notifications de Loyers</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="alerts-checkbox"
                    checked={enableAlerts}
                    onChange={(e) => setEnableAlerts(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="alerts-checkbox" style={{ fontSize: 13, cursor: 'pointer' }}>
                    Activer les alertes automatiques en cas de retard de loyers ou d'échéance de DPE
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12, padding: 14, background: 'var(--color-surface-2)', borderRadius: 8 }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Information Application</label>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Application <strong>LePuits v6</strong> — Gestion Immobilière Native (Tauri v2 + SQLite)
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Thème & Apparence */}
          {activeTab === 'theme' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
                  Mode d'affichage
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div
                    onClick={() => setTheme('system')}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: theme === 'system' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: 'var(--color-surface-2)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🖥️</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Système</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Automatique (OS)</div>
                  </div>

                  <div
                    onClick={() => setTheme('dark')}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: theme === 'dark' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: '#0F172A',
                      color: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🌙</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Mode Sombre</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Thème sombre</div>
                  </div>

                  <div
                    onClick={() => setTheme('light')}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: theme === 'light' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>☀️</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Mode Clair</div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Thème clair</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Couleur d'accentuation</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  {[
                    { color: '#6366f1', label: 'Indigo' },
                    { color: '#10b981', label: 'Émeraude' },
                    { color: '#f59e0b', label: 'Ambre' },
                    { color: '#8b5cf6', label: 'Violet' },
                    { color: '#0284c7', label: 'Océan' }
                  ].map((c) => (
                    <div
                      key={c.color}
                      onClick={() => setAccentColor(c.color)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: c.color,
                        cursor: 'pointer',
                        border: accentColor === c.color ? '3px solid #FFF' : 'none',
                        boxShadow: accentColor === c.color ? '0 0 0 2px ' + c.color : 'none'
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Google Client ID & APIs */}
          {activeTab === 'google' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1E40AF' }}>
                🔑 Renseignez vos identifiants Google Cloud Console pour activer la synchronisation Google Drive, Google Maps et les emails Gmail.
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Google Client ID (OAuth 2.0) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ex: 1234567890-xyz.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Google Client Secret</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="GOCSPX-..."
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Clé API Google Maps (Optionnel)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="AIzaSy..."
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', background: 'var(--color-surface-2)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : '💾 Enregistrer les options'}
          </button>
        </div>
      </div>
    </div>
  )
}
