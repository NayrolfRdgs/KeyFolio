import React, { useState } from 'react'
import { convertProjetToBien } from '../../lib/db'
import { TYPE_BIEN } from '../../lib/types'
import Icon from '../common/Icon'
import { formatEuro } from '../../lib/utils'

export default function ProjetConvertModal({ projet, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nom: projet?.nom || '',
    type_bien: projet?.type_projet === 'construction' ? 'maison' : 'appartement',
    adresse: projet?.adresse || '',
    surface_m2: projet?.surface_m2 || '',
    valeur_estimee: projet?.budget_prevu ? Math.round(projet.budget_prevu * 1.25) : 200000,
    loyer_mensuel_estime: 850
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConvert = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await convertProjetToBien(projet.id, form)
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
          maxWidth: 520,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="checkCircle" size={16} color="#ffffff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Convertir le projet en Bien Réel
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 0 20px' }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Félicitations pour l'achèvement de l'opération <strong>{projet?.nom}</strong> ! Cette étape va intégrer directement ce projet dans votre patrimoine de biens réels sans ressaisie.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: '12px 20px 0' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleConvert} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Nom du nouveau bien
            </label>
            <input
              type="text"
              required
              value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Type de bien
              </label>
              <select
                value={form.type_bien}
                onChange={e => setForm({ ...form, type_bien: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                {TYPE_BIEN.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Surface livrée (m²)
              </label>
              <input
                type="number"
                value={form.surface_m2}
                onChange={e => setForm({ ...form, surface_m2: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Adresse
            </label>
            <input
              type="text"
              value={form.adresse}
              onChange={e => setForm({ ...form, adresse: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Valeur estimée après travaux (€)
              </label>
              <input
                type="number"
                value={form.valeur_estimee}
                onChange={e => setForm({ ...form, valeur_estimee: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Loyer mensuel prévu (€)
              </label>
              <input
                type="number"
                value={form.loyer_mensuel_estime}
                onChange={e => setForm({ ...form, loyer_mensuel_estime: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
              {loading ? 'Intégration...' : 'Valider & Intégrer au Patrimoine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
