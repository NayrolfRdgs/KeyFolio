import React, { useEffect, useState, useCallback } from 'react'
import { getBaux, createBail, updateBail, deleteBail, terminateBail, getBiens, getLocataires, openFilePath } from '../lib/db'
import { todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import EtatDesLieuxModal from '../components/baux/EtatDesLieuxModal'
import BailGenerateurModal from '../components/baux/BailGenerateurModal'
import BailFormModal from '../components/baux/BailFormModal'
import BailClotureModal from '../components/baux/BailClotureModal'
import BauxStatsBar from '../components/baux/BauxStatsBar'
import BauxTable from '../components/baux/BauxTable'

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
  const [filterBien, setFilterBien] = useState('')
  const [filterStatut, setFilterStatut] = useState('actif') // 'actif' | 'all' | 'termine'
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [toasts, setToasts]         = useState([])

  // Modales
  const [terminateModal, setTerminateModal]         = useState(null)
  const [edlModalData, setEdlModalData]             = useState(null)
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
    setForm(EMPTY)
    setEditing(null)
    setModal(true)
  }

  const openEdit = (b) => {
    setForm({
      bien_id: b.bien_id,
      locataire_id: b.locataire_id,
      date_debut: b.date_debut,
      date_fin: b.date_fin || '',
      loyer_mensuel: b.loyer_mensuel,
      charges_mensuelles: b.charges_mensuelles || '0',
      depot_garantie: b.depot_garantie || '',
      statut_garantie: b.statut_garantie || 'en_attente',
      fichier_caution: b.fichier_caution || '',
      jour_paiement: b.jour_paiement || '5',
      statut: b.statut,
      fichier_bail: b.fichier_bail || '',
      type_bail: b.type_bail || 'meuble',
      clause_irl: b.clause_irl !== undefined ? b.clause_irl : true,
      compteur_elec_entree: b.compteur_elec_entree || '',
      compteur_eau_entree: b.compteur_eau_entree || '',
      compteur_gaz_entree: b.compteur_gaz_entree || '',
      notes_bail: b.notes_bail || ''
    })
    setEditing(b.id)
    setModal(true)
  }

  const handlePickBailFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le contrat de bail (PDF)',
        filters: [{ name: 'Documents PDF', extensions: ['pdf'] }]
      })
      if (selected) {
        setForm(prev => ({ ...prev, fichier_bail: selected }))
      }
    } catch(err) {
      console.error(err)
    }
  }

  const handleOpenBailGenerator = () => {
    if (!form.bien_id || !form.locataire_id) {
      addToast('Veuillez d\'abord sélectionner un bien et un locataire', 'error')
      return
    }
    const targetBien = biens.find(b => b.id === parseInt(form.bien_id))
    const targetLoc  = locataires.find(l => l.id === parseInt(form.locataire_id))
    setBailGenerateurData({
      bail: editing ? { id: editing, ...form } : null,
      bien: targetBien,
      locataire: targetLoc,
      formValues: form
    })
  }

  const handleOpenBailGeneratorForRow = (b) => {
    const targetBien = biens.find(bi => bi.id === b.bien_id)
    const targetLoc  = locataires.find(l => l.id === b.locataire_id)
    setBailGenerateurData({
      bail: b,
      bien: targetBien,
      locataire: targetLoc,
      formValues: b
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        bien_id: parseInt(form.bien_id),
        locataire_id: parseInt(form.locataire_id),
        loyer_mensuel: parseFloat(form.loyer_mensuel),
        charges_mensuelles: parseFloat(form.charges_mensuelles || 0),
        depot_garantie: form.depot_garantie ? parseFloat(form.depot_garantie) : null,
        jour_paiement: parseInt(form.jour_paiement || 5),
        date_fin: form.date_fin || null,
        clause_irl: Boolean(form.clause_irl)
      }

      if (editing) {
        await updateBail({ id: editing, ...payload })
        addToast('Contrat de bail mis à jour avec succès !')
      } else {
        await createBail(payload)
        addToast('Nouveau contrat de bail créé avec succès !')
      }
      setModal(false)
      loadAll()
    } catch(err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce bail ? (Les quittances et paiements associés resteront en base)')) return
    try {
      await deleteBail(id)
      addToast('Bail supprimé.', 'info')
      loadAll()
    } catch(err) { setError(err?.toString()) }
  }

  const openTerminateModal = (b) => {
    const targetBien = biens.find(bi => bi.id === b.bien_id)
    const targetLoc = locataires.find(l => l.id === b.locataire_id)
    setTerminateModal({
      bailId: b.id,
      bienId: b.bien_id,
      bienNom: b.bien_nom || targetBien?.nom || 'Logement',
      locataireNom: `${b.locataire_prenom || ''} ${b.locataire_nom || ''}`,
      dateFin: todayISO(),
      motifFin: 'Congé locataire',
      restitutionCaution: 'restitue',
      montantRetenu: '',
      motifRetenue: '',
      compteurElec: '',
      compteurEau: '',
      compteurGaz: '',
      clesRemises: 'Toutes les clés remises',
      notesFin: '',
      generateEdl: true,
      sendClosingMail: true,
      bail: b,
      bien: targetBien,
      locataire: targetLoc
    })
  }

  const handleConfirmTerminate = async (e) => {
    e.preventDefault()
    if (!terminateModal) return
    setLoading(true)
    try {
      await terminateBail(
        terminateModal.bailId,
        terminateModal.dateFin,
        terminateModal.motifFin,
        terminateModal.restitutionCaution,
        terminateModal.montantRetenu ? parseFloat(terminateModal.montantRetenu) : null,
        terminateModal.notesFin || null
      )

      addToast(`Le bail de ${terminateModal.locataireNom} a été clôturé avec succès !`)
      const termData = { ...terminateModal }
      setTerminateModal(null)
      loadAll()

      if (termData.generateEdl) {
        setEdlModalData({
          bail: termData.bail,
          bien: termData.bien,
          locataire: termData.locataire,
          terminationInfo: {
            dateFin: termData.dateFin,
            motifFin: termData.motifFin,
            notesFin: termData.notesFin,
            restitutionCaution: termData.restitutionCaution,
            montantRetenu: termData.montantRetenu,
            motifRetenue: termData.motifRetenue,
            compteurElec: termData.compteurElec,
            compteurEau: termData.compteurEau,
            compteurGaz: termData.compteurGaz,
            clesRemises: termData.clesRemises
          }
        })
      }

      if (termData.sendClosingMail && !termData.generateEdl && onOpenMail) {
        onOpenMail(termData.bienId, {
          initialView: 'compose',
          initialBailId: termData.bailId,
          recipientEmail: termData.locataire?.email || '',
          initialSubject: `Solde de tout compte et clôture de bail — ${termData.bienNom}`
        })
      }
    } catch(err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDoc = async (path) => {
    try {
      await openFilePath(path)
    } catch (e) {
      addToast(`Erreur ouverture document : ${e}`, 'error')
    }
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

      {/* Barre de filtres et stats */}
      <BauxStatsBar
        filterStatut={filterStatut}
        setFilterStatut={setFilterStatut}
        countActifs={countActifs}
        countAnciens={countAnciens}
        totalBaux={baux.length}
        filterBien={filterBien}
        setFilterBien={setFilterBien}
        biens={biens}
      />

      {/* Tableau des baux */}
      <BauxTable
        baux={filtered}
        onNavigate={onNavigate}
        onOpenDoc={handleOpenDoc}
        onOpenBailGeneratorForRow={handleOpenBailGeneratorForRow}
        onOpenTerminateModal={openTerminateModal}
        onOpenEdlModal={(b) => {
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
        onOpenMail={(b) => {
          if (onOpenMail && b.bien_id) {
            onOpenMail(b.bien_id, {
              initialView: 'compose',
              initialBailId: b.id,
              recipientEmail: b.locataire_email || ''
            })
          }
        }}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

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
