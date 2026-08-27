import React, { useState, useMemo } from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function PropertyPerformanceTable({
  propertyPerformances = [],
  onNavigate
}) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('valeur') // 'valeur' | 'loyer' | 'rendement' | 'cashflow' | 'dette' | 'nom'
  const [sortDirection, setSortDirection] = useState('desc')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    let list = [...propertyPerformances]

    // 1. Recherche
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.bien?.nom || '').toLowerCase().includes(q) ||
        (p.bien?.adresse || '').toLowerCase().includes(q) ||
        (p.bien?.type_bien || '').toLowerCase().includes(q)
      )
    }

    // 2. Tri
    list.sort((a, b) => {
      let valA = 0
      let valB = 0

      switch (sortField) {
        case 'nom':
          return sortDirection === 'asc'
            ? (a.bien?.nom || '').localeCompare(b.bien?.nom || '')
            : (b.bien?.nom || '').localeCompare(a.bien?.nom || '')
        case 'valeur':
          valA = a.valeurActuelle || 0
          valB = b.valeurActuelle || 0
          break
        case 'loyer':
          valA = a.loyerMensuel || 0
          valB = b.loyerMensuel || 0
          break
        case 'rendement':
          valA = a.rendementNetPct || a.rendementBrutPct || 0
          valB = b.rendementNetPct || b.rendementBrutPct || 0
          break
        case 'cashflow':
          valA = a.cashFlowMensuelNet || 0
          valB = b.cashFlowMensuelNet || 0
          break
        case 'dette':
          valA = a.detteRestante || 0
          valB = b.detteRestante || 0
          break
        default:
          valA = a.valeurActuelle || 0
          valB = b.valeurActuelle || 0
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA
    })

    return list
  }, [propertyPerformances, search, sortField, sortDirection])

  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0' }}>
      {/* ── EN-TÊTE DU TABLEAU AVEC RECHERCHE ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Performance Détaillée par Bien
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Tableau comparatif consolidé de chaque actif · Cliquez sur une ligne pour ouvrir la fiche
          </p>
        </div>

        {/* Barre de recherche */}
        <div style={{ position: 'relative', width: 240 }}>
          <input
            type="text"
            placeholder="Rechercher un bien, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#0f172a'
            }}
          />
          <div style={{ position: 'absolute', left: 9, top: 9, color: '#94a3b8', pointerEvents: 'none' }}>
            <Icon name="search" size={14} />
          </div>
        </div>
      </div>

      {/* ── TABLEAU MODERNE SCROLLABLE ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => handleSort('nom')}>
                Bien & Ville {sortField === 'nom' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px' }}>Type</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('valeur')}>
                Valeur Estimée {sortField === 'valeur' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('loyer')}>
                Loyer Mensuel {sortField === 'loyer' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('rendement')}>
                Rendement Net {sortField === 'rendement' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Charges/m</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('cashflow')}>
                Cash-Flow Net {sortField === 'cashflow' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('dette')}>
                Dette Restante {sortField === 'dette' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>
                  Aucun bien ne correspond aux filtres ou à la recherche.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((item, idx) => {
                const b = item.bien
                const isLoue = b.statut === 'loue' || (!b.statut && item.loyerMensuel > 0)
                const isVacant = b.statut === 'vacant'
                const isProjet = b.statut === 'projet'
                const isPositif = item.cashFlowMensuelNet >= 0

                return (
                  <tr
                    key={b.id || idx}
                    onClick={() => onNavigate && onNavigate('bien', b.id)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Bien & Ville */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.nom}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{b.adresse || '—'}</div>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px', color: '#475569' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {b.type_bien || 'Appartement'}
                      </span>
                    </td>

                    {/* Valeur */}
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatEuro(item.valeurActuelle)}
                    </td>

                    {/* Loyer */}
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: item.loyerMensuel > 0 ? '#16a34a' : '#94a3b8' }}>
                      {item.loyerMensuel > 0 ? `${formatEuro(item.loyerMensuel)}/m` : '—'}
                    </td>

                    {/* Rendement */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 800,
                        color: item.rendementNetPct >= 5 ? '#16a34a' : item.rendementNetPct >= 3.5 ? '#d97706' : '#e11d48'
                      }}>
                        {item.rendementNetPct > 0 ? `${item.rendementNetPct}%` : `${item.rendementBrutPct}%`}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>
                        (brut: {item.rendementBrutPct}%)
                      </span>
                    </td>

                    {/* Charges */}
                    <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>
                      {item.chargesMensuelles > 0 ? `-${formatEuro(item.chargesMensuelles)}/m` : '0 €'}
                    </td>

                    {/* Cash-Flow */}
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: isPositif ? '#16a34a' : '#e11d48' }}>
                      {isPositif ? '+' : ''}{formatEuro(item.cashFlowMensuelNet)}/m
                    </td>

                    {/* Dette Restante */}
                    <td style={{ padding: '12px', textAlign: 'right', color: item.detteRestante > 0 ? '#e11d48' : '#94a3b8', fontWeight: 600 }}>
                      {item.detteRestante > 0 ? formatEuro(item.detteRestante) : 'Aucune'}
                    </td>

                    {/* Statut Badge */}
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: isLoue ? '#dcfce7' : isVacant ? '#fef3c7' : isProjet ? '#dbeafe' : '#f1f5f9',
                        color: isLoue ? '#15803d' : isVacant ? '#92400e' : isProjet ? '#1e40af' : '#475569'
                      }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isLoue ? '#16a34a' : isVacant ? '#f59e0b' : isProjet ? '#3b82f6' : '#94a3b8'
                        }} />
                        {isLoue ? 'Loué' : isVacant ? 'Vacant' : isProjet ? 'Projet' : b.statut || 'Actif'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
