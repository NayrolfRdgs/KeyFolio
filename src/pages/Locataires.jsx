import React, { useEffect, useState } from 'react'
import { getLocataires, createLocataire, updateLocataire, deleteLocataire } from '../lib/db'
import Icon from '../components/Icon'

const EMPTY = {
  nom: '', prenom: '', telephone: '', email: '',
  garant_nom: '', garant_contact: '', notes: ''
}

export default function Locataires() {
  const [locataires, setLocataires] = useState([])
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editing, setEditing]       = useState(null)
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')

  const load = () => getLocataires().then(setLocataires).catch(e => setError(e?.toString()))
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit   = (l) => { setForm({ ...l }); setEditing(l.id); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, id: editing }
      if (editing) await updateLocataire(payload)
      else         await createLocataire(payload)
      setModal(false)
      load()
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce locataire ?')) return
    try { await deleteLocataire(id); load() }
    catch(err) { setError(err?.toString()) }
  }

  const f = (k) => (e) => setForm({...form, [k]: e.target.value})

  const filtered = locataires.filter(l =>
    `${l.nom} ${l.prenom} ${l.email || ''} ${l.telephone || ''}`.toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Locataires</h2>
          <p>{locataires.length} locataire{locataires.length !== 1 ? 's' : ''} enregistré{locataires.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="btn-add-locataire" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={14} /> Nouveau locataire
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="filter-bar">
        <input className="form-control" placeholder="Rechercher..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>Aucun locataire</h3>
            <p>Ajoutez votre premier locataire pour commencer</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th><th>Téléphone</th><th>Email</th>
                <th>Garant</th><th>Contact garant</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td className="fw-600">{l.prenom} {l.nom}</td>
                  <td className="text-muted">{l.telephone || '—'}</td>
                  <td className="text-muted">{l.email || '—'}</td>
                  <td>{l.garant_nom || '—'}</td>
                  <td className="text-muted">{l.garant_contact || '—'}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(l)}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(l.id)}>
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
              <h3>{editing ? 'Modifier le locataire' : 'Nouveau locataire'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input id="loc-prenom" className="form-control" required
                    value={form.prenom} onChange={f('prenom')} placeholder="Prénom" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-control" required
                    value={form.nom} onChange={f('nom')} placeholder="Nom" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-control" type="tel"
                    value={form.telephone} onChange={f('telephone')} placeholder="06 xx xx xx xx" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email"
                    value={form.email} onChange={f('email')} placeholder="email@exemple.fr" />
                </div>
              </div>
              <hr className="divider" />
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Garant (nom)</label>
                  <input className="form-control"
                    value={form.garant_nom} onChange={f('garant_nom')} placeholder="Nom du garant" />
                </div>
                <div className="form-group">
                  <label className="form-label">Garant (contact)</label>
                  <input className="form-control"
                    value={form.garant_contact} onChange={f('garant_contact')} placeholder="Tel ou email" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control"
                  value={form.notes} onChange={f('notes')} placeholder="Notes complémentaires..." />
              </div>
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
    </div>
  )
}
