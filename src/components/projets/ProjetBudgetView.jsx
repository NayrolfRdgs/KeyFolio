import React, { useState } from 'react'
import { CATEGORIES_BUDGET_PROJET } from '../../lib/types'
import { getProjetBudget, saveProjetBudgetItem, deleteProjetBudgetItem } from '../../lib/db'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function ProjetBudgetView({ projetId, totalBudgetPrevu = 0 }) {
  const [items, setItems] = useState(() => getProjetBudget(projetId))
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({
    categorie: 'travaux',
    description: '',
    montant_prevu: '',
    montant_engage: '',
    montant_paye: '',
    fournisseur: ''
  })

  const refresh = () => {
    setItems(getProjetBudget(projetId))
  }

  // Agréger totaux
  const totalPrevu = items.reduce((s, x) => s + (Number(x.montant_prevu) || 0), 0) || totalBudgetPrevu
  const totalEngage = items.reduce((s, x) => s + (Number(x.montant_engage) || 0), 0)
  const totalPaye = items.reduce((s, x) => s + (Number(x.montant_paye) || 0), 0)
  const resteAPayer = Math.max(0, totalEngage - totalPaye)
  const ecartBudget = totalEngage - totalPrevu

  const pctConsomme = totalPrevu > 0 ? Math.min(100, Math.round((totalPaye / totalPrevu) * 100)) : 0
  const pctEngage = totalPrevu > 0 ? Math.min(100, Math.round((totalEngage / totalPrevu) * 100)) : 0

  const handleOpenAdd = () => {
    setEditItem(null)
    setForm({
      categorie: 'travaux',
      description: '',
      montant_prevu: '',
      montant_engage: '',
      montant_paye: '',
      fournisseur: ''
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (it) => {
    setEditItem(it)
    setForm({
      categorie: it.categorie || 'travaux',
      description: it.description || '',
      montant_prevu: it.montant_prevu || '',
      montant_engage: it.montant_engage || '',
      montant_paye: it.montant_paye || '',
      fournisseur: it.fournisseur || ''
    })
    setModalOpen(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    saveProjetBudgetItem(projetId, {
      ...editItem,
      categorie: form.categorie,
      description: form.description,
      montant_prevu: Number(form.montant_prevu) || 0,
      montant_engage: Number(form.montant_engage) || 0,
      montant_paye: Number(form.montant_paye) || 0,
      fournisseur: form.fournisseur
    })
    setModalOpen(false)
    refresh()
  }

  const handleDelete = (id) => {
    if (!confirm('Supprimer cette ligne budgétaire ?')) return
    deleteProjetBudgetItem(projetId, id)
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── 1. CARTOUCHES SYNTHÈSE BUDGÉTAIRE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Budget Prévu</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{formatEuro(totalPrevu)}</div>
        </div>

        <div style={{ background: 'rgba(37, 99, 235, 0.06)', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Engagé (Devis)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>{formatEuro(totalEngage)}</div>
        </div>

        <div style={{ background: 'rgba(22, 163, 74, 0.06)', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(22, 163, 74, 0.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Payé</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{formatEuro(totalPaye)}</div>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reste à payer</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#475569' }}>{formatEuro(resteAPayer)}</div>
        </div>

        <div style={{ background: ecartBudget > 0 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(22, 163, 74, 0.06)', padding: '12px 14px', borderRadius: 8, border: `1px solid ${ecartBudget > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(22, 163, 74, 0.2)'}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: ecartBudget > 0 ? '#ef4444' : '#16a34a', textTransform: 'uppercase' }}>Écart budget</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: ecartBudget > 0 ? '#ef4444' : '#16a34a' }}>
            {ecartBudget > 0 ? `+${formatEuro(ecartBudget)}` : formatEuro(ecartBudget)}
          </div>
        </div>
      </div>

      {/* ── 2. BARRE VISUELLE DE CONSOMMATION DU BUDGET ── */}
      <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
          <span>Consommation : {pctConsomme}% payé ({formatEuro(totalPaye)})</span>
          <span>Engagé : {pctEngage}% ({formatEuro(totalEngage)})</span>
        </div>
        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${pctConsomme}%`, background: '#16a34a', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${Math.max(0, pctEngage - pctConsomme)}%`, background: '#3b82f6', opacity: 0.6 }} />
        </div>
      </div>

      {/* ── 3. TABLEAU DES POSTES DU BUDGET ── */}
      <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Lignes budgétaires ({items.length})</span>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd} style={{ fontSize: 11 }}>
            <Icon name="plus" size={13} /> + Ajouter un poste
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
            Aucun poste budgétaire enregistré. Cliquez sur "+ Ajouter un poste" pour détailler le budget.
          </div>
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Description</th>
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'right' }}>Prévu</th>
                  <th style={{ textAlign: 'right' }}>Engagé</th>
                  <th style={{ textAlign: 'right' }}>Payé</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => {
                  const catObj = CATEGORIES_BUDGET_PROJET.find(c => c.id === it.categorie)
                  return (
                    <tr key={it.id}>
                      <td className="fw-600">{catObj ? catObj.label : it.categorie}</td>
                      <td>{it.description || '—'}</td>
                      <td>{it.fournisseur || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEuro(it.montant_prevu)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{formatEuro(it.montant_engage)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{formatEuro(it.montant_paye)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEdit(it)}
                          style={{ padding: '2px 6px', marginRight: 4 }}
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(it.id)}
                          style={{ padding: '2px 6px', color: '#ef4444' }}
                        >
                          <Icon name="trash2" size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALE POSTE BUDGET ── */}
      {modalOpen && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="modal-box" style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 800 }}>
              {editItem ? 'Modifier le poste budgétaire' : 'Ajouter un poste budgétaire'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={e => setForm({ ...form, categorie: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                >
                  {CATEGORIES_BUDGET_PROJET.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Description</label>
                <input
                  type="text"
                  placeholder="ex: Devis électricité RDC, Faïence salle de bain..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Prestataire / Fournisseur</label>
                <input
                  type="text"
                  placeholder="ex: SAS Élec-Pro, Leroy Merlin..."
                  value={form.fournisseur}
                  onChange={e => setForm({ ...form, fournisseur: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Prévu (€)</label>
                  <input
                    type="number"
                    value={form.montant_prevu}
                    onChange={e => setForm({ ...form, montant_prevu: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>Engagé (€)</label>
                  <input
                    type="number"
                    value={form.montant_engage}
                    onChange={e => setForm({ ...form, montant_engage: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Payé (€)</label>
                  <input
                    type="number"
                    value={form.montant_paye}
                    onChange={e => setForm({ ...form, montant_paye: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary btn-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
