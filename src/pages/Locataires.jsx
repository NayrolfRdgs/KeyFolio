import React, { useEffect, useState, useCallback } from 'react'
import {
  getLocataires, createLocataire, updateLocataire, deleteLocataire, getLocataireStats,
  getCandidatures, createCandidature, updateCandidature, updateCandidatureStatut, deleteCandidature,
  getBiens, getBaux, getPaiements, createBail, openFilePath
} from '../lib/db'
import { formatEuro, formatDate, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'

// Modales découplées
import LocataireFormModal from '../components/locataires/LocataireFormModal'
import CandidatureFormModal from '../components/locataires/CandidatureFormModal'
import ConvertCandidatureModal from '../components/locataires/ConvertCandidatureModal'
import LocataireStatsModal from '../components/locataires/LocataireStatsModal'

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
  const [convertModal, setConvertModal] = useState(null)
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
  const openCreateLoc = () => { setLocForm(EMPTY_LOC); setLocEditing(null); setLocSourcePath(''); setLocModal(true) }
  const openEditLoc = (l) => { setLocForm({ ...l }); setLocEditing(l.id); setLocSourcePath(''); setLocModal(true) }

  const handlePickLocFile = async () => {
    try {
      const sel = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le dossier du locataire (PDF, Zip, Image)',
        filters: [{ name: 'Dossiers & Documents', extensions: ['pdf', 'zip', 'png', 'jpg', 'jpeg'] }]
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
      if (locEditing) {
        await updateLocataire(payload, locSourcePath || null)
        addToast('Locataire mis à jour')
      } else {
        await createLocataire(payload, locSourcePath || null)
        addToast('Locataire créé avec succès')
      }
      setLocModal(false)
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
  const openCreateCand = () => { setCandForm(EMPTY_CAND); setCandEditing(null); setCandSourcePath(''); setCandModal(true) }
  const openEditCand = (c) => { setCandForm({ ...c }); setCandEditing(c.id); setCandSourcePath(''); setCandModal(true) }

  const handlePickCandFile = async () => {
    try {
      const sel = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le dossier de candidature (PDF / Zip)',
        filters: [{ name: 'Dossiers & Documents', extensions: ['pdf', 'zip', 'png', 'jpg', 'jpeg'] }]
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

  // Conversion Candidature -> Bail
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

      await updateCandidatureStatut(convertModal.id, 'converti')

      setConvertModal(null)
      addToast(`🎉 Processus de création de bail finalisé pour ${convertModal.prenom} ${convertModal.nom}`)
      loadAll()
    } catch (err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleOpenDoc = async (relOrAbsPath) => {
    if (!relOrAbsPath) return
    try { await openFilePath(relOrAbsPath) }
    catch (e) { addToast(`Erreur ouverture : ${e}`, 'error') }
  }

  // Locataires avec bail calculé
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
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditLoc(l)} title="Modifier">
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
          )}
        </>
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
                      <td className="fw-600">📂 {c.prenom} {c.nom}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', fontSize: 12, fontWeight: 600 }}
                          onClick={() => c.bien_id && onNavigate && onNavigate('bien', c.bien_id)}
                        >
                          🏠 {c.bien_nom || 'Voir bien'}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{c.email || '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{c.telephone || '—'}</div>
                      </td>
                      <td>
                        <div className="fw-600">{c.revenus_mensuels ? formatEuro(c.revenus_mensuels) : '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{c.profession || 'Non spécifié'}</div>
                      </td>
                      <td>
                        <div>{c.garant_nom || '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{c.garant_contact || '—'}</div>
                      </td>
                      <td>
                        {c.fichier_dossier ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleOpenDoc(c.fichier_dossier)}
                            title="Ouvrir les pièces du dossier"
                          >
                            📄 Pièces PDF
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun fichier</span>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ fontSize: 12, padding: '3px 8px', height: 'auto', width: 'auto', minWidth: 120 }}
                          value={c.statut}
                          onChange={e => handleCandStatutChange(c.id, e.target.value)}
                          disabled={isConverti}
                        >
                          <option value="nouveau">🟡 Nouveau</option>
                          <option value="retenu">🟢 Retenu</option>
                          <option value="refuse">🔴 Refusé</option>
                          <option value="converti">🔑 Converti en Bail</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {!isConverti && (
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700 }}
                              onClick={() => openConvertModal(c)}
                              title="Convertir ce dossier en bail actif pour ce logement"
                            >
                              🔑 Créer Bail
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => {
                              if (c.bien_id && onOpenMail) {
                                onOpenMail(c.bien_id, { recipientEmail: c.email || '' })
                              }
                            }}
                            title="Envoyer un e-mail au candidat"
                          >
                            ✉️ Mail
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditCand(c)} title="Modifier">
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

      {/* ── Modales découplées ── */}
      <LocataireFormModal
        isOpen={locModal}
        isEditing={locEditing}
        form={locForm}
        setForm={setLocForm}
        sourcePath={locSourcePath}
        onPickFile={handlePickLocFile}
        onSubmit={handleLocSubmit}
        onClose={() => setLocModal(false)}
        loading={loading}
      />

      <CandidatureFormModal
        isOpen={candModal}
        isEditing={candEditing}
        form={candForm}
        setForm={setCandForm}
        biens={biens}
        sourcePath={candSourcePath}
        onPickFile={handlePickCandFile}
        onSubmit={handleCandSubmit}
        onClose={() => setCandModal(false)}
        loading={loading}
      />

      <ConvertCandidatureModal
        candidature={convertModal}
        form={convertBailForm}
        setForm={setConvertBailForm}
        onPickFile={handlePickConvertBailFile}
        onSubmit={handleConvertSubmit}
        onClose={() => setConvertModal(null)}
        loading={loading}
      />

      <LocataireStatsModal
        locataire={statsLocTarget}
        stats={locStatsData}
        paiements={locPaiementsList}
        onOpenFile={handleOpenDoc}
        onClose={() => setStatsLocTarget(null)}
      />

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
