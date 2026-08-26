import React, { useState } from 'react'
import { createPret, updatePret } from '../../lib/db'
import { calculateLoanMonthly } from '../../lib/financialCalculations'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function LoanFormModal({ pret = null, biens = [], projets = [], onClose, onSuccess }) {
  const [form, setForm] = useState({
    nom_banque: pret?.nom_banque || 'Banque Principale',
    bien_id: pret?.bien_id || '',
    projet_id: pret?.projet_id || '',
    montant_emprunt: pret?.montant_emprunt || 180000,
    apport_personnel: pret?.apport_personnel || 20000,
    taux_interet: pret?.taux_interet || 3.45,
    taux_assurance: pret?.taux_assurance || 0.34,
    duree_annees: pret?.duree_annees || 20,
    date_debut: pret?.date_debut || new Date().toISOString().split('T')[0],
    notes: pret?.notes || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Calcul temps réel de la mensualité
  const simulation = calculateLoanMonthly({
    montantEmprunt: Number(form.montant_emprunt) || 0,
    tauxAnnuelPct: Number(form.taux_interet) || 0,
    dureeAnnees: Number(form.duree_annees) || 20,
    tauxAssurancePct: Number(form.taux_assurance) || 0
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (pret?.id) {
        await updatePret({ ...pret, ...form })
      } else {
        await createPret(form)
      }
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
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(37, 99, 235, 0.06) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="circleDollarSign" size={16} color="#ffffff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              {pret?.id ? 'Modifier le prêt immobilier' : 'Nouveau Prêt Immobilier'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: '12px 20px 0' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Nom de la banque / Référence du crédit */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Établissement bancaire / Référence *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Crédit Agricole, BNP Paribas..."
              value={form.nom_banque}
              onChange={e => setForm({ ...form, nom_banque: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          {/* Rattaché à un bien ou projet */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Rattaché au Bien
              </label>
              <select
                value={form.bien_id}
                onChange={e => setForm({ ...form, bien_id: e.target.value ? Number(e.target.value) : '' })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              >
                <option value="">-- Aucun / Prêt global --</option>
                {biens.map(b => (
                  <option key={b.id} value={b.id}>{b.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Ou au Projet
              </label>
              <select
                value={form.projet_id}
                onChange={e => setForm({ ...form, projet_id: e.target.value ? Number(e.target.value) : '' })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              >
                <option value="">-- Aucun --</option>
                {projets.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Montant emprunté & Apport */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Montant emprunté (€) *
              </label>
              <input
                type="number"
                required
                value={form.montant_emprunt}
                onChange={e => setForm({ ...form, montant_emprunt: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Apport personnel (€)
              </label>
              <input
                type="number"
                value={form.apport_personnel}
                onChange={e => setForm({ ...form, apport_personnel: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Durée, Taux nominal & Assurance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Durée (années)
              </label>
              <input
                type="number"
                value={form.duree_annees}
                onChange={e => setForm({ ...form, duree_annees: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Taux annuel (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.taux_interet}
                onChange={e => setForm({ ...form, taux_interet: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Assurance (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.taux_assurance}
                onChange={e => setForm({ ...form, taux_assurance: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Date de première échéance */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Date de début d'amortissement
            </label>
            <input
              type="date"
              value={form.date_debut}
              onChange={e => setForm({ ...form, date_debut: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
            />
          </div>

          {/* Cartouche Récapitulatif Calculé Automatiquement */}
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>MENSUALITÉ TOTALE</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5' }}>
                {formatEuro(simulation.mensualiteTotale)}/mois
              </div>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>COÛT TOTAL DU CRÉDIT</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                {formatEuro(simulation.coutTotalCredit)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer le prêt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
