import React, { useState } from 'react'
import { formatEuro } from '../lib/utils'

/**
 * Graphique Financier Synthétique pour la Carte FINANCES (Onglet Infos)
 */
export function OverviewFinanceChart({ bien, champsMap = {}, paiements = [], depenses = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const prixAchat = parseFloat(champsMap['prix_achat']) || 0
  const fraisNotaire = parseFloat(champsMap['frais_notaire']) || (prixAchat * 0.08)
  const travaux = parseFloat(champsMap['travaux_initiaux']) || 0
  const totalRevient = prixAchat + fraisNotaire + travaux
  const valeurActuelle = parseFloat(champsMap['valeur_estimee']) || totalRevient

  const loyerM = parseFloat(champsMap['loyer_actuel']) || 0
  const chargesM = parseFloat(champsMap['charges_mensuelles']) || 0
  const loyerAnnuel = loyerM * 12
  const chargesAnnuelles = (chargesM * 12) + (parseFloat(champsMap['taxe_fonciere']) || 0) + (parseFloat(champsMap['assurance_pno']) || 0)
  const netAnnuel = Math.max(0, loyerAnnuel - chargesAnnuelles)

  const bars = [
    { label: "Prix d'Achat", value: prixAchat, color: '#3B82F6' },
    { label: "Prix de Revient", value: totalRevient, color: '#6366F1' },
    { label: "Valeur Estimée", value: valeurActuelle, color: '#10B981' },
    { label: "Revenu Brut (1 an)", value: loyerAnnuel, color: '#8B5CF6' },
    { label: "Revenu Net (1 an)", value: netAnnuel, color: '#EC4899' },
  ]

  const maxVal = Math.max(...bars.map(b => b.value), 1)

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
          📊 Aperçu Patrimonial & Flux
        </span>
        {hoveredIdx !== null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: bars[hoveredIdx].color }}>
            {bars[hoveredIdx].label} : {formatEuro(bars[hoveredIdx].value)}
          </span>
        )}
      </div>

      <div style={{ height: 110, display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 4px 4px 4px', background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--border-color)', position: 'relative' }}>
        {bars.map((bar, idx) => {
          const heightPct = Math.max(8, (bar.value / maxVal) * 100)
          const isHovered = hoveredIdx === idx

          return (
            <div
              key={idx}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                style={{
                  width: '80%',
                  height: `${heightPct}%`,
                  background: isHovered ? bar.color : `${bar.color}CC`,
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.2s ease',
                  boxShadow: isHovered ? `0 0 10px ${bar.color}88` : 'none',
                  transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                  transformOrigin: 'bottom'
                }}
              />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {bar.label.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Tableau de Bord Financier Interactif (Graphiques Multiples pour l'onglet Finances)
 */
export function DetailedFinanceDashboard({ bien, champsMap = {}, paiements = [], depenses = [] }) {
  const [activeChartTab, setActiveChartTab] = useState('cashflow')
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // 1. Calcul des données mensuelles sur 12 mois
  const now = new Date()
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    months.push({ key, label, year: d.getFullYear() })
  }

  const monthlyData = months.map(m => {
    const pmtMonth = paiements.filter(p => p.statut === 'paye' && p.date_prevue?.startsWith(m.key))
    const encaisse = pmtMonth.reduce((acc, p) => acc + (p.montant || 0), 0)

    const depMonth = depenses.filter(d => d.date?.startsWith(m.key))
    const depense = depMonth.reduce((acc, d) => acc + (d.montant || 0), 0)

    const net = encaisse - depense
    return { ...m, encaisse, depense, net }
  })

  const maxValMonthly = Math.max(...monthlyData.map(d => Math.max(d.encaisse, d.depense)), 1000)

  // 2. Calcul Répartition des Dépenses par Catégorie
  const depensesCategories = {}
  depenses.forEach(d => {
    const cat = d.categorie || 'Autres charges'
    depensesCategories[cat] = (depensesCategories[cat] || 0) + (d.montant || 0)
  })

  // S'il n'y a pas encore de dépenses enregistrées, utiliser les charges configurées
  if (Object.keys(depensesCategories).length === 0) {
    const TF = parseFloat(champsMap['taxe_fonciere']) || 0
    const PNO = parseFloat(champsMap['assurance_pno']) || 0
    const Copro = (parseFloat(champsMap['charges_trimestrielles']) || 0) * 4
    if (TF > 0) depensesCategories['Taxe Foncière'] = TF
    if (PNO > 0) depensesCategories['Assurance PNO'] = PNO
    if (Copro > 0) depensesCategories['Charges Copro'] = Copro
    if (Object.keys(depensesCategories).length === 0) {
      depensesCategories['Charges courantes'] = (parseFloat(champsMap['charges_mensuelles']) || 0) * 12 || 600
    }
  }

  const totalDepenses = Object.values(depensesCategories).reduce((a, b) => a + b, 0)
  const catColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4']

  const depenseSlices = Object.entries(depensesCategories).map(([cat, val], idx) => ({
    cat,
    val,
    pct: Math.round((val / totalDepenses) * 100),
    color: catColors[idx % catColors.length]
  }))

  // 3. Projections Amortissement & Patrimoine sur 15 ans
  const prixAchat = parseFloat(champsMap['prix_achat']) || 150000
  const apport = parseFloat(champsMap['apport_personnel']) || (prixAchat * 0.1)
  const rentabiliteBrute = parseFloat(champsMap['rendement_brut']) || 5.5

  const projections = []
  for (let year = 0; year <= 15; year++) {
    const valeurBien = prixAchat * Math.pow(1.02, year) // Prise de valeur 2%/an
    const capitalRembourse = Math.min(prixAchat - apport, (prixAchat - apport) * (year / 20))
    const netCumule = (prixAchat * (rentabiliteBrute / 100) * 0.7) * year
    projections.push({ year, valeurBien, capitalRembourse, netCumule })
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--border-color)' }}>
      {/* Selector Menu Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📈</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Analytique & Graphiques Financiers</h3>
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'var(--color-surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <button
            className={`btn btn-sm ${activeChartTab === 'cashflow' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => setActiveChartTab('cashflow')}
          >
            📊 Flux & Cashflow 12 Mois
          </button>
          <button
            className={`btn btn-sm ${activeChartTab === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => setActiveChartTab('categories')}
          >
            🍩 Répartition Charges
          </button>
          <button
            className={`btn btn-sm ${activeChartTab === 'projection' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => setActiveChartTab('projection')}
          >
            🚀 Projection 15 Ans
          </button>
        </div>
      </div>

      {/* CHART 1: CASHFLOW & ENCAISSEMENTS MENSUELS */}
      {activeChartTab === 'cashflow' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              Encaissements (Loyers reçus) vs Dépenses enregistrées par mois
            </div>
            {hoveredPoint && (
              <div style={{ fontSize: 12, fontWeight: 800, background: 'var(--color-surface-2)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                {hoveredPoint.label} : <span style={{ color: '#10B981' }}>+{formatEuro(hoveredPoint.encaisse)}</span> | <span style={{ color: '#EF4444' }}>-{formatEuro(hoveredPoint.depense)}</span> | Net: <strong style={{ color: hoveredPoint.net >= 0 ? '#10B981' : '#EF4444' }}>{formatEuro(hoveredPoint.net)}</strong>
              </div>
            )}
          </div>

          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '16px 8px 8px 8px', background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--border-color)', position: 'relative' }}>
            {monthlyData.map((d, idx) => {
              const hEncaisse = (d.encaisse / maxValMonthly) * 160
              const hDepense = (d.depense / maxValMonthly) * 160
              const isHovered = hoveredPoint?.key === d.key

              return (
                <div
                  key={idx}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer', position: 'relative' }}
                  onMouseEnter={() => setHoveredPoint(d)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', justifyContent: 'center', height: '100%' }}>
                    {/* Barre Encaissements (Vert) */}
                    <div
                      style={{
                        width: '42%',
                        height: `${Math.max(4, hEncaisse)}px`,
                        background: isHovered ? '#10B981' : '#10B981CC',
                        borderRadius: '3px 3px 0 0',
                        transition: 'all 0.2s ease'
                      }}
                      title={`Loyers : ${formatEuro(d.encaisse)}`}
                    />
                    {/* Barre Dépenses (Rouge) */}
                    <div
                      style={{
                        width: '42%',
                        height: `${Math.max(4, hDepense)}px`,
                        background: isHovered ? '#EF4444' : '#EF4444CC',
                        borderRadius: '3px 3px 0 0',
                        transition: 'all 0.2s ease'
                      }}
                      title={`Dépenses : ${formatEuro(d.depense)}`}
                    />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isHovered ? 'var(--color-accent)' : 'var(--text-muted)', marginTop: 6, textTransform: 'capitalize' }}>
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, fontSize: 11, fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: 2 }} /> Loyers Encaissés
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2 }} /> Dépenses & Charges
            </span>
          </div>
        </div>
      )}

      {/* CHART 2: RÉPARTITION DES CHARGES & DÉPENSES */}
      {activeChartTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
          {/* Camembert / Donut SVG */}
          <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              {(() => {
                let accumulatedAngle = 0
                return depenseSlices.map((slice, idx) => {
                  const strokeDasharray = `${slice.pct} ${100 - slice.pct}`
                  const strokeDashoffset = -accumulatedAngle
                  accumulatedAngle += slice.pct
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="12"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                    />
                  )
                })
              })()}
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>Total Charges</span>
              <strong style={{ fontSize: 14, fontWeight: 900 }}>{formatEuro(totalDepenses)}</strong>
            </div>
          </div>

          {/* Légende interactive */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {depenseSlices.map((slice, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, background: slice.color, borderRadius: 3 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{slice.cat}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
                  {formatEuro(slice.val)} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>({slice.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHART 3: PROJECTION PATRIMONIALE SUR 15 ANS */}
      {activeChartTab === 'projection' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
            Valorisation estimée du bien (+2%/an) vs Capital remboursé & Revenus nets cumulés
          </div>

          <div style={{ height: 190, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--border-color)', padding: 12, display: 'flex', alignItems: 'flex-end', gap: 6, position: 'relative' }}>
            {projections.map((p, idx) => {
              const hVal = (p.valeurBien / (prixAchat * 1.4)) * 140

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  <div style={{ width: '80%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    {/* Courbe Valeur bien */}
                    <div style={{ width: '100%', height: `${hVal}px`, background: 'rgba(59, 130, 246, 0.2)', borderTop: '2px solid #3B82F6', borderRadius: '3px 3px 0 0' }} title={`Année ${p.year} : ${formatEuro(p.valeurBien)}`} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>
                    A{p.year}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 11, fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 3, background: '#3B82F6' }} /> Valeur Estimée du Bien (€)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
