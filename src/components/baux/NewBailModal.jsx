import React, { useState, useEffect } from 'react'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import {
  getCandidatures, getLocataires, createLocataire,
  createBail, terminateBail, updateCandidatureStatut
} from '../../lib/db'
import { todayISO, formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function NewBailModal({ bien, activeBail, champsMap = {}, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('manual') // 'manual' | 'candidature' | 'existing_locataire'
  const [candidatures, setCandidatures] = useState([])
  const [selectedCandId, setSelectedCandId] = useState('')
  const [locatairesList, setLocatairesList] = useState([])
  const [selectedLocId, setSelectedLocId] = useState('')
  const [pdfPath, setPdfPath] = useState('')

  // Confirmation fin de bail si un bail est déjà actif
  const [confirmTerminateOld, setConfirmTerminateOld] = useState(!!activeBail)

  // Formulaire Locataire
  const [locataireForm, setLocataireForm] = useState({
    nom: '', prenom: '', telephone: '', email: '',
    revenus_mensuels: '', profession: '', garant_nom: '', garant_contact: '', notes: ''
  })

  // Formulaire Bail
  const defaultLoyer = champsMap['loyer_actuel'] || bien?.loyer_mensuel || 650
  const defaultCharges = champsMap['charges_mensuelles'] || 50
  const [bailForm, setBailForm] = useState({
    date_debut: todayISO(),
    date_fin: '',
    loyer_mensuel: String(defaultLoyer),
    charges_mensuelles: String(defaultCharges),
    depot_garantie: String(defaultLoyer),
    jour_paiement: 5,
    notes: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [bien.id])

  const loadInitialData = async () => {
    try {
      const cands = await getCandidatures(bien.id)
      if (cands) setCandidatures(cands.filter(c => c.statut !== 'refuse' && c.statut !== 'converti'))

      const locs = await getLocataires()
      if (locs) setLocatairesList(locs)
    } catch (e) {
      console.error(e)
    }
  }

  // Sélection d'une candidature
  const handleSelectCandidature = (candId) => {
    setSelectedCandId(candId)
    if (!candId) return

    const cand = candidatures.find(c => String(c.id) === String(candId))
    if (cand) {
      setLocataireForm({
        nom: cand.nom || '',
        prenom: cand.prenom || '',
        telephone: cand.telephone || '',
        email: cand.email || '',
        revenus_mensuels: cand.revenus_mensuels ? String(cand.revenus_mensuels) : '',
        profession: cand.profession || '',
        garant_nom: cand.garant_nom || '',
        garant_contact: cand.garant_contact || '',
        notes: `Candidature pour ${bien.nom}`
      })
    }
  }

  // Sélection d'un locataire existant
  const handleSelectExistingLocataire = (locId) => {
    setSelectedLocId(locId)
    if (!locId) return
    const loc = locatairesList.find(l => String(l.id) === String(locId))
    if (loc) {
      setLocataireForm({
        nom: loc.nom || '',
        prenom: loc.prenom || '',
        telephone: loc.telephone || '',
        email: loc.email || '',
        revenus_mensuels: loc.revenus_mensuels ? String(loc.revenus_mensuels) : '',
        profession: loc.profession || '',
        garant_nom: loc.garant_nom || '',
        garant_contact: loc.garant_contact || '',
        notes: loc.notes || ''
      })
    }
  }

  const handleBrowsePdf = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: 'Contrat PDF', extensions: ['pdf', 'doc', 'docx'] }]
      })
      if (selected) {
        setPdfPath(typeof selected === 'string' ? selected : selected[0])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!locataireForm.nom.trim()) {
        throw new Error('Le nom du locataire est obligatoire')
      }

      // 1. Mettre fin au bail précédent si un bail était actif
      if (activeBail) {
        const dateFinAncien = bailForm.date_debut || todayISO()
        await terminateBail(activeBail.id, dateFinAncien)
      }

      // 2. Récupérer ou Créer le locataire
      let locId = null
      if (mode === 'existing_locataire' && selectedLocId) {
        locId = parseInt(selectedLocId)
      } else {
        const locPayload = {
          nom: locataireForm.nom.trim(),
          prenom: locataireForm.prenom.trim(),
          telephone: locataireForm.telephone.trim(),
          email: locataireForm.email.trim(),
          revenus_mensuels: locataireForm.revenus_mensuels ? parseFloat(locataireForm.revenus_mensuels) : null,
          profession: locataireForm.profession.trim(),
          garant_nom: locataireForm.garant_nom.trim(),
          garant_contact: locataireForm.garant_contact.trim(),
          notes: locataireForm.notes.trim()
        }
        locId = await createLocataire(locPayload, pdfPath || null)
      }

      // 3. Créer le nouveau bail
      const bailPayload = {
        bien_id: bien.id,
        locataire_id: locId,
        date_debut: bailForm.date_debut || todayISO(),
        date_fin: bailForm.date_fin || null,
        loyer_mensuel: parseFloat(bailForm.loyer_mensuel || 0),
        charges_mensuelles: parseFloat(bailForm.charges_mensuelles || 0),
        depot_garantie: bailForm.depot_garantie ? parseFloat(bailForm.depot_garantie) : null,
        jour_paiement: parseInt(bailForm.jour_paiement || 5, 10),
        statut: 'actif',
        fichier_bail: pdfPath || null
      }

      await createBail(bailPayload)

      // 4. Si issu d'une candidature, mettre à jour son statut
      if (mode === 'candidature' && selectedCandId) {
        await updateCandidatureStatut(parseInt(selectedCandId), 'converti')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err?.toString() || 'Erreur lors de la création du bail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 720, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Créer un nouveau bail — {bien.nom}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Enregistrement d'un bail actif et rattachement automatique aux dossiers du bien
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} type="button">
            <Icon name="x" size={18} />
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

        {/* ALERTE FIN DE BAIL ACTIF */}
        {activeBail && (
          <div className="alert alert-warning" style={{ marginBottom: 16, padding: 12, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="alert" size={20} color="#f59e0b" />
            <div>
              <strong style={{ fontSize: 13 }}>Un bail est actuellement actif sur ce bien</strong>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Locataire actuel : <strong>{activeBail.locataire_prenom} {activeBail.locataire_nom}</strong> ({formatEuro(activeBail.loyer_mensuel)}/mois).
              </div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>
                La création du nouveau bail clôturera automatiquement le bail précédent à la date de démarrage du nouveau bail.
              </div>
            </div>
          </div>
        )}

        {/* ONGLETS SÉLECTION SOURCE LOCATAIRE */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--color-surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => { setMode('manual'); setSelectedCandId(''); setSelectedLocId('') }}
          >
            Saisie manuelle locataire
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'candidature' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => { setMode('candidature'); setSelectedLocId('') }}
          >
            Preremplir via Candidature ({candidatures.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'existing_locataire' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, fontSize: 12 }}
            onClick={() => { setMode('existing_locataire'); setSelectedCandId('') }}
          >
             Locataire existant
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* SÉLECTEUR SI CANDIDATURE */}
          {mode === 'candidature' && (
            <div className="form-group" style={{ marginBottom: 16, background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <label style={{ fontWeight: 800 }}>Sélectionner une candidature reçue pour ce logement :</label>
              {candidatures.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Aucune candidature en attente enregistrée pour ce logement.
                </div>
              ) : (
                <select
                  className="form-control"
                  value={selectedCandId}
                  onChange={e => handleSelectCandidature(e.target.value)}
                >
                  <option value="">-- Choisir un candidat --</option>
                  {candidatures.map(c => (
                    <option key={c.id} value={c.id}>
                       {c.nom} {c.prenom} {c.revenus_mensuels ? `(${formatEuro(c.revenus_mensuels)}/mois)` : ''} — {c.profession || 'Sans info'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* SÉLECTEUR SI LOCATAIRE EXISTANT */}
          {mode === 'existing_locataire' && (
            <div className="form-group" style={{ marginBottom: 16, background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <label style={{ fontWeight: 800 }}>Choisir un locataire déjà enregistré dans l'application :</label>
              <select
                className="form-control"
                value={selectedLocId}
                onChange={e => handleSelectExistingLocataire(e.target.value)}
              >
                <option value="">-- Sélectionner dans l'annuaire locataires --</option>
                {locatairesList.map(l => (
                  <option key={l.id} value={l.id}>
                     {l.nom} {l.prenom} {l.email ? `(${l.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* BLOC INFORMATIONS LOCATAIRE */}
          <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800 }}> Informations du Locataire</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Nom du locataire *</label>
                <input
                  type="text" className="form-control" required
                  placeholder="ex: DUPONT"
                  value={locataireForm.nom}
                  onChange={e => setLocataireForm({ ...locataireForm, nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text" className="form-control"
                  placeholder="ex: Jean"
                  value={locataireForm.prenom}
                  onChange={e => setLocataireForm({ ...locataireForm, prenom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel" className="form-control"
                  placeholder="06 12 34 56 78"
                  value={locataireForm.telephone}
                  onChange={e => setLocataireForm({ ...locataireForm, telephone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email" className="form-control"
                  placeholder="jean.dupont@email.com"
                  value={locataireForm.email}
                  onChange={e => setLocataireForm({ ...locataireForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Profession</label>
                <input
                  type="text" className="form-control"
                  placeholder="ex: Ingénieur, CDI..."
                  value={locataireForm.profession}
                  onChange={e => setLocataireForm({ ...locataireForm, profession: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Revenus mensuels (€)</label>
                <input
                  type="number" className="form-control"
                  placeholder="ex: 2800"
                  value={locataireForm.revenus_mensuels}
                  onChange={e => setLocataireForm({ ...locataireForm, revenus_mensuels: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border-color)' }}>
              <div className="form-group">
                <label>Nom du garant</label>
                <input
                  type="text" className="form-control"
                  placeholder="ex: DUPONT Michel"
                  value={locataireForm.garant_nom}
                  onChange={e => setLocataireForm({ ...locataireForm, garant_nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact du garant (Téléphone / Email)</label>
                <input
                  type="text" className="form-control"
                  placeholder="06 99 88 77 66"
                  value={locataireForm.garant_contact}
                  onChange={e => setLocataireForm({ ...locataireForm, garant_contact: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* BLOC INFORMATIONS DU BAIL */}
          <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800 }}> Conditions du Bail</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Date de début du bail *</label>
                <input
                  type="date" className="form-control" required
                  value={bailForm.date_debut}
                  onChange={e => setBailForm({ ...bailForm, date_debut: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date de fin (optionnel)</label>
                <input
                  type="date" className="form-control"
                  value={bailForm.date_fin}
                  onChange={e => setBailForm({ ...bailForm, date_fin: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Loyer mensuel HC (€) *</label>
                <input
                  type="number" step="0.01" className="form-control" required
                  placeholder="ex: 650"
                  value={bailForm.loyer_mensuel}
                  onChange={e => setBailForm({ ...bailForm, loyer_mensuel: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Charges mensuelles (€)</label>
                <input
                  type="number" step="0.01" className="form-control"
                  placeholder="ex: 50"
                  value={bailForm.charges_mensuelles}
                  onChange={e => setBailForm({ ...bailForm, charges_mensuelles: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Dépôt de garantie (€)</label>
                <input
                  type="number" step="0.01" className="form-control"
                  placeholder="ex: 650"
                  value={bailForm.depot_garantie}
                  onChange={e => setBailForm({ ...bailForm, depot_garantie: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Jour d'échéance de paiement</label>
                <input
                  type="number" min="1" max="31" className="form-control"
                  placeholder="5 (ex: le 5 du mois)"
                  value={bailForm.jour_paiement}
                  onChange={e => setBailForm({ ...bailForm, jour_paiement: e.target.value })}
                />
              </div>
            </div>

            {/* JOINDRE LE FICHIER PDF BAIL */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border-color)' }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}> Fichier contrat du bail (PDF / Word) :</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <input
                  type="text" className="form-control" readOnly
                  placeholder="Aucun fichier sélectionné"
                  value={pdfPath}
                  style={{ fontSize: 12 }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleBrowsePdf}>
                  Parcourir...
                </button>
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer le nouveau bail'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
