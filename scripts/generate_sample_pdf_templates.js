import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../templates/pdf')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

// Couleurs KeyFolio Design System
const KF = {
  primary: [79, 70, 229],
  primaryLight: [238, 242, 255],
  success: [22, 163, 74],
  successLight: [220, 252, 231],
  dark: [15, 23, 42],
  body: [51, 65, 85],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  bgCard: [248, 250, 252],
  bgBadge: [241, 245, 249]
}

function drawHeader(doc, title, subtitle, ref) {
  const y = 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...KF.primary)
  doc.text('KEYFOLIO', 14, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF.muted)
  doc.text('OS PATRIMOINE & GESTION LOCATIVE', 14, y + 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...KF.dark)
  doc.text(title.toUpperCase(), 196, y + 3, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.muted)
  doc.text(`RÉFÉRENCE : ${ref}`, 196, y + 8, { align: 'right' })

  doc.setDrawColor(...KF.border)
  doc.setLineWidth(0.4)
  doc.line(14, y + 12, 196, y + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...KF.dark)
  doc.text('{{bien_adresse}}', 14, y + 19)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...KF.muted)
  doc.text(`{{bien_surface}} · {{bien_type}} · ${subtitle} · Établi le {{date_jour}}`, 14, y + 24)

  doc.line(14, y + 29, 196, y + 29)
  return y + 35
}

function drawFooter(doc, pageNum, totalPages, ref) {
  const y = 286
  doc.setDrawColor(...KF.border)
  doc.setLineWidth(0.3)
  doc.line(14, y - 3, 196, y - 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text(`Document modèle officiel KeyFolio OS Patrimoine — Réf. ${ref}`, 14, y + 1)
  doc.text(`Page ${pageNum} sur ${totalPages}`, 196, y + 1, { align: 'right' })
}

// ─── 1. MODÈLE ÉTAT DES LIEUX ───
function createEtatDesLieuxTemplate() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = 'KF-EDL-2026-0001'

  // Page 1
  let y = drawHeader(doc, "ÉTAT DES LIEUX CONTRADICTOIRE", "Document contradictoire officiel — Décret n° 2016-382", ref)

  // 01 — Parties
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('01 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('DÉSIGNATION DES PARTIES & LOGEMENT', 23, y)
  y += 6

  // Fiches Bailleur & Locataire
  doc.setFillColor(...KF.bgCard)
  doc.setDrawColor(...KF.border)
  doc.roundedRect(14, y, 88, 32, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('BAILLEUR (PROPRIÉTAIRE)', 20, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF.dark)
  doc.text('{{bailleur_nom}}', 20, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('{{bailleur_adresse}}', 20, y + 17)
  doc.text('Tél : {{bailleur_telephone}}  |  {{bailleur_email}}', 20, y + 23)

  doc.roundedRect(108, y, 88, 32, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('LOCATAIRE (PRENEUR)', 114, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF.dark)
  doc.text('{{locataire_nom}}', 114, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('{{bien_adresse}}', 114, y + 17)
  doc.text('Tél : {{locataire_telephone}}  |  {{locataire_email}}', 114, y + 23)
  y += 39

  // 02 — Compteurs & Clés
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('02 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('RELEVÉ DES COMPTEURS & MOYENS D\'ACCÈS', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y, 182, 22, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF.dark)
  doc.text('INDEX COMPTEURS : Élec : {{index_elec}}  ·  Eau : {{index_eau}}  ·  Gaz : {{index_gaz}}', 20, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF.body)
  doc.text('Clés et accès remis : {{cles_remises}}', 20, y + 14)
  y += 28

  // 03 — Grille des pièces
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('03 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('CONSTAT DÉTAILLÉ PAR PIÈCE', 23, y)
  y += 6

  const tableX = 14
  const rowH = 6.5
  doc.setFillColor(...KF.bgBadge)
  doc.rect(tableX, y, 182, rowH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF.dark)
  doc.text('PIÈCE / ÉLÉMENT', tableX + 4, y + 4.5)
  doc.text('ÉTAT CONSTATÉ', tableX + 60, y + 4.5)
  doc.text('OBSERVATIONS & ÉQUIPEMENTS', tableX + 105, y + 4.5)
  y += rowH

  const pieces = [
    { n: 'Entrée / Dégagement', e: 'Bon état', o: 'Murs et interphone fonctionnels' },
    { n: 'Séjour / Salon', e: 'Très bon état', o: 'Sols propres, fenêtres conformes' },
    { n: 'Cuisine', e: 'Bon état', o: 'Évier et plaques nettoyés et testés' },
    { n: 'Chambre(s)', e: 'Très bon état', o: 'Revêtement et prises OK' },
    { n: 'Salle d\'eau / WC', e: 'Bon état', o: 'Robinetterie et sanitaires sans fuite' }
  ]

  pieces.forEach((p, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252)
    doc.rect(tableX, y, 182, rowH, 'F')
    doc.setDrawColor(...KF.border)
    doc.line(tableX, y + rowH, tableX + 182, y + rowH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...KF.dark)
    doc.text(p.n, tableX + 4, y + 4.5)
    doc.setFont('helvetica', 'normal')
    doc.text(p.e, tableX + 60, y + 4.5)
    doc.setTextColor(...KF.body)
    doc.text(p.o, tableX + 105, y + 4.5)
    y += rowH
  })

  drawFooter(doc, 1, 2, ref)

  // Page 2
  doc.addPage()
  let y2 = 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('04 —', 14, y2)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('SYNTHÈSE DU DÉPÔT DE GARANTIE', 23, y2)
  y2 += 6

  doc.setFillColor(...KF.bgCard)
  doc.setDrawColor(...KF.border)
  doc.roundedRect(14, y2, 182, 32, 3, 3, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('Dépôt de garantie initial versé : {{depot_garantie}}', 22, y2 + 7)
  doc.text('Retenues éventuelles pour travaux : {{montant_retenu}}', 22, y2 + 13)

  doc.setFillColor(...KF.successLight)
  doc.roundedRect(22, y2 + 17, 166, 11, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF.success)
  doc.text('SOLDE NET RESTITUÉ :', 26, y2 + 24)
  doc.text('{{solde_restitue}}', 180, y2 + 24, { align: 'right' })
  y2 += 38

  // Observations
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('05 —', 14, y2)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('OBSERVATIONS GÉNÉRALES', 23, y2)
  y2 += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y2, 182, 24, 3, 3, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...KF.body)
  doc.text('Logement remis en bon état général. Le présent état des lieux a été établi contradictoirement entre les parties.', 20, y2 + 8)
  y2 += 30

  // Signatures
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('06 —', 14, y2)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('SIGNATURES CONTRADICTOIRES', 23, y2)
  y2 += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y2, 88, 34, 2.5, 2.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF.dark)
  doc.text('Pour le Bailleur : {{bailleur_nom}}', 18, y2 + 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('Mention manuscrite "Lu et approuvé"', 18, y2 + 11)

  doc.roundedRect(108, y2, 88, 34, 2.5, 2.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...KF.dark)
  doc.text('Pour le Locataire : {{locataire_nom}}', 112, y2 + 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('Mention manuscrite "Lu et approuvé"', 112, y2 + 11)

  drawFooter(doc, 2, 2, ref)

  const pdfOutput = doc.output('arraybuffer')
  fs.writeFileSync(path.join(outDir, 'modele_etat_des_lieux.pdf'), Buffer.from(pdfOutput))
  console.log('✓ modele_etat_des_lieux.pdf synchronisé !')
}

// ─── 2. MODÈLE CONTRAT DE BAIL ───
function createContratBailTemplate() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = 'KF-BAIL-2026-0040'

  // Page 1
  let y = drawHeader(doc, "CONTRAT DE LOCATION", "Bail d'habitation — Loi ALUR (Décret n° 2015-587)", ref)

  // 01 — Parties
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('01 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('DÉSIGNATION DES PARTIES CONTRACTANTES', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.setDrawColor(...KF.border)
  doc.roundedRect(14, y, 88, 34, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('BAILLEUR (PROPRIÉTAIRE)', 20, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF.dark)
  doc.text('{{bailleur_nom}}', 20, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('{{bailleur_adresse}}', 20, y + 17)
  doc.text('Tél : {{bailleur_telephone}}', 20, y + 23)
  doc.text('Email : {{bailleur_email}}', 20, y + 28)

  doc.roundedRect(108, y, 88, 34, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('LOCATAIRE (PRENEUR)', 114, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF.dark)
  doc.text('{{locataire_nom}}', 114, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('{{bien_adresse}}', 114, y + 17)
  doc.text('Tél : {{locataire_telephone}}', 114, y + 23)
  doc.text('Email : {{locataire_email}}', 114, y + 28)
  y += 40

  // 02 — Logement
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('02 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('OBJET DU CONTRAT & LOCAUX LOUÉS', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y, 182, 30, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('ADRESSE DU LOGEMENT', 20, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.dark)
  doc.text('{{bien_adresse}}', 20, y + 11)

  const metrics = [
    { label: 'SURFACE', val: '{{bien_surface}}' },
    { label: 'PIÈCES', val: '{{bien_pieces}}' },
    { label: 'RÉGIME', val: '{{bien_type}}' },
    { label: 'PRISE D\'EFFET', val: '{{date_debut_bail}}' }
  ]
  metrics.forEach((m, idx) => {
    const bx = 20 + idx * 43
    doc.setFillColor(...KF.bgBadge)
    doc.roundedRect(bx, y + 14, 41, 12, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...KF.dark)
    doc.text(m.val, bx + 20.5, y + 19.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...KF.muted)
    doc.text(m.label, bx + 20.5, y + 23.5, { align: 'center' })
  })
  y += 36

  // 03 — Finances
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('03 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('CONDITIONS FINANCIÈRES & DÉPÔT DE GARANTIE', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y, 182, 38, 3, 3, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...KF.body)
  doc.text('Loyer mensuel principal hors charges', 22, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.text('{{loyer_hc}}', 100, y + 8, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.text('Provisions mensuelles sur charges', 22, y + 14)
  doc.setFont('helvetica', 'bold')
  doc.text('{{charges}}', 100, y + 14, { align: 'right' })
  doc.line(22, y + 17, 100, y + 17)

  doc.setFillColor(...KF.primaryLight)
  doc.roundedRect(114, y + 5, 74, 20, 2.5, 2.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.primary)
  doc.text('TOTAL MENSUEL CHARGES COMPRISES', 151, y + 10.5, { align: 'center' })
  doc.setFontSize(14)
  doc.text('{{montant_total}}', 151, y + 19, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.muted)
  doc.text('Dépôt de garantie exigé à l\'entrée : {{depot_garantie}}  ·  Paiement exigible le 5 de chaque mois', 22, y + 32)

  drawFooter(doc, 1, 3, ref)

  const pdfOutput = doc.output('arraybuffer')
  fs.writeFileSync(path.join(outDir, 'modele_contrat_bail.pdf'), Buffer.from(pdfOutput))
  console.log('✓ modele_contrat_bail.pdf synchronisé !')
}

// ─── 3. MODÈLE QUITTANCE ───
function createQuittanceTemplate() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = 'KF-QUITT-2026-0012'

  let y = drawHeader(doc, "QUITTANCE DE LOYER", "Période acquittée : {{periode}}", ref)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('01 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('BAILLEUR & LOCATAIRE', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.setDrawColor(...KF.border)
  doc.roundedRect(14, y, 88, 30, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('BAILLEUR', 20, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF.dark)
  doc.text('{{bailleur_nom}}', 20, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('{{bailleur_adresse}}', 20, y + 17)

  doc.roundedRect(108, y, 88, 30, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.muted)
  doc.text('LOCATAIRE', 114, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...KF.dark)
  doc.text('{{locataire_nom}}', 114, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('{{bien_adresse}}', 114, y + 17)
  y += 36

  // 02 — Sommes
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('02 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('DÉTAIL DES SOMMES ACQUITTÉES', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y, 182, 38, 3, 3, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...KF.body)
  doc.text('Loyer mensuel principal hors charges', 22, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.text('{{loyer_hc}}', 100, y + 8, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.text('Provisions sur charges locatives', 22, y + 14)
  doc.setFont('helvetica', 'bold')
  doc.text('{{charges}}', 100, y + 14, { align: 'right' })
  doc.line(22, y + 17, 100, y + 17)

  doc.setFillColor(...KF.primaryLight)
  doc.roundedRect(114, y + 5, 74, 20, 2.5, 2.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...KF.primary)
  doc.text('TOTAL REÇU EN RÈGLEMENT', 151, y + 10.5, { align: 'center' })
  doc.setFontSize(14)
  doc.text('{{montant_total}}', 151, y + 19, { align: 'center' })
  y += 44

  // Attestation
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...KF.primary)
  doc.text('03 —', 14, y)
  doc.setFontSize(10.5)
  doc.setTextColor(...KF.dark)
  doc.text('ATTESTATION DE PAIEMENT', 23, y)
  y += 6

  doc.setFillColor(...KF.bgCard)
  doc.roundedRect(14, y, 182, 28, 3, 3, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...KF.body)
  doc.text('Je soussigné(e) {{bailleur_nom}}, propriétaire du logement situé au {{bien_adresse}}, certifie avoir reçu de {{locataire_nom}} la somme de {{montant_total}} au titre du paiement intégral du loyer et des charges pour la période mentionnée.', 20, y + 8, { maxWidth: 172 })

  drawFooter(doc, 1, 1, ref)

  const pdfOutput = doc.output('arraybuffer')
  fs.writeFileSync(path.join(outDir, 'modele_quittance.pdf'), Buffer.from(pdfOutput))
  console.log('✓ modele_quittance.pdf synchronisé !')
}

createEtatDesLieuxTemplate()
createContratBailTemplate()
createQuittanceTemplate()
console.log('Tous les modèles PDF dans templates/pdf/ sont maintenant 100% alignés avec le Design System KeyFolio !')
