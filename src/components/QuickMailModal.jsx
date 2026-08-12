import React, { useState, useEffect } from 'react'
import { sendEmail } from '../lib/db'

export default function QuickMailModal({
  bienId,
  bienNom,
  type = 'custom', // 'revision' | 'quittance' | 'relance' | 'bienvenue' | 'maintenance' | 'custom'
  recipientName = '',
  recipientEmail = '',
  extraData = {}, // { loyer, mois, dateIntervention, etc. }
  onClose,
  onOpenFullMailbox
}) {
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
  const curMonth = months[new Date().getMonth()]
  const curYear = new Date().getFullYear()
  const todayStr = new Date().toLocaleDateString('fr-FR')

  const getPreset = () => {
    switch (type) {
      case 'revision':
        return {
          label: '📈 Révision de Loyer',
          subject: `Révision de loyer — ${bienNom || 'Votre logement'}`,
          body: `Madame, Monsieur ${recipientName},

Conformément aux termes de votre bail et à l'indice de référence des loyers (IRL), votre loyer mensuel est révisé à ${extraData.loyer ? extraData.loyer + ' €' : '[NOUVEAU_MONTANT] €'}.

Cette révision prend effet ce jour.

Cordialement,
Le Propriétaire`
        }
      case 'quittance':
        return {
          label: '📄 Quittance de Loyer',
          subject: `Quittance de loyer ${curMonth} ${curYear} — ${bienNom || 'Logement'}`,
          body: `Madame, Monsieur ${recipientName},

Nous vous confirmons la bonne réception de votre règlement concernant le loyer du mois de ${curMonth} ${curYear} pour le logement ${bienNom || ''}.

Montant réglé : ${extraData.montant ? extraData.montant + ' €' : '[MONTANT] €'}

Cordialement,
Le Propriétaire`
        }
      case 'relance':
        return {
          label: '⚠️ Relance Impayé',
          subject: `Rappel — Loyer de ${curMonth} ${curYear} en attente`,
          body: `Madame, Monsieur ${recipientName},

Sauf erreur ou retard bancaire, le règlement de votre loyer du mois de ${curMonth} ${curYear} (${extraData.montant ? extraData.montant + ' €' : ''}) ne nous est pas encore parvenu.

Merci de procéder au règlement dans les plus brefs délais.

Cordialement,
Le Propriétaire`
        }
      case 'bienvenue':
        return {
          label: '👋 Bienvenue & Remise des Clés',
          subject: `Bienvenue dans votre logement ${bienNom || ''}`,
          body: `Bonjour ${recipientName},

Nous sommes ravis de vous compter parmi nos locataires pour le logement ${bienNom || ''} !

Votre bail prend effet le ${extraData.dateDebut || todayStr}. N'hésitez pas à nous contacter pour toute question relative à votre entrée dans les lieux.

Bien cordialement,
Le Propriétaire`
        }
      case 'maintenance':
        return {
          label: '🔧 Avis d\'Intervention Maintenance',
          subject: `Intervention technique — ${bienNom || 'Votre logement'}`,
          body: `Bonjour ${recipientName},

Nous vous informons qu'une intervention de maintenance est prévue le ${extraData.date || todayStr} concernant : ${extraData.titre || 'travaux dans votre logement'}.

Merci de faciliter l'accès au logement ou de nous contacter si besoin.

Cordialement,
Le Propriétaire`
        }
      default:
        return {
          label: '✉️ Message au locataire',
          subject: `Information concernant votre logement ${bienNom || ''}`,
          body: `Bonjour ${recipientName},

...

Cordialement,
Le Propriétaire`
        }
    }
  }

  const preset = getPreset()
  const [to, setTo] = useState(recipientEmail)
  const [subject, setSubject] = useState(preset.subject)
  const [body, setBody] = useState(preset.body)
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    if (!to.trim()) { setStatusMsg('❌ Veuillez préciser un e-mail destinataire.'); return }
    if (!bienId) { setStatusMsg('❌ Aucun bien sélectionné.'); return }

    setSending(true)
    setStatusMsg('')
    try {
      await sendEmail({
        bienId,
        to: to.trim(),
        subject: subject.trim(),
        body: body,
        attachments: null
      })
      setStatusMsg('✅ E-mail rapide envoyé avec succès !')
      setTimeout(() => { onClose() }, 1400)
    } catch (err) {
      console.error(err)
      setStatusMsg(`❌ Erreur d'envoi : ${err?.message || err?.toString() || err}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✉️ Mail Rapide — {preset.label}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSend}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', width: 65 }}>À :</span>
            <input
              className="form-control"
              type="email"
              required
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="locataire@email.fr"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', width: 65 }}>Objet :</span>
            <input
              className="form-control"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Contenu de l'e-mail</label>
            <textarea
              className="form-control"
              rows={7}
              required
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5 }}
            />
          </div>

          {statusMsg && (
            <div className={`alert ${statusMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 12 }}>
              {statusMsg}
            </div>
          )}

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            {onOpenFullMailbox ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { onClose(); onOpenFullMailbox(bienId); }}
              >
                📬 Ouvrir dans la Boîte Mail complète
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? '📤 Envoi...' : '📤 Envoyer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
