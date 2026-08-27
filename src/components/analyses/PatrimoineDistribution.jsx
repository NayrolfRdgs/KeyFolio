import React, { useState, useMemo } from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

const COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6'
]

export default function PatrimoineDistribution({ biens = [] }) {
  const [dimension, setDimension] = useState('type') // 'type' | 'ville' | 'statut' | 'valeur'

  const groupedData = useMemo(() => {
    if (!biens || biens.length === 0) return []

    const map = {}
    const totalVal = biens.reduce((s, b) => s + (b.valeur_estimee || b.prix_achat || 180000), 0)

    biens.forEach(b => {
      let key = 'Autre'
      const val = b.valeur_estimee || b.prix_achat || 180000

      if (dimension === 'type') {
        key = b.type_bien || 'Appartement'
      } else if (dimension === 'ville') {
        // Extraction ville de l'adresse
        if (b.adresse) {
          const parts = b.adresse.split(',')
          key = parts.length > 1 ? parts[parts.length - 1].trim() : b.adresse.substring(0, 18)
        } else {
          key = 'Non renseignée'
        }
      } else if (dimension === 'statut') {
        const s = b.statut || 'loue'
        key = s === 'loue' ? 'Loué' : s === 'vacant' ? 'Vacant' : s === 'travaux' ? 'En travaux' : s === 'projet' ? 'Projet' : s
      } else if (dimension === 'valeur') {
        if (val < 150000) key = '< 150 k€'
        else if (val <= 300000) key = '150 k€ - 300 k€'
        else if (val <= 500000) key = '300 k€ - 500 k€'
        else key = '> 500 k€'
      }

      if (!map[key]) {
        map[key] = { key, count: 0, totalVal: 0 }
      }
      map[key].count += 1
      map[key].totalVal += val
    })

    return Object.values(map).map((item, idx) => ({
      ...item,
      percentage: totalVal > 0 ? Math.round((item.totalVal / totalVal) * 100) : 0,
      color: COLORS[idx % COLORS.length]
    })).sort((a, b) => b.totalVal - a.totalVal)
  }, [biens, dimension])

  const totalValeur = biens.reduce((s, b) => s + (b.valeur_estimee || b.prix_achat || 180000), 0)

  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Répartition du Patrimoine
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Ventilation de la valeur selon vos critères d'analyse
          </p>
        </div>

        {/* Sélecteur de dimension */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Critère :</span>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            <option value="type">Type de bien</option>
            <option value="ville">Localisation / Ville</option>
            <option value="statut">Statut d'occupation</option>
            <option value="valeur">Tranche de valeur</option>
          </select>
        </div>
      </div>

      {/* Barre de répartition horizontale segmentée */}
      <div style={{
        height: 12,
        borderRadius: 6,
        background: '#e2e8f0',
        display: 'flex',
        overflow: 'hidden',
        marginBottom: 16
      }}>
        {groupedData.map((item, idx) => (
          <div
            key={idx}
            style={{
              width: `${item.percentage}%`,
              background: item.color,
              transition: 'width 0.3s ease'
            }}
            title={`${item.key} : ${formatEuro(item.totalVal)} (${item.percentage}%)`}
          />
        ))}
      </div>

      {/* Liste des éléments ventilés */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groupedData.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #f1f5f9',
              fontSize: 12.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.key}</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>({item.count} bien{item.count > 1 ? 's' : ''})</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatEuro(item.totalVal)}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: item.color,
                background: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                border: `1px solid ${item.color}30`,
                minWidth: 38,
                textAlign: 'right'
              }}>
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
