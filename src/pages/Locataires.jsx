import React, { useEffect, useState, useCallback } from 'react'
import {
  getLocataires, createLocataire, updateLocataire, deleteLocataire,
  getCandidatures, createCandidature, updateCandidature, updateCandidatureStatut, deleteCandidature,
  getBiens, getBaux, createBail, openFilePath, getLocataireStats
} from '../lib/db'
import { todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import LocataireFormModal from '../components/locataires/LocataireFormModal'
import LocataireProfileModal from '../components/locataires/LocataireProfileModal'
import CandidatureFormModal from '../components/locataires/CandidatureFormModal'
import ConvertCandidatureModal from '../components/locataires/ConvertCandidatureModal'
import LocataireStatsModal from '../components/locataires/LocataireStatsModal'
import LocatairesHeader from '../components/locataires/LocatairesHeader'
import LocatairesTable from '../components/locataires/LocatairesTable'
import CandidaturesTable from '../components/locataires/CandidaturesTable'

const EMPTY_LOC = {
  nom: '', prenom: '', telephone: '', email: '',
  date_naissance: '', profession: '', revenus_mensuels: '',
  garant_nom: '', garant_contact: '', notes: '', bien_id: '',
  fichier_dossier: ''
}

const EMPTY_CAND = {
  bien_id: '', nom: '', prenom: '', telephone: '', email: '',
  profession: '', revenus_mensuels: '', garant_nom: '', garant_contact: '',
  notes: '', fichier_dossier: ''
}

export default function Locataires({ onNavigate, onOpenMail }) {
  const [locataires, setLocataires]     = useState([])
  const [candidatures, setCandidatures] = useState([])
  const [biens, setBiens]               = useState([])
  const [baux, setBaux]                 = useState([])
  const [activeTab, setActiveTab]       = useState('locataires') // 'locataires' | 'candidatures'
  const [search, setSearch]             = useState('')
  const [locSubFilter, setLocSubFilter] = useState('actuels') // 'actuels' | 'anciens' | 'all'
  const [error, setError]               = useState(null)
  const [loading, setLoading]           = useState(false)
  const [toasts, setToasts]             = useState([])

  // Profil Rapide Locataire en 1 clic
  const [selectedLocProfile, setSelectedLocProfile] = useState(null)

  // Modales Locataire
  const [locModal, setLocModal]         = useState(false)
  const [locForm, setLocForm]           = useState(EMPTY_LOC)
  const [editingLoc, setEditingLoc]     = useState(null)

  // Modales Candidature
  const [candModal, setCandModal]       = useState(false)
  const [candForm, setCandForm]         = useState(EMPTY_CAND)
  const [editingCand, setEditingCand]   = useState(null)

  // Modale Conversion Candidature -> Bail
  const [convertModal, setConvertModal] = useState(null)
  const [convertBailForm, setConvertBailForm] = useState({
    date_debut: todayISO(), date_fin: '', loyer_mensuel: '', charges_mensuelles: '0',
    depot_garantie: '', jour_paiement: 5, fichier_bail: ''
  })

  // Modale Bilan Financier & Historique du Locataire
  const [statsModalData, setStatsModalData] = useState(null)

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const loadAll = async () => {
    try {
      const [l, c, bi, ba] = await Promise.all([getLocataires(), getCandidatures(), getBiens(), getBaux()])
      setLocataires(l || []); setCandidatures(c || []); setBiens(bi || []); setBaux(ba || [])
      
      if (selectedLocProfile) {
        const updatedProfile = (l || []).find(item => item.id === selectedLocProfile.id)
        if (updatedProfile) setSelectedLocProfile(updatedProfile)
      }
    } catch (e) { setError(e?.toString()) }
  }

  useEffect(() => { loadAll() }, [])

  // ── Actions Locataires ──
  const openCreateLoc = () => { setLocForm(EMPTY_LOC); setEditingLoc(null); setLocModal(true) }
  const openEditLoc   = (l) => {
    setLocForm({
      nom: l.nom, prenom: l.prenom, telephone: l.telephone || '', email: l.email || '',
      date_naissance: l.date_naissance || '', profession: l.profession || '',
      revenus_mensuels: l.revenus_mensuels || '', garant_nom: l.garant_nom || '',
      garant_contact: l.garant_contact || '', notes: l.notes || '',
      bien_id: l.bien_id || '', fichier_dossier: l.fichier_dossier || ''
    })
    setEditingLoc(l.id)
    setLocModal(true)
  }

  const handlePickLocFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner les pièces du dossier (PDF)',
        filters: [{ name: 'Documents PDF', extensions: ['pdf'] }]
      })
      if (selected) setLocForm(prev => ({ ...prev, fichier_dossier: selected }))
    } catch (err) { console.error(err) }
  }

  const handleLocSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...locForm,
        bien_id: locForm.bien_id ? parseInt(locForm.bien_id) : null,
        revenus_mensuels: locForm.revenus_mensuels ? parseFloat(locForm.revenus_mensuels) : null,
        fichier_dossier: locForm.fichier_dossier || null
      }
      if (editingLoc) {
        await updateLocataire({ id: editingLoc, ...payload })
        addToast('Locataire mis à jour avec succès !')
      } else {
        await createLocataire(payload)
        addToast('Locataire ajouté avec succès !')
      }
      setLocModal(false)
      loadAll()
    } catch (err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleLocQuickSave = async (updatedLoc) => {
    try {
      await updateLocataire(updatedLoc)
      addToast('Profil du locataire mis à jour avec succès !')
      loadAll()
    } catch (err) {
      setError(err?.toString())
      throw err
    }
  }

  const handleLocDelete = async (id) => {
    if (!confirm('Supprimer ce locataire ?')) return
    try {
      await deleteLocataire(id)
      addToast('Locataire supprimé', 'info')
      if (selectedLocProfile?.id === id) setSelectedLocProfile(null)
      loadAll()
    } catch (err) { setError(err?.toString()) }
  }

  const handleOpenLocStats = async (locataire) => {
    try {
      const stats = await getLocataireStats(locataire.id)
      setStatsModalData({ locataire, stats })
    } catch (err) { addToast(`Erreur chargement statistiques : ${err}`, 'error') }
  }

  // ── Actions Candidatures ──
  const openCreateCand = () => { setCandForm(EMPTY_CAND); setEditingCand(null); setCandModal(true) }
  const openEditCand   = (c) => {
    setCandForm({
      bien_id: c.bien_id || '', nom: c.nom, prenom: c.prenom,
      telephone: c.telephone || '', email: c.email || '',
      profession: c.profession || '', revenus_mensuels: c.revenus_mensuels || '',
      garant_nom: c.garant_nom || '', garant_contact: c.garant_contact || '',
      notes: c.notes || '', fichier_dossier: c.fichier_dossier || ''
    })
    setEditingCand(c.id)
    setCandModal(true)
  }

  const handlePickCandFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le dossier de candidature (PDF)',
        filters: [{ name: 'Documents PDF', extensions: ['pdf'] }]
      })
      if (selected) setCandForm(prev => ({ ...prev, fichier_dossier: selected }))
    } catch (err) { console.error(err) }
  }

  const handleCandSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...candForm,
        bien_id: parseInt(candForm.bien_id),
        revenus_mensuels: candForm.revenus_mensuels ? parseFloat(candForm.revenus_mensuels) : null,
        fichier_dossier: candForm.fichier_dossier || null
      }
      if (editingCand) {
        await updateCandidature({ id: editingCand, ...payload })
        addToast('Candidature mise à jour !')
      } else {
        await createCandidature(payload)
        addToast('Candidature enregistrée !')
      }
      setCandModal(false)
      loadAll()
    } catch (err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleCandStatutChange = async (id, statut) => {
    try {
      await updateCandidatureStatut(id, statut)
      addToast(`Statut mis à jour : ${statut}`)
      loadAll()
    } catch (err) { setError(err?.toString()) }
  }

  const handleCandDelete = async (id) => {
    if (!confirm('Supprimer cette candidature ?')) return
    try { await deleteCandidature(id); addToast('Candidature supprimée', 'info'); loadAll() }
    catch (err) { setError(err?.toString()) }
  }

  // ── Conversion Candidature -> Bail ──
  const openConvertModal = (cand) => {
    const targetBien = biens.find(b => b.id === cand.bien_id)
    setConvertBailForm({
      date_debut: todayISO(),
      date_fin: '',
      loyer_mensuel: targetBien?.loyer_estime || targetBien?.loyer_actuel || '',
      charges_mensuelles: '0',
      depot_garantie: targetBien?.loyer_estime || targetBien?.loyer_actuel || '',
      jour_paiement: 5,
      fichier_bail: ''
    })
    setConvertModal(cand)
  }

  const handleConvertSubmit = async (e) => {
    e.preventDefault()
    if (!convertModal) return
    setLoading(true)
    setError(null)
    try {
      const newLoc = await createLocataire({
        nom: convertModal.nom,
        prenom: convertModal.prenom,
        telephone: convertModal.telephone || null,
        email: convertModal.email || null,
        profession: convertModal.profession || null,
        revenus_mensuels: convertModal.revenus_mensuels || null,
        garant_nom: convertModal.garant_nom || null,
        garant_contact: convertModal.garant_contact || null,
        notes: `Converti depuis candidature le ${todayISO()}. ${convertModal.notes || ''}`,
        bien_id: convertModal.bien_id,
        fichier_dossier: convertModal.fichier_dossier || null
      })

      const newLocId = newLoc?.id || newLoc

      await createBail({
        bien_id: convertModal.bien_id,
        locataire_id: newLocId,
        date_debut: convertBailForm.date_debut,
        date_fin: convertBailForm.date_fin || null,
        loyer_mensuel: parseFloat(convertBailForm.loyer_mensuel),
        charges_mensuelles: parseFloat(convertBailForm.charges_mensuelles || 0),
        depot_garantie: convertBailForm.depot_garantie ? parseFloat(convertBailForm.depot_garantie) : null,
        jour_paiement: parseInt(convertBailForm.jour_paiement || 5),
        fichier_bail: convertBailForm.fichier_bail || null,
        statut: 'actif'
      })

      await updateCandidatureStatut(convertModal.id, 'acceptee')
      addToast(`Félicitations ! ${convertModal.prenom} ${convertModal.nom} est désormais locataire officiel.`)
      setConvertModal(null)
      loadAll()
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDoc = async (path) => {
    try { await openFilePath(path) }
    catch (e) { addToast(`Erreur ouverture document : ${e}`, 'error') }
  }

  // ── Filtrage & Jointures ──
  const locatairesEnriched = locataires.map(l => {
    const bauxLoc = baux.filter(b => b.locataire_id === l.id)
    const bailActif = bauxLoc.find(b => b.statut === 'actif')
    const lastBail = bauxLoc.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))[0]
    const currentBienId = bailActif ? bailActif.bien_id : l.bien_id
    const currentBien = biens.find(b => b.id === currentBienId)
    const isActuel = Boolean(bailActif)

    return {
      ...l,
      isActuel,
      bailActif,
      lastBail,
      bien_id: currentBienId,
      bien_nom: currentBien?.nom || (bailActif?.bien_nom) || (lastBail?.bien_nom) || null,
      bien_adresse: currentBien?.adresse || null
    }
  })

  const filteredLocs = locatairesEnriched.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      `${l.prenom} ${l.nom}`.toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.telephone || '').includes(q) ||
      (l.profession || '').toLowerCase().includes(q) ||
      (l.bien_nom || '').toLowerCase().includes(q)

    const matchSub =
      locSubFilter === 'all' ? true :
      locSubFilter === 'actuels' ? l.isActuel :
      locSubFilter === 'anciens' ? !l.isActuel : true

    return matchSearch && matchSub
  })

  const candidaturesEnriched = candidatures.map(c => {
    const bien = biens.find(b => b.id === c.bien_id)
    return { ...c, bien_nom: bien?.nom || '—', bien_adresse: bien?.adresse || '' }
  })

  const filteredCands = candidaturesEnriched.filter(c => {
    const q = search.toLowerCase()
    return !search ||
      `${c.prenom} ${c.nom}`.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.telephone || '').includes(q) ||
      (c.profession || '').toLowerCase().includes(q) ||
      (c.bien_nom || '').toLowerCase().includes(q)
  })

  const fLoc = key => e => setLocForm({ ...locForm, [key]: e.target.value })
  const fCand = key => e => setCandForm({ ...candForm, [key]: e.target.value })

  const countActuels = locatairesEnriched.filter(l => l.isActuel).length
  const countAnciens = locatairesEnriched.filter(l => !l.isActuel).length
  const countCandsEnAttente = candidatures.filter(c => c.statut === 'en_attente').length

  return (
    <div className="page-content">
      {/* En-tête */}
      <LocatairesHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        countLocataires={locataires.length}
        countCandidatures={candidatures.length}
        countCandsEnAttente={countCandsEnAttente}
        search={search}
        setSearch={setSearch}
        locSubFilter={locSubFilter}
        setLocSubFilter={setLocSubFilter}
        countActuels={countActuels}
        countAnciens={countAnciens}
        onOpenCreateLoc={openCreateLoc}
        onOpenCreateCand={openCreateCand}
      />

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0' }}>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Vue Locataires */}
      {activeTab === 'locataires' && (
        <LocatairesTable
          locataires={filteredLocs}
          biens={biens}
          onNavigate={onNavigate}
          onOpenDoc={handleOpenDoc}
          onSelectLocataire={(l) => setSelectedLocProfile(l)}
          onOpenLocStats={handleOpenLocStats}
          onOpenMail={(targetBienId, opts) => {
            if (onOpenMail) onOpenMail(targetBienId, opts)
          }}
          onEdit={openEditLoc}
          onDelete={handleLocDelete}
        />
      )}

      {/* Vue Candidatures */}
      {activeTab === 'candidatures' && (
        <CandidaturesTable
          candidatures={filteredCands}
          onNavigate={onNavigate}
          onOpenDoc={handleOpenDoc}
          onStatutChange={handleCandStatutChange}
          onConvert={openConvertModal}
          onOpenMail={(c) => {
            if (c.bien_id && onOpenMail) {
              onOpenMail(c.bien_id, { recipientEmail: c.email || '' })
            }
          }}
          onEdit={openEditCand}
          onDelete={handleCandDelete}
          onOpenCreate={openCreateCand}
        />
      )}

      {/* ── Modale Profil Locataire en 1 clic ── */}
      {selectedLocProfile && (
        <LocataireProfileModal
          locataire={selectedLocProfile}
          bien={biens.find(b => b.id === selectedLocProfile.bien_id)}
          bail={baux.find(b => b.locataire_id === selectedLocProfile.id && b.statut === 'actif') || selectedLocProfile.lastBail}
          onClose={() => setSelectedLocProfile(null)}
          onEdit={openEditLoc}
          onSaveQuick={handleLocQuickSave}
          onOpenDoc={handleOpenDoc}
          onOpenMail={onOpenMail}
          onNavigate={onNavigate}
        />
      )}

      {/* ── Modale Saisie / Édition Complète Locataire ── */}
      <LocataireFormModal
        isOpen={locModal}
        isEditing={editingLoc}
        form={locForm}
        setForm={setLocForm}
        biens={biens}
        onPickFile={handlePickLocFile}
        onSubmit={handleLocSubmit}
        onClose={() => setLocModal(false)}
        loading={loading}
      />

      <CandidatureFormModal
        isOpen={candModal}
        isEditing={editingCand}
        form={candForm}
        setField={fCand}
        biens={biens}
        onPickFile={handlePickCandFile}
        onSubmit={handleCandSubmit}
        onClose={() => setCandModal(false)}
        loading={loading}
      />

      <ConvertCandidatureModal
        convertModal={convertModal}
        convertBailForm={convertBailForm}
        setConvertBailForm={setConvertBailForm}
        biens={biens}
        onSubmit={handleConvertSubmit}
        onClose={() => setConvertModal(null)}
        loading={loading}
      />

      <LocataireStatsModal
        statsModalData={statsModalData}
        onClose={() => setStatsModalData(null)}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
