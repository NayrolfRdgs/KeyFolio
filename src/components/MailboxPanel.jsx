import React, { useEffect, useState } from 'react'
import { getBienEmailConfig, saveBienEmailConfig, clearBienEmailConfig, getBaux, fetchEmails, createMaintenance, sendEmail, openExternalUrl, startGoogleOauth, saveEmailAttachmentToBien } from '../lib/db'
import Icon from './Icon'
import MailList from './mailbox/MailList'
import MailDetail from './mailbox/MailDetail'

const DEFAULT_CONFIG = {
  email_adresse: '',
  password: '',
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 465,
  use_ssl: true,
}

const EMAIL_TEMPLATES = [
  {
    id: 'quittance',
    label: '📄 Quittance de loyer',
    subject: 'Quittance de loyer — [MOIS]',
    body: `Madame, Monsieur,

Veuillez trouver ci-joint votre quittance de loyer pour le mois de [MOIS].

Montant du loyer : [MONTANT] €
Charges : [CHARGES] €
Total réglé : [TOTAL] €

Nous vous en accusons bonne réception.

Cordialement,
[BAILLEUR]`
  },
  {
    id: 'relance',
    label: '⚠️ Relance impayé',
    subject: 'Rappel — Loyer du [MOIS] non reçu',
    body: `Madame, Monsieur,

Sauf erreur de notre part, le règlement de votre loyer du mois de [MOIS] d'un montant de [MONTANT] € n'a pas encore été effectué.

Merci de procéder au règlement dans les meilleurs délais.

En cas de difficulté, n'hésitez pas à nous contacter.

Cordialement,
[BAILLEUR]`
  },
  {
    id: 'visite',
    label: '🔧 Avis de passage',
    subject: 'Avis de passage — [DATE]',
    body: `Madame, Monsieur,

Nous vous informons qu'un passage est prévu le [DATE] entre [HEURE_DEBUT] et [HEURE_FIN] pour [MOTIF].

Merci de nous confirmer votre disponibilité ou de nous contacter pour convenir d'une autre date.

Cordialement,
[BAILLEUR]`
  },
  {
    id: 'augmentation',
    label: '📈 Révision de loyer',
    subject: 'Révision annuelle de votre loyer',
    body: `Madame, Monsieur,

Conformément aux dispositions de votre bail et à l'indice de référence des loyers (IRL), votre loyer sera révisé à compter du [DATE].

Nouveau loyer mensuel : [NOUVEAU_MONTANT] €

Cette révision est effectuée conformément à l'article de votre contrat de bail.

Cordialement,
[BAILLEUR]`
  },
]

export default function MailboxPanel({ bienId, bienNom }) {
  const [view, setView] = useState('inbox') // 'inbox' | 'compose' | 'config'
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [configSaved, setConfigSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  // Mail inbox list state
  const [emails, setEmails] = useState([])
  const [selectedMail, setSelectedMail] = useState(null)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [emailFetchError, setEmailFetchError] = useState('')

  // Locataires dropdown for Compose
  const [bauxList, setBauxList] = useState([])
  const [selectedBailId, setSelectedBailId] = useState('')

  // Compose state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')

  // OAuth Google
  const [oauthConnected, setOauthConnected] = useState(false)
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('google_custom_client_id') || '')
  const [customClientSecret, setCustomClientSecret] = useState(() => localStorage.getItem('google_custom_client_secret') || '')
  const [showCloudTutorial, setShowCloudTutorial] = useState(false)

  // Attachments
  const [composeAttachments, setComposeAttachments] = useState([])
  const [savingAttachmentMsg, setSavingAttachmentMsg] = useState('')
  const [selectedSubfolder, setSelectedSubfolder] = useState('01_ADMINISTRATIF')

  // Maintenance creation state from email
  const [dispatchMsg, setDispatchMsg] = useState('')

  useEffect(() => {
    loadConfig()
    loadBauxAndLocataires()
  }, [bienId])

  const loadConfig = async () => {
    try {
      const res = await getBienEmailConfig(bienId)
      if (res) {
        setConfig({
          email_adresse: res.email_adresse || '',
          password: '',
          imap_host: res.imap_host || 'imap.gmail.com',
          imap_port: res.imap_port || 993,
          smtp_host: res.smtp_host || 'smtp.gmail.com',
          smtp_port: res.smtp_port || 465,
          use_ssl: res.use_ssl !== false,
        })
        setConfigSaved(true)
        if (res.email_adresse) {
          setView('inbox')
          fetchInbox(bienId)
        } else {
          setView('config')
        }
      } else {
        setView('config')
      }
    } catch (e) {
      console.error('Erreur chargement config email', e)
    }
  }

  const loadBauxAndLocataires = async () => {
    try {
      const bList = await getBaux(bienId)
      setBauxList(bList || [])
    } catch (e) {
      console.error('Erreur baux list', e)
    }
  }

  const fetchInbox = async (bid = bienId) => {
    setLoadingEmails(true)
    setEmailFetchError('')
    try {
      const list = await fetchEmails(bid)
      setEmails(list || [])
    } catch (e) {
      console.error('Erreur chargement emails', e)
      setEmailFetchError(e?.toString() || 'Erreur lors du chargement des e-mails.')
    } finally {
      setLoadingEmails(false)
    }
  }

  const handleSaveConfig = async (e) => {
    e?.preventDefault()
    if (!config.email_adresse.trim()) { setStatus('Adresse email obligatoire.'); return }
    setSaving(true)
    try {
      await saveBienEmailConfig({
        bien_id: bienId,
        email_adresse: config.email_adresse.trim(),
        password: config.password || undefined,
        imap_host: config.imap_host,
        imap_port: Number(config.imap_port),
        smtp_host: config.smtp_host,
        smtp_port: Number(config.smtp_port),
        use_ssl: config.use_ssl,
      })
      setStatus('✅ Configuration sauvegardée pour ce logement.')
      setConfig(prev => ({ ...prev, password: '' }))
      setConfigSaved(true)
      setView('inbox')
      fetchInbox(bienId)
    } catch (err) {
      setStatus(`❌ Erreur: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  const handleClearConfig = async () => {
    if (!confirm('Supprimer la configuration email de ce logement ?')) return
    await clearBienEmailConfig(bienId)
    setConfig(DEFAULT_CONFIG)
    setConfigSaved(false)
    setOauthConnected(false)
    setEmails([])
    setSelectedMail(null)
    setView('config')
    setStatus('')
  }

  const handleGoogleOAuth = async () => {
    setStatus('🔑 Lancement de la connexion Google... Votre navigateur Web s\'ouvre pour autoriser l\'accès.')
    if (customClientId) localStorage.setItem('google_custom_client_id', customClientId.trim())
    if (customClientSecret) localStorage.setItem('google_custom_client_secret', customClientSecret.trim())
    try {
      const userEmail = await startGoogleOauth(bienId, customClientId.trim() || null, customClientSecret.trim() || null)
      setStatus(`✅ Compte Gmail (${userEmail}) connecté avec succès !`)
      setConfig(prev => ({
        ...prev,
        email_adresse: userEmail,
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        use_ssl: true,
      }))
      setConfigSaved(true)
      setOauthConnected(true)
      setView('inbox')
      fetchInbox(bienId)
    } catch (err) {
      console.error('Erreur Google OAuth:', err)
      setStatus(`❌ Erreur connexion Google : ${err?.message || err?.toString() || err}`)
    }
  }

  const applyTemplate = (templateId) => {
    const tpl = EMAIL_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return

    let processedSubject = tpl.subject
    let processedBody = tpl.body

    // Si un locataire est selectionné, pré-remplir les variables
    if (selectedBailId) {
      const activeBail = bauxList.find(b => b.id === parseInt(selectedBailId))
      if (activeBail) {
        const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
        const curMonth = months[new Date().getMonth()]
        const curYear = new Date().getFullYear()

        const tenantName = `${activeBail.locataire_prenom} ${activeBail.locataire_nom}`
        const rentAmount = activeBail.loyer_mensuel || 0
        const chargeAmount = activeBail.charges_mensuelles || 0
        const totalAmount = rentAmount + chargeAmount

        processedSubject = processedSubject.replace(/\[MOIS\]/g, `${curMonth} ${curYear}`)
        processedBody = processedBody
          .replace(/\[MOIS\]/g, `${curMonth} ${curYear}`)
          .replace(/\[MONTANT\]/g, rentAmount.toString())
          .replace(/\[CHARGES\]/g, chargeAmount.toString())
          .replace(/\[TOTAL\]/g, totalAmount.toString())
          .replace(/\[LOCATAIRE\]/g, tenantName)
          .replace(/\[BAILLEUR\]/g, "Le Propriétaire")
      }
    }

    setComposeSubject(processedSubject)
    setComposeBody(processedBody)
    setSelectedTemplate(templateId)
  }

  const selectBail = (bailId) => {
    setSelectedBailId(bailId)
    if (bailId) {
      const activeBail = bauxList.find(b => b.id === parseInt(bailId))
      if (activeBail) {
        const email = activeBail.locataire_email || `${activeBail.locataire_prenom.toLowerCase()}.${activeBail.locataire_nom.toLowerCase()}@email.com`
        setComposeTo(email)
      }
    } else {
      setComposeTo('')
    }
  }

  const handleSendEmail = async (e) => {
    e.preventDefault()
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setSendStatus('Veuillez remplir tous les champs.')
      return
    }
    setSending(true)
    setSendStatus('')
    try {
      await sendEmail({
        bienId,
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
        attachments: composeAttachments.length > 0 ? composeAttachments : null,
      })
      setSendStatus('✅ Email envoyé avec succès !')
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      setComposeAttachments([])
      setSelectedTemplate('')
      setSelectedBailId('')
    } catch (err) {
      setSendStatus(`❌ Erreur d'envoi : ${err}`)
    } finally {
      setSending(false)
    }
  }

  const dispatchToMaintenance = async (mail) => {
    setDispatchMsg('')
    try {
      await createMaintenance({
        bien_id: bienId,
        titre: `Signalement email: ${mail.subject || 'Sans titre'}`,
        description: `Email de: ${mail.from}\nDate: ${mail.date}\n\n${mail.body_text || mail.body || ''}`,
        priorite: 'normal',
        statut: 'ouvert',
        prestataire: '',
        cout: null
      })
      setDispatchMsg('✅ Ticket maintenance créé avec succès à partir de cet e-mail !')
      setTimeout(() => setDispatchMsg(''), 4000)
    } catch (e) {
      console.error(e)
      setDispatchMsg(`❌ Erreur ticket: ${e}`)
    }
  }

  const handleSaveAttachment = async (att) => {
    setSavingAttachmentMsg('')
    try {
      await saveEmailAttachmentToBien({
        bienId,
        subfolder: selectedSubfolder,
        filename: att.filename,
        base64Data: att.base64_data,
      })
      setSavingAttachmentMsg(`✅ Fichier "${att.filename}" enregistré dans le dossier ${selectedSubfolder} !`)
      setTimeout(() => setSavingAttachmentMsg(''), 4000)
    } catch (err) {
      console.error(err)
      setSavingAttachmentMsg(`❌ Erreur d'enregistrement : ${err?.message || err?.toString() || err}`)
    }
  }

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1]
        setComposeAttachments(prev => [...prev, {
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          base64_data: base64Data
        }])
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeAttachment = (index) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="mailbox-panel">
      {/* Header */}
      <div className="mailbox-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>✉️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Boîte mail — {bienNom}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {configSaved ? config.email_adresse : 'Non configurée'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {configSaved && (
            <button className={`btn btn-sm ${view === 'inbox' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('inbox'); fetchInbox(); }}>
              📥 Boîte de réception
            </button>
          )}
          {configSaved && (
            <button className={`btn btn-sm ${view === 'compose' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('compose')}>
              ✏️ Composer
            </button>
          )}
          <button className={`btn btn-sm ${view === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('config')}>
            ⚙️ Config
          </button>
        </div>
      </div>

      {/* View: Inbox (Boîte de réception) */}
      {view === 'inbox' && (
        <div className="mailbox-body" style={{ padding: 0, display: 'flex', height: 420 }}>
          {/* Liste des e-mails à gauche */}
          <div style={{ flex: 1, borderRight: '1px solid var(--color-border)', overflowY: 'auto' }}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
              <strong style={{ fontSize: 13 }}>Messages reçus</strong>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchInbox()} disabled={loadingEmails} style={{ padding: '3px 8px' }}>
                {loadingEmails ? '🔄' : '🔄 Rafraîchir'}
              </button>
            </div>
            
            {emailFetchError && (
              <div className="alert alert-danger" style={{ margin: 10, fontSize: 12 }}>
                {emailFetchError}
              </div>
            )}
            
            {loadingEmails ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <span>⏳ Récupération des e-mails depuis le serveur...</span>
              </div>
            ) : emails.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Aucun e-mail reçu dans la boîte.
              </div>
            ) : (
              emails.map(mail => (
                <div 
                  key={mail.uid} 
                  onClick={() => setSelectedMail(mail)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    background: selectedMail?.uid === mail.uid ? 'var(--color-accent-dim)' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                      👤 {mail.from}
                    </strong>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {mail.date.split(' ').slice(0, 4).join(' ')}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-accent)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mail.subject || '(Sans objet)'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mail.body}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Corps de l'e-mail sélectionné à droite */}
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: 'var(--color-surface-2)', overflowY: 'auto' }}>
            {selectedMail ? (
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date : {selectedMail.date}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0' }}>De : {selectedMail.from}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>Objet : {selectedMail.subject}</div>
                </div>
                
                {/* Rendu e-mail propre HTML ou Texte */}
                <div style={{ flex: 1, minHeight: 200, marginBottom: 12, display: 'flex', flexDirection: 'column' }}>
                  {selectedMail.body_html ? (
                    <iframe
                      title="Mail HTML"
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;color:#1e293b;margin:10px;padding:0;}img{max-width:100%;height:auto;}</style></head><body>${selectedMail.body_html}</body></html>`}
                      style={{ width: '100%', height: 260, border: '1px solid var(--color-border)', background: '#ffffff', borderRadius: 8 }}
                    />
                  ) : (
                    <div style={{ flex: 1, whiteSpace: 'pre-wrap', fontSize: 13, background: 'var(--color-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', overflowY: 'auto' }}>
                      {selectedMail.body_text || selectedMail.body || '(Message sans contenu texte)'}
                    </div>
                  )}
                </div>

                {/* Section Pièces jointes reçues */}
                {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                  <div style={{ background: 'var(--color-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>📎 Pièces jointes ({selectedMail.attachments.length})</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dossier cible :</span>
                        <select
                          className="form-control"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                          value={selectedSubfolder}
                          onChange={e => setSelectedSubfolder(e.target.value)}
                        >
                          <option value="01_ADMINISTRATIF">01_ADMINISTRATIF</option>
                          <option value="02_DIAGNOSTICS_DDT">02_DIAGNOSTICS_DDT</option>
                          <option value="04_FISCAL_FINANCIER">04_FISCAL_FINANCIER</option>
                          <option value="05_TRAVAUX">05_TRAVAUX</option>
                          <option value="06_ENERGIE_CONTRATS">06_ENERGIE_CONTRATS</option>
                          <option value="07_LOCATION">07_LOCATION</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {selectedMail.attachments.map((att, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: 12 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                            {att.mime_type.startsWith('image/') ? '🖼️' : '📄'} <strong>{att.filename}</strong> <small style={{ color: 'var(--text-muted)' }}>({Math.round(att.size_bytes / 1024)} KB)</small>
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => handleSaveAttachment(att)}
                            >
                              💾 Enregistrer dans le bien
                            </button>
                            <a
                              href={`data:${att.mime_type};base64,${att.base64_data}`}
                              download={att.filename}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11, textDecoration: 'none' }}
                            >
                              ⬇️ Télécharger
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                    {savingAttachmentMsg && (
                      <div className={`alert ${savingAttachmentMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 8, padding: 6, fontSize: 11 }}>
                        {savingAttachmentMsg}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => dispatchToMaintenance(selectedMail)}>
                    🔧 Envoyer en Ticket Maintenance
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => {
                      setComposeTo(selectedMail.from.match(/<([^>]+)>/)?.[1] || selectedMail.from);
                      setComposeSubject(`Re: ${selectedMail.subject}`);
                      setView('compose');
                    }}
                  >
                    ✏️ Répondre
                  </button>
                </div>
                {dispatchMsg && (
                  <div className={`alert ${dispatchMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 10, padding: 8, fontSize: 12 }}>
                    {dispatchMsg}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
                Sélectionnez un e-mail à gauche pour afficher son contenu.
              </div>
            )}
          </div>
        </div>
      )}

      {/* View: Config */}
      {view === 'config' && (
        <div className="mailbox-body">
          {/* Option 1 : Connexion Google Gmail (Thunderbird Style) */}
          <div className="mailbox-section" style={{ background: 'var(--color-surface-2)', padding: 18, borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="https://www.google.com/favicon.ico" width={20} height={20} alt="Google" />
              Connexion Google Mail (1-Clic — Style Thunderbird)
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Connectez votre compte Gmail en un clic. Une fenêtre officielle Google s'ouvre pour valider l'accès à votre boîte mail.
            </p>

            {/* Champs Identifiants Client ID Google */}
            <div style={{ background: 'var(--color-surface)', padding: 14, borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔑 Identifiants Google Cloud OAuth (Renseignez votre Client ID ci-dessous)</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => openExternalUrl('https://console.cloud.google.com/apis/credentials')}
                >
                  🌐 Accéder à Google Cloud Console
                </button>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Client ID Google (ex: 123456789-xxxx.apps.googleusercontent.com)
                  </label>
                  <input
                    className="form-control"
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                    placeholder="Collez votre Client ID Google Cloud ici"
                    value={customClientId}
                    onChange={e => {
                      setCustomClientId(e.target.value)
                      localStorage.setItem('google_custom_client_id', e.target.value)
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Client Secret Google (Optionnel, ex: GOCSPX-xxxx)
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                    placeholder="Collez votre Client Secret Google ici"
                    value={customClientSecret}
                    onChange={e => {
                      setCustomClientSecret(e.target.value)
                      localStorage.setItem('google_custom_client_secret', e.target.value)
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => setShowCloudTutorial(!showCloudTutorial)}
                style={{ padding: 0, marginTop: 8, fontSize: 11, color: 'var(--color-accent)' }}
              >
                {showCloudTutorial ? '📖 Masquer le tutoriel Client ID' : '💡 Comment créer son Client ID Google gratuit en 1 minute ?'}
              </button>

              {showCloudTutorial && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--color-bg-subtle)', borderRadius: 6, fontSize: 11, lineHeight: 1.6 }}>
                  <strong>Tutoriel 1 minute :</strong>
                  <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    <li>Cliquez sur le bouton <strong>"🌐 Accéder à Google Cloud Console"</strong> ci-dessus.</li>
                    <li>Cliquez sur <strong>Créer des identifiants</strong> → <strong>ID client OAuth</strong>.</li>
                    <li>Choisissez le type d'application : <strong>Application de bureau</strong> (Desktop App).</li>
                    <li>Nommez-la <em>"LePuits"</em> et cliquez sur <strong>Créer</strong>.</li>
                    <li>Copiez le <strong>Client ID</strong> et le <strong>Client Secret</strong> fournis et collez-les dans les deux champs ci-dessus !</li>
                  </ol>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                    <strong style={{ color: 'var(--color-danger)' }}>⚠️ Si vous avez l'erreur 403 (access_denied / Appli en cours de test) :</strong>
                    <br />
                    Sur Google Cloud, allez sur la page <strong>Écran de consentement OAuth</strong> → faites défiler jusqu'à <strong>Utilisateurs de test</strong> → cliquez sur <strong>+ ADD USERS</strong> et ajoutez votre adresse Gmail !
                    <br />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 6, padding: '3px 8px', fontSize: 11 }}
                      onClick={() => openExternalUrl('https://console.cloud.google.com/apis/credentials/consent')}
                    >
                      🌐 Ouvrir l'Écran de consentement (Ajouter mon adresse Gmail en testeur)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGoogleOAuth}
                style={{ background: 'linear-gradient(135deg, #4285f4, #34a853)', border: 'none', fontWeight: 600, padding: '10px 20px', fontSize: 14 }}
              >
                🔑 Se connecter avec Google (Autoriser)
              </button>
              {configSaved && config.imap_host === 'imap.gmail.com' && (
                <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 12 }}>
                  ✓ Gmail connecté ({config.email_adresse})
                </span>
              )}
            </div>
          </div>

          <div className="mailbox-divider">
            <span>OU — Configuration IMAP/SMTP classique</span>
          </div>

          {/* Option 2 : IMAP/SMTP */}
          <form onSubmit={handleSaveConfig} style={{ display: 'grid', gap: 14, maxWidth: 600 }}>
            <div>
              <label className="form-label">Adresse email *</label>
              <input className="form-control" type="email" placeholder="nom@gmail.com ou nom@outlook.com"
                value={config.email_adresse}
                onChange={e => setConfig({...config, email_adresse: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Mot de passe applicatif</label>
              <input className="form-control" type="password"
                value={config.password}
                onChange={e => setConfig({...config, password: e.target.value})}
                placeholder="Laisser vide pour conserver l'actuel" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Gmail : générez un <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>mot de passe d'application</a> (non votre mot de passe habituel)
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <div>
                <label className="form-label">IMAP host</label>
                <input className="form-control" value={config.imap_host} onChange={e => setConfig({...config, imap_host: e.target.value})} />
              </div>
              <div style={{ minWidth: 90 }}>
                <label className="form-label">Port</label>
                <input type="number" className="form-control" value={config.imap_port} onChange={e => setConfig({...config, imap_port: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <div>
                <label className="form-label">SMTP host</label>
                <input className="form-control" value={config.smtp_host} onChange={e => setConfig({...config, smtp_host: e.target.value})} />
              </div>
              <div style={{ minWidth: 90 }}>
                <label className="form-label">Port</label>
                <input type="number" className="form-control" value={config.smtp_port} onChange={e => setConfig({...config, smtp_port: e.target.value})} />
              </div>
            </div>

            {/* Presets rapides */}
            <div>
              <label className="form-label">Preset rapide</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Gmail', imap: 'imap.gmail.com', smtp: 'smtp.gmail.com', ip: 993, sp: 465 },
                  { label: 'Outlook', imap: 'outlook.office365.com', smtp: 'smtp.office365.com', ip: 993, sp: 587 },
                  { label: 'Yahoo', imap: 'imap.mail.yahoo.com', smtp: 'smtp.mail.yahoo.com', ip: 993, sp: 465 },
                  { label: 'OVH', imap: 'ssl0.ovh.net', smtp: 'ssl0.ovh.net', ip: 993, sp: 465 },
                ].map(preset => (
                  <button key={preset.label} type="button" className="btn btn-secondary btn-sm"
                    onClick={() => setConfig({...config, imap_host: preset.imap, smtp_host: preset.smtp, imap_port: preset.ip, smtp_port: preset.sp})}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement...' : '💾 Enregistrer la configuration'}
              </button>
              {configSaved && (
                <button type="button" className="btn btn-secondary" onClick={handleClearConfig}>
                  Supprimer
                </button>
              )}
            </div>

            {status && (
              <div className={`alert ${status.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ margin: 0 }}>
                {status}
              </div>
            )}
          </form>
        </div>
      )}

      {/* View: Composer */}
      {view === 'compose' && (
        <div className="mailbox-body">
          <div className="mailbox-compose-layout">
            {/* Panneau Templates à gauche */}
            <div className="mailbox-templates">
              <h5 style={{ margin: '0 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Destinataire
              </h5>
              
              <select 
                className="form-control" 
                value={selectedBailId} 
                onChange={e => selectBail(e.target.value)}
                style={{ marginBottom: 18 }}
              >
                <option value="">Sélectionner un locataire</option>
                {bauxList.map(b => (
                  <option key={b.id} value={b.id}>
                    👤 {b.locataire_prenom} {b.locataire_nom} ({b.statut})
                  </option>
                ))}
              </select>

              <h5 style={{ margin: '0 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Modèles
              </h5>
              {EMAIL_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className={`mailbox-template-btn ${selectedTemplate === t.id ? 'active' : ''}`}
                  onClick={() => applyTemplate(t.id)}
                >
                  {t.label}
                </button>
              ))}
              <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <strong>Variables disponibles :</strong><br />
                [MOIS] [MONTANT] [DATE] [BAILLEUR] [LOCATAIRE]
              </div>
            </div>

            {/* Formulaire de composition */}
            <form onSubmit={handleSendEmail} className="mailbox-compose-form">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 50 }}>De :</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{config.email_adresse || 'Non configuré'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 50 }}>À :</label>
                <input className="form-control" type="email" required
                  value={composeTo} onChange={e => setComposeTo(e.target.value)}
                  placeholder="destinataire@email.com" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 50 }}>Objet :</label>
                <input className="form-control" required
                  value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Sujet de l'email" />
              </div>
              <textarea
                className="form-control mailbox-compose-textarea"
                required
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Rédigez votre message ici ou sélectionnez un modèle à gauche..."
              />

              {/* Pièces jointes à envoyer */}
              <div style={{ marginTop: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, padding: '4px 10px', fontSize: 12 }}>
                    📎 Joindre des fichiers (Images, PDF, Documents...)
                    <input type="file" multiple onChange={handleFileAttach} style={{ display: 'none' }} />
                  </label>
                  {composeAttachments.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {composeAttachments.length} fichier(s) joint(s)
                    </span>
                  )}
                </div>

                {composeAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {composeAttachments.map((att, idx) => (
                      <span key={idx} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 11 }}>
                        {att.filename}
                        <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-danger)' }}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={sending || !config.email_adresse}>
                  {sending ? '📤 Envoi...' : '📤 Envoyer'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setComposeTo(''); setComposeSubject(''); setComposeBody(''); setSelectedTemplate('') }}>
                  Effacer
                </button>
                {!config.email_adresse && (
                  <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>⚠ Email non configuré</span>
                )}
              </div>
              {sendStatus && (
                <div className={`alert ${sendStatus.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 10 }}>
                  {sendStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
