import React, { useEffect, useState, useCallback } from 'react'
import {
  getPaiements, createPaiement, updatePaiement, deletePaiement,
  getBaux, updateBail, getBiens, getLocataires,
  attachQuittanceToPaiement, openFilePath
} from '../lib/db'
import { formatDate, formatEuro, statutPaiementBadge, labelStatutPaiement, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'
import QuickDocumentModal from '../components/QuickDocumentModal'
import QuittanceModal from '../components/QuittanceModal'
import PaiementKpis from '../components/paiements/PaiementKpis'
import PaiementModal from '../components/paiements/PaiementModal'

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

  const [modal, setModal]         = useState(false)
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

  // ── Actions Loyers ──
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

  // ── Actions Cautions / Dépôts de garantie ──
  const handleValidateCaution = async (b) => {
    try {
      const updatedBail = {
        ...b,
        statut_garantie: 'recu'
      }
      await updateBail(updatedBail)
      addToast(`✅ Dépôt de garantie (${formatEuro(b.depot_garantie || 0)}) validé et marqué comme REÇU pour ${b.locataire_prenom} ${b.locataire_nom} !`)
      loadAll()
    } catch (err) {
      addToast(`Erreur validation caution : ${err}`, 'error')
    }
  }

  const handleCautionStatusChange = async (b, newStatus) => {
    try {
      const updatedBail = {
        ...b,
        statut_garantie: newStatus
      }
      await updateBail(updatedBail)
      addToast(`Statut du dépôt de garantie mis à jour.`)
      loadAll()
    } catch (err) {
      addToast(`Erreur : ${err}`, 'error')
    }
  }

  const handleAttachCautionDoc = async (b) => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le justificatif de caution (PDF / Reçu / Attestation)',
        filters: [{ name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }]
      })
      if (selected) {
        const updatedBail = {
          ...b,
          fichier_caution: selected,
          statut_garantie: 'recu'
        }
        await updateBail(updatedBail)
        addToast(`Justificatif de caution rattaché et statut validé !`)
        loadAll()
      }
    } catch (err) {
      addToast(`Erreur : ${err}`, 'error')
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

  // Filtrage
  const bauxWithDeposit = baux.filter(b => b.depot_garantie && b.depot_garantie > 0)
  const cautionsEnAttente = bauxWithDeposit.filter(b => b.statut_garantie === 'en_attente' && b.statut === 'actif')
  const totalCautionsRecues = bauxWithDeposit.filter(b => b.statut_garantie === 'recu').reduce((sum, b) => sum + (b.depot_garantie || 0), 0)

  const filteredPaiements = paiements.filter(p => {
    const matchBien = !filterBien || p.bien_id === parseInt(filterBien)
    const matchStatut = !filterStatut || p.statut === filterStatut
    const matchTab =
      activeTab === 'all' || activeTab === 'loyers' ? true :
      activeTab === 'impayes' ? (p.statut === 'impaye' || p.statut === 'en_retard') : false
    return matchBien && matchStatut && matchTab
  })

  const totalFiltered = filteredPaiements.reduce((s, p) => s + p.montant, 0)
  const totalPaye     = filteredPaiements.filter(p => p.statut === 'paye').reduce((s, p) => s + p.montant, 0)
  const countImpayes  = paiements.filter(p => p.statut === 'impaye' || p.statut === 'en_retard').length

  const labelStatutCaution = (statut) => {
    switch (statut) {
      case 'recu': return { label: '✅ Reçu / Encaissé', cls: 'badge-success' }
      case 'restitue': return { label: '↩️ Restitué', cls: 'badge-neutral' }
      case 'partiel_restitue': return { label: '⚠️ Retenue partielle', cls: 'badge-warning' }
      case 'en_attente':
      default:
        return { label: '⏳ En attente', cls: 'badge-danger' }
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Paiements, Loyers & Cautions</h2>
          <p className="page-subtitle">
            Suivi des échéances de loyers, validation des dépôts de garantie et génération de quittances PDF
          </p>
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

      {/* KPI Cards */}
      <PaiementKpis
        totalFiltered={totalFiltered}
        totalPaye={totalPaye}
        countImpayes={countImpayes}
        totalCautionsRecues={totalCautionsRecues}
        countCautionsEnAttente={cautionsEnAttente.length}
      />

      {/* Bannière Cautions en Attente si existantes */}
      {cautionsEnAttente.length > 0 && (
        <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px 18px', borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <strong style={{ color: '#92400E', fontSize: 14 }}>
                  {cautionsEnAttente.length} dépôt{cautionsEnAttente.length > 1 ? 's' : ''} de garantie en attente de versement !
                </strong>
                <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                  Validez la réception des cautions dès l'encaissement du virement ou du chèque.
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: '#F59E0B', color: '#FFF', fontWeight: 700, border: 'none' }}
              onClick={() => setActiveTab('cautions')}
            >
              Voir les cautions en attente →
            </button>
          </div>
        </div>
      )}

      {/* Sous-filtres d'onglets */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('all')}
          >
            📋 Tous les flux
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'loyers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('loyers')}
          >
            🏠 Loyers ({paiements.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'cautions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('cautions')}
          >
            💶 Dépôts de garantie ({bauxWithDeposit.length})
            {cautionsEnAttente.length > 0 && ` ⚠️ ${cautionsEnAttente.length}`}
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'impayes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('impayes')}
            style={countImpayes > 0 ? { background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' } : {}}
          >
            🔴 Impayés & En retard ({countImpayes})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab !== 'cautions' && (
            <select className="form-control" style={{ maxWidth: 180 }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="impaye">Impayé</option>
              <option value="paye">Payé</option>
              <option value="en_retard">En retard</option>
              <option value="partiel">Partiel</option>
            </select>
          )}

          <select className="form-control" style={{ maxWidth: 180 }} value={filterBien} onChange={e => setFilterBien(e.target.value)}>
            <option value="">Tous les logements</option>
            {biens.map(b => <option key={b.id} value={b.id}>🏠 {b.nom}</option>)}
          </select>
        </div>
      </div>

      {/* ── SECTION CAUTIONS / DÉPÔTS DE GARANTIE ── */}
      {(activeTab === 'cautions' || activeTab === 'all') && (
        <div style={{ marginBottom: activeTab === 'all' ? 24 : 0 }}>
          {activeTab === 'all' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                💶 Dépôts de garantie & Cautions ({bauxWithDeposit.length})
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Montant total garanti : {formatEuro(totalCautionsRecues)}
              </span>
            </div>
          )}

          {bauxWithDeposit.length === 0 ? (
            <div className="table-wrapper" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun dépôt de garantie enregistré sur les baux.
            </div>
          ) : (
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Logement</th>
                    <th>Locataire</th>
                    <th>Date d'entrée</th>
                    <th>Montant caution</th>
                    <th>Statut caution</th>
                    <th>Justificatif</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bauxWithDeposit.map(b => {
                    const st = labelStatutCaution(b.statut_garantie || 'en_attente')
                    const isEnAttente = (b.statut_garantie || 'en_attente') === 'en_attente'
                    return (
                      <tr key={b.id} style={{ background: isEnAttente ? '#FFFBEB' : undefined }}>
                        <td className="fw-600">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}
                            onClick={() => onNavigate && onNavigate('bien', b.bien_id)}
                          >
                            🏠 {b.bien_nom || '—'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: 13, fontWeight: 500 }}
                            onClick={() => onNavigate && onNavigate('locataires')}
                          >
                            👤 {b.locataire_prenom} {b.locataire_nom}
                          </button>
                        </td>
                        <td className="text-muted">{formatDate(b.date_debut)}</td>
                        <td className="fw-600" style={{ fontSize: 14 }}>{formatEuro(b.depot_garantie)}</td>
                        <td>
                          <select
                            className={`badge ${st.cls}`}
                            style={{ border: 'none', cursor: 'pointer', outline: 'none', padding: '4px 8px', fontWeight: 600 }}
                            value={b.statut_garantie || 'en_attente'}
                            onChange={(e) => handleCautionStatusChange(b, e.target.value)}
                          >
                            <option value="en_attente" style={{ color: '#000' }}>⏳ En attente</option>
                            <option value="recu" style={{ color: '#000' }}>✅ Reçu / Encaissé</option>
                            <option value="restitue" style={{ color: '#000' }}>↩️ Restitué</option>
                            <option value="partiel_restitue" style={{ color: '#000' }}>⚠️ Retenue partielle</option>
                          </select>
                        </td>
                        <td>
                          {b.fichier_caution ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => handleOpenDoc(b.fichier_caution)}
                              title="Ouvrir le justificatif de caution"
                            >
                              📄 Reçu PDF
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11, border: '1px dashed var(--border-color)' }}
                              onClick={() => handleAttachCautionDoc(b)}
                              title="Attacher un justificatif de virement"
                            >
                              📎 Attacher reçu
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                            {isEnAttente && (
                              <button
                                className="btn btn-success btn-sm"
                                style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700 }}
                                onClick={() => handleValidateCaution(b)}
                                title="Valider l'encaissement de la caution en 1 clic"
                              >
                                ✔️ Valider reçue
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => {
                                if (onOpenMail && b.bien_id) {
                                  onOpenMail(b.bien_id, {
                                    recipientEmail: b.locataire_email || '',
                                    initialBailId: b.id
                                  })
                                }
                              }}
                              title="Contacter le locataire"
                            >
                              ✉️ Mail
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
        </div>
      )}

      {/* ── SECTION LOYERS & ÉCHÉANCIER ── */}
      {activeTab !== 'cautions' && (
        <div>
          {activeTab === 'all' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                🏠 Échéancier des Loyers ({filteredPaiements.length})
              </h3>
            </div>
          )}

          {filteredPaiements.length === 0 ? (
            <div className="table-wrapper">
              <div className="empty-state">
                <div className="empty-state-icon">💳</div>
                <h3>Aucun paiement correspondant</h3>
                <p>Les loyers s'affichent automatiquement dès qu'un bail actif est créé.</p>
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
                  {filteredPaiements.map(p => {
                    const isOver = dragOverId === p.id
                    const isPaye = p.statut === 'paye'
                    const targetBail = baux.find(b => b.id === p.bail_id)
                    const targetBien = biens.find(b => b.id === (targetBail?.bien_id || p.bien_id))
                    const targetLoc = locataires.find(l => l.id === (targetBail?.locataire_id || p.locataire_id))

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
                              style={{ padding: '2px 8px', fontSize: 11, border: '1px dashed var(--border-color)' }}
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
                            {!isPaye && (
                              <button
                                className="btn btn-success btn-sm"
                                style={{ padding: '3px 10px', fontSize: 12, fontWeight: 600 }}
                                onClick={() => markPaid(p)}
                                title="Marquer comme payé"
                              >
                                ✔️ Payé
                              </button>
                            )}

                            {isPaye && (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: 11, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
                                onClick={() => setQuittancePaiement({
                                  paiement: p,
                                  bien: targetBien,
                                  locataire: targetLoc,
                                  bail: targetBail
                                })}
                                title="Générer ou imprimer la quittance de loyer officielle"
                              >
                                📄 Quittance
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
        </div>
      )}

      {/* ── Modale Saisie Paiement ── */}
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

      {/* ── Modale Déposer Document ── */}
      {quickDocModal && (
        <QuickDocumentModal
          onClose={() => setQuickDocModal(false)}
          onSuccess={loadAll}
        />
      )}

      {/* ── Modale Quittance de Loyer PDF ── */}
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
