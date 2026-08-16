import React, { useEffect, useState, useCallback } from 'react'
import {
  getLocataires, createLocataire, updateLocataire, deleteLocataire,
  getCandidatures, createCandidature, updateCandidature, updateCandidatureStatut, deleteCandidature,
  getBiens, getBaux, createBail, openFilePath, getLocataireStats
} from '../lib/db'
import { todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import LocataireFormModal from '../components/locataires/LocataireFormModal'
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
      setLocataires(l); setCandidatures(c); setBiens(bi); setBaux(ba)
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

  const handleLocDelete = async (id) => {
    if (!confirm('Supprimer ce locataire ?')) return
    try { await deleteLocataire(id); addToast('Locataire supprimé', 'info'); loadAll() }
    catch (err) { setError(err?.toString()) }
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
      bien_id: c.bien_id || '', nom: c.nom, prenom: c.prenom, telephone: c.telephone || '',
      email: c.email || '', profession: c.profession || '', revenus_mensuels: c.revenus_mensuels || '',
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
        bien_id: candForm.bien_id ? parseInt(candForm.bien_id) : null,
        revenus_mensuels: candForm.revenus_mensuels ? parseFloat(candForm.revenus_mensuels) : null,
        statut: editingCand ? undefined : 'nouveau',
        fichier_dossier: candForm.fichier_dossier || null
      }
      if (editingCand) {
        await updateCandidature({ id: editingCand, ...payload })
        addToast('Candidature mise à jour avec succès !')
      } else {
        await createCandidature(payload)
        addToast('Candidature enregistrée avec succès !')
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

  const fLoc = key => e => setLocForm({ ...locForm, [key]: e.target.value })
  const fCand = key => e => setCandForm({ ...candForm, [key]: e.target.value })

  return (
    <div className="page-content">
      {/* En-tête et onglets */}
      <LocatairesHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        locatairesCount={locataires.length}
        candidaturesCount={candidatures.length}
        search={search}
        setSearch={setSearch}
        locSubFilter={locSubFilter}
        setLocSubFilter={setLocSubFilter}
        countActuels={countActuels}
        countAnciens={countAnciens}
        onOpenCreateLoc={openCreateLoc}
        onOpenCreateCand={openCreateCand}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Vue Locataires */}
      {activeTab === 'locataires' && (
        <LocatairesTable
          locataires={filteredLocs}
          biens={biens}
          onNavigate={onNavigate}
          onOpenDoc={handleOpenDoc}
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

      {/* ── Modales ── */}
      <LocataireFormModal
        isOpen={locModal}
        isEditing={editingLoc}
        form={locForm}
        setField={fLoc}
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
