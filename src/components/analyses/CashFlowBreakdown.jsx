import React, { useState } from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function CashFlowBreakdown({
  revenusLocatifsMensuels = 0,
  chargesMensuelles = 0,
  mensualitesCredit = 0
}) {
  const [isAnnual, setIsAnnual] = useState(false)
  const mult = isAnnual ? 12 : 1

  const revenus = revenusLocatifsMensuels * mult
  const charges = chargesMensuelles * mult
  const credits = mensualitesCredit * mult
  const cashFlowNet = revenus - charges - credits
  const isPositif = cashFlowNet >= 0

  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Décomposition du Cash-Flow
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Vision transparente de la trésorerie réelle générée après encaissements et décaissements
          </p>
        </div>

        {/* Sélecteur Mensuel / Annuel */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: 8,
          padding: 3,
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            style={{
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: !isAnnual ? '#ffffff' : 'transparent',
              color: !isAnnual ? '#0f172a' : '#64748b',
              boxShadow: !isAnnual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Vue Mensuelle
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            style={{
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: isAnnual ? '#ffffff' : 'transparent',
              color: isAnnual ? '#0f172a' : '#64748b',
              boxShadow: isAnnual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Vue Annuelle
          </button>
        </div>
      </div>

      {/* ── LIGNE D'OPÉRATION MATHEMATIQUE TRANSPARENTE ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        alignItems: 'center',
        gap: 12
      }}>
        {/* 1. REVENUS */}
        <div style={{
          background: 'rgba(22, 163, 74, 0.05)',
          border: '1.5px solid rgba(22, 163, 74, 0.25)',
          borderRadius: 12,
          padding: '16px 18px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            <Icon name="plus" size={13} color="#16a34a" /> Revenus Locatifs {isAnnual ? 'Annuels' : 'Mensuels'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            +{formatEuro(revenus)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Loyers charges comprises
          </div>
        </div>

        {/* 2. MOINS CHARGES */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1.5px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 12,
          padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            <span style={{ fontWeight: 900, fontSize: 14 }}>—</span> Charges d'exploitation
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            -{formatEuro(charges)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Taxes, PNO, copro & entretien
          </div>
        </div>

        {/* 3. MOINS CRÉDITS */}
        <div style={{
          background: 'rgba(225, 29, 72, 0.05)',
          border: '1.5px solid rgba(225, 29, 72, 0.25)',
          borderRadius: 12,
          padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e11d48', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            <span style={{ fontWeight: 900, fontSize: 14 }}>—</span> Échéances de Crédits
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#e11d48', marginTop: 4 }}>
            -{formatEuro(credits)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Capital, intérêts & assurance
          </div>
        </div>

        {/* 4. ÉGAL CASH-FLOW NET */}
        <div style={{
          background: isPositif
            ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(225, 29, 72, 0.05) 100%)',
          border: `2px solid ${isPositif ? '#16a34a' : '#e11d48'}`,
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: isPositif ? '0 4px 14px rgba(22, 163, 74, 0.12)' : '0 4px 14px rgba(225, 29, 72, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isPositif ? '#15803d' : '#be123c', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
            <span style={{ fontWeight: 900, fontSize: 14 }}>=</span> Cash-Flow Net {isAnnual ? 'Annuel' : 'Mensuel'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: isPositif ? '#15803d' : '#be123c', marginTop: 4 }}>
            {isPositif ? '+' : ''}{formatEuro(cashFlowNet)}
          </div>
          <div style={{ fontSize: 11, color: isPositif ? '#166534' : '#9f1239', fontWeight: 600, marginTop: 2 }}>
            {isPositif ? '✅ Reste en trésorerie nette' : '⚠️ Effort d\'épargne personnel requis'}
          </div>
        </div>
      </div>

      {/* ── BARRE DE COUVERTURE VISUELLE ── */}
      {revenus > 0 && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            <span>Répartition de l'utilisation des loyers :</span>
            <span style={{ fontWeight: 600 }}>
              Crédits : {Math.round((credits / revenus) * 100)}% · Charges : {Math.round((charges / revenus) * 100)}% · Solde Net : {Math.round((cashFlowNet / revenus) * 100)}%
            </span>
          </div>

          <div style={{
            height: 12,
            background: '#e2e8f0',
            borderRadius: 6,
            display: 'flex',
            overflow: 'hidden'
          }}>
            <div
              style={{ width: `${Math.min(100, Math.round((credits / revenus) * 100))}%`, background: '#e11d48' }}
              title={`Crédits : ${formatEuro(credits)}`}
            />
            <div
              style={{ width: `${Math.min(100, Math.round((charges / revenus) * 100))}%`, background: '#f59e0b' }}
              title={`Charges : ${formatEuro(charges)}`}
            />
            {isPositif && (
              <div
                style={{ width: `${Math.max(0, Math.round((cashFlowNet / revenus) * 100))}%`, background: '#16a34a' }}
                title={`Excédent net : ${formatEuro(cashFlowNet)}`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
