import React, { useState } from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function PerformanceCard({
  rendementBrut = 0,
  rendementNet = 0,
  roi = 0,
  cashFlowAnnuel = 0,
  plusValueLatente = 0,
  tauxOccupation = 100,
  totalCapitauxInvestis = 0
}) {
  const [activeTooltip, setActiveTooltip] = useState(null)

  const metrics = [
    {
      id: 'brut',
      label: 'Rendement Brut',
      value: `${rendementBrut}%`,
      color: '#16a34a',
      bg: '#dcfce7',
      desc: 'Loyers annuels bruts rapportés au coût total d\'acquisition.',
      formula: '(Loyers Annuels Théoriques / Coût Total d\'Investissement) × 100'
    },
    {
      id: 'net',
      label: 'Rendement Net de charges',
      value: `${rendementNet}%`,
      color: '#0d9488',
      bg: '#ccfbf1',
      desc: 'Loyers nets réels après déduction de la taxe foncière, assurance PNO et charges d\'exploitation.',
      formula: '(Revenu Net d\'Exploitation / Coût Total d\'Investissement) × 100'
    },
    {
      id: 'roi',
      label: 'ROI / Rendement Capitaux Propres',
      value: `${roi}%`,
      color: '#4f46e5',
      bg: '#e0e7ff',
      desc: 'Rendement annuel effectif généré par chaque euro de fonds propres apporté (effet de levier bancaire).',
      formula: '(Cash-Flow Annuel Net / Apport Personnel Réel) × 100'
    },
    {
      id: 'cashflow',
      label: 'Cash-Flow Annuel Net',
      value: `${cashFlowAnnuel >= 0 ? '+' : ''}${formatEuro(cashFlowAnnuel)}`,
      color: cashFlowAnnuel >= 0 ? '#16a34a' : '#e11d48',
      bg: cashFlowAnnuel >= 0 ? '#dcfce7' : '#ffe4e6',
      desc: 'Solde de trésorerie net après encaissement de tous les loyers et paiement de toutes les charges et crédits.',
      formula: 'Revenus Locatifs - Charges Réelles - Mensualités Crédits'
    },
    {
      id: 'plusvalue',
      label: 'Plus-Value Latente',
      value: `${plusValueLatente >= 0 ? '+' : ''}${formatEuro(plusValueLatente)}`,
      color: plusValueLatente >= 0 ? '#2563eb' : '#e11d48',
      bg: plusValueLatente >= 0 ? '#dbeafe' : '#ffe4e6',
      desc: 'Différence entre la valeur marchande actuelle estimée du patrimoine et son coût d\'acquisition total.',
      formula: 'Valeur Immobilière Actuelle - Coût Total d\'Achat'
    },
    {
      id: 'occupation',
      label: 'Taux d\'Occupation Locative',
      value: `${tauxOccupation}%`,
      color: tauxOccupation >= 90 ? '#16a34a' : tauxOccupation >= 70 ? '#f59e0b' : '#e11d48',
      bg: tauxOccupation >= 90 ? '#dcfce7' : tauxOccupation >= 70 ? '#fef3c7' : '#fee2e2',
      desc: 'Pourcentage des biens actuellement loués sous bail actif par rapport au total des biens exploitables.',
      formula: '(Biens Loués / Total Biens Exploitables) × 100'
    }
  ]

  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Performance & Ratios Financiers
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Indicateurs d'efficacité locative et de rentabilité calculés en temps réel
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
          Capitaux investis : {formatEuro(totalCapitauxInvestis)}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12
      }}>
        {metrics.map(m => (
          <div
            key={m.id}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px 16px',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {m.label}
              </span>
              <button
                type="button"
                onClick={() => setActiveTooltip(activeTooltip === m.id ? null : m.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  color: activeTooltip === m.id ? '#4f46e5' : '#94a3b8'
                }}
                title="Comment est calculé ce chiffre ?"
              >
                <Icon name="info" size={13} />
              </button>
            </div>

            <div style={{ fontSize: 22, fontWeight: 800, color: m.color, marginTop: 6 }}>
              {m.value}
            </div>

            {/* Infobulle explicative interactive */}
            {activeTooltip === m.id && (
              <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: 6,
                fontSize: 11,
                lineHeight: 1.4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                <div style={{ fontWeight: 600, color: '#93c5fd', marginBottom: 2 }}>Explication :</div>
                <div>{m.desc}</div>
                <div style={{ marginTop: 4, fontFamily: 'monospace', color: '#86efac', fontSize: 10 }}>
                  Formule : {m.formula}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
