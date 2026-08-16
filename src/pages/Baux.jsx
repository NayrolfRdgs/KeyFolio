import React, { useEffect, useState, useCallback } from 'react'
import { getBaux, createBail, updateBail, deleteBail, terminateBail, getBiens, getLocataires, openFilePath } from '../lib/db'
import { formatDate, formatEuro, labelStatutBail, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'
import EtatDesLieuxModal from '../components/EtatDesLieuxModal'
import BailGenerateurModal from '../components/BailGenerateurModal'
import BailFormModal from '../components/baux/BailFormModal'
import BailClotureModal from '../components/baux/BailClotureModal'

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

      {/* ── Modale Saisie / Édition Bail ── */}
      <BailFormModal
        isOpen={modal}
        isEditing={editing}
        form={form}
        setField={f}
        biens={biens}
        locataires={locataires}
        onPickBailFile={handlePickBailFile}
        onOpenBailGenerator={handleOpenBailGenerator}
        onSubmit={handleSubmit}
        onClose={() => setModal(false)}
        loading={loading}
      />

      {/* ── Modale Fin de Bail & Clôture ── */}
      <BailClotureModal
        modalData={terminateModal}
        setModalData={setTerminateModal}
        onSubmit={handleConfirmTerminate}
        onClose={() => setTerminateModal(null)}
      />

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
