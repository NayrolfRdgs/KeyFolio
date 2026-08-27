import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../templates/pdf')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

// Couleurs charte KeyFolio
const C = {
  blue: rgb(37 / 255, 99 / 255, 235 / 255),        // #2563eb
  blueDark: rgb(29 / 255, 78 / 255, 216 / 255),    // #1d4ed8
  blueBg: rgb(239 / 255, 246 / 255, 255 / 255),    // #eff6ff
  blueBorder: rgb(191 / 255, 219 / 255, 254 / 255),// #bfdbfe
  green: rgb(22 / 255, 163 / 255, 74 / 255),      // #16a34a
  greenDark: rgb(21 / 255, 128 / 255, 61 / 255),   // #15803d
  greenBg: rgb(240 / 255, 253 / 255, 244 / 255),   // #f0fdf4
  red: rgb(220 / 255, 38 / 255, 38 / 255),         // #dc2626
  redBg: rgb(254 / 255, 242 / 255, 242 / 255),     // #fef2f2
  dark: rgb(15 / 255, 23 / 255, 42 / 255),         // #0f172a
  body: rgb(51 / 255, 65 / 255, 85 / 255),         // #334155
  muted: rgb(100 / 255, 116 / 255, 139 / 255),     // #64748b
  border: rgb(226 / 255, 232 / 255, 240 / 255),    // #e2e8f0
  cardBg: rgb(248 / 255, 250 / 255, 252 / 255),    // #f8fafc
  white: rgb(1, 1, 1)
}

function drawHeader(page, fontBold, fontReg, {
  title = '',
  subtitle = '',
  badge = 'DOCUMENT OFFICIEL',
  accentColor = C.blue
}) {
  const topY = 800

  // 1. Barre rouge / accent à gauche
  page.drawRectangle({
    x: 42,
    y: topY - 36,
    width: 4.5,
    height: 40,
    color: accentColor
  })

  // 2. Titre & sous-titre
  page.drawText(title.toUpperCase(), {
    x: 58,
    y: topY - 6,
    size: 13.5,
    font: fontBold,
    color: C.dark
  })

  page.drawText(subtitle, {
    x: 58,
    y: topY - 22,
    size: 8.2,
    font: fontReg,
    color: C.muted
  })

  // 3. Logo KeyFolio à droite
  page.drawText('KeyFolio', {
    x: 480,
    y: topY - 6,
    size: 15,
    font: fontBold,
    color: C.blue
  })

  page.drawText('GESTION LOCATIVE', {
    x: 497,
    y: topY - 18,
    size: 6.2,
    font: fontBold,
    color: C.muted
  })

  // 4. Badge catégorie en haut à droite
  if (badge) {
    const badgeW = fontBold.widthOfTextAtSize(badge, 7) + 14
    page.drawRectangle({
      x: 553 - badgeW,
      y: topY - 48,
      width: badgeW,
      height: 15,
      color: C.blueBg,
      borderColor: C.blueBorder,
      borderWidth: 0.6
    })

    page.drawText(badge, {
      x: 553 - badgeW + 7,
      y: topY - 42,
      size: 7,
      font: fontBold,
      color: C.blue
    })
  }

  return topY - 62
}

function drawFooter(page, fontBold, fontReg, pageNum = 1, totalPages = 1) {
  const y = 42
  page.drawLine({
    start: { x: 42, y: y + 14 },
    end: { x: 553, y: y + 14 },
    thickness: 0.7,
    color: C.border
  })

  page.drawText('KEYFOLIO', {
    x: 42,
    y: y,
    size: 7.2,
    font: fontBold,
    color: C.blue
  })

  const pageStr = totalPages > 1 ? ` · Page ${pageNum}/${totalPages}` : ''
  const rightText = `Document officiel généré via KeyFolio.${pageStr}`
  const w = fontReg.widthOfTextAtSize(rightText, 7)
  page.drawText(rightText, {
    x: 553 - w,
    y: y,
    size: 7,
    font: fontReg,
    color: C.muted
  })
}

function drawPillBadge(page, fontBold, number, title, x, y) {
  // Cercle bleu
  page.drawCircle({
    x: x + 8,
    y: y + 5,
    size: 7.5,
    color: C.blue
  })

  // Numéro blanc centré
  const numStr = String(number)
  const nw = fontBold.widthOfTextAtSize(numStr, 7.5)
  page.drawText(numStr, {
    x: x + 8 - nw / 2,
    y: y + 2.5,
    size: 7.5,
    font: fontBold,
    color: C.white
  })

  // Titre en gras
  page.drawText(title.toUpperCase(), {
    x: x + 21,
    y: y + 2.2,
    size: 8.8,
    font: fontBold,
    color: C.dark
  })
}

// ─────────────────────────────────────────────────────────────
// 1. MODÈLE QUITTANCE DE LOYER
// ─────────────────────────────────────────────────────────────
async function createQuittancePDF() {
  const doc = await PDFDocument.create()
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)

  const page = doc.addPage([595.28, 841.89]) // A4

  let curY = drawHeader(page, fontBold, fontReg, {
    title: 'QUITTANCE DE LOYER',
    subtitle: 'Paiement intégral du loyer et des charges (Loi n° 89-462, art. 21)',
    badge: 'QUITTANCE OFFICIELLE',
    accentColor: C.blue
  })

  // 1 & 2 : Bailleur et Locataire côte à côte
  const cardW = 248
  const cardH = 80
  const col1X = 42
  const col2X = 305
  const boxY = curY - cardH

  // Carte Bailleur
  page.drawRectangle({
    x: col1X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 1, 'BAILLEUR', col1X + 14, boxY + cardH - 18)
  page.drawText('"{{bailleur_nom}}"', { x: col1X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page.drawText('"{{bailleur_adresse}}"', { x: col1X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  // Carte Locataire
  page.drawRectangle({
    x: col2X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 2, 'LOCATAIRE', col2X + 14, boxY + cardH - 18)
  page.drawText('"{{locataire_nom}}"', { x: col2X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page.drawText('"{{bien_nom}}" — "{{bien_adresse}}"', { x: col2X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  curY = boxY - 14

  // 3 : Période et Paiement
  const box3H = 60
  const box3Y = curY - box3H
  page.drawRectangle({
    x: col1X, y: box3Y, width: 511, height: box3H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 3, 'PÉRIODE ACQUITTÉE & DATE DE RÈGLEMENT', col1X + 14, box3Y + box3H - 18)
  page.drawText('Période concernée :', { x: col1X + 14, y: box3Y + 18, size: 8.6, font: fontReg, color: C.muted })
  page.drawText('"{{periode}}"', { x: col1X + 110, y: box3Y + 18, size: 9.2, font: fontBold, color: C.dark })
  page.drawText('Date de règlement :', { x: col1X + 280, y: box3Y + 18, size: 8.6, font: fontReg, color: C.muted })
  page.drawText('"{{date_paiement}}"', { x: col1X + 375, y: box3Y + 18, size: 9.2, font: fontBold, color: C.dark })

  curY = box3Y - 14

  // 4 : Détail financier
  const box4H = 135
  const box4Y = curY - box4H
  page.drawRectangle({
    x: col1X, y: box4Y, width: 511, height: box4H,
    color: C.white, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 4, 'DÉTAIL DU RÈGLEMENT ACQUITTÉ', col1X + 14, box4Y + box4H - 18)

  page.drawText('1. Loyer principal hors charges :', { x: col1X + 14, y: box4Y + box4H - 42, size: 9, font: fontReg, color: C.dark })
  page.drawText('"{{loyer_hc}}"', { x: 480, y: box4Y + box4H - 42, size: 9.5, font: fontBold, color: C.dark })

  page.drawLine({ start: { x: col1X + 14, y: box4Y + box4H - 52 }, end: { x: 538, y: box4Y + box4H - 52 }, thickness: 0.5, color: C.border })

  page.drawText('2. Provisions pour charges locatives :', { x: col1X + 14, y: box4Y + box4H - 68, size: 9, font: fontReg, color: C.dark })
  page.drawText('"{{charges}}"', { x: 480, y: box4Y + box4H - 68, size: 9.5, font: fontBold, color: C.dark })

  // Encadré vert Total
  page.drawRectangle({
    x: col1X + 10, y: box4Y + 12, width: 491, height: 42,
    color: C.greenBg
  })
  page.drawText('TOTAL REÇU EN RÈGLEMENT :', { x: col1X + 22, y: box4Y + 33, size: 9, font: fontBold, color: C.greenDark })
  page.drawText('"{{montant_total}}"', { x: 460, y: box4Y + 32, size: 12, font: fontBold, color: C.greenDark })
  page.drawText('Paiement intégral reçu pour valoir quittance de droit selon la loi du 6 juillet 1989.', { x: col1X + 22, y: box4Y + 19, size: 7, font: fontReg, color: C.muted })

  curY = box4Y - 14

  // 5 : Attestation légale
  const box5H = 80
  const box5Y = curY - box5H
  page.drawRectangle({
    x: col1X, y: box5Y, width: 511, height: box5H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 5, 'ATTESTATION DE PAIEMENT', col1X + 14, box5Y + box5H - 18)
  page.drawText('Je soussigné(e) "{{bailleur_nom}}", propriétaire du logement situé au "{{bien_adresse}}", certifie avoir', { x: col1X + 14, y: box5Y + box5H - 36, size: 8, font: fontReg, color: C.body })
  page.drawText('reçu de "{{locataire_nom}}" la somme de "{{montant_total}}" au titre du loyer et des charges pour la période mentionnée.', { x: col1X + 14, y: box5Y + box5H - 49, size: 8, font: fontReg, color: C.body })
  page.drawText('Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte.', { x: col1X + 14, y: box5Y + box5H - 62, size: 7.5, font: fontItalic, color: C.muted })

  curY = box5Y - 14

  // Signatures
  page.drawText('Fait à "{{bien_adresse}}" le "{{date_paiement}}"', { x: col1X + 14, y: curY - 5, size: 8, font: fontReg, color: C.muted })
  page.drawText('Signature du Bailleur :', { x: col1X + 14, y: curY - 20, size: 8.8, font: fontBold, color: C.dark })
  page.drawLine({ start: { x: col1X + 14, y: curY - 50 }, end: { x: 260, y: curY - 50 }, thickness: 0.8, color: C.border })
  page.drawText('Signature', { x: col1X + 14, y: curY - 60, size: 6.8, font: fontReg, color: C.muted })

  drawFooter(page, fontBold, fontReg, 1, 1)

  const pdfBytes = await doc.save()
  fs.writeFileSync(path.join(outDir, 'modele_quittance.pdf'), pdfBytes)
  console.log('✓ modele_quittance.pdf harmonisé généré avec succès !')
}

// ─────────────────────────────────────────────────────────────
// 2. MODÈLE AVIS D'ÉCHÉANCE / APPEL DE LOYER
// ─────────────────────────────────────────────────────────────
async function createAvisEcheancePDF() {
  const doc = await PDFDocument.create()
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)

  const page = doc.addPage([595.28, 841.89]) // A4

  let curY = drawHeader(page, fontBold, fontReg, {
    title: "AVIS D'ÉCHÉANCE DE LOYER",
    subtitle: 'Appel de loyer et provisions sur charges locatives',
    badge: 'APPEL DE LOYER',
    accentColor: C.blue
  })

  const cardW = 248
  const cardH = 80
  const col1X = 42
  const col2X = 305
  const boxY = curY - cardH

  // Carte Bailleur
  page.drawRectangle({
    x: col1X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 1, 'BAILLEUR', col1X + 14, boxY + cardH - 18)
  page.drawText('"{{bailleur_nom}}"', { x: col1X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page.drawText('"{{bailleur_adresse}}"', { x: col1X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  // Carte Locataire
  page.drawRectangle({
    x: col2X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 2, 'LOCATAIRE', col2X + 14, boxY + cardH - 18)
  page.drawText('"{{locataire_nom}}"', { x: col2X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page.drawText('"{{bien_nom}}" — "{{bien_adresse}}"', { x: col2X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  curY = boxY - 14

  // 3 : Échéance
  const box3H = 60
  const box3Y = curY - box3H
  page.drawRectangle({
    x: col1X, y: box3Y, width: 511, height: box3H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 3, "PÉRIODE CONCERNÉE & DATE D'ÉCHÉANCE", col1X + 14, box3Y + box3H - 18)
  page.drawText('Période :', { x: col1X + 14, y: box3Y + 18, size: 8.6, font: fontReg, color: C.muted })
  page.drawText('"{{periode}}"', { x: col1X + 65, y: box3Y + 18, size: 9.2, font: fontBold, color: C.dark })
  page.drawText("Date limite d'exigibilité :", { x: col1X + 260, y: box3Y + 18, size: 8.6, font: fontReg, color: C.muted })
  page.drawText('"{{date_echeance}}"', { x: col1X + 385, y: box3Y + 18, size: 9.2, font: fontBold, color: C.red })

  curY = box3Y - 14

  // 4 : Sommes exigibles
  const box4H = 135
  const box4Y = curY - box4H
  page.drawRectangle({
    x: col1X, y: box4Y, width: 511, height: box4H,
    color: C.white, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 4, 'MONTANT EXIGIBLE À L\'ÉCHÉANCE', col1X + 14, box4Y + box4H - 18)

  page.drawText('1. Loyer principal hors charges :', { x: col1X + 14, y: box4Y + box4H - 42, size: 9, font: fontReg, color: C.dark })
  page.drawText('"{{loyer_hc}}"', { x: 480, y: box4Y + box4H - 42, size: 9.5, font: fontBold, color: C.dark })

  page.drawLine({ start: { x: col1X + 14, y: box4Y + box4H - 52 }, end: { x: 538, y: box4Y + box4H - 52 }, thickness: 0.5, color: C.border })

  page.drawText('2. Provisions sur charges locatives :', { x: col1X + 14, y: box4Y + box4H - 68, size: 9, font: fontReg, color: C.dark })
  page.drawText('"{{charges}}"', { x: 480, y: box4Y + box4H - 68, size: 9.5, font: fontBold, color: C.dark })

  // Encadré bleu Total
  page.drawRectangle({
    x: col1X + 10, y: box4Y + 12, width: 491, height: 42,
    color: C.blueBg
  })
  page.drawText('TOTAL NET À PAYER :', { x: col1X + 22, y: box4Y + 33, size: 9, font: fontBold, color: C.blueDark })
  page.drawText('"{{montant_total}}"', { x: 460, y: box4Y + 32, size: 12, font: fontBold, color: C.blueDark })
  page.drawText('Merci de procéder au règlement avant la date d\'échéance indiquée ci-dessus.', { x: col1X + 22, y: box4Y + 19, size: 7, font: fontReg, color: C.muted })

  curY = box4Y - 14

  // 5 : Coordonnées bancaires
  const box5H = 85
  const box5Y = curY - box5H
  page.drawRectangle({
    x: col1X, y: box5Y, width: 511, height: box5H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page, fontBold, 5, 'COORDONNÉES BANCAIRES POUR LE RÈGLEMENT', col1X + 14, box5Y + box5H - 18)

  const subW = 238
  page.drawRectangle({ x: col1X + 12, y: box5Y + 12, width: subW, height: 44, color: C.white, borderColor: C.border, borderWidth: 0.6 })
  page.drawText('IBAN du Bailleur :', { x: col1X + 20, y: box5Y + 42, size: 7, font: fontBold, color: C.muted })
  page.drawText('"{{bailleur_iban}}"', { x: col1X + 20, y: box5Y + 28, size: 8, font: fontBold, color: C.dark })

  page.drawRectangle({ x: col1X + 260, y: box5Y + 12, width: subW, height: 44, color: C.white, borderColor: C.border, borderWidth: 0.6 })
  page.drawText('BIC / SWIFT :', { x: col1X + 268, y: box5Y + 42, size: 7, font: fontBold, color: C.muted })
  page.drawText('"{{bailleur_bic}}"', { x: col1X + 268, y: box5Y + 28, size: 8, font: fontBold, color: C.dark })

  curY = box5Y - 14

  page.drawText('Cet avis d\'échéance ne constitue pas une quittance de loyer.', { x: col1X + 14, y: curY - 5, size: 7.5, font: fontItalic, color: C.muted })

  drawFooter(page, fontBold, fontReg, 1, 1)

  const pdfBytes = await doc.save()
  fs.writeFileSync(path.join(outDir, 'modele_avis_echeance.pdf'), pdfBytes)
  console.log('✓ modele_avis_echeance.pdf harmonisé généré avec succès !')
}

// ─────────────────────────────────────────────────────────────
// 3. MODÈLE ÉTAT DES LIEUX CONTRADICTOIRE (2 Pages)
// ─────────────────────────────────────────────────────────────
async function createEtatDesLieuxPDF() {
  const doc = await PDFDocument.create()
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)

  // PAGE 1
  const page1 = doc.addPage([595.28, 841.89])

  let curY = drawHeader(page1, fontBold, fontReg, {
    title: 'ÉTAT DES LIEUX CONTRADICTOIRE',
    subtitle: 'Constat contradictoire d\'entrée / sortie (Décret n° 2016-382)',
    badge: 'DOCUMENT CONTRADICTOIRE',
    accentColor: C.green
  })

  const cardW = 248
  const cardH = 80
  const col1X = 42
  const col2X = 305
  const boxY = curY - cardH

  // Carte Bailleur
  page1.drawRectangle({
    x: col1X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 1, 'BAILLEUR', col1X + 14, boxY + cardH - 18)
  page1.drawText('"{{bailleur_nom}}"', { x: col1X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page1.drawText('"{{bailleur_adresse}}"', { x: col1X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  // Carte Locataire
  page1.drawRectangle({
    x: col2X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 2, 'LOCATAIRE', col2X + 14, boxY + cardH - 18)
  page1.drawText('"{{locataire_nom}}"', { x: col2X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page1.drawText('"{{bien_nom}}" — "{{bien_adresse}}"', { x: col2X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  curY = boxY - 14

  // 3 : Compteurs et Clés (3 Blocs)
  const box3H = 85
  const box3Y = curY - box3H
  page1.drawRectangle({
    x: col1X, y: box3Y, width: 511, height: box3H,
    color: C.white, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 3, 'RELEVÉ DES COMPTEURS & REMISE DES CLÉS', col1X + 14, box3Y + box3H - 18)

  const subW = 158
  // Bloc Elec
  page1.drawRectangle({ x: col1X + 12, y: box3Y + 12, width: subW, height: 44, color: C.cardBg, borderColor: C.border, borderWidth: 0.6 })
  page1.drawText('Index Électricité :', { x: col1X + 18, y: box3Y + 42, size: 7, font: fontBold, color: C.muted })
  page1.drawText('"{{index_elec}}"', { x: col1X + 18, y: box3Y + 28, size: 8.4, font: fontBold, color: C.dark })

  // Bloc Eau
  page1.drawRectangle({ x: col1X + 176, y: box3Y + 12, width: subW, height: 44, color: C.cardBg, borderColor: C.border, borderWidth: 0.6 })
  page1.drawText('Index Eau :', { x: col1X + 182, y: box3Y + 42, size: 7, font: fontBold, color: C.muted })
  page1.drawText('"{{index_eau}}"', { x: col1X + 182, y: box3Y + 28, size: 8.4, font: fontBold, color: C.dark })

  // Bloc Clés
  page1.drawRectangle({ x: col1X + 340, y: box3Y + 12, width: subW, height: 44, color: C.blueBg, borderColor: C.blueBorder, borderWidth: 0.6 })
  page1.drawText('Clés & Badges remis :', { x: col1X + 346, y: box3Y + 42, size: 7, font: fontBold, color: C.blueDark })
  page1.drawText('"{{cles_remises}}"', { x: col1X + 346, y: box3Y + 28, size: 8, font: fontBold, color: C.blueDark })

  curY = box3Y - 14

  // 4 : Grille des pièces
  const box4H = 220
  const box4Y = curY - box4H
  page1.drawRectangle({
    x: col1X, y: box4Y, width: 511, height: box4H,
    color: C.white, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 4, 'CONSTAT DÉTAILLÉ PAR PIÈCE', col1X + 14, box4Y + box4H - 18)

  // En-tête tableau
  page1.drawRectangle({ x: col1X + 10, y: box4Y + box4H - 42, width: 491, height: 18, color: C.cardBg })
  page1.drawText('PIÈCE / ESPACE', { x: col1X + 18, y: box4Y + box4H - 30, size: 7.5, font: fontBold, color: C.dark })
  page1.drawText('ÉTAT CONSTATÉ', { x: col1X + 180, y: box4Y + box4H - 30, size: 7.5, font: fontBold, color: C.dark })
  page1.drawText('OBSERVATIONS & ÉQUIPEMENTS', { x: col1X + 310, y: box4Y + box4H - 30, size: 7.5, font: fontBold, color: C.dark })

  const piecesList = [
    { n: 'Entrée / Couloir', e: 'Bon état', o: 'Murs propres, interphone et serrure testés' },
    { n: 'Séjour / Salon', e: 'Très bon état', o: 'Parquet propre, fenêtres conformes, prises OK' },
    { n: 'Cuisine', e: 'Bon état', o: 'Évier, placards et plaques nettoyés et testés' },
    { n: 'Chambre principale', e: 'Très bon état', o: 'Murs et sols sans accroc, radiateur fonctionnel' },
    { n: 'Salle d\'eau & WC', e: 'Bon état', o: 'Robinetterie sans fuite, faïence propre, VMC OK' }
  ]

  piecesList.forEach((p, idx) => {
    const rowY = box4Y + box4H - 64 - idx * 28
    page1.drawLine({ start: { x: col1X + 10, y: rowY + 22 }, end: { x: 541, y: rowY + 22 }, thickness: 0.5, color: C.border })
    page1.drawText(p.n, { x: col1X + 18, y: rowY + 6, size: 8, font: fontBold, color: C.dark })
    page1.drawText(p.e, { x: col1X + 180, y: rowY + 6, size: 8, font: fontReg, color: C.body })
    page1.drawText(p.o, { x: col1X + 310, y: rowY + 6, size: 7.5, font: fontReg, color: C.muted })
  })

  drawFooter(page1, fontBold, fontReg, 1, 2)

  // PAGE 2
  const page2 = doc.addPage([595.28, 841.89])

  let curY2 = drawHeader(page2, fontBold, fontReg, {
    title: 'ÉTAT DES LIEUX CONTRADICTOIRE',
    subtitle: 'Synthèse de clôture, caution et signatures',
    badge: 'PAGE DE CLÔTURE',
    accentColor: C.green
  })

  // 5 : Décompte caution
  const box5H = 135
  const box5Y = curY2 - box5H
  page2.drawRectangle({
    x: col1X, y: box5Y, width: 511, height: box5H,
    color: C.white, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page2, fontBold, 5, 'DÉPÔT DE GARANTIE & CONDITIONS DE SORTIE', col1X + 14, box5Y + box5H - 18)

  page2.drawText('1. Dépôt de garantie initial versé :', { x: col1X + 14, y: box5Y + box5H - 42, size: 9, font: fontReg, color: C.dark })
  page2.drawText('"{{depot_garantie}}"', { x: 480, y: box5Y + box5H - 42, size: 9.5, font: fontBold, color: C.dark })

  page2.drawLine({ start: { x: col1X + 14, y: box5Y + box5H - 52 }, end: { x: 538, y: box5Y + box5H - 52 }, thickness: 0.5, color: C.border })

  page2.drawText('2. Retenue pour dégradations / travaux :', { x: col1X + 14, y: box5Y + box5H - 68, size: 9, font: fontReg, color: C.dark })
  page2.drawText('"{{montant_retenu}}"', { x: 480, y: box5Y + box5H - 68, size: 9.5, font: fontBold, color: C.red })

  page2.drawRectangle({
    x: col1X + 10, y: box5Y + 12, width: 491, height: 42,
    color: C.greenBg
  })
  page2.drawText('SOLDE NET RESTITUÉ :', { x: col1X + 22, y: box5Y + 33, size: 9, font: fontBold, color: C.greenDark })
  page2.drawText('"{{solde_restitue}}"', { x: 460, y: box5Y + 32, size: 12, font: fontBold, color: C.greenDark })
  page2.drawText('Motif retenue éventuelle : "{{motif_retenue}}"', { x: col1X + 22, y: box5Y + 19, size: 7, font: fontReg, color: C.muted })

  curY2 = box5Y - 14

  // 6 : Observations
  const box6H = 100
  const box6Y = curY2 - box6H
  page2.drawRectangle({
    x: col1X, y: box6Y, width: 511, height: box6H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page2, fontBold, 6, 'OBSERVATIONS GÉNÉRALES DES PARTIES', col1X + 14, box6Y + box6H - 18)
  page2.drawText('Le présent état des lieux est dressé contradictoirement entre les parties soussignées qui reconnaissent', { x: col1X + 14, y: box6Y + box6H - 42, size: 8, font: fontReg, color: C.body })
  page2.drawText('l\'exactitude des constatations consignées ci-dessus à la date d\'effet du présent document.', { x: col1X + 14, y: box6Y + box6H - 56, size: 8, font: fontReg, color: C.body })

  curY2 = box6Y - 18

  // Signatures
  page2.drawText('Le Bailleur :', { x: col1X + 14, y: curY2, size: 9.1, font: fontBold, color: C.dark })
  page2.drawText('Le Locataire :', { x: col2X + 14, y: curY2, size: 9.1, font: fontBold, color: C.dark })

  page2.drawLine({ start: { x: col1X + 14, y: curY2 - 50 }, end: { x: 260, y: curY2 - 50 }, thickness: 0.8, color: C.border })
  page2.drawLine({ start: { x: col2X + 14, y: curY2 - 50 }, end: { x: 538, y: curY2 - 50 }, thickness: 0.8, color: C.border })

  page2.drawText('Signature', { x: col1X + 14, y: curY2 - 62, size: 6.8, font: fontReg, color: C.muted })
  page2.drawText('Signature', { x: col2X + 14, y: curY2 - 62, size: 6.8, font: fontReg, color: C.muted })

  drawFooter(page2, fontBold, fontReg, 2, 2)

  const pdfBytes = await doc.save()
  fs.writeFileSync(path.join(outDir, 'modele_etat_des_lieux.pdf'), pdfBytes)
  console.log('✓ modele_etat_des_lieux.pdf harmonisé généré avec succès !')
}

// ─────────────────────────────────────────────────────────────
// 4. MODÈLE CONTRAT DE BAIL LOI ALUR (2 Pages)
// ─────────────────────────────────────────────────────────────
async function createContratBailPDF() {
  const doc = await PDFDocument.create()
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)

  // PAGE 1
  const page1 = doc.addPage([595.28, 841.89])

  let curY = drawHeader(page1, fontBold, fontReg, {
    title: 'CONTRAT DE LOCATION D\'HABITATION',
    subtitle: 'Bail conforme Loi ALUR (Décret n° 2015-587 du 29 mai 2015)',
    badge: 'CONFORME LOI ALUR',
    accentColor: C.blue
  })

  const cardW = 248
  const cardH = 80
  const col1X = 42
  const col2X = 305
  const boxY = curY - cardH

  // Carte Bailleur
  page1.drawRectangle({
    x: col1X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 1, 'BAILLEUR', col1X + 14, boxY + cardH - 18)
  page1.drawText('"{{bailleur_nom}}"', { x: col1X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page1.drawText('"{{bailleur_adresse}}"', { x: col1X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  // Carte Locataire
  page1.drawRectangle({
    x: col2X, y: boxY, width: cardW, height: cardH,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 2, 'LOCATAIRE', col2X + 14, boxY + cardH - 18)
  page1.drawText('"{{locataire_nom}}"', { x: col2X + 14, y: boxY + cardH - 38, size: 10, font: fontBold, color: C.dark })
  page1.drawText('"{{locataire_email}}" — "{{locataire_telephone}}"', { x: col2X + 14, y: boxY + cardH - 54, size: 8.5, font: fontReg, color: C.muted })

  curY = boxY - 14

  // 3 : Logement
  const box3H = 85
  const box3Y = curY - box3H
  page1.drawRectangle({
    x: col1X, y: box3Y, width: 511, height: box3H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 3, 'OBJET DU CONTRAT & DÉSIGNATION DU LOGEMENT', col1X + 14, box3Y + box3H - 18)
  page1.drawText('Adresse :', { x: col1X + 14, y: box3Y + 48, size: 8.5, font: fontBold, color: C.muted })
  page1.drawText('"{{bien_nom}}" — "{{bien_adresse}}"', { x: col1X + 68, y: box3Y + 48, size: 9, font: fontBold, color: C.dark })

  const subMetricW = 115
  const mY = box3Y + 12
  const metrics = [
    { label: 'Surface', val: '"{{bien_surface}}"' },
    { label: 'Pièces', val: '"{{bien_pieces}}"' },
    { label: 'Régime', val: '"{{bien_type}}"' },
    { label: 'Prise d\'effet', val: '"{{date_debut_bail}}"' }
  ]
  metrics.forEach((m, idx) => {
    const mx = col1X + 10 + idx * 124
    page1.drawRectangle({ x: mx, y: mY, width: subMetricW, height: 28, color: C.white, borderColor: C.border, borderWidth: 0.6 })
    page1.drawText(m.label, { x: mx + 8, y: mY + 16, size: 6.8, font: fontBold, color: C.muted })
    page1.drawText(m.val, { x: mx + 8, y: mY + 6, size: 8, font: fontBold, color: C.dark })
  })

  curY = box3Y - 14

  // 4 : Finances
  const box4H = 135
  const box4Y = curY - box4H
  page1.drawRectangle({
    x: col1X, y: box4Y, width: 511, height: box4H,
    color: C.white, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page1, fontBold, 4, 'CONDITIONS FINANCIÈRES & CAUTION', col1X + 14, box4Y + box4H - 18)

  page1.drawText('1. Loyer mensuel principal hors charges :', { x: col1X + 14, y: box4Y + box4H - 42, size: 9, font: fontReg, color: C.dark })
  page1.drawText('"{{loyer_hc}}"', { x: 480, y: box4Y + box4H - 42, size: 9.5, font: fontBold, color: C.dark })

  page1.drawLine({ start: { x: col1X + 14, y: box4Y + box4H - 52 }, end: { x: 538, y: box4Y + box4H - 52 }, thickness: 0.5, color: C.border })

  page1.drawText('2. Provisions sur charges locatives :', { x: col1X + 14, y: box4Y + box4H - 68, size: 9, font: fontReg, color: C.dark })
  page1.drawText('"{{charges}}"', { x: 480, y: box4Y + box4H - 68, size: 9.5, font: fontBold, color: C.dark })

  page1.drawRectangle({
    x: col1X + 10, y: box4Y + 12, width: 491, height: 42,
    color: C.blueBg
  })
  page1.drawText('TOTAL MENSUEL CHARGES COMPRISES :', { x: col1X + 22, y: box4Y + 33, size: 9, font: fontBold, color: C.blueDark })
  page1.drawText('"{{montant_total}}"', { x: 460, y: box4Y + 32, size: 12, font: fontBold, color: C.blueDark })
  page1.drawText('Dépôt de garantie versé à la signature : "{{depot_garantie}}"  ·  Paiement exigible le 5 de chaque mois.', { x: col1X + 22, y: box4Y + 19, size: 7, font: fontReg, color: C.muted })

  drawFooter(page1, fontBold, fontReg, 1, 2)

  // PAGE 2
  const page2 = doc.addPage([595.28, 841.89])

  let curY2 = drawHeader(page2, fontBold, fontReg, {
    title: 'CONTRAT DE LOCATION D\'HABITATION',
    subtitle: 'Clauses obligatoires, obligations et signatures',
    badge: 'CLAUSES & SIGNATURES',
    accentColor: C.blue
  })

  // 5 : Clauses
  const box5H = 260
  const box5Y = curY2 - box5H
  page2.drawRectangle({
    x: col1X, y: box5Y, width: 511, height: box5H,
    color: C.cardBg, borderColor: C.border, borderWidth: 0.8
  })
  drawPillBadge(page2, fontBold, 5, 'CONDITIONS GÉNÉRALES & CLAUSES DU BAIL', col1X + 14, box5Y + box5H - 18)

  const clauses = [
    { t: 'Durée du contrat :', d: 'Le présent contrat prend effet le "{{date_debut_bail}}". Il est conclu pour une durée légale de 1 an (meublé) ou 3 ans (nu) tacitement reconductible.' },
    { t: 'Révision annuelle IRL :', d: 'Le loyer sera révisé automatiquement chaque année selon la variation de l\'Indice de Référence des Loyers (IRL) publié par l\'INSEE.' },
    { t: 'Destination des lieux :', d: 'Les locaux sont destinés exclusivement à l\'habitation principale. Toute sous-location totale ou partielle est strictement interdite sans accord écrit du bailleur.' },
    { t: 'Dépôt de garantie :', d: 'Le dépôt de garantie de "{{depot_garantie}}" sera restitué dans un délai maximal de 1 mois (conforme) ou 2 mois (avec dégradations), déduction faite des sommes dues.' },
    { t: 'Clause résolutoire :', d: 'À défaut de paiement du loyer ou des charges au terme convenu, ou à défaut d\'assurance locative, le bail sera résilié de plein droit après commandement infructueux.' }
  ]

  clauses.forEach((c, idx) => {
    const cY = box5Y + box5H - 42 - idx * 42
    page2.drawText(c.t, { x: col1X + 14, y: cY, size: 8, font: fontBold, color: C.blueDark })
    page2.drawText(c.d, { x: col1X + 14, y: cY - 14, size: 7.5, font: fontReg, color: C.body })
  })

  curY2 = box5Y - 20

  // 6 : Signatures
  page2.drawText('Fait à "{{bien_adresse}}" le "{{date_debut_bail}}"', { x: col1X + 14, y: curY2, size: 8, font: fontReg, color: C.muted })
  curY2 -= 18

  page2.drawText('Le Bailleur :', { x: col1X + 14, y: curY2, size: 9.1, font: fontBold, color: C.dark })
  page2.drawText('Le Locataire :', { x: col2X + 14, y: curY2, size: 9.1, font: fontBold, color: C.dark })

  page2.drawLine({ start: { x: col1X + 14, y: curY2 - 50 }, end: { x: 260, y: curY2 - 50 }, thickness: 0.8, color: C.border })
  page2.drawLine({ start: { x: col2X + 14, y: curY2 - 50 }, end: { x: 538, y: curY2 - 50 }, thickness: 0.8, color: C.border })

  page2.drawText('Signature précédée de la mention "Lu et approuvé"', { x: col1X + 14, y: curY2 - 62, size: 6.8, font: fontItalic, color: C.muted })
  page2.drawText('Signature précédée de la mention "Lu et approuvé"', { x: col2X + 14, y: curY2 - 62, size: 6.8, font: fontItalic, color: C.muted })

  drawFooter(page2, fontBold, fontReg, 2, 2)

  const pdfBytes = await doc.save()
  fs.writeFileSync(path.join(outDir, 'modele_contrat_bail.pdf'), pdfBytes)
  console.log('✓ modele_contrat_bail.pdf harmonisé généré avec succès !')
}

await createQuittancePDF()
await createAvisEcheancePDF()
await createEtatDesLieuxPDF()
await createContratBailPDF()
console.log('--- TOUS LES MODÈLES PDF ONT ÉTÉ GÉNÉRÉS ET HARMONISÉS SUR LA NOUVELLE CHARTE VISUELLE ! ---')
