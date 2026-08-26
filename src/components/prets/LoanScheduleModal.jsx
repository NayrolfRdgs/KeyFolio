import React, { useState } from 'react'
import { generateAmortizationSchedule } from '../../lib/financialCalculations'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function LoanScheduleModal({ pret, onClose }) {
  const [filterYear, setFilterYear] = useState('all')

  if (!pret) return null

  const schedule = generateAmortizationSchedule({
    montantEmprunt: Number(pret.montant_emprunt) || 0,
    tauxAnnuelPct: Number(pret.taux_interet) || 0,
    dureeAnnees: Number(pret.duree_annees) || 20,
    tauxAssurancePct: Number(pret.taux_assurance) || 0,
    dateDebut: pret.date_debut || '2022-01-01'
  })

  // Extraire années uniques
  const years = Array.from(new Set(schedule.map(s => s.date.split('-')[0])))
  const filteredSchedule = filterYear === 'all'
    ? schedule
    : schedule.filter(s => s.date.startsWith(filterYear))

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 720,
          maxHeight: '85vh',
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
            background: '#f8fafc'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Tableau d'amortissement — {pret.nom_banque}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>
              Montant : {formatEuro(pret.montant_emprunt)} · Taux : {pret.taux_interet}% · Durée : {pret.duree_annees} ans
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Filtre par année */}
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
            >
              <option value="all">Toutes les années ({years.length} ans)</option>
              {years.map(y => (
                <option key={y} value={y}>Année {y}</option>
              ))}
            </select>

            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Tableau amortissement */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Échéance</th>
                  <th style={{ textAlign: 'right' }}>Mensualité</th>
                  <th style={{ textAlign: 'right' }}>Capital amorti</th>
                  <th style={{ textAlign: 'right' }}>Intérêts</th>
                  <th style={{ textAlign: 'right' }}>Assurance</th>
                  <th style={{ textAlign: 'right' }}>Capital restant</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map(s => (
                  <tr key={s.numeroMois}>
                    <td className="text-muted" style={{ fontSize: 11 }}>#{s.numeroMois}</td>
                    <td className="fw-600">{s.date}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>{formatEuro(s.mensualiteTotale)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{formatEuro(s.capitalAmorti)}</td>
                    <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatEuro(s.interets)}</td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>{formatEuro(s.assurance)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatEuro(s.capitalRestantDu)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
