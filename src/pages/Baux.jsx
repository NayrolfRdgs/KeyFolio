import React, { useEffect, useState, useCallback } from 'react'
import { getBaux, createBail, updateBail, deleteBail, terminateBail, getBiens, getLocataires, openFilePath } from '../lib/db'
import { formatDate, formatEuro, labelStatutBail, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'
import EtatDesLieuxModal from '../components/EtatDesLieuxModal'
import BailGenerateurModal from '../components/BailGenerateurModal'

const EMPTY = {
  bien_id: '', locataire_id: '', date_debut: todayISO(), date_fin: '',
  loyer_mensuel: '', charges_mensuelles: '0', depot_garantie: '',
  statut_garantie: 'en_attente', fichier_caution: '',
  jour_paiement: '5', statut: 'actif', fichier_bail: '',
  type_bail: 'meuble', clause_irl: true,
  compteur_elec_entree: '', compteur_eau_entree: '', compteur_gaz_entree: '',
  notes_bail: ''
}

export default function Baux({ onNavigate, onOpenMail }) {
  const [baux, setBaux]             = useState([])
  const [biens, setBiens]           = useState([])
  const [locataires, setLocataires] = useState([])
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editing, setEditing]       = useState(null)
  const [oldLoyer, setOldLoyer]     = useState(null)
  const [filterBien, setFilterBien] = useState('')
  const [filterStatut, setFilterStatut] = useState('actif') // 'actif' | 'all' | 'termine'
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [toasts, setToasts]         = useState([])

  // Modal Fin de Bail enrichie
  const [terminateModal, setTerminateModal] = useState(null)

  // Modal État des Lieux de Sortie
  const [edlModalData, setEdlModalData] = useState(null)

  // Modal Générateur de Bail PDF
  const [bailGenerateurData, setBailGenerateurData] = useState(null)

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const loadAll = async () => {
    try {
      const [b, bi, lo] = await Promise.all([getBaux(), getBiens(), getLocataires()])
      setBaux(b); setBiens(bi); setLocataires(lo)
    } catch(e) { setError(e?.toString()) }
  }

  useEffect(() => { loadAll() }, [])

  const openCreate = () => {
    setForm({ ...EMPTY, bien_id: biens[0]?.id || '', locataire_id: locataires[0]?.id || '' })
    setEditing(null)
    setModal(true)
  }

  const openEdit = (b) => {
    setForm({
      ...b,
      bien_id: b.bien_id, locataire_id: b.locataire_id,
      loyer_mensuel: b.loyer_mensuel,
      charges_mensuelles: b.charges_mensuelles ?? 0,
      depot_garantie: b.depot_garantie ?? '',
      statut_garantie: b.statut_garantie || 'en_attente',
      fichier_caution: b.fichier_caution || '',
      jour_paiement: b.jour_paiement ?? 5,
      fichier_bail: b.fichier_bail || '',
      type_bail: b.type_bail || 'meuble',
      clause_irl: b.clause_irl ?? true,
      compteur_elec_entree: b.compteur_elec_entree || '',
      compteur_eau_entree: b.compteur_eau_entree || '',
      compteur_gaz_entree: b.compteur_gaz_entree || '',
      notes_bail: b.notes_bail || ''
    })
    setOldLoyer(b.loyer_mensuel)
    setEditing(b.id)
    setModal(true)
  }

  const handlePickBailFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le contrat de bail (PDF / Scan)',
        filters: [{ name: 'Documents PDF & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
      })
      if (selected) {
        setForm(prev => ({ ...prev, fichier_bail: selected }))
      }
    } catch (e) { console.warn(e) }
  }

  // Ouvrir le générateur de bail depuis le formulaire
  const handleOpenBailGenerator = () => {
    const targetBien = biens.find(b => b.id === parseInt(form.bien_id))
    const targetLoc = locataires.find(l => l.id === parseInt(form.locataire_id))
    setBailGenerateurData({
      bail: editing ? baux.find(b => b.id === editing) : null,
      bien: targetBien,
      locataire: targetLoc,
      formValues: form
    })
  }

  // Ouvrir le générateur de bail depuis une ligne du tableau
  const handleOpenBailGeneratorForRow = (b) => {
    const targetBien = biens.find(bi => bi.id === b.bien_id)
    const targetLoc = locataires.find(l => l.id === b.locataire_id)
    setBailGenerateurData({
      bail: b,
      bien: targetBien,
      locataire: targetLoc,
      formValues: b
    })
  }

  const openTerminateModal = (b) => {
    setTerminateModal({
      bail: b,
      bailId: b.id,
      locataireNom: `${b.locataire_prenom} ${b.locataire_nom}`,
      bienNom: b.bien_nom,
      dateFin: todayISO(),
      motifFin: 'Congé locataire',
      notesFin: '',
      restitutionCaution: 'restitue',
      montantRetenu: '',
      motifRetenue: '',
      compteurElec: '',
      compteurEau: '',
      compteurGaz: '',
      clesRemises: '2 jeux complets (porte + boîte aux lettres + badge)',
      generateEdl: true,
      sendClosingMail: false
    })
  }

  const handleConfirmTerminate = async (e) => {
    e.preventDefault()
    if (!terminateModal?.bailId) return
    setLoading(true)
    try {
      const notesDetails = [
        terminateModal.notesFin ? `Observations : ${terminateModal.notesFin}` : '',
        terminateModal.restitutionCaution ? `Caution : ${terminateModal.restitutionCaution === 'restitue' ? 'Restituée intégralement' : terminateModal.restitutionCaution === 'partiel_restitue' ? `Retenue de ${terminateModal.montantRetenu}€ (${terminateModal.motifRetenue})` : 'En attente'}` : '',
        terminateModal.clesRemises ? `Clés : ${terminateModal.clesRemises}` : '',
        terminateModal.compteurElec || terminateModal.compteurEau ? `Compteurs sortie : Elec=${terminateModal.compteurElec || '—'}, Eau=${terminateModal.compteurEau || '—'}, Gaz=${terminateModal.compteurGaz || '—'}` : ''
      ].filter(Boolean).join(' | ')

      await terminateBail(
        terminateModal.bailId,
        terminateModal.dateFin || todayISO(),
        terminateModal.motifFin || 'Congé locataire',
        notesDetails
      )

      addToast(`Le bail de ${terminateModal.locataireNom} a été clôturé et archivé.`)

      const terminatedBail = terminateModal.bail
      const terminationData = { ...terminateModal }
      setTerminateModal(null)
      await loadAll()

      // Si l'utilisateur a coché la génération d'état des lieux
      if (terminationData.generateEdl) {
        const targetBien = biens.find(bi => bi.id === terminatedBail.bien_id)
        const targetLoc = locataires.find(l => l.id === terminatedBail.locataire_id)
        setEdlModalData({
          bail: terminatedBail,
          bien: targetBien,
          locataire: targetLoc,
          terminationInfo: terminationData
        })
      }

      // Si l'utilisateur a coché l'envoi de mail de solde de tout compte
      if (terminationData.sendClosingMail && onOpenMail && terminatedBail.bien_id) {
        onOpenMail(terminatedBail.bien_id, {
          initialView: 'compose',
          initialTemplate: 'fin_bail',
          initialBailId: terminatedBail.id,
          recipientEmail: terminatedBail.locataire_email || ''
        })
      }
    } catch (err) {
      addToast(`Erreur clôture bail : ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDoc = async (relPath) => {
    try { await openFilePath(relPath) }
    catch (err) { addToast(`Impossible d'ouvrir le fichier : ${err}`, 'error') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form, id: editing,
        bien_id: parseInt(form.bien_id),
        locataire_id: parseInt(form.locataire_id),
        loyer_mensuel: parseFloat(form.loyer_mensuel),
        charges_mensuelles: parseFloat(form.charges_mensuelles || 0),
        depot_garantie: form.depot_garantie !== '' ? parseFloat(form.depot_garantie) : null,
        jour_paiement: parseInt(form.jour_paiement || 5),
        fichier_bail: form.fichier_bail || null
      }

      const isRentChanged = editing && oldLoyer !== null && Math.abs(oldLoyer - payload.loyer_mensuel) > 0.01

      if (editing) {
        await updateBail(payload)
        addToast('Bail mis à jour')
      } else {
        await createBail(payload)
        addToast('Nouveau bail actif enregistré dans 07_LOCATION/Bail/Bail_en_cours (ancien bail archivé)')
      }

      setModal(false)
      await loadAll()

      if (isRentChanged && onOpenMail) {
        addToast('Loyer modifié ! Redirection vers la boîte mail pour la révision de loyer...', 'info')
        onOpenMail(payload.bien_id, {
          initialView: 'compose',
          initialTemplate: 'augmentation',
          initialBailId: editing,
          initialRentAmount: payload.loyer_mensuel
        })
      }
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer définitivement ce bail ? Les paiements associés seront conservés.')) return
    try { await deleteBail(id); addToast('Bail supprimé', 'info'); loadAll() }
    catch(err) { setError(err?.toString()) }
  }

  const statutBadge = (statut) => {
    if (statut === 'actif')   return 'badge-success'
    if (statut === 'termine') return 'badge-neutral'
    if (statut === 'resilie') return 'badge-danger'
    return 'badge-neutral'
  }

  const filtered = baux.filter(b => {
    const matchBien = !filterBien || b.bien_id === parseInt(filterBien)
    const matchStatut =
      filterStatut === 'all' ? true :
      filterStatut === 'actif' ? b.statut === 'actif' :
      filterStatut === 'termine' ? b.statut !== 'actif' : true
    return matchBien && matchStatut
  })

  const f = key => e => setForm({ ...form, [key]: e.target.value })

  const countActifs = baux.filter(b => b.statut === 'actif').length
  const countAnciens = baux.filter(b => b.statut !== 'actif').length

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Baux & Contrats de Location</h2>
          <p className="page-subtitle">
            Génération de contrats Loi ALUR (PDF), gestion des départs, états des lieux et archivage
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nouveau bail
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Barre de filtres */}
      <div className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn btn-sm ${filterStatut === 'actif' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatut('actif')}
          >
            🟢 Baux en cours ({countActifs})
          </button>
          <button
            className={`btn btn-sm ${filterStatut === 'termine' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatut('termine')}
          >
            📁 Baux antérieurs / Archives ({countAnciens})
          </button>
          <button
            className={`btn btn-sm ${filterStatut === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatut('all')}
          >
            Tous les baux ({baux.length})
          </button>
        </div>

        <select className="form-control" style={{ maxWidth: 200, marginLeft: 'auto' }} value={filterBien} onChange={e => setFilterBien(e.target.value)}>
          <option value="">Tous les logements</option>
          {biens.map(b => <option key={b.id} value={b.id}>🏠 {b.nom}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>Aucun bail correspondant</h3>
            <p>Créez un bail pour lier un locataire à un logement</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bien</th>
                <th>Locataire</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Loyer net</th>
                <th>Charges</th>
                <th>Dépôt garantie</th>
                <th>Contrat de bail</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const isActif = b.statut === 'actif'
                return (
                  <tr key={b.id} style={{ background: !isActif ? 'var(--color-surface-2)' : undefined }}>
                    <td className="fw-600">
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}
                        onClick={() => onNavigate && onNavigate('bien', b.bien_id)}
                        title="Accéder directement à la fiche du bien"
                      >
                        🏠 {b.bien_nom || '—'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 13, fontWeight: 500 }}
                        onClick={() => onNavigate && onNavigate('locataires')}
                        title="Accéder à la section locataires"
                      >
                        👤 {b.locataire_prenom} {b.locataire_nom}
                      </button>
                    </td>
                    <td className="text-muted">{formatDate(b.date_debut)}</td>
                    <td className="text-muted">
                      {b.date_fin ? formatDate(b.date_fin) : '—'}
                      {b.motif_fin && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.motif_fin}</div>
                      )}
                    </td>
                    <td className="fw-600">{formatEuro(b.loyer_mensuel)}</td>
                    <td>{formatEuro(b.charges_mensuelles)}</td>
                    <td>{b.depot_garantie ? formatEuro(b.depot_garantie) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {b.fichier_bail ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleOpenDoc(b.fichier_bail)}
                            title="Ouvrir le contrat de bail PDF"
                          >
                            📄 Bail PDF
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: 11, border: '1px dashed #cbd5e1' }}
                            onClick={() => handleOpenBailGeneratorForRow(b)}
                            title="Générer le contrat de bail officiel en PDF"
                          >
                            ✨ Générer bail
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statutBadge(b.statut)}`}>
                        {labelStatutBail(b.statut)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
                          onClick={() => handleOpenBailGeneratorForRow(b)}
                          title="Générer / Imprimer le contrat de bail type Loi ALUR"
                        >
                          ✨ Contrat
                        </button>
                        {isActif ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                            onClick={() => openTerminateModal(b)}
                            title="Mettre fin au bail, faire l'état des lieux et archiver le contrat"
                          >
                            🚪 Fin de bail
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => {
                              const targetBien = biens.find(bi => bi.id === b.bien_id)
                              const targetLoc = locataires.find(l => l.id === b.locataire_id)
                              setEdlModalData({
                                bail: b,
                                bien: targetBien,
                                locataire: targetLoc,
                                terminationInfo: {
                                  dateFin: b.date_fin || todayISO(),
                                  motifFin: b.motif_fin || 'Congé locataire',
                                  notesFin: b.notes_fin || ''
                                }
                              })
                            }}
                            title="Générer ou réimprimer l'état des lieux de sortie"
                          >
                            📋 État des lieux
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => {
                            if (onOpenMail && b.bien_id) {
                              onOpenMail(b.bien_id, {
                                initialView: 'compose',
                                initialBailId: b.id,
                                recipientEmail: b.locataire_email || ''
                              })
                            }
                          }}
                          title="Ouvrir la boîte mail pour ce logement"
                        >
                          ✉️ Mail
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Modifier">
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(b.id)} title="Supprimer">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale Saisie / Édition Bail Enrichie ── */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Modifier le bail' : 'Nouveau contrat de bail'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {!editing && form.statut === 'actif' && (
                <div className="alert alert-info" style={{ fontSize: 12, marginBottom: 12 }}>
                  ℹ️ Si un bail était déjà actif sur ce logement, il sera automatiquement clôturé et son fichier archivé dans <strong>07_LOCATION/Bail/Baux_anciens</strong>.
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bien immobilier *</label>
                  <select className="form-control" required value={form.bien_id} onChange={f('bien_id')}>
                    <option value="">Sélectionner un logement</option>
                    {biens.map(b => (
                      <option key={b.id} value={b.id}>{b.nom} ({b.adresse || 'Sans adresse'})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Locataire *</label>
                  <select className="form-control" required value={form.locataire_id} onChange={f('locataire_id')}>
                    <option value="">Sélectionner un locataire</option>
                    {locataires.map(l => (
                      <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type de contrat de bail</label>
                  <select className="form-control" value={form.type_bail || 'meuble'} onChange={f('type_bail')}>
                    <option value="meuble">Meublé (Résidence principale - 1 an)</option>
                    <option value="nu">Non meublé / Nu (3 ans)</option>
                    <option value="etudiant">Étudiant meublé (9 mois)</option>
                    <option value="mobilite">Bail Mobilité (1 à 10 mois)</option>
                    <option value="colocation">Bail de Colocation</option>
                    <option value="professionnel">Bail Professionnel / Commercial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jour d'échéance (du 1 au 28)</label>
                  <input type="number" min="1" max="28" className="form-control" value={form.jour_paiement} onChange={f('jour_paiement')} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date de début *</label>
                  <input type="date" className="form-control" required value={form.date_debut} onChange={f('date_debut')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date de fin (optionnel)</label>
                  <input type="date" className="form-control" value={form.date_fin || ''} onChange={f('date_fin')} placeholder="Laisser vide si en cours" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Loyer hors charges (€) *</label>
                  <input type="number" step="0.01" className="form-control" required value={form.loyer_mensuel} onChange={f('loyer_mensuel')} placeholder="750.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Provisions sur charges (€)</label>
                  <input type="number" step="0.01" className="form-control" value={form.charges_mensuelles} onChange={f('charges_mensuelles')} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dépôt de garantie (€)</label>
                  <input type="number" step="0.01" className="form-control" value={form.depot_garantie} onChange={f('depot_garantie')} placeholder="750.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Statut de la caution</label>
                  <select className="form-control" value={form.statut_garantie || 'en_attente'} onChange={f('statut_garantie')}>
                    <option value="en_attente">⏳ En attente de versement</option>
                    <option value="recu">✅ Reçu / Encaissé</option>
                    <option value="restitue">↩️ Restitué au locataire</option>
                    <option value="partiel_restitue">⚠️ Retenu partiel / Sinistre</option>
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  ⚡ Index des compteurs à l'entrée (Optionnel)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Électricité (kWh)</label>
                    <input type="text" className="form-control" style={{ fontSize: 12 }} placeholder="ex: 14250" value={form.compteur_elec_entree || ''} onChange={f('compteur_elec_entree')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Eau (m³)</label>
                    <input type="text" className="form-control" style={{ fontSize: 12 }} placeholder="ex: 345" value={form.compteur_eau_entree || ''} onChange={f('compteur_eau_entree')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gaz (m³)</label>
                    <input type="text" className="form-control" style={{ fontSize: 12 }} placeholder="ex: 120" value={form.compteur_gaz_entree || ''} onChange={f('compteur_gaz_entree')} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Statut du bail</label>
                <select className="form-control" value={form.statut} onChange={f('statut')}>
                  <option value="actif">Actif (Bail en cours)</option>
                  <option value="termine">Terminé (Bail antérieur / Archivé)</option>
                  <option value="resilie">Résilié</option>
                </select>
              </div>

              {/* Générateur et attachement de contrat */}
              <div className="form-group" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#1E40AF' }}>
                    📄 Contrat de bail de location (PDF)
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700 }}
                    onClick={handleOpenBailGenerator}
                  >
                    ✨ Générer le Bail officiel (PDF ALUR)
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-control" readOnly value={form.fichier_bail || ''} placeholder="Aucun contrat joint (cliquez sur Générer ou Parcourir)" />
                  <button type="button" className="btn btn-secondary" onClick={handlePickBailFile}>Parcourir...</button>
                </div>
                <p style={{ fontSize: 11, color: '#1E40AF', marginTop: 4 }}>
                  📁 Le contrat est automatiquement archivé dans <em>07_LOCATION/Bail/Bail_en_cours</em>.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer le bail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Fin de Bail & Clôture Enrichie ── */}
      {terminateModal && (
        <div className="modal-backdrop" onClick={() => setTerminateModal(null)}>
          <div className="modal-card" style={{ maxWidth: 620, width: '92%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>🚪 Clôturer le bail — {terminateModal.locataireNom}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Logement : {terminateModal.bienNom}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTerminateModal(null)}>✕</button>
            </div>

            <form onSubmit={handleConfirmTerminate}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Date effective de départ *</label>
                  <input
                    type="date" className="form-control" required
                    value={terminateModal.dateFin || todayISO()}
                    onChange={e => setTerminateModal({ ...terminateModal, dateFin: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Motif de fin de bail *</label>
                  <select
                    className="form-control" required
                    value={terminateModal.motifFin || 'Congé locataire'}
                    onChange={e => setTerminateModal({ ...terminateModal, motifFin: e.target.value })}
                  >
                    <option value="Congé locataire">Congé donné par le locataire (Départ)</option>
                    <option value="Congé bailleur (Vente)">Congé bailleur — Vente du logement</option>
                    <option value="Congé bailleur (Reprise)">Congé bailleur — Reprise personnelle</option>
                    <option value="Résiliation impayés / Contentieux">Résiliation impayés / Contentieux</option>
                    <option value="Expiration normale du contrat">Expiration normale du contrat</option>
                    <option value="Autre motif">Autre motif</option>
                  </select>
                </div>
              </div>

              {/* Dépôt de garantie / Caution */}
              <div style={{ background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  💶 Restitution du dépôt de garantie (Caution initiale : {formatEuro(terminateModal.bail?.depot_garantie || 0)})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Modalité de restitution</label>
                    <select
                      className="form-control"
                      value={terminateModal.restitutionCaution}
                      onChange={e => setTerminateModal({ ...terminateModal, restitutionCaution: e.target.value })}
                    >
                      <option value="restitue">✅ Restitution intégrale</option>
                      <option value="partiel_restitue">⚠️ Retenue partielle (Réparations/Charges)</option>
                      <option value="en_attente">⏳ En attente de régularisation</option>
                    </select>
                  </div>
                  {terminateModal.restitutionCaution === 'partiel_restitue' && (
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Montant retenu (€)</label>
                      <input
                        type="number" step="0.01" className="form-control"
                        placeholder="ex: 150.00"
                        value={terminateModal.montantRetenu}
                        onChange={e => setTerminateModal({ ...terminateModal, montantRetenu: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                {terminateModal.restitutionCaution === 'partiel_restitue' && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Motif de la retenue</label>
                    <input
                      type="text" className="form-control" style={{ fontSize: 12 }}
                      placeholder="ex: Nettoyage approfondi, régularisation charges d'eau..."
                      value={terminateModal.motifRetenue}
                      onChange={e => setTerminateModal({ ...terminateModal, motifRetenue: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Compteurs de sortie & Clés */}
              <div style={{ background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  ⚡ Relevé des compteurs de sortie & Clés
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Électricité (kWh)</label>
                    <input
                      type="text" className="form-control" style={{ fontSize: 12 }}
                      placeholder="Index..."
                      value={terminateModal.compteurElec}
                      onChange={e => setTerminateModal({ ...terminateModal, compteurElec: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Eau (m³)</label>
                    <input
                      type="text" className="form-control" style={{ fontSize: 12 }}
                      placeholder="Index..."
                      value={terminateModal.compteurEau}
                      onChange={e => setTerminateModal({ ...terminateModal, compteurEau: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gaz (m³)</label>
                    <input
                      type="text" className="form-control" style={{ fontSize: 12 }}
                      placeholder="Index..."
                      value={terminateModal.compteurGaz}
                      onChange={e => setTerminateModal({ ...terminateModal, compteurGaz: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Restitution des clés</label>
                  <input
                    type="text" className="form-control" style={{ fontSize: 12 }}
                    value={terminateModal.clesRemises}
                    onChange={e => setTerminateModal({ ...terminateModal, clesRemises: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Observations / Notes complémentaires</label>
                <textarea
                  className="form-control" rows={2}
                  placeholder="ex: Appartement rendu propre, pas de dégradation majeure..."
                  value={terminateModal.notesFin || ''}
                  onChange={e => setTerminateModal({ ...terminateModal, notesFin: e.target.value })}
                />
              </div>

              {/* Options complémentaires : État des lieux & Email */}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id="generate-edl-check"
                    checked={terminateModal.generateEdl}
                    onChange={e => setTerminateModal({ ...terminateModal, generateEdl: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="generate-edl-check" style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF', cursor: 'pointer' }}>
                    📋 Ouvrir et générer l'État des Lieux de Sortie officiel (PDF / Impression)
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id="send-mail-check"
                    checked={terminateModal.sendClosingMail}
                    onChange={e => setTerminateModal({ ...terminateModal, sendClosingMail: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="send-mail-check" style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', cursor: 'pointer' }}>
                    ✉️ Étape suivante : Rédiger et envoyer un email de solde de tout compte au locataire
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setTerminateModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-warning" disabled={loading}>
                  {loading ? '⏳ Clôture en cours...' : '🚪 Confirmer la clôture du bail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale État des Lieux de Sortie ── */}
      {edlModalData && (
        <EtatDesLieuxModal
          bail={edlModalData.bail}
          bien={edlModalData.bien}
          locataire={edlModalData.locataire}
          terminationInfo={edlModalData.terminationInfo}
          onClose={() => setEdlModalData(null)}
          onSendMail={onOpenMail}
        />
      )}

      {/* ── Modale Générateur Contrat de Bail PDF ── */}
      {bailGenerateurData && (
        <BailGenerateurModal
          bail={bailGenerateurData.bail}
          bien={bailGenerateurData.bien}
          locataire={bailGenerateurData.locataire}
          formValues={bailGenerateurData.formValues}
          onClose={() => setBailGenerateurData(null)}
          onGenerated={(newPath) => {
            setForm(prev => ({ ...prev, fichier_bail: newPath }))
            addToast('✅ Contrat de bail PDF généré et lié au formulaire !')
          }}
          onSendMail={onOpenMail}
        />
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '❌'}
              {t.type === 'info' && 'ℹ️'}
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
