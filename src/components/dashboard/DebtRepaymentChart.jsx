import React from 'react'
import { formatEuro } from '../../lib/utils'

export default function DebtRepaymentChart({ totalDetteInitiale = 0, capitalRestant = 0, totalPrets = 0 }) {
  const capitalRembourse = Math.max(0, totalDetteInitiale - capitalRestant)
  const pctRembourse = totalDetteInitiale > 0 ? Math.min(100, Math.round((capitalRembourse / totalDetteInitiale) * 100)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {/* Jauge horizontale segmentée */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            Capital amorti : <strong style={{ color: '#16a34a' }}>{pctRembourse}%</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {totalPrets} prêt{totalPrets > 1 ? 's' : ''} en cours
          </span>
        </div>

        <div
          style={{
            height: 12,
            width: '100%',
            background: '#e2e8f0',
            borderRadius: 99,
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          <div
            style={{
              width: `${pctRembourse}%`,
              background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
              transition: 'width 0.5s ease',
              borderRadius: '99px 0 0 99px'
            }}
          />
          <div
            style={{
              width: `${100 - pctRembourse}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
              opacity: 0.8
            }}
          />
        </div>
      </div>

      {/* Cartouche résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
        <div
          style={{
            background: 'rgba(22, 163, 74, 0.08)',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(22, 163, 74, 0.2)'
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Amorti</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{formatEuro(capitalRembourse)}</div>
        </div>

        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Restant dû</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>{formatEuro(capitalRestant)}</div>
        </div>
      </div>
    </div>
  )
}
