import React, { useState } from 'react'
import { formatEuro } from '../../lib/utils'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']

export default function PortfolioDonutChart({ biens = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  // Agréger par type de bien
  const typeMap = {}
  biens.forEach(b => {
    const t = b.type_bien || 'Autre'
    const val = b.valeur_estimee || b.prix_achat || 150000
    typeMap[t] = (typeMap[t] || 0) + val
  })

  const entries = Object.entries(typeMap).map(([label, value]) => ({ label, value }))
  const totalVal = entries.reduce((acc, e) => acc + e.value, 0) || 1

  if (entries.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
        Aucune donnée de répartition
      </div>
    )
  }

  // Calcul des segments SVG en cercle SVG
  let cumulativeAngle = 0
  const size = 150
  const center = size / 2
  const radius = 56
  const strokeWidth = 24

  const segments = entries.map((e, i) => {
    const pct = e.value / totalVal
    const angle = pct * 360
    const startAngle = cumulativeAngle
    cumulativeAngle += angle
    const color = COLORS[i % COLORS.length]

    // Convertir angles en coordonnées polaires pour arc SVG
    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (startAngle + angle - 90) * (Math.PI / 180)

    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0
    const d = entries.length === 1
      ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius}`
      : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`

    return { ...e, d, color, pct: Math.round(pct * 100) }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%', transform: 'rotate(-0.01deg)' }}>
          {segments.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={s.color}
              strokeWidth={hoveredIdx === i ? strokeWidth + 4 : strokeWidth}
              strokeLinecap="round"
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            {hoveredIdx !== null ? `${segments[hoveredIdx].pct}%` : `${biens.length}`}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>
            {hoveredIdx !== null ? segments[hoveredIdx].label : 'Biens'}
          </div>
        </div>
      </div>

      {/* Légende latérale */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
        {segments.map((s, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              cursor: 'pointer',
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.4 : 1,
              transition: 'opacity 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: 8, flexShrink: 0 }}>
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
