import React, { useEffect, useState, useMemo } from 'react'
import {
  getBiens,
  getProjets,
  getPrets,
  getBaux,
  getPaiements,
  getDepenses,
  getMaintenance,
  getTaches
} from '../lib/db'
import { formatEuro } from '../lib/utils'
import { calculatePropertyYield, getLoanStatusAtDate } from '../lib/financialCalculations'
import Icon from '../components/common/Icon'

// Sous-composants modulaires
import PatrimoineKPICards from '../components/analyses/PatrimoineKPICards'
import PatrimoineEvolutionChart from '../components/analyses/PatrimoineEvolutionChart'
import PerformanceCard from '../components/analyses/PerformanceCard'
import CashFlowBreakdown from '../components/analyses/CashFlowBreakdown'
import DebtCard from '../components/analyses/DebtCard'
import PatrimoineDistribution from '../components/analyses/PatrimoineDistribution'
import PropertyPerformanceTable from '../components/analyses/PropertyPerformanceTable'
import WatchlistAlerts from '../components/analyses/WatchlistAlerts'
import ProjetsPatrimoineCard from '../components/analyses/ProjetsPatrimoineCard'
import KeyFolioAnalysisCard from '../components/analyses/KeyFolioAnalysisCard'
import ExportReportModal from '../components/analyses/ExportReportModal'

export default function AnalysesRapports({ onNavigate }) {
  // ─── ÉTAT DES DONNÉES RÉELLES DU SYSTÈME ───
  const [biens, setBiens] = useState([])
  const [projets, setProjets] = useState([])
  const [prets, setPrets] = useState([])
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [depenses, setDepenses] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [taches, setTaches] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // ─── ÉTAT DES FILTRES RÉACTIFS EN BARRE SUPÉRIEURE ───
  const [filterPeriod, setFilterPeriod] = useState('all') // 'all' | '2026' | '2025' | '2024'
  const [filterScope, setFilterScope] = useState('all') // 'all' | bienId
  const [filterType, setFilterType] = useState('all') // 'all' | 'Appartement' | 'Maison' | 'Studio' | ...
  const [filterStatut, setFilterStatut] = useState('all') // 'all' | 'loue' | 'vacant' | 'travaux' | 'projet'
  const [includeProjets, setIncludeProjets] = useState(true)

  // Modale d'exportation
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // ─── CHARGEMENT CONCURRENT COMPLET DES DONNÉES ───
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    const loadData = async () => {
      try {
        const [bi, pr, lo, ba, pa, de, ma, ta] = await Promise.all([
          Promise.resolve().then(() => getBiens()).catch(() => []),
          Promise.resolve().then(() => getProjets()).catch(() => []),
          Promise.resolve().then(() => getPrets()).catch(() => []),
          Promise.resolve().then(() => getBaux()).catch(() => []),
          Promise.resolve().then(() => getPaiements()).catch(() => []),
          Promise.resolve().then(() => getDepenses()).catch(() => []),
          Promise.resolve().then(() => getMaintenance()).catch(() => []),
          Promise.resolve().then(() => getTaches()).catch(() => [])
        ])

        if (isMounted) {
          setBiens(bi || [])
          setProjets(pr || [])
          setPrets(lo || [])
          setBaux(ba || [])
          setPaiements(pa || [])
          setDepenses(de || [])
          setMaintenance(ma || [])
          setTaches(ta || [])
          setIsLoading(false)
        }
      } catch (err) {
        console.error('[AnalysesRapports] Erreur de chargement des données:', err)
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [])

  // ─── FILTRAGE DES BIENS SELON LES SÉLECTIONS DE L'UTILISATEUR ───
  const filteredBiens = useMemo(() => {
    let list = [...biens]

    if (filterScope !== 'all') {
      list = list.filter(b => String(b.id) === String(filterScope))
    }

    if (filterType !== 'all') {
      list = list.filter(b => (b.type_bien || 'Appartement').toLowerCase() === filterType.toLowerCase())
    }

    if (filterStatut !== 'all') {
      list = list.filter(b => (b.statut || 'loue').toLowerCase() === filterStatut.toLowerCase())
    }

    if (!includeProjets) {
      list = list.filter(b => b.statut !== 'projet')
    }

    return list
  }, [biens, filterScope, filterType, filterStatut, includeProjets])

  // ─── CALCUL DES PERFORMANCES INDIVIDUELLES & GLOBALES ───
  const propertyPerformances = useMemo(() => {
    return filteredBiens.map(b => {
      const activeBail = baux.find(x => x.bien_id === b.id && x.statut === 'actif')
      const pret = prets.find(p => p.bien_id === b.id)
      const pretStatus = pret ? getLoanStatusAtDate(pret) : { capitalRestantDu: 0, mensualite: 0 }

      const depensesBien = depenses.filter(d => d.bien_id === b.id)
      const totalDepensesAnnuelles = depensesBien.reduce((s, d) => s + (d.montant || 0), 0)

      const loyerMensuel = activeBail ? (activeBail.loyer_mensuel || 0) : 0
      const chargesMensuelles = activeBail ? (activeBail.charges_mensuelles || 0) : Math.round(totalDepensesAnnuelles / 12)

      const prixAcq = b.prix_achat || b.valeur_estimee || 180000
      const fraisNotaire = Math.round(prixAcq * 0.08)
      const valeurActuelle = b.valeur_estimee || prixAcq

      const yieldData = calculatePropertyYield({
        prixAcquisition: prixAcq,
        fraisNotaire: fraisNotaire,
        travauxInitiaux: b.budget_prevision || 0,
        valeurActuelle: valeurActuelle,
        loyerMensuel: loyerMensuel,
        chargesMensuellesNonRecup: Math.round(chargesMensuelles * 0.4),
        taxeFonciereAnnuelle: Math.round(totalDepensesAnnuelles * 0.35) || 800,
        assurancePNOAnnuelle: 160,
        mensualitePret: pretStatus.mensualite,
        tauxVacancePct: b.statut === 'vacant' ? 100 : 3
      })

      return {
        bien: b,
        bail: activeBail,
        pret,
        valeurActuelle,
        loyerMensuel,
        chargesMensuelles: Math.round(yieldData.totalFraisExploitation / 12),
        detteRestante: pretStatus.capitalRestantDu,
        mensualiteCredit: pretStatus.mensualite,
        ...yieldData
      }
    })
  }, [filteredBiens, baux, prets, depenses])

  // ─── TOTAUX CONSOLIDÉS DU PATRIMOINE ───
  const valeurImmobiliereTotale = useMemo(() => {
    return propertyPerformances.reduce((s, p) => s + (p.valeurActuelle || 0), 0)
  }, [propertyPerformances])

  const detteTotaleRestante = useMemo(() => {
    return propertyPerformances.reduce((s, p) => s + (p.detteRestante || 0), 0)
  }, [propertyPerformances])

  const detteTotaleInitiale = useMemo(() => {
    return prets
      .filter(p => propertyPerformances.some(item => item.bien.id === p.bien_id))
      .reduce((s, p) => s + (p.montant_emprunt || p.montant || 0), 0)
  }, [prets, propertyPerformances])

  const patrimoineNet = Math.max(0, valeurImmobiliereTotale - detteTotaleRestante)

  const revenusLocatifsMensuels = useMemo(() => {
    return propertyPerformances.reduce((s, p) => s + (p.loyerMensuel || 0), 0)
  }, [propertyPerformances])

  const chargesMensuellesTotales = useMemo(() => {
    return propertyPerformances.reduce((s, p) => s + (p.chargesMensuelles || 0), 0)
  }, [propertyPerformances])

  const mensualitesCreditTotales = useMemo(() => {
    return propertyPerformances.reduce((s, p) => s + (p.mensualiteCredit || 0), 0)
  }, [propertyPerformances])

  const cashFlowMensuelTotal = revenusLocatifsMensuels - chargesMensuellesTotales - mensualitesCreditTotales
  const cashFlowAnnuelTotal = cashFlowMensuelTotal * 12

  const totalCapitauxInvestis = propertyPerformances.reduce((s, p) => s + (p.coutTotalInvestissement || 0), 0)
  const loyerAnnuelTotal = revenusLocatifsMensuels * 12
  const revenuNetExploitationAnnuel = propertyPerformances.reduce((s, p) => s + (p.revenuNetExploitation || 0), 0)

  const rendementGlobalBrut = totalCapitauxInvestis > 0 ? Number(((loyerAnnuelTotal / totalCapitauxInvestis) * 100).toFixed(2)) : 0
  const rendementGlobalNet = totalCapitauxInvestis > 0 ? Number(((revenuNetExploitationAnnuel / totalCapitauxInvestis) * 100).toFixed(2)) : 0

  // Plus-value latente globale
  const plusValueLatenteTotale = Math.max(0, valeurImmobiliereTotale - totalCapitauxInvestis)

  // Taux d'occupation locative
  const biensExploitables = filteredBiens.filter(b => b.statut !== 'projet')
  const biensLoues = biensExploitables.filter(b => b.statut === 'loue' || baux.some(x => x.bien_id === b.id && x.statut === 'actif'))
  const tauxOccupation = biensExploitables.length > 0 ? Math.round((biensLoues.length / biensExploitables.length) * 100) : 100

  // Taux moyen pondéré des crédits
  const pretsActifs = prets.filter(p => propertyPerformances.some(item => item.bien.id === p.bien_id))
  const sommeTauxPondere = pretsActifs.reduce((s, p) => s + ((p.taux_interet || p.taux || 0) * (p.montant_emprunt || p.montant || 0)), 0)
  const tauxMoyenPct = detteTotaleInitiale > 0 ? Number((sommeTauxPondere / detteTotaleInitiale).toFixed(2)) : 0

  const totalInteretsRestants = pretsActifs.reduce((s, p) => {
    const st = getLoanStatusAtDate(p)
    return s + (st.interetsRestants || 0)
  }, 0)

  const ltvRatio = valeurImmobiliereTotale > 0 ? Number(((detteTotaleRestante / valeurImmobiliereTotale) * 100).toFixed(1)) : 0

  // ─── DÉTECTION AUTOMATIQUE DES ALERTES PATRIMONIALES (SECTION À SURVEILLER) ───
  const watchlistAlerts = useMemo(() => {
    const alerts = []

    // 1. Biens vacants
    propertyPerformances.forEach(p => {
      if (p.bien.statut === 'vacant' || (p.bien.statut !== 'projet' && !p.bail && p.loyerMensuel === 0)) {
        alerts.push({
          level: 'critique',
          title: 'Bien vacant sans locataire',
          targetName: p.bien.nom,
          message: `Ce bien ne génère aucun revenu locatif actuellement (${formatEuro(p.chargesMensuelles)}/mois de charges fixes).`,
          actionLabel: 'Trouver un locataire',
          actionUrl: { page: 'baux' }
        })
      }
    })

    // 2. Cash-flow négatif important
    propertyPerformances.forEach(p => {
      if (p.cashFlowMensuelNet < -100 && p.bien.statut !== 'projet') {
        alerts.push({
          level: 'attention',
          title: 'Cash-Flow mensuel négatif',
          targetName: p.bien.nom,
          message: `Effort d'épargne de ${formatEuro(Math.abs(p.cashFlowMensuelNet))}/mois nécessaire pour couvrir les crédits et charges.`,
          actionLabel: 'Voir le bien',
          actionUrl: { page: 'bien', param: p.bien.id }
        })
      }
    })

    // 3. Rendement net inférieur à 3.5%
    propertyPerformances.forEach(p => {
      if (p.rendementNetPct > 0 && p.rendementNetPct < 3.5 && p.bien.statut === 'loue') {
        alerts.push({
          level: 'info',
          title: 'Rendement locatif faible (< 3.5%)',
          targetName: p.bien.nom,
          message: `Rendement net actuel de ${p.rendementNetPct}%. Envisager une revalorisation du loyer ou une optimisation des charges.`,
          actionLabel: 'Optimiser',
          actionUrl: { page: 'bien', param: p.bien.id }
        })
      }
    })

    // 4. Tickets de maintenance urgents
    const ticketsUrgents = maintenance.filter(m => m.statut !== 'resolu' && (m.priorite === 'haute' || m.priorite === 'urgente'))
    ticketsUrgents.forEach(t => {
      alerts.push({
        level: 'critique',
        title: `Maintenance urgente : ${t.titre}`,
        targetName: t.bien_nom || 'Bien rattaché',
        message: t.description || 'Intervention prioritaire requise pour éviter des dégradations.',
        actionLabel: 'Gérer le ticket',
        actionUrl: { page: 'maintenance' }
      })
    })

    // 5. Projets en retard ou budget dépassé
    projets.forEach(pr => {
      if (pr.budget_consomme && pr.budget_prevision && pr.budget_consomme > pr.budget_prevision) {
        alerts.push({
          level: 'attention',
          title: `Dépassement de budget projet`,
          targetName: pr.nom,
          message: `Budget dépassé de ${formatEuro(pr.budget_consomme - pr.budget_prevision)} sur ce chantier.`,
          actionLabel: 'Voir le projet',
          actionUrl: { page: 'projets' }
        })
      }
    })

    return alerts
  }, [propertyPerformances, maintenance, projets])

  // Bien le plus performant
  const topProperty = useMemo(() => {
    if (propertyPerformances.length === 0) return null
    return [...propertyPerformances].sort((a, b) => (b.rendementNetPct || b.rendementBrutPct) - (a.rendementNetPct || a.rendementBrutPct))[0]
  }, [propertyPerformances])

  return (
    <div className="page-content">
      {/* ── A. BARRE SUPÉRIEURE D'ANALYSE & FILTRES ── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>Analyses & Rapports Patrimoniaux</h2>
          <p className="page-subtitle">
            Vue consolidée de votre patrimoine, de sa performance et de vos projets
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setExportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Icon name="download" size={15} /> Exporter le rapport
          </button>
        </div>
      </div>

      {/* ── FILTRES RÉACTIFS SUR LE PATRIMOINE ── */}
      <div className="card" style={{
        padding: '12px 18px',
        marginBottom: 20,
        background: '#fff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="filter" size={14} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Filtres :</span>
          </div>

          {/* Période */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Période : Tout l'historique</option>
            <option value="2026">Année : 2026</option>
            <option value="2025">Année : 2025</option>
            <option value="2024">Année : 2024</option>
          </select>

          {/* Périmètre (Bien spécifique ou Tout le patrimoine) */}
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Périmètre : Tout le patrimoine ({biens.length})</option>
            {biens.map(b => (
              <option key={b.id} value={b.id}>{b.nom}</option>
            ))}
          </select>

          {/* Type de bien */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Type : Tous</option>
            <option value="Appartement">Appartement</option>
            <option value="Maison">Maison</option>
            <option value="Studio">Studio</option>
            <option value="Immeuble">Immeuble</option>
            <option value="Local commercial">Local commercial</option>
            <option value="Parking">Parking</option>
          </select>

          {/* Statut */}
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Statut : Tous</option>
            <option value="loue">Loué</option>
            <option value="vacant">Vacant</option>
            <option value="projet">Projet</option>
          </select>
        </div>

        {/* Checkbox Inclure les projets */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: '#0f172a',
          cursor: 'pointer',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={includeProjets}
            onChange={(e) => setIncludeProjets(e.target.checked)}
            style={{ accentColor: '#4f46e5', cursor: 'pointer' }}
          />
          Inclure les projets en cours
        </label>
      </div>

      {/* ── B. KPIS PRINCIPAUX ── */}
      <div style={{ marginBottom: 24 }}>
        <PatrimoineKPICards
          patrimoineNet={patrimoineNet}
          valeurImmobiliere={valeurImmobiliereTotale}
          detteRestante={detteTotaleRestante}
          rendementGlobalNet={rendementGlobalNet}
          rendementGlobalBrut={rendementGlobalBrut}
          cashFlowMensuel={cashFlowMensuelTotal}
          cashFlowAnnuel={cashFlowAnnuelTotal}
          nbBiens={filteredBiens.length}
          nbPrets={pretsActifs.length}
        />
      </div>

      {/* ── C. ÉVOLUTION DU PATRIMOINE + PERFORMANCE ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        marginBottom: 24
      }}>
        <div>
          <PatrimoineEvolutionChart
            currentValue={valeurImmobiliereTotale}
            currentDebt={detteTotaleRestante}
          />
        </div>

        <div>
          <PerformanceCard
            rendementBrut={rendementGlobalBrut}
            rendementNet={rendementGlobalNet}
            roi={totalCapitauxInvestis > 0 ? Number(((cashFlowAnnuelTotal / (patrimoineNet || 1)) * 100).toFixed(1)) : 0}
            cashFlowAnnuel={cashFlowAnnuelTotal}
            plusValueLatente={plusValueLatenteTotale}
            tauxOccupation={tauxOccupation}
            totalCapitauxInvestis={totalCapitauxInvestis}
          />
        </div>
      </div>

      {/* ── D. DÉCOMPOSITION DU CASH-FLOW ── */}
      <div style={{ marginBottom: 24 }}>
        <CashFlowBreakdown
          revenusLocatifsMensuels={revenusLocatifsMensuels}
          chargesMensuelles={chargesMensuellesTotales}
          mensualitesCredit={mensualitesCreditTotales}
        />
      </div>

      {/* ── E. DETTE + RÉPARTITION DU PATRIMOINE ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        marginBottom: 24
      }}>
        <div>
          <DebtCard
            detteTotaleInitiale={detteTotaleInitiale}
            capitalRestantDu={detteTotaleRestante}
            mensualitesTotales={mensualitesCreditTotales}
            tauxMoyenPct={tauxMoyenPct}
            dureeRestanteMoisMoyenne={180}
            interetsRestants={totalInteretsRestants}
            valeurImmobiliereTotale={valeurImmobiliereTotale}
            nbPrets={pretsActifs.length}
          />
        </div>

        <div>
          <PatrimoineDistribution biens={filteredBiens} />
        </div>
      </div>

      {/* ── F. PERFORMANCE DÉTAILLÉE DES BIENS (TABLEAU) ── */}
      <div style={{ marginBottom: 24 }}>
        <PropertyPerformanceTable
          propertyPerformances={propertyPerformances}
          onNavigate={onNavigate}
        />
      </div>

      {/* ── G. À SURVEILLER + PROJETS IMMOBILIERS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        marginBottom: 24
      }}>
        <div>
          <WatchlistAlerts
            alerts={watchlistAlerts}
            onNavigate={onNavigate}
          />
        </div>

        <div>
          <ProjetsPatrimoineCard
            projets={projets}
            patrimoineActuel={patrimoineNet}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* ── H. ANALYSE AUTOMATIQUE KEYFOLIO ── */}
      <div style={{ marginBottom: 24 }}>
        <KeyFolioAnalysisCard
          patrimoineNet={patrimoineNet}
          valeurTotale={valeurImmobiliereTotale}
          topProperty={topProperty}
          cashFlowMensuel={cashFlowMensuelTotal}
          ltv={ltvRatio}
          tauxOccupation={tauxOccupation}
          nbProjets={projets.length}
        />
      </div>

      {/* ── MODALE D'EXPORTATION DE RAPPORTS ── */}
      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        biens={filteredBiens}
        propertyPerformances={propertyPerformances}
        kpis={{
          patrimoineNet,
          valeurImmobiliereTotale,
          detteTotaleRestante,
          cashFlowMensuelTotal,
          rendementGlobalNet
        }}
        dette={{
          detteTotaleInitiale,
          capitalRestantDu: detteTotaleRestante,
          tauxMoyenPct
        }}
      />
    </div>
  )
}
