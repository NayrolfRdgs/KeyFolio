// KeyFolio — Moteur de calculs financiers immobiliers
// Calculs de prêts, amortissements, rendements, cash-flow et simulations

/**
 * Calcule la mensualité d'un crédit immobilier (hors assurance et avec assurance)
 * @param {number} montantEmprunt - Montant total emprunté
 * @param {number} tauxAnnuelPct - Taux d'intérêt annuel en % (ex: 3.5 pour 3.5%)
 * @param {number} dureeAnnees - Durée du prêt en années (ex: 20)
 * @param {number} tauxAssurancePct - Taux annuel d'assurance en % (ex: 0.36%)
 */
export function calculateLoanMonthly({ montantEmprunt, tauxAnnuelPct, dureeAnnees, tauxAssurancePct = 0 }) {
  if (!montantEmprunt || montantEmprunt <= 0 || !dureeAnnees || dureeAnnees <= 0) {
    return {
      mensualiteHorsAssurance: 0,
      mensualiteAssurance: 0,
      mensualiteTotale: 0,
      coutInteretsTotal: 0,
      coutAssuranceTotal: 0,
      coutTotalCredit: 0,
      nbMois: 0
    }
  }

  const nbMois = Math.round(dureeAnnees * 12)
  const tauxMensuel = (tauxAnnuelPct || 0) / 100 / 12
  const mensualiteAssurance = (montantEmprunt * ((tauxAssurancePct || 0) / 100)) / 12

  let mensualiteHorsAssurance = 0
  if (tauxMensuel === 0) {
    mensualiteHorsAssurance = montantEmprunt / nbMois
  } else {
    mensualiteHorsAssurance = (montantEmprunt * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois))
  }

  const coutInteretsTotal = (mensualiteHorsAssurance * nbMois) - montantEmprunt
  const coutAssuranceTotal = mensualiteAssurance * nbMois
  const coutTotalCredit = coutInteretsTotal + coutAssuranceTotal
  const mensualiteTotale = mensualiteHorsAssurance + mensualiteAssurance

  return {
    mensualiteHorsAssurance: Math.round(mensualiteHorsAssurance * 100) / 100,
    mensualiteAssurance: Math.round(mensualiteAssurance * 100) / 100,
    mensualiteTotale: Math.round(mensualiteTotale * 100) / 100,
    coutInteretsTotal: Math.max(0, Math.round(coutInteretsTotal * 100) / 100),
    coutAssuranceTotal: Math.round(coutAssuranceTotal * 100) / 100,
    coutTotalCredit: Math.max(0, Math.round(coutTotalCredit * 100) / 100),
    nbMois
  }
}

/**
 * Génère le tableau d'amortissement complet mois par mois
 */
export function generateAmortizationSchedule({
  montantEmprunt,
  tauxAnnuelPct,
  dureeAnnees,
  tauxAssurancePct = 0,
  dateDebut = new Date().toISOString().split('T')[0]
}) {
  const { mensualiteHorsAssurance, mensualiteAssurance, nbMois } = calculateLoanMonthly({
    montantEmprunt,
    tauxAnnuelPct,
    dureeAnnees,
    tauxAssurancePct
  })

  if (nbMois === 0) return []

  const tauxMensuel = (tauxAnnuelPct || 0) / 100 / 12
  let capitalRestant = montantEmprunt
  const schedule = []

  const startDate = new Date(dateDebut)

  for (let mois = 1; mois <= nbMois; mois++) {
    const interets = capitalRestant * tauxMensuel
    const capitalAmorti = Math.min(capitalRestant, mensualiteHorsAssurance - interets)
    capitalRestant = Math.max(0, capitalRestant - capitalAmorti)

    const dateMois = new Date(startDate.getFullYear(), startDate.getMonth() + (mois - 1), 1)
    const dateStr = `${dateMois.getFullYear()}-${String(dateMois.getMonth() + 1).padStart(2, '0')}`

    schedule.push({
      numeroMois: mois,
      date: dateStr,
      mensualiteTotale: Math.round((mensualiteHorsAssurance + mensualiteAssurance) * 100) / 100,
      capitalAmorti: Math.round(capitalAmorti * 100) / 100,
      interets: Math.round(interets * 100) / 100,
      assurance: Math.round(mensualiteAssurance * 100) / 100,
      capitalRestantDu: Math.round(capitalRestant * 100) / 100
    })
  }

  return schedule
}

/**
 * Calcule l'état actuel d'un prêt à une date donnée
 */
export function getLoanStatusAtDate(loan, targetDate = new Date()) {
  const schedule = generateAmortizationSchedule({
    montantEmprunt: loan.montant_emprunt || loan.montant || 0,
    tauxAnnuelPct: loan.taux_interet || loan.taux || 0,
    dureeAnnees: (loan.duree_mois ? loan.duree_mois / 12 : loan.duree_annees) || 20,
    tauxAssurancePct: loan.taux_assurance || 0,
    dateDebut: loan.date_debut || loan.date || '2020-01-01'
  })

  if (!schedule.length) {
    return {
      capitalRestantDu: loan.montant_emprunt || 0,
      capitalRembourse: 0,
      interetsPayes: 0,
      interetsRestants: 0,
      pourcentageRembourse: 0,
      mensualite: 0
    }
  }

  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
  const pastItems = schedule.filter(s => s.date <= targetDateStr)
  const lastPast = pastItems[pastItems.length - 1]

  const capitalRestantDu = lastPast ? lastPast.capitalRestantDu : (loan.montant_emprunt || 0)
  const capitalRembourse = (loan.montant_emprunt || 0) - capitalRestantDu
  const interetsPayes = pastItems.reduce((acc, s) => acc + s.interets, 0)
  const totalInterets = schedule.reduce((acc, s) => acc + s.interets, 0)
  const interetsRestants = Math.max(0, totalInterets - interetsPayes)
  const pourcentageRembourse = loan.montant_emprunt ? Math.min(100, Math.round((capitalRembourse / loan.montant_emprunt) * 100)) : 0

  return {
    capitalRestantDu: Math.round(capitalRestantDu),
    capitalRembourse: Math.round(capitalRembourse),
    interetsPayes: Math.round(interetsPayes),
    interetsRestants: Math.round(interetsRestants),
    pourcentageRembourse,
    mensualite: schedule[0]?.mensualiteTotale || 0
  }
}

/**
 * Calcul complet des rendements et cash-flow pour un bien ou portefeuille
 */
export function calculatePropertyYield({
  prixAcquisition = 0,
  fraisNotaire = 0,
  travauxInitiaux = 0,
  valeurActuelle = 0,
  loyerMensuel = 0,
  chargesMensuellesNonRecup = 0,
  taxeFonciereAnnuelle = 0,
  assurancePNOAnnuelle = 0,
  fraisGestionAnnuels = 0,
  mensualitePret = 0,
  tauxVacancePct = 0
}) {
  const coutTotalInvestissement = (prixAcquisition || 0) + (fraisNotaire || 0) + (travauxInitiaux || 0) || (valeurActuelle || 1)
  
  // Revenus annuels bruts corrigés de la vacance locative
  const loyerAnnuelTheorique = (loyerMensuel || 0) * 12
  const perteVacance = loyerAnnuelTheorique * ((tauxVacancePct || 0) / 100)
  const loyerAnnuelEffectif = loyerAnnuelTheorique - perteVacance

  // Charges annuelles non récupérables
  const chargesAnnuelles = (chargesMensuellesNonRecup || 0) * 12
  const totalFraisExploitation = chargesAnnuelles + (taxeFonciereAnnuelle || 0) + (assurancePNOAnnuelle || 0) + (fraisGestionAnnuels || 0)

  // Revenu net d'exploitation
  const revenuNetExploitation = loyerAnnuelEffectif - totalFraisExploitation

  // Rendements
  const rendementBrutPct = coutTotalInvestissement > 0
    ? ((loyerAnnuelTheorique / coutTotalInvestissement) * 100)
    : 0

  const rendementNetPct = coutTotalInvestissement > 0
    ? ((revenuNetExploitation / coutTotalInvestissement) * 100)
    : 0

  // Cash-flow avec financement
  const chargeFinanciereAnnuelle = (mensualitePret || 0) * 12
  const cashFlowAnnuelNet = revenuNetExploitation - chargeFinanciereAnnuelle
  const cashFlowMensuelNet = cashFlowAnnuelNet / 12

  // Plus-value latente estimée
  const plusValueEstimee = valeurActuelle > 0 && coutTotalInvestissement > 0
    ? (valeurActuelle - coutTotalInvestissement)
    : 0

  return {
    coutTotalInvestissement: Math.round(coutTotalInvestissement),
    loyerAnnuelTheorique: Math.round(loyerAnnuelTheorique),
    loyerAnnuelEffectif: Math.round(loyerAnnuelEffectif),
    totalFraisExploitation: Math.round(totalFraisExploitation),
    revenuNetExploitation: Math.round(revenuNetExploitation),
    rendementBrutPct: Number(rendementBrutPct.toFixed(2)),
    rendementNetPct: Number(rendementNetPct.toFixed(2)),
    cashFlowMensuelNet: Math.round(cashFlowMensuelNet),
    cashFlowAnnuelNet: Math.round(cashFlowAnnuelNet),
    plusValueEstimee: Math.round(plusValueEstimee),
    mensualitePret: Math.round(mensualitePret)
  }
}

/**
 * Calculateur de scénario : Location Saisonnière
 */
export function calculateSeasonalScenario({
  coutTotalProjet = 0,
  prixNuitMoyen = 100,
  tauxOccupationPct = 60,
  fraisMenageEtPlateformePct = 20,
  chargesFixesAnnuelles = 1500,
  mensualitePret = 0
}) {
  const nbNuitsTotal = 365
  const nuitsLouees = Math.round(nbNuitsTotal * (tauxOccupationPct / 100))
  const CA_Annuel = nuitsLouees * prixNuitMoyen
  const commissionsEtFrais = CA_Annuel * (fraisMenageEtPlateformePct / 100)
  const revenuNet = CA_Annuel - commissionsEtFrais - chargesFixesAnnuelles
  const detteAnnuelle = (mensualitePret || 0) * 12
  const cashFlowAnnuel = revenuNet - detteAnnuelle
  const rendementBrut = coutTotalProjet > 0 ? (CA_Annuel / coutTotalProjet) * 100 : 0
  const rendementNet = coutTotalProjet > 0 ? (revenuNet / coutTotalProjet) * 100 : 0

  return {
    nuitsLouees,
    chiffreAffairesAnnuel: Math.round(CA_Annuel),
    revenuMensuelMoyen: Math.round(CA_Annuel / 12),
    fraisExploitation: Math.round(commissionsEtFrais + chargesFixesAnnuelles),
    revenuNet: Math.round(revenuNet),
    cashFlowMensuel: Math.round(cashFlowAnnuel / 12),
    cashFlowAnnuel: Math.round(cashFlowAnnuel),
    rendementBrut: Number(rendementBrut.toFixed(2)),
    rendementNet: Number(rendementNet.toFixed(2))
  }
}

/**
 * Calculateur de scénario : Revente / Opération marchand de biens
 */
export function calculateFlippingScenario({
  prixAchat = 0,
  fraisNotaireAchat = 0,
  budgetTravaux = 0,
  fraisPortageCredit = 0,
  dureeMois = 12,
  prixReventeEstime = 0,
  fraisAgenceRevente = 0,
  apportPersonnel = 0
}) {
  const coutTotalOperation = (prixAchat || 0) + (fraisNotaireAchat || 0) + (budgetTravaux || 0) + (fraisPortageCredit || 0)
  const netVendeur = (prixReventeEstime || 0) - (fraisAgenceRevente || 0)
  const margeNette = netVendeur - coutTotalOperation
  const rentabiliteCoutTotalPct = coutTotalOperation > 0 ? (margeNette / coutTotalOperation) * 100 : 0
  const rentabiliteFondsPropresPct = (apportPersonnel || 0) > 0 ? (margeNette / apportPersonnel) * 100 : rentabiliteCoutTotalPct

  return {
    coutTotalOperation: Math.round(coutTotalOperation),
    netVendeur: Math.round(netVendeur),
    margeNette: Math.round(margeNette),
    rentabiliteCoutTotalPct: Number(rentabiliteCoutTotalPct.toFixed(2)),
    rentabiliteFondsPropresPct: Number(rentabiliteFondsPropresPct.toFixed(2)),
    dureeMois
  }
}
