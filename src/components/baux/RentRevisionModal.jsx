import React, { useState } from 'react'
import { sendEmail } from '../../lib/db'

export default function RentRevisionModal({ bail, newRentAmount, oldRentAmount, onClose, onSent }) {
  const locataireName = bail ? `${bail.locataire_prenom || ''} ${bail.locataire_nom || ''}`.trim() : 'Locataire'
  const locataireEmail = bail?.locataire_email || ''
  const bienNom = bail?.bien_nom || 'Logement'
  const bienId = bail?.bien_id || null

  const todayStr = new Date().toLocaleDateString('fr-FR')
  const defaultNewRent = newRentAmount || bail?.loyer_mensuel || ''

  const [to, setTo] = useState(locataireEmail)
  const [subject, setSubject] = useState(`Révision annuelle de votre loyer — ${bienNom}`)
  const [nouveauLoyer, setNouveauLoyer] = useState(defaultNewRent)
  const [ancienLoyer, setAncienLoyer] = useState(oldRentAmount || bail?.loyer_mensuel || '')
  const [datePriseEffet, setDatePriseEffet] = useState(todayStr)
  const [customBody, setCustomBody] = useState('')
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const generateBody = (nRent, aRent, dateEffet) => `Madame, Monsieur ${locataireName},

Conformément aux dispositions de votre bail et à l'indice de référence des loyers (IRL), nous vous informons que le montant de votre loyer sera révisé.

• Ancien loyer mensuel (hors charges) : ${aRent ? aRent + ' €' : '—'}
• Nouveau loyer mensuel (hors charges) : ${nRent ? nRent + ' €' : '—'}
• Date de prise d'effet : ${dateEffet || todayStr}

Nous vous remercions de bien vouloir prendre en compte ce nouveau montant pour vos futurs règlements.

Cordialement,
Le Propriétaire`

  const currentBody = customBody || generateBody(nouveauLoyer, ancienLoyer, datePriseEffet)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!to.trim()) { setStatusMsg('❌ Veuillez saisir une adresse email valide.'); return }
    if (!bienId) { setStatusMsg('❌ Aucun bien associé au bail.'); return }

    setSending(true)
    setStatusMsg('')
    try {
      await sendEmail({
        bienId,
        to: to.trim(),
        subject: subject.trim(),
        body: currentBody,
        attachments: null
      })
      setStatusMsg('✅ E-mail de révision de loyer envoyé avec succès !')
      setTimeout(() => {
        if (onSent) onSent()
        onClose()
      }, 1500)
    } catch (err) {
      console.error(err)
      setStatusMsg(`❌ Erreur d'envoi : ${err?.message || err?.toString() || err}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📈 Mail de Révision de Loyer</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSend}>
          <div className="alert alert-info" style={{ fontSize: 12, marginBottom: 14 }}>
            💡 Ce raccourci génère et envoie l'e-mail officiel de révision de loyer au locataire <strong>{locataireName}</strong> pour le logement <strong>{bienNom}</strong>.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Destinataire (Email) *</label>
              <input
                className="form-control"
                type="email"
                required
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="email@locataire.fr"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date de prise d'effet</label>
              <input
                className="form-control"
                value={datePriseEffet}
                onChange={e => setDatePriseEffet(e.target.value)}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ancien loyer (€)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={ancienLoyer}
                onChange={e => setAncienLoyer(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nouveau loyer (€) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                required
                value={nouveauLoyer}
                onChange={e => setNouveauLoyer(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sujet de l'email *</label>
            <input
              className="form-control"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Aperçu & Contenu du message</label>
            <textarea
              className="form-control"
              rows={8}
              value={currentBody}
              onChange={e => setCustomBody(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5 }}
            />
          </div>

          {statusMsg && (
            <div className={`alert ${statusMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 12 }}>
              {statusMsg}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? '📤 Envoi en cours...' : '📤 Envoyer le mail au locataire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
