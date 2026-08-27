import React, { useEffect, useState } from 'react'
import { getDepenses, createDepense, updateDepense, deleteDepense, getBiens } from '../lib/db'
import { formatDate, formatEuro, todayISO } from '../lib/utils'
import Icon from '../components/common/Icon'
import QuickDocumentModal from '../components/documents/QuickDocumentModal'

import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'
import EmptyState from '../components/common/EmptyState'

const CATEGORIES = ['travaux','energie','assurance','taxe','entretien','frais_gestion','autre']
const LABELS_CAT = {
  travaux: 'Travaux', energie: 'Énergie', assurance: 'Assurance',
  taxe: 'Taxe', entretien: 'Entretien', frais_gestion: 'Frais gestion', autre: 'Autre'
}

const EMPTY = {
  bien_id: '', date: '', categorie: 'autre', description: '',
  montant: '', fournisseur: '', fichier_justificatif: ''
}

export default function Depenses() {
  const [depenses, setDepenses] = useState([])
  const [biens, setBiens]       = useState([])
  const [modal, setModal]       = useState(false)
  const [quickDocModal, setQuickDocModal] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [editing, setEditing]   = useState(null)
  const [filterBien, setFilterBien]   = useState('')
  const [filterCat, setFilterCat]     = useState('')
  const [error, setError]             = useState(null)
  const [loading, setLoading]         = useState(false)

  const loadAll = async () => {
    try {
      const [d, b] = await Promise.all([getDepenses(), getBiens()])
      setDepenses(d || []); setBiens(b || [])
    } catch(e) { setError(e?.toString()) }
  }
  useEffect(() => { loadAll() }, [])

  const openCreate = () => { setForm({...EMPTY, date: todayISO()}); setEditing(null); setModal(true) }
  const openEdit   = (d) => { setForm({ ...d, montant: d.montant }); setEditing(d.id); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form, id: editing,
        bien_id: parseInt(form.bien_id),
        montant: parseFloat(form.montant),
      }
      if (editing) await updateDepense(payload)
      else         await createDepense(payload)
      setModal(false)
      loadAll()
    } catch(err) { setError(err?.toString()) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    try { await deleteDepense(id); loadAll() }
    catch(err) { setError(err?.toString()) }
  }

  const f = (k) => (e) => setForm({...form, [k]: e.target.value})

  const filtered = depenses.filter(d => {
    if (filterBien && d.bien_id !== parseInt(filterBien)) return false
    if (filterCat  && d.categorie !== filterCat) return false
    return true
  })

  const totalFiltered = filtered.reduce((s, d) => s + d.montant, 0)

  const catBadge = (c) => ({
    travaux: 'badge-warning', energie: 'badge-info', assurance: 'badge-accent',
    taxe: 'badge-danger', entretien: 'badge-muted', frais_gestion: 'badge-muted', autre: 'badge-muted'
  }[c] || 'badge-muted')

  return (
    <div className="page-content">
      <PageHeader
        title="Dépenses & Factures"
        subtitle={`Total affiché : ${formatEuro(totalFiltered)}`}
        icon="receipt"
        badge={filtered.length > 0 ? `${filtered.length} dépense${filtered.length > 1 ? 's' : ''}` : null}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setQuickDocModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="paperclip" size={14} /> Associer une facture PDF
            </button>
            <button id="btn-add-depense" className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="plus" size={14} /> Nouvelle dépense
            </button>
          </>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <FilterBar
        filters={
          <>
            <select className="form-control" value={filterBien} onChange={e => setFilterBien(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="">Tous les biens</option>
              {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
            <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{LABELS_CAT[c]}</option>)}
            </select>
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Aucune dépense enregistrée"
          description="Enregistrez vos charges, travaux et frais d'exploitation liés à votre patrimoine."
          actionLabel="+ Nouvelle dépense"
          onAction={openCreate}
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bien</th><th>Date</th><th>Catégorie</th><th>Description</th>
                <th>Montant</th><th>Fournisseur</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td className="fw-600">{d.bien_nom || '—'}</td>
                  <td className="text-muted">{formatDate(d.date)}</td>
                  <td><span className={`badge ${catBadge(d.categorie)}`}>{LABELS_CAT[d.categorie] || d.categorie}</span></td>
                  <td>{d.description || '—'}</td>
                  <td className="fw-600 text-danger">-{formatEuro(d.montant)}</td>
                  <td className="text-muted">{d.fournisseur || '—'}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d)}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(d.id)}>
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
              <h3>{editing ? 'Modifier la dépense' : 'Nouvelle dépense'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bien *</label>
                  <select id="dep-bien" className="form-control" required
                    value={form.bien_id} onChange={f('bien_id')}>
                    <option value="">Sélectionner</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-control" required
                    value={form.date} onChange={f('date')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select className="form-control" value={form.categorie} onChange={f('categorie')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{LABELS_CAT[c]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Montant (€) *</label>
                  <input type="number" step="0.01" className="form-control" required
                    value={form.montant} onChange={f('montant')} placeholder="Ex. 350" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control"
                  value={form.description} onChange={f('description')}
                  placeholder="Ex. Remplacement chauffe-eau" />
              </div>
              <div className="form-group">
                <label className="form-label">Fournisseur</label>
                <input className="form-control"
                  value={form.fournisseur} onChange={f('fournisseur')} placeholder="Nom du prestataire" />
              </div>
              <div className="form-group">
                <label className="form-label">Justificatif (chemin)</label>
                <input className="form-control"
                  value={form.fichier_justificatif} onChange={f('fichier_justificatif')}
                  placeholder="Ex. D:\Docs\Factures\facture_plombier.pdf" />
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

      {quickDocModal && (
        <QuickDocumentModal
          onClose={() => setQuickDocModal(false)}
          onSuccess={loadAll}
        />
      )}
    </div>
  )
}
