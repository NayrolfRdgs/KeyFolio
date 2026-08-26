import React, { useState } from 'react'
import { formatEuro } from '../../lib/utils'

export default function PatrimoineValueChart({ history = [], currentValue = 0 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  // Générer des données réalistes si history est vide
  const data = history.length > 0 ? history : [
    { label: 'Jan', value: Math.round(currentValue * 0.92) },
    { label: 'Fév', value: Math.round(currentValue * 0.93) },
    { label: 'Mar', value: Math.round(currentValue * 0.94) },
    { label: 'Avr', value: Math.round(currentValue * 0.95) },
    { label: 'Mai', value: Math.round(currentValue * 0.96) },
    { label: 'Juin', value: Math.round(currentValue * 0.97) },
    { label: 'Juil', value: Math.round(currentValue * 0.98) },
    { label: 'Août', value: Math.round(currentValue * 0.99) },
    { label: 'Actuel', value: Math.round(currentValue || 350000) },
  ]

  const width = 500
  const height = 180
  const paddingX = 35
  const paddingY = 25

  const values = data.map(d => d.value)
  const minVal = Math.min(...values) * 0.95
  const maxVal = Math.max(...values) * 1.05
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2)
    const y = height - paddingY - ((d.value - minVal) / range) * (height - paddingY * 2)
    return { x, y, ...d }
  })

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="patrimoineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Lignes de repère */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
        <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(148,163,184,0.25)" />

        {/* Surface dégradée */}
        <path d={areaD} fill="url(#patrimoineGradient)" />

        {/* Courbe principale */}
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points et labels */}
        {points.map((p, i) => {
          const isHovered = hoveredIdx === i
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3.5}
                fill={isHovered ? '#4f46e5' : '#ffffff'}
                stroke="#4f46e5"
                strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
                fontWeight="500"
              >
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>

      {hoveredIdx !== null && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 12,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            pointerEvents: 'none'
          }}
        >
          {data[hoveredIdx].label} : {formatEuro(data[hoveredIdx].value)}
        </div>
      )}
    </div>
  )
}
