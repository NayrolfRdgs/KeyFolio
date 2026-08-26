import React, { useState } from 'react'
import { getTaches, createTache, toggleTacheComplete, deleteTache } from '../lib/db'
import { CATEGORIES_TACHES } from '../lib/types'
import { formatDate } from '../lib/utils'
import Icon from '../components/common/Icon'

export default function TachesEcheances({ onNavigate }) {
  const [taches, setTaches] = useState(() => getTaches())
  const [filter, setFilter] = useState('all') // 'all' | 'a_faire' | 'termine'
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    categorie: 'assurance',
    echeance: new Date().toISOString().split('T')[0],
    priorite: 'normal'
  })

  const refresh = () => setTaches(getTaches())

  const handleToggle = (id) => {
    toggleTacheComplete(id)
    refresh()
  }

  const handleDelete = (id) => {
    if (!confirm('Supprimer cette tâche ?')) return
    deleteTache(id)
    refresh()
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.titre.trim()) return
    createTache(form)
    setModalOpen(false)
    setForm({ titre: '', categorie: 'assurance', echeance: new Date().toISOString().split('T')[0], priorite: 'normal' })
    refresh()
  }

  const filtered = taches.filter(t => {
    if (filter === 'a_faire') return !t.termine
    if (filter === 'termine') return t.termine
    return true
  })

  const aFaireCount = taches.filter(t => !t.termine).length
  const termineesCount = taches.filter(t => t.termine).length

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <div className="page-header">
        <div>
          <h2>Tâches & Échéances</h2>
          <p className="page-subtitle">
            Suivi des obligations, assurances, diagnostics DPE, révisions de loyers et entretiens
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={14} /> + Nouvelle tâche
        </button>
      </div>

      {/* ── BANDEAU KPI & FILTRES DÉTACHÉ ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            Toutes les tâches ({taches.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'a_faire' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('a_faire')}
          >
            À faire ({aFaireCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'termine' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('termine')}
          >
            Terminées ({termineesCount})
          </button>
        </div>
      </div>

      {/* ── LISTE DES TÂCHES DÉTACHÉES ── */}
      <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="checkSquare" size={36} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune tâche dans cette vue</div>
          </div>
        ) : (
          filtered.map(t => {
            const catObj = CATEGORIES_TACHES.find(c => c.id === t.categorie)
            const isOverdue = t.echeance && new Date(t.echeance) < new Date() && !t.termine

            return (
              <div
                key={t.id}
                className="card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  border: isOverdue ? '1.5px solid #ef4444' : undefined,
                  opacity: t.termine ? 0.65 : 1
                }}
              >
                {/* Case à cocher + Titre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={t.termine || false}
                    onChange={() => handleToggle(t.id)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#4f46e5' }}
                  />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: t.termine ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.termine ? 'line-through' : 'none' }}>
                      {t.titre}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>{catObj ? catObj.label : t.categorie}</span>
                      {t.echeance && (
                        <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 500 }}>
                          Échéance : {formatDate(t.echeance)} {isOverdue ? '(En retard)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priorité & Suppression */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {t.priorite === 'urgent' && (
                    <span className="badge badge-danger" style={{ fontSize: 10 }}>Urgent</span>
                  )}
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Supprimer"
                  >
                    <Icon name="trash2" size={14} color="#ef4444" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── MODALE CRÉATION TÂCHE ── */}
      {modalOpen && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="modal-box" style={{ background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 460, padding: 22, boxShadow: '0 24px 50px rgba(15, 23, 42, 0.22)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Nouvelle Tâche ou Échéance
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>
                  Intitulé de la tâche *
                </label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="ex: Révision annuelle IRL, Entretien chaudière..."
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Catégorie</label>
                  <select
                    className="form-control"
                    value={form.categorie}
                    onChange={e => setForm({ ...form, categorie: e.target.value })}
                  >
                    {CATEGORIES_TACHES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Priorité</label>
                  <select
                    className="form-control"
                    value={form.priorite}
                    onChange={e => setForm({ ...form, priorite: e.target.value })}
                  >
                    <option value="normal">Normale</option>
                    <option value="urgent">Urgente</option>
                    <option value="faible">Faible</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Date d'échéance</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.echeance}
                  onChange={e => setForm({ ...form, echeance: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer la tâche</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
