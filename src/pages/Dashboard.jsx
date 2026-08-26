import React, { useEffect, useState, useMemo } from 'react'
import {
  getBiens, getProjets, getPrets, getBaux, getPaiements, getDepenses,
  getMaintenance, getTaches
} from '../lib/db'
import { formatEuro, formatDate } from '../lib/utils'
import { getLoanStatusAtDate } from '../lib/financialCalculations'
import Icon from '../components/common/Icon'
import StatusBadge from '../components/common/StatusBadge'
import PatrimoineValueChart from '../components/dashboard/PatrimoineValueChart'
import CashFlowChart from '../components/dashboard/CashFlowChart'
import DebtRepaymentChart from '../components/dashboard/DebtRepaymentChart'
import PortfolioDonutChart from '../components/dashboard/PortfolioDonutChart'
import AttentionFeed from '../components/dashboard/AttentionFeed'

export default function Dashboard({ onNavigate, onOpenWizard }) {
  const [biens, setBiens] = useState([])
  const [projets, setProjets] = useState([])
  const [prets, setPrets] = useState([])
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [depenses, setDepenses] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [taches, setTaches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBiens().catch(() => []),
      getProjets().catch(() => []),
      getPrets().catch(() => []),
      getBaux().catch(() => []),
      getPaiements().catch(() => []),
      getDepenses().catch(() => []),
      getMaintenance().catch(() => []),
      Promise.resolve(getTaches()).catch(() => [])
    ]).then(([bi, pr, lo, ba, pa, de, ma, ta]) => {
      setBiens(bi || [])
      setProjets(pr || [])
      setPrets(lo || [])
      setBaux(ba || [])
      setPaiements(pa || [])
      setDepenses(de || [])
      setMaintenance(ma || [])
      setTaches(ta || [])
      setLoading(false)
    })
  }, [])

  // ─── CALCULS PATRIMONIAUX & FINANCIERS CLÉS ──────────────────
  const kpis = useMemo(() => {
    // 1. Valeur totale du patrimoine (Biens actifs + Projets)
    const valeurBiens = biens
      .filter(b => String(b.statut).toLowerCase() !== 'projet')
      .reduce((sum, b) => sum + (b.valeur_estimee || b.prix_achat || 180000), 0)
    
    const budgetProjets = projets.reduce((sum, p) => sum + (p.budget_prevu || 0), 0)
    const valeurTotalePatrimoine = valeurBiens + budgetProjets

    // 2. Dette totale & capital restant
    let totalDetteInitiale = 0
    let capitalRestantTotal = 0
    let mensualitesCreditsTotal = 0

    prets.forEach(p => {
      const status = getLoanStatusAtDate(p)
      totalDetteInitiale += (p.montant_emprunt || 0)
      capitalRestantTotal += status.capitalRestantDu
      mensualitesCreditsTotal += status.mensualite
    })

    // 3. Revenus & Dépenses mensuels
    const bauxActifs = baux.filter(b => b.statut === 'actif')
    const revenusMensuelsTheoriques = bauxActifs.reduce((sum, b) => sum + (b.loyer_mensuel || 0) + (b.charges_mensuelles || 0), 0)

    const now = new Date()
    const thisMo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const depensesCeMois = depenses
      .filter(d => d.date?.startsWith(thisMo))
      .reduce((sum, d) => sum + (d.montant || 0), 0)

    // 4. Cash-flow mensuel net d'emprunt
    const cashFlowNetMensuel = revenusMensuelsTheoriques - depensesCeMois - mensualitesCreditsTotal

    // 5. Rendement global brut
    const rendementGlobalBrut = valeurTotalePatrimoine > 0
      ? ((revenusMensuelsTheoriques * 12) / valeurTotalePatrimoine) * 100
      : 0

    // 6. Taux d'occupation
    const biensExploites = biens.filter(b => String(b.statut).toLowerCase() !== 'projet' && String(b.statut).toLowerCase() !== 'inactif')
    const nbBiensOccupes = bauxActifs.length
    const nbBiensVacants = Math.max(0, biensExploites.length - nbBiensOccupes)

    // 7. Alertes & Attention
    const impayes = paiements.filter(p => p.statut === 'impaye' || p.statut === 'en_retard')
    const ticketsUrgents = maintenance.filter(m => m.priorite === 'urgent' && m.statut !== 'resolu')
    const echeancesProches = taches
      .filter(t => !t.termine && t.echeance)
      .sort((a, b) => new Date(a.echeance) - new Date(b.echeance))
      .slice(0, 3)

    const totalAlertes = impayes.length + ticketsUrgents.length

    return {
      valeurTotalePatrimoine,
      totalDetteInitiale,
      capitalRestantTotal,
      patrimoineNet: Math.max(0, valeurTotalePatrimoine - capitalRestantTotal),
      revenusMensuelsTheoriques,
      depensesCeMois,
      mensualitesCreditsTotal,
      cashFlowNetMensuel,
      rendementGlobalBrut: Number(rendementGlobalBrut.toFixed(2)),
      nbBiens: biens.length,
      nbProjets: projets.length,
      nbBiensOccupes,
      nbBiensVacants,
      impayes,
      ticketsUrgents,
      echeancesProches,
      totalAlertes
    }
  }, [biens, projets, prets, baux, paiements, depenses, maintenance, taches])

  return (
    <div className="page-content" style={{ padding: '24px 32px', background: '#f8fafc' }}>
      
      {/* ── 1. EN-TÊTE SUPÉRIEUR AVEC ACCUEIL & ACTIONS CLÉS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Tableau de bord</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.1)', padding: '3px 10px', borderRadius: 99 }}>
              OS Patrimoine
            </span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Vue globale en temps réel de vos actifs, financements et projets en cours
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('projets')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="hardHat" size={15} color="#2563eb" /> + Nouveau projet
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onOpenWizard ? onOpenWizard() : onNavigate('biens')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="plus" size={15} /> + Ajouter un bien
          </button>
        </div>
      </div>

      {/* ── 2. LES 5 RÉPONSES IMMÉDIATES AUX QUESTIONS ESSENTIELLES DU PATRIMOINE ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Q1: Combien vaut mon patrimoine ? */}
        <div
          onClick={() => onNavigate('biens')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Valeur du Patrimoine
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="house" size={16} color="#4f46e5" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
            {formatEuro(kpis.valeurTotalePatrimoine)}
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
            Net : {formatEuro(kpis.patrimoineNet)}
          </div>
        </div>

        {/* Q2: Combien me rapporte-t-il ? */}
        <div
          onClick={() => onNavigate('rendements')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Revenus Mensuels
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="euro" size={16} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
            {formatEuro(kpis.revenusMensuelsTheoriques)}<span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>/mois</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
            Rendement brut : <strong>{kpis.rendementGlobalBrut}%</strong>
          </div>
        </div>

        {/* Q3: Combien dois-je ? (Dette) */}
        <div
          onClick={() => onNavigate('prets')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Dette Restante
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="circleDollarSign" size={16} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginTop: 8 }}>
            {formatEuro(kpis.capitalRestantTotal)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
            Mensualités : {formatEuro(kpis.mensualitesCreditsTotal)}/mois
          </div>
        </div>

        {/* Q4: Quels projets sont en cours ? */}
        <div
          onClick={() => onNavigate('projets')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Projets en Cours
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="hardHat" size={16} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 8 }}>
            {kpis.nbProjets}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
            {kpis.nbBiens} biens au total
          </div>
        </div>

        {/* Q5: Cash-Flow Net */}
        <div
          onClick={() => onNavigate('rendements')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Cash-Flow Net
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wallet" size={16} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: kpis.cashFlowNetMensuel >= 0 ? '#16a34a' : '#ef4444', marginTop: 8 }}>
            {formatEuro(kpis.cashFlowNetMensuel)}<span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>/mois</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
            Occupés : {kpis.nbBiensOccupes} · Vacants : {kpis.nbBiensVacants}
          </div>
        </div>
      </div>

      {/* ── 3. GRAPHIQUES VISUELS INTERACTIFS & ATTENTION FEED ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
        
        {/* Évolution de la valeur du patrimoine */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="trendingUp" size={16} color="#4f46e5" /> Évolution de la valeur du patrimoine
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Estimation globale</span>
          </div>
          <PatrimoineValueChart currentValue={kpis.valeurTotalePatrimoine} />
        </div>

        {/* Flux de trésorerie & Cash-flow */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="receipt" size={16} color="#16a34a" /> Flux Revenus / Dépenses
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Mensualisé</span>
          </div>
          <CashFlowChart monthlyIncome={kpis.revenusMensuelsTheoriques} monthlyExpenses={kpis.depensesCeMois} />
        </div>

        {/* Remboursement de la dette & passif */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="circleDollarSign" size={16} color="#ef4444" /> Amortissement de la dette
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('prets')} style={{ fontSize: 11 }}>
              Gérer les prêts
            </button>
          </div>
          <DebtRepaymentChart
            totalDetteInitiale={kpis.totalDetteInitiale}
            capitalRestant={kpis.capitalRestantTotal}
            totalPrets={prets.length}
          />
        </div>

        {/* Répartition du parc immobilier */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="pieChart" size={16} color="#8b5cf6" /> Répartition du patrimoine
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Par catégorie</span>
          </div>
          <PortfolioDonutChart biens={biens} />
        </div>
      </div>

      {/* ── 4. POINTS D'ATTENTION & PROJETS EN COURS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        
        {/* Points d'attention */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={16} color="#f59e0b" /> Nécessite votre attention ({kpis.totalAlertes})
            </h3>
          </div>
          <AttentionFeed
            impayes={kpis.impayes}
            ticketsUrgents={kpis.ticketsUrgents}
            echeancesProches={kpis.echeancesProches}
            onNavigate={onNavigate}
          />
        </div>

        {/* Projets récents / en cours */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="hardHat" size={16} color="#2563eb" /> Projets immobiliers ({projets.length})
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('projets')} style={{ fontSize: 11 }}>
              Tous les projets →
            </button>
          </div>

          {projets.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              <Icon name="hardHat" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12 }}>Aucun projet en cours. Créez votre première opération !</div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('projets')} style={{ marginTop: 10 }}>
                + Nouveau projet
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projets.slice(0, 3).map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('projets')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.nom}</span>
                    <StatusBadge status={p.statut || 'travaux'} type="projet" size="sm" />
                  </div>
                  
                  {/* Barre d'avancement */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${p.pourcentage_avancement || 0}%`,
                          height: '100%',
                          background: '#2563eb',
                          borderRadius: 99
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb' }}>
                      {p.pourcentage_avancement || 0}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                    <span>Budget : {formatEuro(p.budget_prevision || p.budget_prevu || 0)}</span>
                    <span>{p.date_livraison_prevue ? `Livraison : ${formatDate(p.date_livraison_prevue)}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
