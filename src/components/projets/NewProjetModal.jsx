import React, { useState } from 'react'
import { createProjet } from '../../lib/db'
import { TYPE_PROJET, STATUT_PROJET } from '../../lib/types'
import Icon from '../common/Icon'

export default function NewProjetModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    nom: '',
    type_projet: 'renovation',
    statut: 'etude',
    budget_prevu: '',
    adresse: '',
    surface_m2: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_livraison_prevue: '',
    pourcentage_avancement: 0,
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) {
      setError('Veuillez renseigner le nom du projet')
      return
    }
    setLoading(true)
    try {
      await createProjet(form)
      onSuccess && onSuccess()
    } catch (err) {
      setError(err?.toString())
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 540,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="hardHat" size={16} color="#ffffff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Nouveau Projet Immobilier
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: '12px 20px 0' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom du projet */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Nom du projet / de l'opération *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Rénovation Studio République, Construction Villa..."
              value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          {/* Type et Statut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Type d'opération
              </label>
              <select
                value={form.type_projet}
                onChange={e => setForm({ ...form, type_projet: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                {TYPE_PROJET.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Phase actuelle
              </label>
              <select
                value={form.statut}
                onChange={e => setForm({ ...form, statut: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                {STATUT_PROJET.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget prévisionnel & Surface */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Budget global prévisionnel (€)
              </label>
              <input
                type="number"
                placeholder="ex: 150000"
                value={form.budget_prevu}
                onChange={e => setForm({ ...form, budget_prevu: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Surface estimée (m²)
              </label>
              <input
                type="number"
                placeholder="ex: 65"
                value={form.surface_m2}
                onChange={e => setForm({ ...form, surface_m2: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Localisation / Adresse
            </label>
            <input
              type="text"
              placeholder="ex: 14 Rue de la Paix, 75002 Paris"
              value={form.adresse}
              onChange={e => setForm({ ...form, adresse: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          {/* Date début & Date livraison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Date de lancement
              </label>
              <input
                type="date"
                value={form.date_debut}
                onChange={e => setForm({ ...form, date_debut: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Livraison prévisionnelle
              </label>
              <input
                type="date"
                value={form.date_livraison_prevue}
                onChange={e => setForm({ ...form, date_livraison_prevue: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Description & Objectifs
            </label>
            <textarea
              rows={3}
              placeholder="Détaillez les travaux envisagés, contraintes ou objectifs de rentabilité..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Création...' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
