import React, { useEffect, useState, useMemo } from 'react'
import { getBiens, getBaux, getDepenses, getPrets } from '../lib/db'
import { formatEuro } from '../lib/utils'
import { calculatePropertyYield, getLoanStatusAtDate } from '../lib/financialCalculations'
import Icon from '../components/common/Icon'

export default function Rendements({ onNavigate }) {
  const [biens, setBiens] = useState([])
  const [baux, setBaux] = useState([])
  const [depenses, setDepenses] = useState([])
  const [prets, setPrets] = useState([])
  const [selectedBienId, setSelectedBienId] = useState(null)

  useEffect(() => {
    Promise.all([
      getBiens().catch(() => []),
      getBaux().catch(() => []),
      getDepenses().catch(() => []),
      getPrets().catch(() => [])
    ]).then(([bi, ba, de, pr]) => {
      setBiens(bi || [])
      setBaux(ba || [])
      setDepenses(de || [])
      setPrets(pr || [])
      if (bi && bi.length > 0) setSelectedBienId(bi[0].id)
    })
  }, [])

  // Calcul des rendements pour chaque bien
  const yieldsByBien = useMemo(() => {
    return biens.map(b => {
      const bail = baux.find(x => x.bien_id === b.id && x.statut === 'actif')
      const pret = prets.find(p => p.bien_id === b.id)
      const pretStatus = pret ? getLoanStatusAtDate(pret) : { mensualite: 0 }

      const depensesBien = depenses.filter(d => d.bien_id === b.id)
      const depensesAnnuellesMoyennes = depensesBien.reduce((s, d) => s + d.montant, 0)

      const loyerMensuel = bail ? (bail.loyer_mensuel || 0) : 0
      const chargesMensuelles = bail ? (bail.charges_mensuelles || 0) : 0

      const result = calculatePropertyYield({
        prixAcquisition: b.prix_achat || b.valeur_estimee || 180000,
        fraisNotaire: Math.round((b.prix_achat || b.valeur_estimee || 180000) * 0.08),
        travauxInitiaux: 0,
        valeurActuelle: b.valeur_estimee || b.prix_achat || 180000,
        loyerMensuel: loyerMensuel,
        chargesMensuellesNonRecup: Math.round(chargesMensuelles * 0.3),
        taxeFonciereAnnuelle: Math.round(depensesAnnuellesMoyennes * 0.4) || 800,
        assurancePNOAnnuelle: 180,
        mensualitePret: pretStatus.mensualite,
        tauxVacancePct: 4
      })

      return {
        bien: b,
        bail,
        pret,
        ...result
      }
    })
  }, [biens, baux, depenses, prets])

  const selectedItem = yieldsByBien.find(y => y.bien.id === selectedBienId) || yieldsByBien[0]

  // Moyennes et globaux
  const globalInvestissement = yieldsByBien.reduce((s, y) => s + y.coutTotalInvestissement, 0)
  const globalLoyerAnnuel = yieldsByBien.reduce((s, y) => s + y.loyerAnnuelTheorique, 0)
  const globalCashFlowMensuel = yieldsByBien.reduce((s, y) => s + y.cashFlowMensuelNet, 0)
  const rendementGlobalBrut = globalInvestissement > 0 ? Number(((globalLoyerAnnuel / globalInvestissement) * 100).toFixed(2)) : 0

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <div className="page-header">
        <div>
          <h2>Rendements & Cash-Flow</h2>
          <p className="page-subtitle">
            Calculs automatisés des performances locatives réelles avec détail transparent des hypothèses
          </p>
        </div>

        {/* KPIs Globaux */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rendement Brut Global</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{rendementGlobalBrut}%</div>
          </div>

          <div className="card" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash-Flow Mensuel Global</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: globalCashFlowMensuel >= 0 ? '#16a34a' : '#ef4444', marginTop: 2 }}>
              {formatEuro(globalCashFlowMensuel)}/m
            </div>
          </div>
        </div>
      </div>

      {/* ── DISPOSITION DÉTACHÉE ET SPACIEUSE ── */}
      {yieldsByBien.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="trendingUp" size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Aucun bien enregistré pour le calcul de rendement</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Ajoutez un premier bien dans Patrimoine pour visualiser les ratios de performance locative.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          
          {/* Colonne gauche : liste des biens */}
          <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 6px' }}>
              Biens analysés ({yieldsByBien.length})
            </div>

            {yieldsByBien.map(y => {
              const isSelected = selectedItem?.bien.id === y.bien.id
              return (
                <div
                  key={y.bien.id}
                  onClick={() => setSelectedBienId(y.bien.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #4f46e5' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{y.bien.nom}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>{y.rendementBrutPct}%</span>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Loyer : {formatEuro(y.loyerAnnuelTheorique / 12)}/m · CF : <span style={{ color: y.cashFlowMensuelNet >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{formatEuro(y.cashFlowMensuelNet)}/m</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Colonne droite : Fiche d'analyse détaillée détachée */}
          {selectedItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Carte Principale */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selectedItem.bien.nom}</h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {selectedItem.bien.adresse || 'Adresse non renseignée'} • {selectedItem.bien.type_bien || 'Bien'}
                    </p>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate && onNavigate('bien', selectedItem.bien.id)}
                  >
                    Voir la fiche du bien →
                  </button>
                </div>

                {/* 4 Indicateurs Clés */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rendement Brut</span>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{selectedItem.rendementBrutPct}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Loyer / Coût Total</div>
                  </div>

                  <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rendement Net</span>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#4f46e5', marginTop: 4 }}>{selectedItem.rendementNetPct}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Après charges & taxe</div>
                  </div>

                  <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash-Flow Net</span>
                    <div style={{ fontSize: 24, fontWeight: 800, color: selectedItem.cashFlowMensuelNet >= 0 ? '#16a34a' : '#ef4444', marginTop: 4 }}>
                      {formatEuro(selectedItem.cashFlowMensuelNet)}<span style={{ fontSize: 12, fontWeight: 500 }}>/m</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Après mensualité crédit</div>
                  </div>

                  <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Investissement Total</span>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                      {formatEuro(selectedItem.coutTotalInvestissement)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Prix + Notaire (~8%)</div>
                  </div>
                </div>

                {/* Détail Transparent des Postes */}
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700 }}>Détail des flux annuels</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
                  <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#16a34a', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                      + Revenus Locatifs Annuels
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Loyers théoriques bruts</span>
                      <strong style={{ color: '#16a34a' }}>+{formatEuro(selectedItem.loyerAnnuelTheorique)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Provision vacance locative (4%)</span>
                      <span>-{formatEuro(selectedItem.perteVacanceAnnuelle)}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                      - Charges & Sorties Annuelles
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Charges non récupérables</span>
                      <span>-{formatEuro(selectedItem.chargesNonRecupAnnuelles)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Taxe foncière estimée</span>
                      <span>-{formatEuro(selectedItem.taxeFonciereAnnuelle)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Assurance PNO</span>
                      <span>-{formatEuro(selectedItem.assurancePNOAnnuelle)}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}
    </div>
  )
}
