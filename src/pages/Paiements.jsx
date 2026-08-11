import React, { useEffect, useState, useCallback } from 'react'
import { getPaiements, createPaiement, updatePaiement, deletePaiement, getBaux, attachQuittanceToPaiement, openFilePath } from '../lib/db'
import { formatDate, formatEuro, statutPaiementBadge, labelStatutPaiement, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'
import QuickDocumentModal from '../components/QuickDocumentModal'
import PaiementKpis from '../components/paiements/PaiementKpis'
import PaiementModal from '../components/paiements/PaiementModal'

const EMPTY = {
  bail_id: '', date_prevue: '', date_reelle: '',
  montant: '', methode: 'virement', statut: 'impaye', notes: '', fichier_quittance: ''
}

export default function Paiements() {
  const [paiements, setPaiements] = useState([])
  const [baux, setBaux]           = useState([])
  const [modal, setModal]         = useState(false)
  const [quickDocModal, setQuickDocModal] = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [filterStatut, setFilterStatut] = useState('')
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
      const [p, b] = await Promise.all([getPaiements(), getBaux()])
      setPaiements(p); setBaux(b)
    } catch(e) { setError(e?.toString()) }
  }
  useEffect(() => { loadAll() }, [])

  const openCreate = () => { setForm({...EMPTY, date_prevue: todayISO()}); setEditing(null); setModal(true) }
  const openEdit   = (p) => {
    setForm({ ...p, montant: p.montant, fichier_quittance: p.fichier_quittance || '' })
    setEditing(p.id)
    setModal(true)
  }

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

  const handleDropFileOnRow = async (e, p) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const filePath = file.path || file.name
      if (filePath) {
        try {
          await attachQuittanceToPaiement(p.id, filePath)
          addToast(`Justificatif "${file.name}" attaché et paiement validé !`)
          loadAll()
        } catch(err) {
          addToast(`Erreur: ${err}`, 'error')
        }
      }
    }
  }

  const handleOpenDoc = async (relPath) => {
    try {
      await openFilePath(relPath)
    } catch(err) {
      addToast(`Impossible d'ouvrir le fichier : ${err}`, 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form, id: editing,
        bail_id: parseInt(form.bail_id),
        montant: parseFloat(form.montant),
        date_reelle: form.date_reelle || null,
        fichier_quittance: form.fichier_quittance || null,
      }
      if (editing) await updatePaiement(payload)
      else         await createPaiement(payload)
      setModal(false)
      addToast(editing ? 'Paiement mis à jour' : 'Paiement créé')
      loadAll()
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce paiement ?')) return
    try { await deletePaiement(id); addToast('Paiement supprimé', 'info'); loadAll() }
    catch(err) { setError(err?.toString()) }
  }

  const f = (k) => (e) => setForm({...form, [k]: e.target.value})

  const filtered = filterStatut
    ? paiements.filter(p => p.statut === filterStatut)
    : paiements

  const totalFiltered = filtered.reduce((s, p) => s + p.montant, 0)
  const totalPaye     = filtered.filter(p => p.statut === 'paye').reduce((s, p) => s + p.montant, 0)
  const countImpayes  = paiements.filter(p => p.statut === 'impaye' || p.statut === 'en_retard').length

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Paiements & Loyers</h2>
          <p>Échéancier automatique des loyers · Glissez-déposez un justificatif PDF pour valider un paiement</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setQuickDocModal(true)}>
            📎 Déposer un document
          </button>
          <button id="btn-add-paiement" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={14} /> Saisir une échéance
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <PaiementKpis
        totalFiltered={totalFiltered}
        totalPaye={totalPaye}
        countImpayes={countImpayes}
      />

      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select className="form-control" style={{ maxWidth: 220 }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts ({paiements.length})</option>
          <option value="impaye">Impayé ({paiements.filter(p => p.statut === 'impaye').length})</option>
          <option value="paye">Payé ({paiements.filter(p => p.statut === 'paye').length})</option>
          <option value="en_retard">En retard ({paiements.filter(p => p.statut === 'en_retard').length})</option>
          <option value="partiel">Partiel ({paiements.filter(p => p.statut === 'partiel').length})</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 Astuce : glissez-déposez le PDF d'un virement sur une ligne pour la valider instantanément
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <h3>Aucun paiement trouvé</h3>
            <p>Les loyers s'affichent automatiquement sous forme d'impayés dès qu'un bail actif est créé.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bien</th>
                <th>Locataire</th>
                <th>Date prévue</th>
                <th>Date payé</th>
                <th>Montant</th>
                <th>Justificatif / Virement</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isOver = dragOverId === p.id
                return (
                  <tr
                    key={p.id}
                    className={isOver ? 'drop-zone-highlight' : ''}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(p.id) }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => handleDropFileOnRow(e, p)}
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    <td className="fw-600">🏠 {p.bien_nom || '—'}</td>
                    <td>👤 {p.locataire_nom || '—'}</td>
                    <td className="text-muted">{formatDate(p.date_prevue)}</td>
                    <td className="text-muted">{p.date_reelle ? formatDate(p.date_reelle) : '—'}</td>
                    <td className="fw-600">{formatEuro(p.montant)}</td>
                    <td>
                      {p.fichier_quittance ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => handleOpenDoc(p.fichier_quittance)}
                          title="Ouvrir le justificatif attaché"
                        >
                          📄 Justificatif PDF
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11, border: '1px dashed var(--color-border)' }}
                          onClick={() => handleAttachQuittance(p)}
                          title="Attacher un PDF de virement ou justificatif"
                        >
                          📎 Glisser PDF ici
                        </button>
                      )}
                    </td>
                    <td>
                      <select
                        className={`badge ${statutPaiementBadge(p.statut)}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none', padding: '4px 8px', fontWeight: 600 }}
                        value={p.statut}
                        onChange={(e) => handleStatusChange(p, e.target.value)}
                      >
                        <option value="impaye" style={{ color: '#000' }}>🔴 Impayé</option>
                        <option value="paye" style={{ color: '#000' }}>🟢 Payé</option>
                        <option value="en_retard" style={{ color: '#000' }}>🟠 En retard</option>
                        <option value="partiel" style={{ color: '#000' }}>🟡 Partiel</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {p.statut !== 'paye' && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '3px 10px', fontSize: 12, fontWeight: 600 }}
                            onClick={() => markPaid(p)}
                            title="Marquer comme payé"
                          >
                            ✔️ Payé
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)} title="Modifier">
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id)} title="Supprimer">
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

      {quickDocModal && (
        <QuickDocumentModal
          onClose={() => setQuickDocModal(false)}
          onSuccess={loadAll}
        />
      )}

      {/* Toast notifications */}
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
