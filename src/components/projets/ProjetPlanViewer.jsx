import React, { useState } from 'react'
import { CATEGORIES_PLANS } from '../../lib/types'
import { getProjetPlans, saveProjetPlan, deleteProjetPlan } from '../../lib/db'
import Icon from '../common/Icon'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'

export default function ProjetPlanViewer({ targetId }) {
  const [plans, setPlans] = useState(() => getProjetPlans(targetId))
  const [activeCategory, setActiveCategory] = useState('rdc')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({ categorie: 'rdc', nom: '', fichier_path: '' })

  const refresh = () => {
    const list = getProjetPlans(targetId)
    setPlans(list)
    if (selectedPlan) {
      const updated = list.find(p => p.id === selectedPlan.id)
      setSelectedPlan(updated || list[0] || null)
    }
  }

  const filteredPlans = plans.filter(p => p.categorie === activeCategory)
  const currentPlan = selectedPlan && selectedPlan.categorie === activeCategory
    ? selectedPlan
    : filteredPlans[0]

  const handlePickFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: 'Plans & Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'pdf'] }]
      })
      if (selected) {
        setForm(prev => ({
          ...prev,
          fichier_path: typeof selected === 'string' ? selected : selected[0],
          nom: prev.nom || (typeof selected === 'string' ? selected.split(/[\\/]/).pop() : 'Nouveau plan')
        }))
      }
    } catch (e) {
      console.warn("Sélecteur de fichier:", e)
    }
  }

  const handleSavePlan = (e) => {
    e.preventDefault()
    if (!form.fichier_path && !form.nom) return
    saveProjetPlan({
      target_id: targetId,
      categorie: form.categorie,
      nom: form.nom || 'Plan',
      chemin_fichier: form.fichier_path
    })
    setAddModal(false)
    refresh()
  }

  const handleDeletePlan = (id) => {
    if (!confirm('Supprimer ce plan ?')) return
    deleteProjetPlan(id)
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      
      {/* ── 1. BARRE D'ONGLETS PAR NIVEAU / TYPE DE PLAN ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          {CATEGORIES_PLANS.map(cat => {
            const count = plans.filter(p => p.categorie === cat.id).length
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSelectedPlan(null) }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#4f46e5' : '#64748b',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>{cat.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: isActive ? '#4f46e5' : '#cbd5e1', color: '#ffffff' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => { setForm({ categorie: activeCategory, nom: '', fichier_path: '' }); setAddModal(true) }}>
          <Icon name="plus" size={13} /> + Associer un plan
        </button>
      </div>

      {/* ── 2. ZONE DE VISUALISATION DU PLAN ACTIF ── */}
      <div
        style={{
          flex: 1,
          minHeight: 380,
          background: '#0f172a',
          borderRadius: 10,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {currentPlan ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={currentPlan.chemin_fichier ? convertFileSrc(currentPlan.chemin_fichier) : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80'}
              alt={currentPlan.nom}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.15s ease'
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
            <Icon name="plan" size={44} color="#334155" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun plan pour "{CATEGORIES_PLANS.find(c => c.id === activeCategory)?.label}"</div>
            <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 12px 0' }}>
              Ajoutez des plans d'architecte, schémas techniques ou documents 2D/PDF.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ categorie: activeCategory, nom: '', fichier_path: '' }); setAddModal(true) }}>
              + Ajouter un plan
            </button>
          </div>
        )}

        {/* Barre d'outils de Zoom en superposition */}
        {currentPlan && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(6px)',
              padding: '4px 8px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
              title="Zoom arrière"
            >
              <Icon name="zoomOut" size={14} />
            </button>
            <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
              title="Zoom avant"
            >
              <Icon name="zoomIn" size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              title="Réinitialiser"
            >
              <Icon name="reset" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 3. LISTE DES PLANS DU NIVEAU ACTUEL ── */}
      {filteredPlans.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {filteredPlans.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: currentPlan?.id === p.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                background: currentPlan?.id === p.id ? '#eef2ff' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 600
              }}
            >
              <Icon name="file" size={13} color="#4f46e5" />
              <span>{p.nom}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id) }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL AJOUT PLAN ── */}
      {addModal && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="modal-box" style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 800 }}>Associer un nouveau plan</h3>
            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Niveau / Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={e => setForm({ ...form, categorie: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                >
                  {CATEGORIES_PLANS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Nom du plan</label>
                <input
                  type="text"
                  placeholder="ex: Plan RDC électricité, Coupe de façade A-A..."
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Fichier (Image, SVG ou PDF)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    placeholder="Chemin du fichier sélectionné..."
                    value={form.fichier_path}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, background: '#f8fafc' }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handlePickFile}>
                    Parcourir
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary btn-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
