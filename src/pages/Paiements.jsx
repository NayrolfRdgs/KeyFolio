import React, { useEffect, useState, useCallback } from 'react'
import {
  getPaiements, createPaiement, updatePaiement, deletePaiement,
  getBaux, updateBail, getBiens, getLocataires,
  attachQuittanceToPaiement, openFilePath
} from '../lib/db'
import { labelStatutPaiement, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/common/Icon'
import QuickDocumentModal from '../components/documents/QuickDocumentModal'
import QuittanceModal from '../components/paiements/QuittanceModal'
import PaiementKpis from '../components/paiements/PaiementKpis'
import PaiementModal from '../components/paiements/PaiementModal'
import PaiementsFilterBar from '../components/paiements/PaiementsFilterBar'
import CautionsTable from '../components/paiements/CautionsTable'
import PaiementsTable from '../components/paiements/PaiementsTable'

const EMPTY = {
  bail_id: '', date_prevue: '', date_reelle: '',
  montant: '', methode: 'virement', statut: 'impaye', notes: '', fichier_quittance: ''
}

export default function Paiements({ onNavigate, onOpenMail }) {
  const [paiements, setPaiements] = useState([])
  const [baux, setBaux]           = useState([])
  const [biens, setBiens]         = useState([])
  const [locataires, setLocataires] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'loyers' | 'cautions' | 'impayes'
  const [filterStatut, setFilterStatut] = useState('')
  const [filterBien, setFilterBien] = useState('')

  const [modal, setModal]                 = useState(false)
  const [quickDocModal, setQuickDocModal] = useState(false)
  const [quittancePaiement, setQuittancePaiement] = useState(null)
  
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [dragOverId, setDragOverId] = useState(null)
  const [toasts, setToasts]       = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const loadAll = async () => {
    try {
      const [p, b, bi, lo] = await Promise.all([getPaiements(), getBaux(), getBiens(), getLocataires()])
      setPaiements(p); setBaux(b); setBiens(bi); setLocataires(lo)
    } catch(e) { setError(e?.toString()) }
  }
  useEffect(() => { loadAll() }, [])

  const openCreate = () => { setForm({...EMPTY, date_prevue: todayISO()}); setEditing(null); setModal(true) }
  const openEdit   = (p) => {
    setForm({ ...p, montant: p.montant, fichier_quittance: p.fichier_quittance || '' })
    setEditing(p.id)
    setModal(true)
  }

  // Actions Loyers
  const markPaid = async (p) => {
    const updated = { ...p, statut: 'paye', date_reelle: p.date_reelle || todayISO() }
    try {
      await updatePaiement(updated)
      addToast(`Loyer de ${p.locataire_nom || 'locataire'} marqué comme PAYÉ`)
      loadAll()
    } catch(err) { setError(err?.toString()) }
  }

  const handleStatusChange = async (p, newStatut) => {
    const updated = {
      ...p,
      statut: newStatut,
      date_reelle: newStatut === 'paye' ? (p.date_reelle || todayISO()) : p.date_reelle
    }
    try {
      await updatePaiement(updated)
      addToast(`Statut mis à jour : ${labelStatutPaiement(newStatut)}`)
      loadAll()
    } catch(err) { setError(err?.toString()) }
  }

  const handleAttachQuittance = async (p) => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le virement ou justificatif PDF / Image',
        filters: [{ name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }]
      })
      if (selected) {
        await attachQuittanceToPaiement(p.id, selected)
        addToast(`Justificatif rattaché à l'échéance de ${p.locataire_nom || 'locataire'} !`)
        loadAll()
      }
    } catch(err) {
      addToast(`Erreur d'attachement: ${err}`, 'error')
    }
  }

  // Actions Dépôt de garantie / Caution
  const handleCautionStatusChange = async (bail, newStatut) => {
    try {
      await updateBail({ ...bail, statut_garantie: newStatut })
      addToast(`Statut caution mis à jour : ${newStatut}`)
      loadAll()
    } catch(err) {
      addToast(`Erreur: ${err}`, 'error')
    }
  }

  const handleValidateCaution = async (bail) => {
    try {
      await updateBail({ ...bail, statut_garantie: 'recu' })
      addToast(` Dépôt de garantie (${bail.locataire_prenom} ${bail.locataire_nom}) validé comme REÇU !`)
      loadAll()
    } catch(err) {
      addToast(`Erreur: ${err}`, 'error')
    }
  }

  const handleAttachCautionDoc = async (bail) => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le justificatif de caution',
        filters: [{ name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
      })
      if (selected) {
        await updateBail({ ...bail, fichier_caution: selected, statut_garantie: 'recu' })
        addToast(`Justificatif de caution attaché !`)
        loadAll()
      }
    } catch(err) {
      addToast(`Erreur: ${err}`, 'error')
    }
  }

  const handleUpdateCaution = async (updatedBail) => {
    try {
      await updateBail(updatedBail)
      addToast(` Dépôt de garantie mis à jour et synchronisé dans l'Excel !`)
      loadAll()
    } catch(err) {
      addToast(`Erreur mise à jour caution: ${err}`, 'error')
    }
  }

  const handleOpenDoc = async (path) => {
    try {
      await openFilePath(path)
    } catch (e) {
      addToast(`Erreur ouverture fichier: ${e}`, 'error')
    }
  }

  // Drag and Drop
  const handleDragOver = (e, paiementId) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(paiementId)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOverId(null)
  }

  const handleDrop = async (e, paiementId) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      const path = file.path || file.name
      if (path) {
        try {
          await attachQuittanceToPaiement(paiementId, path)
          addToast('Justificatif rattaché par glisser-déposer !')
          loadAll()
        } catch (err) {
          addToast(`Erreur lors du dépôt: ${err}`, 'error')
        }
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        bail_id: parseInt(form.bail_id),
        montant: parseFloat(form.montant),
        date_reelle: form.date_reelle || null,
        notes: form.notes || null,
        fichier_quittance: form.fichier_quittance || null
      }
      if (editing) {
        await updatePaiement({ id: editing, ...payload })
        addToast('Paiement mis à jour avec succès')
      } else {
        await createPaiement(payload)
        addToast('Paiement créé avec succès')
      }
      setModal(false)
      loadAll()
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce paiement ?')) return
    try {
      await deletePaiement(id)
      addToast('Paiement supprimé', 'info')
      loadAll()
    } catch(err) { setError(err?.toString()) }
  }

  // Filtrage
  const filteredPaiements = paiements.filter(p => {
    const matchStatut = !filterStatut || p.statut === filterStatut
    const matchBien   = !filterBien || p.bien_id === parseInt(filterBien)
    const matchTab    = activeTab === 'all' || activeTab === 'loyers' ||
                        (activeTab === 'impayes' && (p.statut === 'impaye' || p.statut === 'en_retard'))
    return matchStatut && matchBien && matchTab
  })

  const bauxWithDeposit = baux.filter(b => {
    const hasDeposit = b.depot_garantie && parseFloat(b.depot_garantie) > 0
    const matchBien = !filterBien || b.bien_id === parseInt(filterBien)
    return hasDeposit && matchBien
  })

  const cautionsEnAttente = baux.filter(b => b.statut_garantie === 'en_attente' && b.depot_garantie > 0)
  const totalPaye     = paiements.filter(p => p.statut === 'paye').reduce((s, p) => s + p.montant, 0)
  const totalFiltered = filteredPaiements.reduce((s, p) => s + p.montant, 0)
  const countImpayes  = paiements.filter(p => p.statut === 'impaye' || p.statut === 'en_retard').length
  const totalCautionsRecues = bauxWithDeposit.filter(b => b.statut_garantie === 'recu').reduce((s, b) => s + (parseFloat(b.depot_garantie) || 0), 0)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Paiements & Cautions</h2>
          <p className="page-subtitle">
            Suivi des loyers, encaissement des cautions, génération de quittances et justificatifs de virement
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setQuickDocModal(true)} title="Déposer un justificatif PDF">
             Déposer un reçu
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            + Encaisser un loyer
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* KPI Cards */}
      <PaiementKpis
        totalFiltered={totalFiltered}
        totalPaye={totalPaye}
        countImpayes={countImpayes}
        totalCautionsRecues={totalCautionsRecues}
        countCautionsEnAttente={cautionsEnAttente.length}
      />

      {/* Onglets et filtres */}
      <PaiementsFilterBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        paiementsCount={paiements.length}
        bauxWithDepositCount={bauxWithDeposit.length}
        cautionsEnAttenteCount={cautionsEnAttente.length}
        countImpayes={countImpayes}
        filterStatut={filterStatut}
        setFilterStatut={setFilterStatut}
        filterBien={filterBien}
        setFilterBien={setFilterBien}
        biens={biens}
      />

      {/* Section Cautions */}
      {(activeTab === 'cautions' || activeTab === 'all') && (
        <CautionsTable
          bauxWithDeposit={bauxWithDeposit}
          totalCautionsRecues={totalCautionsRecues}
          isAllTab={activeTab === 'all'}
          onNavigate={onNavigate}
          onCautionStatusChange={handleCautionStatusChange}
          onOpenDoc={handleOpenDoc}
          onAttachCautionDoc={handleAttachCautionDoc}
          onValidateCaution={handleValidateCaution}
          onUpdateCaution={handleUpdateCaution}
          onOpenMail={(b) => {
            if (onOpenMail && b.bien_id) {
              onOpenMail(b.bien_id, {
                recipientEmail: b.locataire_email || '',
                initialBailId: b.id
              })
            }
          }}
        />
      )}

      {/* Section Loyers */}
      {activeTab !== 'cautions' && (
        <PaiementsTable
          paiements={filteredPaiements}
          isAllTab={activeTab === 'all'}
          biens={biens}
          locataires={locataires}
          baux={baux}
          dragOverId={dragOverId}
          onNavigate={onNavigate}
          onOpenDoc={handleOpenDoc}
          onAttachQuittance={handleAttachQuittance}
          onStatusChange={handleStatusChange}
          onMarkPaid={markPaid}
          onOpenQuittanceModal={setQuittancePaiement}
          onEdit={openEdit}
          onDelete={handleDelete}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      )}

      {/* Modale Saisie Paiement */}
      <PaiementModal
        modal={modal}
        editing={editing}
        form={form}
        setForm={setForm}
        baux={baux}
        loading={loading}
        setModal={setModal}
        handleSubmit={handleSubmit}
      />

      {/* Modale Déposer Document */}
      {quickDocModal && (
        <QuickDocumentModal
          onClose={() => setQuickDocModal(false)}
          onSuccess={loadAll}
        />
      )}

      {/* Modale Quittance de Loyer PDF */}
      {quittancePaiement && (
        <QuittanceModal
          paiement={quittancePaiement.paiement}
          bien={quittancePaiement.bien}
          locataire={quittancePaiement.locataire}
          bail={quittancePaiement.bail}
          onClose={() => setQuittancePaiement(null)}
          onSendMail={onOpenMail}
        />
      )}

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'success' && ''}
              {t.type === 'error' && ''}
              {t.type === 'info' && 'ℹ️'}
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
