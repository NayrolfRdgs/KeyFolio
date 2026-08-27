import { jsPDF } from 'jspdf'
import { formatEuro, formatDate, todayISO } from './utils'
import { buildDataContext } from './pdfTemplateEngine'
import {
  KF_COLORS,
  drawDocHeader,
  drawPageReminderHeader,
  drawDocFooter,
  drawSectionTitle,
  drawPersonCards,
  drawPropertyMetrics,
  drawFinancialSummary,
  drawNumberedClauses,
  drawSignatureBlocks
} from './pdfDesignSystem'

function generateDocRef(prefix = 'KF', id = null) {
  const year = new Date().getFullYear()
  const randomNum = id ? String(id).padStart(4, '0') : Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${year}-${randomNum}`
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 1. CONTRAT DE LOCATION D'HABITATION (LOI ALUR / DÉCRET 2015-587)
 * ═══════════════════════════════════════════════════════════════
 */
export function buildContratBailPDF({
  bail, bien, locataire,
  bailleurNom = '',
  bailleurAdresse = '',
  bailleurEmail = '',
  bailleurTelephone = '',
  typeBail = 'meuble',
  dateDebut = '',
  dateFin = '',
  loyerHC = 0,
  charges = 0,
  depotGarantie = 0,
  jourPaiement = 5,
  clauseIRL = true,
  elecEntree = '',
  eauEntree = '',
  gazEntree = '',
  equipements = '',
  clausesParticulieres = ''
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = generateDocRef('KF-BAIL', bail?.id || bien?.id)
  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}`.trim() : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const bienAdresse = bien?.adresse || bail?.bien_adresse || 'Adresse du logement'
  const isMeuble = typeBail === 'meuble' || typeBail === 'etudiant' || typeBail === 'mobilite'
  const dureeTexte = isMeuble
    ? (typeBail === 'etudiant' ? '9 mois' : typeBail === 'mobilite' ? '1 à 10 mois' : '1 an (tacitement reconductible)')
    : '3 ans (tacitement reconductible)'
  const totalLoyer = parseFloat(loyerHC || 0) + parseFloat(charges || 0)

  // ─────────────────────────────────────────────────────────────
  // PAGE 1 : EN-TÊTE, PARTIES, LOGEMENT & CONDITIONS FINANCIÈRES
  // ─────────────────────────────────────────────────────────────
  let y = drawDocHeader(doc, {
    title: 'CONTRAT DE LOCATION',
    subtitle: isMeuble ? "Bail meublé — Loi ALUR (Décret n° 2015-587)" : "Bail nu — Loi du 6 juillet 1989",
    reference: ref,
    bienAdresse: bienAdresse,
    bienSurface: bien?.surface_m2 || '',
    bienType: isMeuble ? 'Meublé' : 'Nu',
    dateDoc: dateDebut || todayISO(),
    accentColor: KF_COLORS.primary
  })

  // 01 — DÉSIGNATION DES PARTIES
  y = drawSectionTitle(doc, { number: '01', title: 'Désignation des Parties Contractantes', startY: y, accentColor: KF_COLORS.primary })
  y = drawPersonCards(doc, {
    bailleur: {
      nom: bailleurNom || 'Bailleur / Propriétaire',
      adresse: bailleurAdresse,
      telephone: bailleurTelephone,
      email: bailleurEmail
    },
    locataire: {
      nom: locataireFullName,
      adresse: bienAdresse,
      profession: locataire?.profession || 'Locataire principal',
      telephone: locataire?.telephone || bail?.locataire_telephone || '',
      email: locataire?.email || bail?.locataire_email || ''
    },
    startY: y,
    accentColor: KF_COLORS.primary
  })

  // 02 — LE LOGEMENT & DÉSIGNATION
  y = drawSectionTitle(doc, { number: '02', title: 'Objet du Contrat & Locaux Loués', startY: y, accentColor: KF_COLORS.primary })
  y = drawPropertyMetrics(doc, {
    adresse: bienAdresse,
    surface: bien?.surface_m2 || '',
    pieces: bien?.nb_pieces || '2',
    typeBien: bien?.type_bien || 'Appartement',
    regime: isMeuble ? '🛋️ Meublé (1 an)' : '🏢 Nu (3 ans)',
    dateEffet: dateDebut || todayISO(),
    startY: y
  })

  // 03 — CONDITIONS FINANCIÈRES
  y = drawSectionTitle(doc, { number: '03', title: 'Conditions Financières & Dépôt de Garantie', startY: y, accentColor: KF_COLORS.primary })
  y = drawFinancialSummary(doc, {
    loyerHC: parseFloat(loyerHC || 0),
    charges: parseFloat(charges || 0),
    total: totalLoyer,
    depotGarantie: parseFloat(depotGarantie || 0),
    jourPaiement: parseInt(jourPaiement || 5),
    startY: y,
    accentColor: KF_COLORS.primary
  })

  drawDocFooter(doc, { pageNum: 1, totalPages: 3, reference: ref })

  // ─────────────────────────────────────────────────────────────
  // PAGE 2 : CONDITIONS GÉNÉRALES & CLAUSES DU BAIL
  // ─────────────────────────────────────────────────────────────
  doc.addPage()
  y = drawPageReminderHeader(doc, {
    title: 'Contrat de location',
    reference: ref,
    bienAdresse: bienAdresse,
    locataireNom: locataireFullName,
    accentColor: KF_COLORS.primary
  })

  y = drawSectionTitle(doc, { number: '04', title: 'Clauses & Conditions Générales du Contrat', startY: y, accentColor: KF_COLORS.primary })

  const clausesList = [
    {
      title: 'Prise d\'effet et durée du contrat',
      text: `Le présent contrat prend effet le ${formatDate(dateDebut || todayISO())}. Il est consenti pour une durée légale de ${dureeTexte}. À l'expiration de cette période, le bail se renouvelle tacitement par périodes de même durée, sous réserve des règles de congé légal.`
    },
    {
      title: 'Modalités de paiement du loyer et révision IRL',
      text: `Le loyer mensuel de ${formatEuro(loyerHC)} hors charges, majoré de la provision de ${formatEuro(charges)} pour charges locatives, est payable d'avance le ${jourPaiement} de chaque mois. ${clauseIRL ? "Le loyer fera l'objet d'une révision annuelle automatique à chaque date anniversaire selon la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE." : "Le loyer reste fixe sans révision contractuelle."}`
    },
    {
      title: 'Destination et usage exclusif des lieux',
      text: 'Les locaux loués sont destinés exclusivement à l\'habitation principale du preneur. Toute transformation substantielle, cession de bail ou sous-location totale ou partielle est strictement interdite sans accord écrit et préalable du bailleur.'
    },
    {
      title: 'Entretien, réparations locatives et jouissance paisible',
      text: 'Le locataire est tenu de maintenir les lieux en bon état d\'entretien locatif et d\'effectuer les menues réparations à sa charge (décret n° 87-712). Il s\'engage à respecter la tranquillité de l\'immeuble et le règlement de copropriété en vigueur.'
    },
    {
      title: 'Dépôt de garantie et restitution',
      text: `Un dépôt de garantie de ${formatEuro(depotGarantie)} est versé à la signature. Il sera restitué dans un délai légal maximal d'un mois (si l'état des lieux de sortie est conforme) ou de deux mois (en cas de dégradations constatées), déduction faite des sommes restant dues au bailleur.`
    },
    {
      title: 'Index et relevés des compteurs à la remise des clés',
      text: `Relevés d'entrée — Électricité : ${elecEntree || 'Relevé à l\'entrée'} kWh | Eau froide : ${eauEntree || 'Relevé à l\'entrée'} m³ | Gaz : ${gazEntree || 'Non raccordé / Relevé'} m³.`
    }
  ]

  if (isMeuble && equipements) {
    clausesList.push({
      title: 'Inventaire des équipements et mobilier (Loi ALUR)',
      text: `Mobilier et équipements mis à disposition : ${equipements}`
    })
  }

  if (clausesParticulieres) {
    clausesList.push({
      title: 'Conditions particulières convenues entre les parties',
      text: clausesParticulieres
    })
  }

  y = drawNumberedClauses(doc, { clauses: clausesList, startY: y, accentColor: KF_COLORS.primary })
  drawDocFooter(doc, { pageNum: 2, totalPages: 3, reference: ref })

  // ─────────────────────────────────────────────────────────────
  // PAGE 3 : ANNEXES & SIGNATURES CONTRADICTOIRES
  // ─────────────────────────────────────────────────────────────
  doc.addPage()
  y = drawPageReminderHeader(doc, {
    title: 'Contrat de location — Signatures',
    reference: ref,
    bienAdresse: bienAdresse,
    locataireNom: locataireFullName,
    accentColor: KF_COLORS.primary
  })

  y = drawSectionTitle(doc, { number: '05', title: 'Dossier de Diagnostic & Annexes Obligatoires', startY: y, accentColor: KF_COLORS.primary })

  // Carte des annexes
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 182, 38, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text('DOCUMENTS ANNEXÉS AU PRÉSENT CONTRAT :', 20, y + 6)

  const annexes = [
    '✓ Notice d\'information relative aux droits et obligations des locataires et bailleurs',
    '✓ Dossier de Diagnostic Technique (DPE, Constat de risque d\'exposition au plomb, ERP, Amiante)',
    '✓ État des lieux contradictoire d\'entrée et inventaire détaillé du mobilier (si meublé)',
    '✓ Extrait du règlement de copropriété concernant la destination des parties privatives'
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF_COLORS.body)
  annexes.forEach((a, i) => {
    doc.text(a, 20, y + 13 + i * 5.5)
  })

  y += 46

  // 06 — SIGNATURES CONTRADICTOIRES
  y = drawSectionTitle(doc, { number: '06', title: 'Signatures et Paraphes des Parties', startY: y, accentColor: KF_COLORS.primary })
  drawSignatureBlocks(doc, {
    bailleurNom: bailleurNom || 'Bailleur',
    locataireNom: locataireFullName,
    dateDoc: dateDebut || todayISO(),
    lieu: `Fait à ${bienAdresse ? bienAdresse.split(',').pop().trim() : 'Paris'}`,
    startY: y
  })

  drawDocFooter(doc, { pageNum: 3, totalPages: 3, reference: ref })

  return doc
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 2. ÉTAT DES LIEUX CONTRADICTOIRE (DÉCRET N° 2016-382)
 * ═══════════════════════════════════════════════════════════════
 */
export function buildEtatDesLieuxPDF({
  bail, bien, locataire,
  typeEdl = 'sortie',
  bailleurNom = '',
  bailleurAdresse = '',
  dateEdl = '',
  elecIndex = '',
  eauIndex = '',
  gazIndex = '',
  clesRemises = '',
  depotGarantieInitial = 0,
  montantRetenu = 0,
  motifRetenue = '',
  pieces = [],
  observationsGenerales = ''
}) {
  const isEntree = typeEdl === 'entree'
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const accentColor = isEntree ? KF_COLORS.success : KF_COLORS.accent
  const ref = generateDocRef(isEntree ? 'KF-EDL-IN' : 'KF-EDL-OUT', bail?.id || bien?.id)

  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}`.trim() : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const bienAdresse = bien?.adresse || bail?.bien_adresse || 'Adresse du logement'
  const soldeRestitue = Math.max(0, parseFloat(depotGarantieInitial || 0) - parseFloat(montantRetenu || 0))

  // ─────────────────────────────────────────────────────────────
  // PAGE 1 : EN-TÊTE, PARTIES, COMPTEURS & GRILLE DES PIÈCES
  // ─────────────────────────────────────────────────────────────
  let y = drawDocHeader(doc, {
    title: isEntree ? "ÉTAT DES LIEUX D'ENTRÉE" : "ÉTAT DES LIEUX DE SORTIE",
    subtitle: 'Document contradictoire officiel — Décret n° 2016-382',
    reference: ref,
    bienAdresse: bienAdresse,
    bienSurface: bien?.surface_m2 || '',
    bienType: bail?.type_bail === 'meuble' ? 'Meublé' : 'Nu',
    dateDoc: dateEdl || todayISO(),
    accentColor: accentColor
  })

  // 01 — DÉSIGNATION DES PARTIES
  y = drawSectionTitle(doc, { number: '01', title: 'Parties & Logement', startY: y, accentColor })
  y = drawPersonCards(doc, {
    bailleur: { nom: bailleurNom || 'Bailleur / Propriétaire', adresse: bailleurAdresse },
    locataire: { nom: locataireFullName, roleLabel: isEntree ? 'LOCATAIRE ENTRANT' : 'LOCATAIRE SORTANT' },
    startY: y,
    accentColor
  })

  // 02 — COMPTEURS & CLÉS
  y = drawSectionTitle(doc, { number: '02', title: isEntree ? 'Compteurs & Remise des Clés' : 'Compteurs & Restitution des Clés', startY: y, accentColor })
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 182, 22, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(`INDEX DES COMPTEURS :  Électricité : ${elecIndex || '—'} kWh   ·   Eau froide : ${eauIndex || '—'} m³   ·   Gaz : ${gazIndex || '—'} m³`, 20, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF_COLORS.body)
  doc.text(`Moyens d'accès et clés remis : ${clesRemises || '2 jeux complets de clés et badges'}`, 20, y + 14)

  y += 28

  // 03 — ÉTAT DÉTAILLÉ DES PIÈCES
  y = drawSectionTitle(doc, { number: '03', title: 'Constat Détaillé par Pièce', startY: y, accentColor })

  // En-tête de tableau
  const tableX = 14
  const col1W = 55
  const col2W = 40
  const col3W = 87
  const rowH = 6

  doc.setFillColor(...KF_COLORS.bgBadge)
  doc.rect(tableX, y, 182, rowH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text('PIÈCE / ESPACE', tableX + 3, y + 4.2)
  doc.text('ÉTAT CONSTATÉ', tableX + col1W + 3, y + 4.2)
  doc.text('OBSERVATIONS & ÉQUIPEMENTS', tableX + col1W + col2W + 3, y + 4.2)
  y += rowH

  const piecesToShow = pieces.slice(0, 7)
  piecesToShow.forEach((p, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252)
    doc.rect(tableX, y, 182, rowH, 'F')
    doc.setDrawColor(...KF_COLORS.border)
    doc.line(tableX, y + rowH, tableX + 182, y + rowH)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...KF_COLORS.dark)
    doc.text(p.nom || 'Pièce', tableX + 3, y + 4.2)

    doc.setFont('helvetica', 'normal')
    doc.text(p.etat || 'Bon état', tableX + col1W + 3, y + 4.2)
    doc.setTextColor(...KF_COLORS.body)
    doc.text(p.obs || 'RAS', tableX + col1W + col2W + 3, y + 4.2)

    y += rowH
  })

  drawDocFooter(doc, { pageNum: 1, totalPages: 2, reference: ref })

  // ─────────────────────────────────────────────────────────────
  // PAGE 2 : SYNTHÈSE FINANCIÈRE, OBSERVATIONS & SIGNATURES
  // ─────────────────────────────────────────────────────────────
  doc.addPage()
  y = drawPageReminderHeader(doc, {
    title: isEntree ? "État des lieux d'entrée" : "État des lieux de sortie",
    reference: ref,
    bienAdresse: bienAdresse,
    locataireNom: locataireFullName,
    accentColor
  })

  // 04 — SYNTHÈSE DU DÉPÔT DE GARANTIE
  y = drawSectionTitle(doc, { number: '04', title: isEntree ? 'Dépôt de Garantie Encaissé' : 'Restitution & Solde de Caution', startY: y, accentColor })

  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 182, isEntree ? 20 : 34, 3, 3, 'FD')

  if (isEntree) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...KF_COLORS.dark)
    doc.text(`Dépôt de garantie versé à l'entrée : ${formatEuro(depotGarantieInitial)}`, 22, y + 11)
    y += 26
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...KF_COLORS.body)
    doc.text(`Dépôt de garantie initial versé : ${formatEuro(depotGarantieInitial)}`, 22, y + 7)
    doc.text(`Retenue pour réparations / remise en état : ${formatEuro(montantRetenu)} ${motifRetenue ? `(${motifRetenue})` : ''}`, 22, y + 13)

    // Solde net restitué mis en avant
    doc.setFillColor(...KF_COLORS.successLight)
    doc.roundedRect(22, y + 17, 166, 12, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...KF_COLORS.success)
    doc.text('SOLDE NET À RESTITUER AU LOCATAIRE :', 26, y + 24.5)
    doc.setFontSize(10.5)
    doc.text(formatEuro(soldeRestitue), 180, y + 24.5, { align: 'right' })
    y += 40
  }

  // 05 — OBSERVATIONS GÉNÉRALES
  y = drawSectionTitle(doc, { number: '05', title: 'Observations Générales & Remarques', startY: y, accentColor })
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 182, 24, 3, 3, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF_COLORS.body)
  const obsLines = doc.splitTextToSize(observationsGenerales || 'Aucune observation complémentaire. Logement et équipements inspectés contradictoirement.', 174)
  doc.text(obsLines, 20, y + 6)
  y += 30

  // 06 — SIGNATURES CONTRADICTOIRES
  y = drawSectionTitle(doc, { number: '06', title: 'Signatures Contradictoires', startY: y, accentColor })
  drawSignatureBlocks(doc, {
    bailleurNom: bailleurNom || 'Bailleur',
    locataireNom: locataireFullName,
    dateDoc: dateEdl || todayISO(),
    lieu: `Fait à ${bienAdresse ? bienAdresse.split(',').pop().trim() : 'Paris'}`,
    startY: y
  })

  drawDocFooter(doc, { pageNum: 2, totalPages: 2, reference: ref })

  return doc
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 3. QUITTANCE DE LOYER OFFICIELLE (LOI 1989)
 * ═══════════════════════════════════════════════════════════════
 */
export function buildQuittancePDF({
  paiement, bien, locataire, bail,
  bailleurNom = '',
  bailleurAdresse = '',
  datePaiement = '',
  periode = '',
  montantLoyer = null,
  montantCharges = null
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = generateDocRef('KF-QUITT', paiement?.id || bail?.id)
  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}`.trim() : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const bienAdresse = bien?.adresse || bail?.bien_adresse || 'Adresse du logement'

  const loyerHC = montantLoyer !== null ? montantLoyer : (bail?.loyer_mensuel || (paiement?.montant ? paiement.montant - (bail?.charges_mensuelles || 0) : 0))
  const charges = montantCharges !== null ? montantCharges : (bail?.charges_mensuelles || 0)
  const total = paiement?.montant || (loyerHC + charges)
  const dateStr = datePaiement || paiement?.date_paiement || todayISO()

  let y = drawDocHeader(doc, {
    title: 'QUITTANCE DE LOYER',
    subtitle: `Période acquittée : ${periode || formatDate(dateStr)}`,
    reference: ref,
    bienAdresse: bienAdresse,
    bienSurface: bien?.surface_m2 || '',
    bienType: bail?.type_bail === 'meuble' ? 'Meublé' : 'Nu',
    dateDoc: dateStr,
    accentColor: KF_COLORS.primary
  })

  // 01 — PARTIES
  y = drawSectionTitle(doc, { number: '01', title: 'Bailleur & Locataire', startY: y, accentColor: KF_COLORS.primary })
  y = drawPersonCards(doc, {
    bailleur: { nom: bailleurNom || 'Bailleur / Propriétaire', adresse: bailleurAdresse },
    locataire: { nom: locataireFullName, adresse: bienAdresse },
    startY: y,
    accentColor: KF_COLORS.primary
  })

  // 02 — DÉTAIL DU RÈGLEMENT
  y = drawSectionTitle(doc, { number: '02', title: 'Détail des Sommes Acquittées', startY: y, accentColor: KF_COLORS.primary })
  y = drawFinancialSummary(doc, {
    loyerHC: parseFloat(loyerHC || 0),
    charges: parseFloat(charges || 0),
    total: parseFloat(total || 0),
    depotGarantie: parseFloat(bail?.depot_garantie || 0),
    jourPaiement: parseInt(bail?.jour_paiement || 5),
    startY: y,
    accentColor: KF_COLORS.primary
  })

  // 03 — MENTION LÉGALE DE QUITTANCE
  y = drawSectionTitle(doc, { number: '03', title: 'Attestation & Quittance de Paiement', startY: y, accentColor: KF_COLORS.primary })
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 182, 28, 3, 3, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.body)
  const attestationText = `Je soussigné(e) ${bailleurNom || 'le bailleur'}, propriétaire du logement situé au ${bienAdresse}, certifie avoir reçu de ${locataireFullName} la somme totale de ${formatEuro(total)} (${formatEuro(loyerHC)} au titre du loyer et ${formatEuro(charges)} au titre des provisions pour charges) en règlement du terme échu pour la période de ${periode || 'ce mois'}. Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte.`
  const lines = doc.splitTextToSize(attestationText, 172)
  doc.text(lines, 20, y + 6)

  y += 34

  // SIGNATURE
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(`Fait le ${formatDate(dateStr)} pour valoir quittance de droit.`, 14, y)
  y += 6

  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 88, 28, 2.5, 2.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(`Signature du Bailleur : ${bailleurNom || ''}`, 18, y + 6)

  drawDocFooter(doc, { pageNum: 1, totalPages: 1, reference: ref, mention: 'Quittance officielle de loyer certifiée par KeyFolio' })

  return doc
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 4. AVIS D'ÉCHÉANCE / APPEL DE LOYER
 * ═══════════════════════════════════════════════════════════════
 */
export function buildAvisEcheancePDF({
  bail, bien, locataire,
  bailleurNom = '',
  bailleurAdresse = '',
  dateEmission = '',
  dateEcheance = '',
  periode = '',
  montantLoyer = null,
  montantCharges = null,
  iban = ''
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = generateDocRef('KF-AVIS', bail?.id || bien?.id)
  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}`.trim() : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const bienAdresse = bien?.adresse || bail?.bien_adresse || 'Adresse du logement'

  const loyerHC = montantLoyer !== null ? montantLoyer : (bail?.loyer_mensuel || 0)
  const charges = montantCharges !== null ? montantCharges : (bail?.charges_mensuelles || 0)
  const total = loyerHC + charges

  let y = drawDocHeader(doc, {
    title: 'AVIS D\'ÉCHÉANCE DE LOYER',
    subtitle: `Appel de loyer pour la période : ${periode || 'Mois en cours'}`,
    reference: ref,
    bienAdresse: bienAdresse,
    bienSurface: bien?.surface_m2 || '',
    bienType: bail?.type_bail === 'meuble' ? 'Meublé' : 'Nu',
    dateDoc: dateEmission || todayISO(),
    accentColor: KF_COLORS.primary
  })

  y = drawSectionTitle(doc, { number: '01', title: 'Parties Contractantes', startY: y, accentColor: KF_COLORS.primary })
  y = drawPersonCards(doc, {
    bailleur: { nom: bailleurNom || 'Bailleur / Propriétaire', adresse: bailleurAdresse },
    locataire: { nom: locataireFullName, adresse: bienAdresse },
    startY: y,
    accentColor: KF_COLORS.primary
  })

  y = drawSectionTitle(doc, { number: '02', title: 'Montant Exigible à l\'Échéance', startY: y, accentColor: KF_COLORS.primary })
  y = drawFinancialSummary(doc, {
    loyerHC: parseFloat(loyerHC || 0),
    charges: parseFloat(charges || 0),
    total: parseFloat(total || 0),
    depotGarantie: parseFloat(bail?.depot_garantie || 0),
    jourPaiement: parseInt(bail?.jour_paiement || 5),
    startY: y,
    accentColor: KF_COLORS.primary
  })

  if (iban) {
    y = drawSectionTitle(doc, { number: '03', title: 'Coordonnées Bancaires pour le Règlement', startY: y, accentColor: KF_COLORS.primary })
    doc.setFillColor(...KF_COLORS.bgCard)
    doc.setDrawColor(...KF_COLORS.border)
    doc.roundedRect(14, y, 182, 16, 2.5, 2.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...KF_COLORS.dark)
    doc.text(`IBAN : ${iban}`, 20, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...KF_COLORS.muted)
    doc.text(`Merci de mentionner la référence "${ref}" dans le libellé de votre virement.`, 20, y + 11)
  }

  drawDocFooter(doc, { pageNum: 1, totalPages: 1, reference: ref, mention: 'Avis d\'échéance officiel émis par KeyFolio OS Patrimoine' })

  return doc
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 5. LETTRE DE FIN DE BAIL / CONGÉ
 * ═══════════════════════════════════════════════════════════════
 */
export function buildFinBailLetterPDF({
  bail, bien, locataire,
  bailleurNom = '',
  bailleurAdresse = '',
  dateFin = '',
  motifFin = '',
  notesFin = '',
  montantRetenu = 0,
  motifRetenue = '',
  typeLettre = 'restitution_caution'
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = generateDocRef('KF-CLOTURE', bail?.id || bien?.id)
  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}`.trim() : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const bienAdresse = bien?.adresse || bail?.bien_adresse || 'Adresse du logement'
  const cautionInitiale = parseFloat(bail?.depot_garantie || 0)
  const soldeRestitue = Math.max(0, cautionInitiale - parseFloat(montantRetenu || 0))

  let y = drawDocHeader(doc, {
    title: 'CLÔTURE DE BAIL & SOLDE DE CAUTION',
    subtitle: 'Notification officielle de fin de location',
    reference: ref,
    bienAdresse: bienAdresse,
    bienSurface: bien?.surface_m2 || '',
    bienType: bail?.type_bail === 'meuble' ? 'Meublé' : 'Nu',
    dateDoc: dateFin || todayISO(),
    accentColor: KF_COLORS.dark
  })

  y = drawSectionTitle(doc, { number: '01', title: 'Parties', startY: y, accentColor: KF_COLORS.dark })
  y = drawPersonCards(doc, {
    bailleur: { nom: bailleurNom || 'Bailleur / Propriétaire', adresse: bailleurAdresse },
    locataire: { nom: locataireFullName, adresse: bienAdresse, roleLabel: 'LOCATAIRE SORTANT' },
    startY: y,
    accentColor: KF_COLORS.dark
  })

  y = drawSectionTitle(doc, { number: '02', title: 'Décompte Définitif du Dépôt de Garantie', startY: y, accentColor: KF_COLORS.dark })
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, 182, 34, 3, 3, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.body)
  doc.text(`Date de clôture effective : ${formatDate(dateFin || todayISO())}  ·  Motif : ${motifFin || 'Départ convenu'}`, 22, y + 7)
  doc.text(`Dépôt de garantie initial versé : ${formatEuro(cautionInitiale)}`, 22, y + 13)
  if (parseFloat(montantRetenu || 0) > 0) {
    doc.text(`Retenue pour réparations / remise en état : ${formatEuro(montantRetenu)} (${motifRetenue || 'Justificatifs annexés'})`, 22, y + 19)
  }

  // Solde net restitué
  doc.setFillColor(...KF_COLORS.successLight)
  doc.roundedRect(22, y + 22, 166, 9, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.success)
  doc.text('SOLDE NET RESTITUÉ :', 26, y + 28)
  doc.text(formatEuro(soldeRestitue), 180, y + 28, { align: 'right' })

  y += 42

  // SIGNATURES
  y = drawSectionTitle(doc, { number: '03', title: 'Signatures et Quitus de Clôture', startY: y, accentColor: KF_COLORS.dark })
  drawSignatureBlocks(doc, {
    bailleurNom: bailleurNom || 'Bailleur',
    locataireNom: locataireFullName,
    dateDoc: dateFin || todayISO(),
    lieu: `Fait à ${bienAdresse ? bienAdresse.split(',').pop().trim() : 'Paris'}`,
    startY: y
  })

  drawDocFooter(doc, { pageNum: 1, totalPages: 1, reference: ref, mention: 'Document officiel de clôture de bail — KeyFolio' })

  return doc
}
