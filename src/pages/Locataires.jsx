import React, { useEffect, useState, useCallback } from 'react'
import {
  getLocataires, createLocataire, updateLocataire, deleteLocataire, getLocataireStats,
  getCandidatures, createCandidature, updateCandidature, updateCandidatureStatut, deleteCandidature,
  getBiens, getBaux, getPaiements, createBail, openFilePath
} from '../lib/db'
import { formatEuro, formatDate, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'

const EMPTY_LOC = {
  bien_id: '', nom: '', prenom: '', telephone: '', email: '',
  revenus_mensuels: '', profession: '', garant_nom: '', garant_contact: '', notes: '', fichier_dossier: ''
}

const EMPTY_CAND = {
  bien_id: '', nom: '', prenom: '', email: '', telephone: '',
  revenus_mensuels: '', profession: '', garant_nom: '', garant_contact: '', notes: '', fichier_dossier: '', statut: 'nouveau'
}

export default function Locataires({ onNavigate, onOpenMail }) {
  const [activeTab, setActiveTab] = useState('locataires') // 'locataires' | 'candidatures'
  const [locSubFilter, setLocSubFilter] = useState('actuels') // 'actuels' | 'anciens' | 'all'
  const [locataires, setLocataires] = useState([])
  const [candidatures, setCandidatures] = useState([])
  const [biens, setBiens] = useState([])
  const [baux, setBaux] = useState([])

  // Modal Fin de bail / Résiliation
  const [terminateModal, setTerminateModal] = useState(null)
  // { bailId, locataireNom, dateFin: todayISO(), motifFin: 'Congé locataire', notesFin: '' }

  // Modal Locataire
  const [locModal, setLocModal] = useState(false)
  const [locForm, setLocForm] = useState(EMPTY_LOC)
  const [locEditing, setLocEditing] = useState(null)
  const [locSourcePath, setLocSourcePath] = useState('')

  // Modal Candidature (Création & Édition)
  const [candModal, setCandModal] = useState(false)
  const [candForm, setCandForm] = useState(EMPTY_CAND)
  const [candEditing, setCandEditing] = useState(null)
  const [candSourcePath, setCandSourcePath] = useState('')

  // Modal Processus complet de Création de Bail à partir d'une Candidature
  const [convertModal, setConvertModal] = useState(null) // candid item
  const [convertBailForm, setConvertBailForm] = useState({
    date_debut: todayISO(),
    date_fin: '',
    loyer_mensuel: '',
    charges_mensuelles: 50,
    depot_garantie: '',
    jour_paiement: 5,
    fichier_bail: ''
  })

  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  // Modal Bilan Financier & Historique Locataire
  const [statsLocTarget, setStatsLocTarget] = useState(null)
  const [locStatsData, setLocStatsData] = useState(null)
  const [locPaiementsList, setLocPaiementsList] = useState([])
  const [locBauxList, setLocBauxList] = useState([])

  const handleOpenLocStats = async (loc) => {
    setLoading(true)
    try {
      const [st, pAll, bAll] = await Promise.all([
        getLocataireStats(loc.id),
        getPaiements(),
        getBaux()
      ])
      const locBauxIds = bAll.filter(b => b.locataire_id === loc.id).map(b => b.id)
      const pFiltered = pAll.filter(p => locBauxIds.includes(p.bail_id))
      setLocStatsData(st)
      setLocPaiementsList(pFiltered)
      setLocBauxList(bAll.filter(b => b.locataire_id === loc.id))
      setStatsLocTarget(loc)
    } catch (e) {
      setError(e?.toString())
    } finally {
      setLoading(false)
    }
  }

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const loadAll = async () => {
    try {
      const [lRes, cRes, bRes, bauxRes] = await Promise.all([getLocataires(), getCandidatures(), getBiens(), getBaux()])
      setLocataires(lRes)
      setCandidatures(cRes)
      setBiens(bRes)
      setBaux(bauxRes)
    } catch (e) {
      setError(e?.toString())
    }
  }

  useEffect(() => { loadAll() }, [])

  // Handlers Locataires
  const openCreateLoc = () => {
    setLocForm({ ...EMPTY_LOC, bien_id: biens[0]?.id || '' })
    setLocEditing(null)
    setLocSourcePath('')
    setLocModal(true)
  }

  const openEditLoc = (l) => {
    setLocForm({
      ...l,
      bien_id: l.bien_id || '',
      revenus_mensuels: l.revenus_mensuels ?? '',
      profession: l.profession || '',
      garant_nom: l.garant_nom || '',
      garant_contact: l.garant_contact || '',
      notes: l.notes || '',
      fichier_dossier: l.fichier_dossier || ''
    })
    setLocEditing(l.id)
    setLocSourcePath('')
    setLocModal(true)
  }

  const handlePickLocFile = async () => {
    try {
      const sel = await openFileDialog({
        multiple: false,
        title: 'Sélectionner les pièces du dossier locataire (PDF / Zip / Scan)',
      })
      if (sel) setLocSourcePath(sel)
    } catch (e) { console.warn(e) }
  }

  const handleLocSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...locForm,
        id: locEditing || undefined,
        bien_id: locForm.bien_id ? parseInt(locForm.bien_id) : null,
        revenus_mensuels: locForm.revenus_mensuels ? parseFloat(locForm.revenus_mensuels) : null,
      }
      if (locEditing) await updateLocataire(payload, locSourcePath || null)
      else await createLocataire(payload, locSourcePath || null)
      setLocModal(false)
      addToast(locEditing ? 'Locataire mis à jour' : 'Locataire enregistré')
      loadAll()
    } catch (err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleLocDelete = async (id) => {
    if (!confirm('Supprimer ce locataire ?')) return
    try { await deleteLocataire(id); addToast('Locataire supprimé', 'info'); loadAll() }
    catch (err) { setError(err?.toString()) }
  }

  // Handlers Candidatures
  const openCreateCand = () => {
    setCandForm({ ...EMPTY_CAND, bien_id: biens[0]?.id || '' })
    setCandEditing(null)
    setCandSourcePath('')
    setCandModal(true)
  }

  const openEditCand = (cand) => {
    setCandForm({
      ...cand,
      bien_id: cand.bien_id || '',
      revenus_mensuels: cand.revenus_mensuels ?? '',
      profession: cand.profession || '',
      garant_nom: cand.garant_nom || '',
      garant_contact: cand.garant_contact || '',
      notes: cand.notes || '',
      statut: cand.statut || 'nouveau',
      fichier_dossier: cand.fichier_dossier || ''
    })
    setCandEditing(cand.id)
    setCandSourcePath('')
    setCandModal(true)
  }

  const handlePickCandFile = async () => {
    try {
      const sel = await openFileDialog({
        multiple: false,
        title: 'Sélectionner les pièces du dossier (PDF / Zip / Images)',
      })
      if (sel) setCandSourcePath(sel)
    } catch (e) { console.warn(e) }
  }

  const handlePickConvertBailFile = async () => {
    try {
      const sel = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le contrat de bail (PDF / Scan)',
        filters: [{ name: 'Documents PDF & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
      })
      if (sel) setConvertBailForm(prev => ({ ...prev, fichier_bail: sel }))
    } catch (e) { console.warn(e) }
  }

  const handleCandSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...candForm,
        id: candEditing || undefined,
        bien_id: candForm.bien_id ? parseInt(candForm.bien_id) : null,
        revenus_mensuels: candForm.revenus_mensuels ? parseFloat(candForm.revenus_mensuels) : null,
      }
      if (candEditing) {
        await updateCandidature(payload, candSourcePath || null)
        addToast('Candidature mise à jour avec succès')
      } else {
        await createCandidature(payload, candSourcePath || null)
        addToast('Candidature enregistrée dans 07_LOCATION/Locataires/Dossier candidature !')
      }
      setCandModal(false)
      loadAll()
    } catch (err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleCandStatutChange = async (id, newStatut) => {
    try {
      await updateCandidatureStatut(id, newStatut)
      addToast(`Statut candidature mis à jour : ${newStatut}`)
      loadAll()
    } catch (err) { setError(err?.toString()) }
  }

  const handleCandDelete = async (id) => {
    if (!confirm('Supprimer cette candidature ?')) return
    try { await deleteCandidature(id); addToast('Candidature supprimée', 'info'); loadAll() }
    catch (err) { setError(err?.toString()) }
  }

  // Lancement du Processus complet de Création de Bail à partir d'une Candidature
  const openConvertModal = (cand) => {
    setConvertModal(cand)
    setConvertBailForm({
      date_debut: todayISO(),
      date_fin: '',
      loyer_mensuel: cand.revenus_mensuels ? (cand.revenus_mensuels * 0.33).toFixed(0) : '750',
      charges_mensuelles: 50,
      depot_garantie: cand.revenus_mensuels ? (cand.revenus_mensuels * 0.33).toFixed(0) : '750',
      jour_paiement: 5,
      fichier_bail: ''
    })
  }

  const handleConvertSubmit = async (e) => {
    e.preventDefault()
    if (!convertModal) return
    setLoading(true)
    try {
      // 1. Créer le locataire avec l'ensemble des données renseignées dans la candidature
      const locId = await createLocataire({
        bien_id: convertModal.bien_id ? parseInt(convertModal.bien_id) : null,
        nom: convertModal.nom,
        prenom: convertModal.prenom,
        telephone: convertModal.telephone,
        email: convertModal.email,
        revenus_mensuels: convertModal.revenus_mensuels ? parseFloat(convertModal.revenus_mensuels) : null,
        profession: convertModal.profession,
        garant_nom: convertModal.garant_nom,
        garant_contact: convertModal.garant_contact,
        fichier_dossier: convertModal.fichier_dossier,
        notes: convertModal.notes ? `Issu de candidature. ${convertModal.notes}` : 'Issu de candidature'
      })

      // 2. Lancer le processus de création de bail (clôture automatique de l'ancien s'il y en a un + archivage dans Baux_anciens + enregistrement du nouveau dans Bail_en_cours)
      await createBail({
        bien_id: parseInt(convertModal.bien_id),
        locataire_id: locId,
        date_debut: convertBailForm.date_debut,
        date_fin: convertBailForm.date_fin || null,
        loyer_mensuel: parseFloat(convertBailForm.loyer_mensuel),
        charges_mensuelles: parseFloat(convertBailForm.charges_mensuelles || 0),
        depot_garantie: convertBailForm.depot_garantie ? parseFloat(convertBailForm.depot_garantie) : null,
        jour_paiement: parseInt(convertBailForm.jour_paiement || 5),
        statut: 'actif',
        fichier_bail: convertBailForm.fichier_bail || null
      })

      // 3. Passer le statut de la candidature en 'converti'
      await updateCandidatureStatut(convertModal.id, 'converti')

      setConvertModal(null)
      addToast(`🎉 Processus de création de bail finalisé ! Bail actif créé pour ${convertModal.prenom} ${convertModal.nom}`)
      loadAll()
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDoc = async (relPath) => {
    try { await openFilePath(relPath) }
    catch (e) { addToast(`Erreur ouverture : ${e}`, 'error') }
  }

  // Identification des locataires actuels (bail actif) vs anciens (bail terminé / aucun bail actif)
  const locatairesWithBail = locataires.map(l => {
    const activeBail = baux.find(b => b.locataire_id === l.id && b.statut === 'actif')
    const lastBail = baux.filter(b => b.locataire_id === l.id && b.statut === 'termine').sort((a,b) => (b.date_fin || '').localeCompare(a.date_fin || ''))[0]
    return {
      ...l,
      isActuel: !!activeBail,
      activeBail,
      lastBail
    }
  })

  const countActuels = locatairesWithBail.filter(l => l.isActuel).length
  const countAnciens = locatairesWithBail.filter(l => !l.isActuel).length

  const filteredLocs = locatairesWithBail.filter(l => {
    const matchesSearch = `${l.nom} ${l.prenom} ${l.email || ''} ${l.telephone || ''} ${l.profession || ''}`.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (locSubFilter === 'actuels') return l.isActuel
    if (locSubFilter === 'anciens') return !l.isActuel
    return true
  })

  const filteredCands = candidatures.filter(c =>
    `${c.nom} ${c.prenom} ${c.bien_nom || ''} ${c.email || ''} ${c.profession || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirmTerminate = async (e) => {
    e.preventDefault()
    if (!terminateModal?.bailId) return
    setLoading(true)
    try {
      await terminateBail(
        terminateModal.bailId,
        terminateModal.dateFin || todayISO(),
        terminateModal.motifFin || 'Congé locataire',
        terminateModal.notesFin || ''
      )
      addToast('Fin de bail enregistrée. Le locataire figure désormais dans les anciens locataires.', 'info')
      setTerminateModal(null)
      await loadAll()
    } catch (err) {
      addToast(`Erreur : ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Locataires & Candidatures</h2>
          <p>Gestion des dossiers locataires, candidatures et processus de création de baux</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'locataires' ? (
            <button id="btn-add-locataire" className="btn btn-primary" onClick={openCreateLoc}>
              <Icon name="plus" size={14} /> Nouveau locataire
            </button>
          ) : (
            <button className="btn btn-primary" onClick={openCreateCand}>
              <Icon name="plus" size={14} /> Nouvelle candidature
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Onglets navigation Locataires / Candidatures */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'locataires' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('locataires')}
        >
          👤 Locataires enregistrés ({locataires.length})
        </button>
        <button
          className={`btn ${activeTab === 'candidatures' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('candidatures')}
        >
          📂 Candidatures & Dossiers ({candidatures.length})
        </button>
      </div>

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── VUE LOCATAIRES ── */}
      {activeTab === 'locataires' && (
        <>
          {/* Sub-filtres Locataires Actuels vs Anciens */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--color-surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)', width: 'fit-content' }}>
            <button
              className={`btn btn-sm ${locSubFilter === 'actuels' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => setLocSubFilter('actuels')}
            >
              🟢 Locataires actuels ({countActuels})
            </button>
            <button
              className={`btn btn-sm ${locSubFilter === 'anciens' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => setLocSubFilter('anciens')}
            >
              📜 Anciens locataires ({countAnciens})
            </button>
            <button
              className={`btn btn-sm ${locSubFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => setLocSubFilter('all')}
            >
              Tous ({locataires.length})
            </button>
          </div>

          {filteredLocs.length === 0 ? (
            <div className="table-wrapper">
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <h3>Aucun locataire dans cette catégorie</h3>
                <p>Modifiez les filtres ou ajoutez un nouveau locataire</p>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Statut</th>
                    <th>Locataire</th>
                    <th>Logement & Bail</th>
                    <th>Contact</th>
                    <th>Profession & Revenus</th>
                    <th>Garant</th>
                    <th>Pièces dossier</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocs.map(l => (
                    <tr key={l.id}>
                      <td>
                        {l.isActuel ? (
                          <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>🟢 Actuel</span>
                        ) : (
                          <div>
                            <span className="badge badge-muted" style={{ fontSize: 10, padding: '2px 6px' }}>📜 Ancien</span>
                            {l.lastBail?.motif_fin && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                {l.lastBail.motif_fin}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="fw-600">👤 {l.prenom} {l.nom}</td>
                      <td>
                        {l.bien_id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 12, fontWeight: 600 }}
                              onClick={() => onNavigate && onNavigate('bien', l.bien_id)}
                              title="Accéder directement à la fiche de ce logement"
                            >
                              🏠 {l.bien_nom || 'Voir logement'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 6px', fontSize: 11 }}
                              onClick={() => onNavigate && onNavigate('baux')}
                              title="Voir les détails du bail"
                            >
                              🔑 Bail
                            </button>
                          </div>
                        ) : l.lastBail ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Dernier logement : <strong>{l.lastBail.bien_nom || '—'}</strong>
                            <br />
                            Fin du bail : {formatDate(l.lastBail.date_fin)}
                          </div>
                        ) : (
                          <span className="badge badge-muted" style={{ fontSize: 11 }}>Aucun bail</span>
                        )}
                      </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{l.email || '—'}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{l.telephone || '—'}</div>
                    </td>
                    <td>
                      <div className="fw-600">{l.revenus_mensuels ? formatEuro(l.revenus_mensuels) : '—'}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{l.profession || 'Non spécifié'}</div>
                    </td>
                    <td>
                      <div>{l.garant_nom || '—'}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{l.garant_contact || '—'}</div>
                    </td>
                    <td>
                      {l.fichier_dossier ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleOpenDoc(l.fichier_dossier)}
                          title="Voir les pièces du dossier"
                        >
                          📄 Dossier PDF
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun fichier</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {l.activeBail && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                            onClick={() => setTerminateModal({
                              bailId: l.activeBail.id,
                              locataireNom: `${l.prenom} ${l.nom}`,
                              dateFin: todayISO(),
                              motifFin: 'Congé locataire',
                              notesFin: ''
                            })}
                            title="Mettre fin au bail et enregistrer le motif de départ"
                          >
                            🚪 Fin de bail
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11, background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}
                          onClick={() => handleOpenLocStats(l)}
                          title="Voir le bilan financier complet et l'historique des loyers"
                        >
                          📊 Bilan & Stats
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => {
                            const targetBienId = l.bien_id || (biens[0]?.id)
                            if (targetBienId && onOpenMail) {
                              onOpenMail(targetBienId, { recipientEmail: l.email || '' })
                            }
                          }}
                          title="Ouvrir la boîte mail pour ce locataire"
                        >
                          ✉️ Mail
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditLoc(l)} title="Modifier les informations du locataire">
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleLocDelete(l.id)} title="Supprimer">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── VUE CANDIDATURES ── */}
      {activeTab === 'candidatures' && (
        filteredCands.length === 0 ? (
          <div className="table-wrapper">
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <h3>Aucune candidature enregistrée</h3>
              <p>Ajoutez les dossiers des candidats pour les classer et lancer le processus de création de bail.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreateCand}>
                + Ajouter une candidature
              </button>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Logement visé</th>
                  <th>Contact</th>
                  <th>Profession & Revenus</th>
                  <th>Garant</th>
                  <th>Pièces dossier</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCands.map(c => {
                  const isConverti = c.statut === 'converti'
                  return (
                    <tr key={c.id}>
                      <td className="fw-600">
                        👤 {c.prenom} {c.nom}
                      </td>
                      <td>🏠 {c.bien_nom || 'Non spécifié'}</td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.email || '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{c.telephone || '—'}</div>
                      </td>
                      <td>
                        <div className="fw-600">{c.revenus_mensuels ? formatEuro(c.revenus_mensuels) : '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{c.profession || 'Non spécifié'}</div>
                      </td>
                      <td className="text-muted">{c.garant_nom ? `${c.garant_nom}` : 'Sans garant'}</td>
                      <td>
                        {c.fichier_dossier ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleOpenDoc(c.fichier_dossier)}
                            title="Voir les pièces du dossier"
                          >
                            📄 Dossier PDF
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun fichier</span>
                        )}
                      </td>
                      <td>
                        <select
                          className={`badge ${c.statut === 'retenu' ? 'badge-success' : c.statut === 'refuse' ? 'badge-danger' : c.statut === 'converti' ? 'badge-info' : 'badge-warning'}`}
                          style={{ border: 'none', cursor: 'pointer', outline: 'none', padding: '4px 8px', fontWeight: 600 }}
                          value={c.statut}
                          onChange={(e) => handleCandStatutChange(c.id, e.target.value)}
                        >
                          <option value="nouveau" style={{ color: '#000' }}>🟡 Nouveau</option>
                          <option value="retenu" style={{ color: '#000' }}>🟢 Retenu</option>
                          <option value="refuse" style={{ color: '#000' }}>🔴 Refusé</option>
                          <option value="converti" style={{ color: '#000' }}>🔑 Converti en Bail</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {!isConverti && (
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600 }}
                              onClick={() => openConvertModal(c)}
                              title="Lancer le processus de création de bail"
                            >
                              🔑 Créer le Bail
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => openEditCand(c)}
                            title="Modifier la candidature"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleCandDelete(c.id)} title="Supprimer">
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
        )
      )}

      {/* ── Modale Saisie Locataire ── */}
      {locModal && (
        <div className="modal-backdrop" onClick={() => setLocModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{locEditing ? 'Modifier le locataire' : 'Nouveau locataire'}</h3>
              <button className="modal-close" onClick={() => setLocModal(false)}>×</button>
            </div>
            <form onSubmit={handleLocSubmit}>
              <div className="form-group">
                <label className="form-label">Logement associé</label>
                <select className="form-control" value={locForm.bien_id || ''} onChange={e => setLocForm({...locForm, bien_id: e.target.value})}>
                  <option value="">Sélectionner un bien (optionnel)</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.id}>{b.nom} ({b.adresse || 'Sans adresse'})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input className="form-control" required value={locForm.prenom} onChange={e => setLocForm({...locForm, prenom: e.target.value})} placeholder="Prénom" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-control" required value={locForm.nom} onChange={e => setLocForm({...locForm, nom: e.target.value})} placeholder="Nom" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-control" type="tel" value={locForm.telephone || ''} onChange={e => setLocForm({...locForm, telephone: e.target.value})} placeholder="06 xx xx xx xx" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={locForm.email || ''} onChange={e => setLocForm({...locForm, email: e.target.value})} placeholder="email@exemple.fr" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Revenus mensuels (€) / Salaire</label>
                  <input type="number" step="50" className="form-control" value={locForm.revenus_mensuels || ''} onChange={e => setLocForm({...locForm, revenus_mensuels: e.target.value})} placeholder="Ex: 2400" />
                </div>
                <div className="form-group">
                  <label className="form-label">Profession / Situation pro</label>
                  <input className="form-control" value={locForm.profession || ''} onChange={e => setLocForm({...locForm, profession: e.target.value})} placeholder="Ex: CDI, Fonctionnaire, Cadre..." />
                </div>
              </div>

              <hr className="divider" style={{ margin: '12px 0' }} />

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Garant (nom / organisme)</label>
                  <input className="form-control" value={locForm.garant_nom || ''} onChange={e => setLocForm({...locForm, garant_nom: e.target.value})} placeholder="Nom du garant ou Visale" />
                </div>
                <div className="form-group">
                  <label className="form-label">Garant (contact)</label>
                  <input className="form-control" value={locForm.garant_contact || ''} onChange={e => setLocForm({...locForm, garant_contact: e.target.value})} placeholder="Tél ou email du garant" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">📎 Pièces du dossier (PDF / Zip / Scan)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-control" readOnly value={locSourcePath || locForm.fichier_dossier || ''} placeholder="Aucun fichier sélectionné" />
                  <button type="button" className="btn btn-secondary" onClick={handlePickLocFile}>Parcourir...</button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  📁 Le fichier sera automatiquement enregistré dans <em>07_LOCATION/Locataires/Dossier candidature</em> du bien.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Observations</label>
                <textarea className="form-control" value={locForm.notes || ''} onChange={e => setLocForm({...locForm, notes: e.target.value})} placeholder="Remarques..." />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setLocModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Saisie / Édition Candidature ── */}
      {candModal && (
        <div className="modal-backdrop" onClick={() => setCandModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{candEditing ? 'Modifier la candidature' : 'Nouvelle candidature'}</h3>
              <button className="modal-close" onClick={() => setCandModal(false)}>×</button>
            </div>
            <form onSubmit={handleCandSubmit}>
              <div className="form-group">
                <label className="form-label">Logement visé *</label>
                <select className="form-control" required value={candForm.bien_id} onChange={e => setCandForm({...candForm, bien_id: e.target.value})}>
                  <option value="">Sélectionner un bien</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.id}>{b.nom} ({b.adresse || 'Sans adresse'})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input className="form-control" required value={candForm.prenom} onChange={e => setCandForm({...candForm, prenom: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-control" required value={candForm.nom} onChange={e => setCandForm({...candForm, nom: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={candForm.email || ''} onChange={e => setCandForm({...candForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-control" type="tel" value={candForm.telephone || ''} onChange={e => setCandForm({...candForm, telephone: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Revenus mensuels (€) / Salaire</label>
                  <input type="number" step="50" className="form-control" value={candForm.revenus_mensuels || ''} onChange={e => setCandForm({...candForm, revenus_mensuels: e.target.value})} placeholder="Ex: 2400" />
                </div>
                <div className="form-group">
                  <label className="form-label">Profession / Situation pro</label>
                  <input className="form-control" value={candForm.profession || ''} onChange={e => setCandForm({...candForm, profession: e.target.value})} placeholder="Ex: CDI, Fonctionnaire, Cadre..." />
                </div>
              </div>
              <hr className="divider" style={{ margin: '12px 0' }} />
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom du garant</label>
                  <input className="form-control" value={candForm.garant_nom || ''} onChange={e => setCandForm({...candForm, garant_nom: e.target.value})} placeholder="Garant / Visale" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact du garant</label>
                  <input className="form-control" value={candForm.garant_contact || ''} onChange={e => setCandForm({...candForm, garant_contact: e.target.value})} placeholder="Tél ou email du garant" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select className="form-control" value={candForm.statut || 'nouveau'} onChange={e => setCandForm({...candForm, statut: e.target.value})}>
                  <option value="nouveau">🟡 Nouveau</option>
                  <option value="retenu">🟢 Retenu</option>
                  <option value="refuse">🔴 Refusé</option>
                  <option value="converti">🔑 Converti en Bail</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">📎 Pièces du dossier (PDF / Zip / Scan)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-control" readOnly value={candSourcePath || candForm.fichier_dossier || ''} placeholder="Aucun fichier sélectionné" />
                  <button type="button" className="btn btn-secondary" onClick={handlePickCandFile}>Parcourir...</button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  📁 Le fichier sera automatiquement enregistré dans <em>07_LOCATION/Locataires/Dossier candidature</em> du bien.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Notes & Observations</label>
                <textarea className="form-control" value={candForm.notes || ''} onChange={e => setCandForm({...candForm, notes: e.target.value})} placeholder="Remarques..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCandModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {candEditing ? 'Mettre à jour' : 'Enregistrer la candidature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Processus de Création de Bail à partir de la Candidature ── */}
      {convertModal && (
        <div className="modal-backdrop" onClick={() => setConvertModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Processus de Création de Bail pour {convertModal.prenom} {convertModal.nom}</h3>
              <button className="modal-close" onClick={() => setConvertModal(null)}>×</button>
            </div>
            <form onSubmit={handleConvertSubmit}>
              <div className="alert alert-info" style={{ fontSize: 12, marginBottom: 14 }}>
                ℹ️ La création du bail actif enregistrera le locataire et clôturera tout bail en cours pour <strong>{convertModal.bien_nom}</strong> en l'archivant dans les baux antérieurs (<em>07_LOCATION/Bail/Baux_anciens</em>).
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date de début du bail *</label>
                  <input type="date" className="form-control" required value={convertBailForm.date_debut} onChange={e => setConvertBailForm({...convertBailForm, date_debut: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date de fin (optionnelle)</label>
                  <input type="date" className="form-control" value={convertBailForm.date_fin} onChange={e => setConvertBailForm({...convertBailForm, date_fin: e.target.value})} placeholder="En cours" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Loyer net mensuel (€) *</label>
                  <input type="number" step="0.01" className="form-control" required value={convertBailForm.loyer_mensuel} onChange={e => setConvertBailForm({...convertBailForm, loyer_mensuel: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Charges mensuelles (€)</label>
                  <input type="number" step="0.01" className="form-control" value={convertBailForm.charges_mensuelles} onChange={e => setConvertBailForm({...convertBailForm, charges_mensuelles: e.target.value})} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dépôt de garantie (€)</label>
                  <input type="number" step="0.01" className="form-control" value={convertBailForm.depot_garantie} onChange={e => setConvertBailForm({...convertBailForm, depot_garantie: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jour d'échéance du loyer</label>
                  <input type="number" min="1" max="28" className="form-control" value={convertBailForm.jour_paiement} onChange={e => setConvertBailForm({...convertBailForm, jour_paiement: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">📎 Contrat de bail (PDF / Scan)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-control" readOnly value={convertBailForm.fichier_bail} placeholder="Aucun contrat sélectionné" />
                  <button type="button" className="btn btn-secondary" onClick={handlePickConvertBailFile}>Parcourir...</button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  📁 Le fichier sera automatiquement copié dans <em>07_LOCATION/Bail/Bail_en_cours</em>.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConvertModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  🔑 Lancer & Valider le Bail Actif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Bilan Financier & Historique du Locataire ── */}
      {statsLocTarget && locStatsData && (
        <div className="modal-backdrop" onClick={() => setStatsLocTarget(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 850 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>📊 Bilan Financier & Historique — {statsLocTarget.prenom} {statsLocTarget.nom}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Synthèse complète des encaissements, ponctualité et état des cautionnements
                </p>
              </div>
              <button className="modal-close" onClick={() => setStatsLocTarget(null)}>×</button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Grille des KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div className="dash-card" style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Total Encaissé</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                    {formatEuro(locStatsData.total_encaisse)}
                  </div>
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>sur {formatEuro(locStatsData.total_du)} appelés</div>
                </div>

                <div className="dash-card" style={{ padding: '12px 14px', background: locStatsData.impayes_count > 0 ? '#FEF2F2' : '#F8FAFC', border: locStatsData.impayes_count > 0 ? '1px solid #FECACA' : '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: locStatsData.impayes_count > 0 ? '#991B1B' : 'var(--text-muted)', textTransform: 'uppercase' }}>Reste Dû / Impayés</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: locStatsData.impayes_count > 0 ? '#DC2626' : 'var(--text-primary)', marginTop: 4 }}>
                    {formatEuro(locStatsData.total_du - locStatsData.total_encaisse)}
                  </div>
                  <div style={{ fontSize: 11, color: locStatsData.impayes_count > 0 ? '#B91C1C' : 'var(--text-muted)', marginTop: 2 }}>
                    {locStatsData.impayes_count} échéance(s) en retard
                  </div>
                </div>

                <div className="dash-card" style={{ padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>Régularité %</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1D4ED8', marginTop: 4 }}>
                    {locStatsData.taux_regularite}%
                  </div>
                  <div style={{ fontSize: 11, color: '#1E40AF', marginTop: 2 }}>taux d'échéances réglées à temps</div>
                </div>

                <div className="dash-card" style={{ padding: '12px 14px', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Dépôt de Garantie</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309', marginTop: 4 }}>
                    {formatEuro(locStatsData.total_depot_garantie)}
                  </div>
                  <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                    Statut : {locStatsData.statut_caution_resume}
                  </div>
                </div>
              </div>

              {/* Tableau de l'historique des paiements */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700 }}>📋 Historique des Loyers & Règlement ({locPaiementsList.length})</h4>
                {locPaiementsList.length === 0 ? (
                  <div className="alert alert-info" style={{ fontSize: 12 }}>Aucun règlement enregistré pour ce locataire.</div>
                ) : (
                  <div className="table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date prévue</th>
                          <th>Montant</th>
                          <th>Statut</th>
                          <th>Méthode</th>
                          <th>Quittance / Justificatif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locPaiementsList.map(p => (
                          <tr key={p.id}>
                            <td className="fw-600">{formatDate(p.date_prevue)}</td>
                            <td>{formatEuro(p.montant)}</td>
                            <td>
                              <span className={`badge ${p.statut === 'paye' ? 'badge-success' : 'badge-danger'}`}>
                                {p.statut === 'paye' ? 'Payé' : 'Impayé / En retard'}
                              </span>
                            </td>
                            <td>{p.methode || 'virement'}</td>
                            <td>
                              {p.fichier_quittance ? (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 8px', fontSize: 11 }}
                                  onClick={() => openFilePath(p.fichier_quittance)}
                                >
                                  📄 Ouvrir justificatif
                                </button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 11 }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStatsLocTarget(null)}>Fermer</button>
            </div>
          </div>
        </div>
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
