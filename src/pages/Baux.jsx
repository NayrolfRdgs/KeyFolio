import React, { useEffect, useState } from 'react'
import { getBaux, createBail, updateBail, deleteBail, getBiens, getLocataires } from '../lib/db'
import { formatDate, formatEuro, labelStatutBail, todayISO } from '../lib/utils'
import Icon from '../components/Icon'

const EMPTY = {
  bien_id: '', locataire_id: '', date_debut: '', date_fin: '',
  loyer_mensuel: '', charges_mensuelles: '0', depot_garantie: '',
  jour_paiement: '5', statut: 'actif', fichier_bail: ''
}

export default function Baux() {
  const [baux, setBaux]             = useState([])
  const [biens, setBiens]           = useState([])
  const [locataires, setLocataires] = useState([])
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editing, setEditing]       = useState(null)
  const [filterBien, setFilterBien] = useState('')
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)

  const loadAll = async () => {
    try {
      const [b, bi, lo] = await Promise.all([getBaux(), getBiens(), getLocataires()])
      setBaux(b); setBiens(bi); setLocataires(lo)
    } catch(e) { setError(e?.toString()) }
  }
  useEffect(() => { loadAll() }, [])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit   = (b) => {
    setForm({
      ...b,
      bien_id: b.bien_id, locataire_id: b.locataire_id,
      loyer_mensuel: b.loyer_mensuel,
      charges_mensuelles: b.charges_mensuelles ?? 0,
      depot_garantie: b.depot_garantie ?? '',
      jour_paiement: b.jour_paiement ?? 5,
    })
    setEditing(b.id)
    setModal(true)
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
      }
      if (editing) await updateBail(payload)
      else         await createBail(payload)
      setModal(false)
      loadAll()
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce bail ? Les paiements associés seront aussi supprimés.')) return
    try { await deleteBail(id); loadAll() }
    catch(err) { setError(err?.toString()) }
  }

  const f = (k) => (e) => setForm({...form, [k]: e.target.value})

  const statutBadge = (s) => ({ actif: 'badge-success', termine: 'badge-muted', resilie: 'badge-danger' }[s] || 'badge-muted')

  const filtered = filterBien
    ? baux.filter(b => b.bien_id === parseInt(filterBien))
    : baux

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Baux</h2>
          <p>{filtered.length} contrat{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="btn-add-bail" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={14} /> Nouveau bail
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="filter-bar">
        <select className="form-control" value={filterBien} onChange={e => setFilterBien(e.target.value)}>
          <option value="">Tous les biens</option>
          {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>Aucun bail</h3>
            <p>Créez un bail pour lier un locataire à un bien</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bien</th><th>Locataire</th><th>Début</th><th>Fin</th>
                <th>Loyer</th><th>Charges</th><th>Dépôt</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td className="fw-600">{b.bien_nom || '—'}</td>
                  <td>{b.locataire_prenom} {b.locataire_nom}</td>
                  <td className="text-muted">{formatDate(b.date_debut)}</td>
                  <td className="text-muted">{b.date_fin ? formatDate(b.date_fin) : '—'}</td>
                  <td className="fw-600">{formatEuro(b.loyer_mensuel)}</td>
                  <td>{formatEuro(b.charges_mensuelles)}</td>
                  <td>{b.depot_garantie ? formatEuro(b.depot_garantie) : '—'}</td>
                  <td><span className={`badge ${statutBadge(b.statut)}`}>{labelStatutBail(b.statut)}</span></td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(b.id)}>
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
              <h3>{editing ? 'Modifier le bail' : 'Nouveau bail'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bien *</label>
                  <select id="bail-bien" className="form-control" required
                    value={form.bien_id} onChange={f('bien_id')}>
                    <option value="">Sélectionner un bien</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Locataire *</label>
                  <select className="form-control" required
                    value={form.locataire_id} onChange={f('locataire_id')}>
                    <option value="">Sélectionner un locataire</option>
                    {locataires.map(l => <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date de début *</label>
                  <input type="date" className="form-control" required
                    value={form.date_debut} onChange={f('date_debut')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date de fin</label>
                  <input type="date" className="form-control"
                    value={form.date_fin} onChange={f('date_fin')} />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Loyer mensuel (€) *</label>
                  <input type="number" step="0.01" className="form-control" required
                    value={form.loyer_mensuel} onChange={f('loyer_mensuel')} placeholder="Ex. 750" />
                </div>
                <div className="form-group">
                  <label className="form-label">Charges (€)</label>
                  <input type="number" step="0.01" className="form-control"
                    value={form.charges_mensuelles} onChange={f('charges_mensuelles')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dépôt garantie (€)</label>
                  <input type="number" step="0.01" className="form-control"
                    value={form.depot_garantie} onChange={f('depot_garantie')} placeholder="Ex. 1500" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jour de paiement</label>
                  <input type="number" min="1" max="28" className="form-control"
                    value={form.jour_paiement} onChange={f('jour_paiement')} placeholder="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select className="form-control" value={form.statut} onChange={f('statut')}>
                    <option value="actif">Actif</option>
                    <option value="termine">Terminé</option>
                    <option value="resilie">Résilié</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fichier bail (chemin)</label>
                <input className="form-control"
                  value={form.fichier_bail} onChange={f('fichier_bail')}
                  placeholder="Ex. D:\Documents\Baux\bail_dupont.pdf" />
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
    </div>
  )
}
