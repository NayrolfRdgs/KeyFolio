import React, { useEffect, useState } from 'react'
import { getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance, getBiens } from '../lib/db'
import { formatDate, formatEuro, prioriteBadge, labelPriorite, statutMaintenanceBadge, todayISO } from '../lib/utils'
import Icon from '../components/common/Icon'
import QuickDocumentModal from '../components/documents/QuickDocumentModal'

const EMPTY = {
  bien_id: '', titre: '', description: '', priorite: 'normal',
  statut: 'ouvert', prestataire: '', cout: '', date_resolution: ''
}

export default function Maintenance() {
  const [items, setItems]     = useState([])
  const [biens, setBiens]     = useState([])
  const [modal, setModal]     = useState(false)
  const [quickDocModal, setQuickDocModal] = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [filterStatut, setFilterStatut]   = useState('ouvert')
  const [filterBien, setFilterBien]       = useState('')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const loadAll = async () => {
    try {
      const [m, b] = await Promise.all([getMaintenance(), getBiens()])
      setItems(m); setBiens(b)
    } catch(e) { setError(e?.toString()) }
  }
  useEffect(() => { loadAll() }, [])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit   = (m) => {
    setForm({ ...m, cout: m.cout ?? '', date_resolution: m.date_resolution ?? '' })
    setEditing(m.id)
    setModal(true)
  }

  const markResolu = async (item) => {
    const updated = { ...item, statut: 'resolu', date_resolution: todayISO() }
    try { await updateMaintenance(updated); loadAll() }
    catch(err) { setError(err?.toString()) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form, id: editing,
        bien_id: parseInt(form.bien_id),
        cout: form.cout !== '' ? parseFloat(form.cout) : null,
        date_resolution: form.date_resolution || null,
      }
      if (editing) await updateMaintenance(payload)
      else         await createMaintenance(payload)
      setModal(false)
      loadAll()
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce ticket ?')) return
    try { await deleteMaintenance(id); loadAll() }
    catch(err) { setError(err?.toString()) }
  }

  const f = (k) => (e) => setForm({...form, [k]: e.target.value})

  const statutLabel = (s) => ({ ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu' }[s] || s)

  const filtered = items.filter(m => {
    if (filterBien   && m.bien_id !== parseInt(filterBien)) return false
    if (filterStatut && m.statut  !== filterStatut)         return false
    return true
  })

  const urgents = items.filter(m => m.priorite === 'urgent' && m.statut !== 'resolu').length

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Maintenance</h2>
          <p>
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
            {urgents > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{urgents} urgent{urgents > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setQuickDocModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="paperclip" size={14} /> Associer un devis / facture PDF
          </button>
          <button id="btn-add-maintenance" className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={14} /> Nouveau ticket
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="filter-bar">
        <select className="form-control" value={filterBien} onChange={e => setFilterBien(e.target.value)}>
          <option value="">Tous les biens</option>
          {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>
        <select className="form-control" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="ouvert">Ouvert</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="wrench" size={40} color="#94a3b8" />
            </div>
            <h3>Aucun ticket</h3>
            <p>Signalez des travaux ou problèmes liés à vos biens</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bien</th><th>Titre</th><th>Priorité</th><th>Statut</th>
                <th>Signalé le</th><th>Résolu le</th><th>Coût</th><th>Prestataire</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td className="fw-600">{m.bien_nom || '—'}</td>
                  <td>
                    <div className="fw-600">{m.titre}</div>
                    {m.description && <div className="text-muted" style={{ fontSize: 12 }}>{m.description}</div>}
                  </td>
                  <td><span className={`badge ${prioriteBadge(m.priorite)}`}>{labelPriorite(m.priorite)}</span></td>
                  <td><span className={`badge ${statutMaintenanceBadge(m.statut)}`}>{statutLabel(m.statut)}</span></td>
                  <td className="text-muted">{formatDate(m.date_signalement)}</td>
                  <td className="text-muted">{m.date_resolution ? formatDate(m.date_resolution) : '—'}</td>
                  <td>{m.cout ? formatEuro(m.cout) : '—'}</td>
                  <td className="text-muted">{m.prestataire || '—'}</td>
                  <td>
                    <div className="actions-cell">
                      {m.statut !== 'resolu' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => markResolu(m)} title="Marquer résolu" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="check" size={13} /> Résolu
                        </button>
                      )}
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(m.id)}>
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

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Modifier le ticket' : 'Nouveau ticket de maintenance'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bien *</label>
                  <select id="maint-bien" className="form-control" required
                    value={form.bien_id} onChange={f('bien_id')}>
                    <option value="">Sélectionner</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priorité</label>
                  <select className="form-control" value={form.priorite} onChange={f('priorite')}>
                    <option value="urgent">Urgent</option>
                    <option value="normal">Normal</option>
                    <option value="faible">Faible</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Titre *</label>
                <input id="maint-titre" className="form-control" required
                  value={form.titre} onChange={f('titre')}
                  placeholder="Ex. Fuite robinet cuisine" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control"
                  value={form.description} onChange={f('description')}
                  placeholder="Détails du problème..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select className="form-control" value={form.statut} onChange={f('statut')}>
                    <option value="ouvert">Ouvert</option>
                    <option value="en_cours">En cours</option>
                    <option value="resolu">Résolu</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Coût (€)</label>
                  <input type="number" step="0.01" className="form-control"
                    value={form.cout} onChange={f('cout')} placeholder="Coût éventuel" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Prestataire / Artisan</label>
                <input className="form-control"
                  value={form.prestataire} onChange={f('prestataire')}
                  placeholder="Nom de l'artisan ou entreprise" />
              </div>
              {editing && (
                <div className="form-group">
                  <label className="form-label">Date de résolution</label>
                  <input type="date" className="form-control"
                    value={form.date_resolution} onChange={f('date_resolution')} />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quickDocModal && (
        <QuickDocumentModal
          onClose={() => setQuickDocModal(false)}
          onSuccess={loadAll}
        />
      )}
    </div>
  )
}
