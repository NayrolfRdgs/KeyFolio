import React, { useEffect, useState, useCallback } from 'react'
import { getBaux, createBail, updateBail, deleteBail, terminateBail, getBiens, getLocataires, openFilePath } from '../lib/db'
import { formatDate, formatEuro, labelStatutBail, todayISO } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'

const EMPTY = {
  bien_id: '', locataire_id: '', date_debut: todayISO(), date_fin: '',
  loyer_mensuel: '', charges_mensuelles: '0', depot_garantie: '',
  jour_paiement: '5', statut: 'actif', fichier_bail: ''
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
      jour_paiement: b.jour_paiement ?? 5,
      fichier_bail: b.fichier_bail || ''
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

  const handleTerminateBail = async (b) => {
    if (!confirm(`Mettre fin au bail de ${b.locataire_prenom} ${b.locataire_nom} pour le logement ${b.bien_nom} ? Le contrat sera automatiquement archivé dans les baux antérieurs (07_LOCATION/Bail/Baux_anciens).`)) return
    try {
      await terminateBail(b.id)
      addToast(`Le bail de ${b.locataire_prenom} ${b.locataire_nom} a été clôturé et archivé dans les baux antérieurs.`)
      loadAll()
    } catch (err) {
      setError(err?.toString())
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

  const f = (k) => (e) => setForm({...form, [k]: e.target.value})

  const statutBadge = (s) => ({ actif: 'badge-success', termine: 'badge-muted', resilie: 'badge-danger' }[s] || 'badge-muted')

  let filtered = baux
  if (filterBien) filtered = filtered.filter(b => b.bien_id === parseInt(filterBien))
  if (filterStatut === 'actif') filtered = filtered.filter(b => b.statut === 'actif')
  else if (filterStatut === 'termine') filtered = filtered.filter(b => b.statut === 'termine' || b.statut === 'resilie')

  const countActifs = baux.filter(b => b.statut === 'actif').length
  const countAnciens = baux.filter(b => b.statut !== 'actif').length

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Baux & Contrats</h2>
          <p>Gestion des baux en cours et archivage automatique des anciens baux</p>
        </div>
        <button id="btn-add-bail" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={14} /> Nouveau bail
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Bar de filtre */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn btn-sm ${filterStatut === 'actif' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatut('actif')}
          >
            🔑 Baux en cours ({countActifs})
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
                <th>Contrat PDF</th>
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
                    <td className="text-muted">{b.date_fin ? formatDate(b.date_fin) : '—'}</td>
                    <td className="fw-600">{formatEuro(b.loyer_mensuel)}</td>
                    <td>{formatEuro(b.charges_mensuelles)}</td>
                    <td>{b.depot_garantie ? formatEuro(b.depot_garantie) : '—'}</td>
                    <td>
                      {b.fichier_bail ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleOpenDoc(b.fichier_bail)}
                          title="Ouvrir le contrat de bail"
                        >
                          📄 Bail PDF
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Non fourni</span>
                      )}
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
                        {isActif && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11, color: 'var(--color-warning)' }}
                            onClick={() => handleTerminateBail(b)}
                            title="Clôturer le bail et l'archiver dans Baux_anciens"
                          >
                            ⏹️ Mettre fin
                          </button>
                        )}
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
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Modifier le bail' : 'Nouveau bail'}</h3>
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
                  <label className="form-label">Charges mensuelles (€)</label>
                  <input type="number" step="0.01" className="form-control" value={form.charges_mensuelles} onChange={f('charges_mensuelles')} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dépôt de garantie (€)</label>
                  <input type="number" step="0.01" className="form-control" value={form.depot_garantie} onChange={f('depot_garantie')} placeholder="750.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Jour d'échéance (du 1 au 28)</label>
                  <input type="number" min="1" max="28" className="form-control" value={form.jour_paiement} onChange={f('jour_paiement')} />
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

              <div className="form-group">
                <label className="form-label">📎 Contrat de bail (PDF / Scan)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-control" readOnly value={form.fichier_bail || ''} placeholder="Aucun contrat sélectionné" />
                  <button type="button" className="btn btn-secondary" onClick={handlePickBailFile}>Parcourir...</button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  📁 Si actif, le contrat est enregistré dans <em>07_LOCATION/Bail/Bail_en_cours</em>. Si archivé, dans <em>07_LOCATION/Bail/Baux_anciens</em>.
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
