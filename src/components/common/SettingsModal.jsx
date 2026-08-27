import Icon from '../common/Icon'
import React, { useState, useEffect } from 'react'
import { applyTheme } from '../../lib/theme'
import { openExternalUrl, openTemplatesFolder } from '../../lib/db'
import PdfTemplateManagerModal from '../documents/PdfTemplateManagerModal'

export default function SettingsModal({ isOpen, onClose, initialTab = 'general' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)

  // Settings State — 'system' par défaut
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'system')
  const [googleClientId, setGoogleClientId] = useState(localStorage.getItem('google_client_id') || '')
  const [googleClientSecret, setGoogleClientSecret] = useState(localStorage.getItem('google_client_secret') || '')
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('google_api_key') || '')
  const [currency, setCurrency] = useState(localStorage.getItem('app_currency') || '€')
  const [enableAlerts, setEnableAlerts] = useState(localStorage.getItem('enable_alerts') !== 'false')
  const [enableUpdateNotifs, setEnableUpdateNotifs] = useState(localStorage.getItem('enable_update_notifs') !== 'false')
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accent_color') || '#6366f1')

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  if (!isOpen) return null

  const handleSave = () => {
    setSaving(true)
    try {
      localStorage.setItem('app_theme', theme)
      localStorage.setItem('google_client_id', googleClientId.trim())
      localStorage.setItem('google_client_secret', googleClientSecret.trim())
      localStorage.setItem('google_api_key', googleApiKey.trim())
      localStorage.setItem('app_currency', currency)
      localStorage.setItem('enable_alerts', String(enableAlerts))
      localStorage.setItem('enable_update_notifs', String(enableUpdateNotifs))
      localStorage.setItem('accent_color', accentColor)

      setMsg('Options enregistrées avec succès !')
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
        style={{ maxWidth: 700, width: '94%', padding: 0, overflow: 'hidden', borderRadius: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="settings" size={22} color="var(--color-accent)" />
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Options Générales & Réglages</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Thème, templates PDF, identifiants Google et préférences</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--color-surface)' }}>
          <button
            className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 14px', fontSize: 12.5, borderBottom: activeTab === 'general' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('general')}
          >
            Général
          </button>
          <button
            className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 14px', fontSize: 12.5, borderBottom: activeTab === 'templates' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('templates')}
          >
            📄 Modèles PDF
          </button>
          <button
            className={`btn ${activeTab === 'theme' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 14px', fontSize: 12.5, borderBottom: activeTab === 'theme' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('theme')}
          >
            Apparence
          </button>
          <button
            className={`btn ${activeTab === 'google' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, padding: '10px 14px', fontSize: 12.5, borderBottom: activeTab === 'google' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('google')}
          >
            Google API
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
                <label className="form-label" style={{ fontWeight: 700 }}>Alertes & Notifications</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      id="update-notifs-checkbox"
                      checked={enableUpdateNotifs}
                      onChange={(e) => setEnableUpdateNotifs(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="update-notifs-checkbox" style={{ fontSize: 13, cursor: 'pointer' }}>
                      Activer les notifications de mise à jour au démarrage (Vérification GitHub Releases)
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12, padding: 14, background: 'var(--color-surface-2)', borderRadius: 8 }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Information Application</label>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Application <strong>KeyFolio v0.1.0 (Beta)</strong> — Gestion Immobilière Native (Tauri v2 + Rust + SQLite)
                </div>
              </div>
            </div>
          )}

          {/* Tab: Modèles PDF Personnalisables */}
          {activeTab === 'templates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #eef4ff 0%, #f5f3ff 100%)',
                border: '1px solid #c7d2fe',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                    📁 Dossier des Modèles PDF KeyFolio
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Modifiez facilement la charte, vos coordonnées bailleur par défaut, mentions et clauses.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTemplateEditorOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: 12,
                      background: '#ffffff',
                      borderColor: '#c7d2fe',
                      color: '#4f46e5'
                    }}
                  >
                    <Icon name="edit" size={14} color="#4f46e5" /> Modifier les balises (UI)
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openTemplatesFolder()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      fontWeight: 700,
                      fontSize: 12,
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    <Icon name="folderOpen" size={15} /> Ouvrir le dossier des Templates →
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                  Fichiers de modèles disponibles dans votre dossier :
                </div>

                {[
                  {
                    file: 'quittance_template.json',
                    title: 'Quittance de loyer mensuelle',
                    desc: 'Couleurs de charte, coordonnées du bailleur, texte d\'attestation officiel.'
                  },
                  {
                    file: 'avis_echeance_template.json',
                    title: 'Avis d\'échéance / Appel de loyer',
                    desc: 'IBAN/BIC par défaut, jour d\'échéance, mentions légales de paiement.'
                  },
                  {
                    file: 'etat_des_lieux_template.json',
                    title: 'États des lieux (Entrée & Sortie)',
                    desc: 'Liste des pièces par défaut (Séjour, Cuisine, Chambres, etc.) et observations types.'
                  },
                  {
                    file: 'fin_bail_template.json',
                    title: 'Attestation de fin de bail & caution',
                    desc: 'Clause de libération des lieux et modèle de restitution de garantie.'
                  },
                  {
                    file: 'contrat_bail_template.json',
                    title: 'Contrat de location Loi ALUR',
                    desc: 'Clauses d\'indexation IRL, clause résolutoire et inventaire meublé obligatoire.'
                  },
                  {
                    file: 'GUIDE_PERSONNALISATION_TEMPLATES.md',
                    title: 'Guide complet d\'explication',
                    desc: 'Manuel pas-à-pas expliquant comment modifier chaque paramètre et variable.'
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#e0e7ff', padding: '2px 6px', borderRadius: 4 }}>
                          {item.file}
                        </code>
                        <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--color-text)' }}>
                          {item.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                💡 <strong>Prise en compte immédiate :</strong> Chaque modification effectuée dans ces fichiers JSON est automatiquement et instantanément prise en compte lors de la génération de vos prochains documents PDF, sans nécessiter de redémarrage de l'application.
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
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Icon name="settings" size={24} /></div>
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
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Icon name="lock" size={24} /></div>
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
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Icon name="zap" size={24} /></div>
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
              <div style={{ padding: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1E40AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Renseignez vos identifiants Google Cloud Console pour la connexion Gmail et Google Maps.</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => openExternalUrl('https://console.cloud.google.com/apis/credentials')}
                >
                  Ouvrir Google Cloud Console
                </button>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Google Client ID (OAuth 2.0) *</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="ex: 1234567890-xyz.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Google Client Secret (Optionnel)</label>
                <input
                  type="password"
                  className="form-control"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
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
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="AIzaSy..."
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                />
              </div>

              <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 11, lineHeight: 1.6 }}>
                <strong>Comment créer son Client ID Google gratuit en 1 minute :</strong>
                <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li>Cliquez sur le bouton <strong>"Ouvrir Google Cloud Console"</strong> ci-dessus.</li>
                  <li>Cliquez sur <strong>Créer des identifiants</strong> → <strong>ID client OAuth</strong>.</li>
                  <li>Choisissez le type d'application : <strong>Application de bureau</strong> (Desktop App).</li>
                  <li>Nommez-la <em>"KeyFolio"</em> et cliquez sur <strong>Créer</strong>.</li>
                  <li>Copiez le <strong>Client ID</strong> et le <strong>Client Secret</strong> fournis et collez-les dans les champs ci-dessus !</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', background: 'var(--color-surface-2)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer les options'}
          </button>
        </div>
      </div>

      {/* Modale d'Édition des Modèles PDF */}
      <PdfTemplateManagerModal
        isOpen={templateEditorOpen}
        onClose={() => setTemplateEditorOpen(false)}
      />
    </div>
  )
}
