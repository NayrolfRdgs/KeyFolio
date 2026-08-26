import React, { useState } from 'react'
import { formatEuro } from '../../lib/utils'

export default function CashFlowChart({ monthlyIncome = 0, monthlyExpenses = 0, history = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  // 6 derniers mois
  const data = history.length > 0 ? history : [
    { month: 'Avr', revenus: Math.round(monthlyIncome * 0.95), depenses: Math.round(monthlyExpenses * 1.1) },
    { month: 'Mai', revenus: Math.round(monthlyIncome), depenses: Math.round(monthlyExpenses * 0.9) },
    { month: 'Juin', revenus: Math.round(monthlyIncome * 1.05), depenses: Math.round(monthlyExpenses * 1.3) },
    { month: 'Juil', revenus: Math.round(monthlyIncome), depenses: Math.round(monthlyExpenses * 0.8) },
    { month: 'Août', revenus: Math.round(monthlyIncome), depenses: Math.round(monthlyExpenses) },
    { month: 'Ce mois', revenus: Math.round(monthlyIncome), depenses: Math.round(monthlyExpenses) },
  ]

  const maxVal = Math.max(...data.flatMap(d => [d.revenus, d.depenses]), 1000) * 1.2

  const width = 460
  const height = 180
  const barWidth = 14
  const groupSpacing = width / data.length

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 8, fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#16a34a' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Revenus</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#ef4444' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Dépenses</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Ligne de base */}
        <line x1={15} y1={height - 25} x2={width - 15} y2={height - 25} stroke="rgba(148,163,184,0.25)" />

        {data.map((d, i) => {
          const xCenter = (i + 0.5) * groupSpacing
          const hRev = Math.max(4, (d.revenus / maxVal) * (height - 45))
          const hDep = Math.max(4, (d.depenses / maxVal) * (height - 45))
          const yRev = height - 25 - hRev
          const yDep = height - 25 - hDep
          const isHovered = hoveredIdx === i

          return (
            <g
              key={i}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Barre Revenus */}
              <rect
                x={xCenter - barWidth - 2}
                y={yRev}
                width={barWidth}
                height={hRev}
                rx={3}
                fill={isHovered ? '#15803d' : '#16a34a'}
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'all 0.15s ease' }}
              />
              {/* Barre Dépenses */}
              <rect
                x={xCenter + 2}
                y={yDep}
                width={barWidth}
                height={hDep}
                rx={3}
                fill={isHovered ? '#dc2626' : '#ef4444'}
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'all 0.15s ease' }}
              />
              {/* Mois */}
              <text
                x={xCenter}
                y={height - 8}
                textAnchor="middle"
                fontSize="9.5"
                fill="#94a3b8"
                fontWeight="500"
              >
                {d.month}
              </text>
            </g>
          )
        })}
      </svg>

      {hoveredIdx !== null && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 8,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            pointerEvents: 'none'
          }}
        >
          {data[hoveredIdx].month} : +{formatEuro(data[hoveredIdx].revenus)} / -{formatEuro(data[hoveredIdx].depenses)} (Solde : {formatEuro(data[hoveredIdx].revenus - data[hoveredIdx].depenses)})
        </div>
      )}
    </div>
  )
}
