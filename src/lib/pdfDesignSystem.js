import { formatEuro, formatDate, todayISO } from './utils'

// Couleurs par défaut du design system documentaire KeyFolio
export const KF_COLORS = {
  primary: [79, 70, 229],     // Indigo KeyFolio #4f46e5
  primaryDark: [67, 56, 202], // #4338ca
  primaryLight: [238, 242, 255], // #eef2ff
  success: [22, 163, 74],     // Vert Émeraude #16a34a
  successLight: [220, 252, 231], // #dcfce7
  accent: [37, 99, 235],      // Bleu #2563eb
  dark: [15, 23, 42],         // Ardoise foncé #0f172a
  body: [51, 65, 85],         // Texte normal #334155
  muted: [100, 116, 139],     // Gris intermédiaire #64748b
  border: [226, 232, 240],    // Bordure douce #e2e8f0
  bgCard: [248, 250, 252],    // Fond carte #f8fafc
  bgBadge: [241, 245, 249],   // Fond badge métrique #f1f5f9
  white: [255, 255, 255]
}

/**
 * Dessine l'en-tête de marque officiel KeyFolio (Page 1)
 */
export function drawDocHeader(doc, {
  title = 'CONTRAT DE LOCATION',
  subtitle = "Bail d'habitation — Loi ALUR (Décret n° 2015-587)",
  reference = 'KF-2026-0001',
  bienAdresse = '',
  bienSurface = '',
  bienType = '',
  dateDoc = '',
  accentColor = KF_COLORS.primary
}) {
  const y = 14

  // 1. Logo & Marque KeyFolio (Haut gauche)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...accentColor)
  doc.text('KEYFOLIO', 14, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text('OS PATRIMOINE & GESTION LOCATIVE', 14, y + 8)

  // 2. Type de document & Référence (Haut droite)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(title.toUpperCase(), 196, y + 3, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(`RÉFÉRENCE : ${reference}`, 196, y + 8, { align: 'right' })

  // Ligne de séparation haute
  doc.setDrawColor(...KF_COLORS.border)
  doc.setLineWidth(0.4)
  doc.line(14, y + 12, 196, y + 12)

  // 3. Bloc Adresse du bien & Caractéristiques sous l'en-tête
  let curY = y + 19
  if (bienAdresse) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...KF_COLORS.dark)
    doc.text(bienAdresse, 14, curY)
    curY += 5
  }

  const metaParts = []
  if (bienSurface) metaParts.push(`${bienSurface} m²`)
  if (bienType) metaParts.push(bienType)
  metaParts.push(subtitle)
  if (dateDoc) metaParts.push(`Établi le ${formatDate(dateDoc)}`)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(metaParts.join(' · '), 14, curY)

  curY += 5
  doc.setDrawColor(...KF_COLORS.border)
  doc.line(14, curY, 196, curY)

  return curY + 6
}

/**
 * Dessine l'en-tête de rappel pour les pages suivantes (Page 2, 3...)
 */
export function drawPageReminderHeader(doc, {
  title = 'CONTRAT DE LOCATION',
  reference = 'KF-2026-0001',
  bienAdresse = '',
  locataireNom = '',
  accentColor = KF_COLORS.primary
}) {
  const y = 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...accentColor)
  doc.text('KEYFOLIO', 14, y + 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF_COLORS.muted)
  const summaryText = [
    title,
    bienAdresse ? bienAdresse.split(',')[0] : '',
    locataireNom ? `Locataire : ${locataireNom}` : '',
    `Réf : ${reference}`
  ].filter(Boolean).join('  |  ')

  doc.text(summaryText, 42, y + 2)

  doc.setDrawColor(...KF_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(14, y + 5, 196, y + 5)

  return y + 10
}

/**
 * Dessine le pied de page universel
 */
export function drawDocFooter(doc, {
  pageNum = 1,
  totalPages = 1,
  reference = 'KF-2026-0001',
  mention = 'Document officiel certifié généré par KeyFolio OS Patrimoine'
}) {
  const y = 286
  doc.setDrawColor(...KF_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(14, y - 3, 196, y - 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(`${mention} — Réf. ${reference}`, 14, y + 1)
  doc.text(`Page ${pageNum} sur ${totalPages}`, 196, y + 1, { align: 'right' })
}

/**
 * Dessine un titre de section numéroté élégant
 */
export function drawSectionTitle(doc, {
  number = '01',
  title = 'Désignation des Parties',
  startY = 40,
  accentColor = KF_COLORS.primary
}) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...accentColor)
  doc.text(`${number} —`, 14, startY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(title.toUpperCase(), 23, startY)

  return startY + 6
}

/**
 * Dessine deux fiches de personnes côte à côte (Bailleur & Locataire)
 */
export function drawPersonCards(doc, {
  bailleur = {},
  locataire = {},
  startY = 45,
  accentColor = KF_COLORS.primary
}) {
  const colW = 88
  const cardH = 34
  const col1X = 14
  const col2X = 108

  // Fiche Bailleur
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(col1X, startY, colW, cardH, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text('BAILLEUR (PROPRIÉTAIRE)', col1X + 6, startY + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(bailleur.nom || 'Bailleur non renseigné', col1X + 6, startY + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.body)
  doc.text(bailleur.adresse || 'Adresse non spécifiée', col1X + 6, startY + 17)

  let bLineY = startY + 23
  if (bailleur.telephone) {
    doc.text(`Tél : ${bailleur.telephone}`, col1X + 6, bLineY)
    bLineY += 5
  }
  if (bailleur.email) {
    doc.text(`Email : ${bailleur.email}`, col1X + 6, bLineY)
  }

  // Fiche Locataire
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.roundedRect(col2X, startY, colW, cardH, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(locataire.roleLabel || 'LOCATAIRE (PRENEUR)', col2X + 6, startY + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(locataire.nom || 'Locataire', col2X + 6, startY + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.body)
  if (locataire.profession) {
    doc.text(`Statut : ${locataire.profession}`, col2X + 6, startY + 17)
  } else if (locataire.adresse) {
    doc.text(locataire.adresse, col2X + 6, startY + 17)
  } else {
    doc.text('Résidence principale', col2X + 6, startY + 17)
  }

  let lLineY = startY + 23
  if (locataire.telephone) {
    doc.text(`Tél : ${locataire.telephone}`, col2X + 6, lLineY)
    lLineY += 5
  }
  if (locataire.email) {
    doc.text(`Email : ${locataire.email}`, col2X + 6, lLineY)
  }

  return startY + cardH + 7
}

/**
 * Dessine la fiche du logement avec métriques graphiques en badges
 */
export function drawPropertyMetrics(doc, {
  adresse = '',
  surface = '',
  pieces = '',
  typeBien = 'Appartement',
  regime = 'Meublé',
  dateEffet = '',
  startY = 90
}) {
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, startY, 182, 30, 3, 3, 'FD')

  // Adresse du logement
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text('ADRESSE DES LOCAUX LOUÉS', 20, startY + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(adresse || 'Adresse du logement', 20, startY + 11)

  // 4 Badges de métriques horizontales
  const metrics = [
    { label: 'SURFACE', val: surface ? `${surface} m²` : '—' },
    { label: 'PIÈCES', val: pieces ? `${pieces} pièces` : '—' },
    { label: 'RÉGIME', val: regime || typeBien },
    { label: 'PRISE D\'EFFET', val: dateEffet ? formatDate(dateEffet) : '—' }
  ]

  const badgeW = 41
  const badgeH = 12
  const badgeY = startY + 14

  metrics.forEach((m, idx) => {
    const bx = 20 + idx * 43
    doc.setFillColor(...KF_COLORS.bgBadge)
    doc.roundedRect(bx, badgeY, badgeW, badgeH, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...KF_COLORS.dark)
    doc.text(m.val, bx + badgeW / 2, badgeY + 5.5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...KF_COLORS.muted)
    doc.text(m.label, bx + badgeW / 2, badgeY + 9.5, { align: 'center' })
  })

  return startY + 36
}

/**
 * Dessine la synthèse des conditions financières avec mise en valeur
 */
export function drawFinancialSummary(doc, {
  loyerHC = 0,
  charges = 0,
  total = 0,
  depotGarantie = 0,
  jourPaiement = 5,
  startY = 135,
  accentColor = KF_COLORS.primary
}) {
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, startY, 182, 38, 3, 3, 'FD')

  // Loyer HC
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...KF_COLORS.body)
  doc.text('Loyer mensuel principal hors charges', 22, startY + 8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(formatEuro(loyerHC), 100, startY + 8, { align: 'right' })

  // Charges
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...KF_COLORS.body)
  doc.text('Provisions mensuelles sur charges locatives', 22, startY + 14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(formatEuro(charges), 100, startY + 14, { align: 'right' })

  // Ligne de sous-total
  doc.setDrawColor(...KF_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(22, startY + 17, 100, startY + 17)

  // Encart Total Mensuel (Mis en valeur)
  const totalBoxX = 114
  const totalBoxW = 74
  doc.setFillColor(...KF_COLORS.primaryLight)
  doc.roundedRect(totalBoxX, startY + 5, totalBoxW, 20, 2.5, 2.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...accentColor)
  doc.text('TOTAL MENSUEL CHARGES COMPRISES', totalBoxX + totalBoxW / 2, startY + 10.5, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...accentColor)
  doc.text(formatEuro(total || (loyerHC + charges)), totalBoxX + totalBoxW / 2, startY + 19, { align: 'center' })

  // Dépôt de garantie & Modalités en bas
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(`Dépôt de garantie exigé à l'entrée : ${formatEuro(depotGarantie)}   ·   Exigibilité : le ${jourPaiement} de chaque mois`, 22, startY + 32)

  return startY + 44
}

/**
 * Dessine des clauses numérotées structurées et aérées
 */
export function drawNumberedClauses(doc, {
  clauses = [],
  startY = 30,
  accentColor = KF_COLORS.primary
}) {
  let y = startY

  clauses.forEach((c, idx) => {
    // Vérifier saut de page
    if (y > 255) {
      doc.addPage()
      y = 20
    }

    const numStr = String(idx + 1).padStart(2, '0')

    // Titre de la clause
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...accentColor)
    doc.text(`${numStr} ·`, 14, y)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...KF_COLORS.dark)
    doc.text(c.title, 22, y)
    y += 4.5

    // Texte de la clause
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...KF_COLORS.body)
    const lines = doc.splitTextToSize(c.text, 178)
    doc.text(lines, 22, y)
    y += lines.length * 3.6 + 4
  })

  return y
}

/**
 * Dessine les blocs de signature professionnels
 */
export function drawSignatureBlocks(doc, {
  bailleurNom = '',
  locataireNom = '',
  dateDoc = '',
  lieu = 'Fait au logement',
  startY = 220
}) {
  let y = startY
  if (y > 235) {
    doc.addPage()
    y = 30
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text(`${lieu}, le ${formatDate(dateDoc || todayISO())}. Document rédigé en 2 exemplaires originaux.`, 14, y)

  y += 6
  const boxW = 88
  const boxH = 34

  // Bloc Bailleur
  doc.setFillColor(...KF_COLORS.bgCard)
  doc.setDrawColor(...KF_COLORS.border)
  doc.roundedRect(14, y, boxW, boxH, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(`Pour le Bailleur : ${bailleurNom}`, 18, y + 6)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text('Mention manuscrite "Lu et approuvé"', 18, y + 11)

  // Bloc Locataire
  doc.roundedRect(108, y, boxW, boxH, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF_COLORS.dark)
  doc.text(`Pour le Locataire : ${locataireNom}`, 112, y + 6)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...KF_COLORS.muted)
  doc.text('Mention manuscrite "Lu et approuvé"', 112, y + 11)

  return y + boxH + 6
}
