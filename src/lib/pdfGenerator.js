import { jsPDF } from 'jspdf'
import { formatEuro, formatDate } from './utils'

/**
 * Génère un PDF officiel et élégant d'État des Lieux Contradictoire de Sortie
 */
export function buildEtatDesLieuxPDF({
  bail, bien, locataire,
  bailleurNom = 'Bailleur / Propriétaire',
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}` : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const bienNom = bien?.nom || bail?.bien_nom || 'Logement'
  const bienAdresse = bien?.adresse || ''

  const soldeRestitue = Math.max(0, parseFloat(depotGarantieInitial || 0) - parseFloat(montantRetenu || 0))

  // Couleurs de la charte
  const primaryColor = [37, 99, 235]    // #2563eb
  const darkColor = [15, 23, 42]        // #0f172a
  const textMuted = [100, 116, 139]     // #64748b
  const bgLight = [248, 250, 252]       // #f8fafc
  const borderLight = [203, 213, 225]   // #cbd5e1

  let y = 16

  // ── EN-TÊTE ──
  doc.setFillColor(...primaryColor)
  doc.rect(14, y, 4, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...darkColor)
  doc.text('ÉTAT DES LIEUX CONTRADICTOIRE DE SORTIE', 22, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...textMuted)
  doc.text('Loi n° 89-462 du 6 juillet 1989 modifiée — Décret n° 2016-382', 22, y + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...primaryColor)
  doc.text('KeyFolio', 196, y + 6, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...textMuted)
  doc.text(`Date : ${formatDate(dateEdl)}`, 196, y + 12, { align: 'right' })

  y += 24

  // Ligne de séparation
  doc.setDrawColor(...borderLight)
  doc.setLineWidth(0.4)
  doc.line(14, y - 2, 196, y - 2)

  // ── CADRES BAILLEUR & LOCATAIRE ──
  const boxWidth = 88
  const boxHeight = 22

  // Box Bailleur
  doc.setFillColor(...bgLight)
  doc.setDrawColor(...borderLight)
  doc.roundedRect(14, y, boxWidth, boxHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...textMuted)
  doc.text('BAILLEUR / REPRÉSENTANT', 18, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...darkColor)
  doc.text(bailleurNom || 'Bailleur', 18, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(bailleurAdresse || 'Adresse non spécifiée', 18, y + 16)

  // Box Locataire
  doc.roundedRect(108, y, boxWidth, boxHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...textMuted)
  doc.text('LOCATAIRE SORTANT', 112, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...darkColor)
  doc.text(locataireFullName, 112, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Logement : ${bienNom}${bienAdresse ? ' — ' + bienAdresse : ''}`, 112, y + 16)

  y += boxHeight + 4

  // ── BANDEAU DATES DU CONTRAT ──
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(14, y, 182, 9, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Date d'entrée : ${formatDate(bail?.date_debut)}`, 18, y + 6)
  doc.text(`Date de sortie : ${formatDate(dateEdl)}`, 85, y + 6)
  doc.text(`Motif : ${bail?.motif_fin || 'Congé locataire'}`, 145, y + 6)

  y += 13

  // ── RELEVÉ DES COMPTEURS & CLÉS ──
  doc.setFillColor(...bgLight)
  doc.roundedRect(14, y, boxWidth, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('INDEX DES COMPTEURS DE SORTIE', 18, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Électricité : ${elecIndex ? elecIndex + ' kWh' : '—'}`, 18, y + 11)
  doc.text(`Eau froide : ${eauIndex ? eauIndex + ' m³' : '—'}`, 18, y + 16)
  doc.text(`Gaz : ${gazIndex ? gazIndex + ' m³' : '—'}`, 18, y + 21)

  // Box Clés
  doc.roundedRect(108, y, boxWidth, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('RESTITUTION DES CLÉS', 112, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(clesRemises || '2 jeux de clés complets remis', 112, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...textMuted)
  doc.text("L'ensemble des clés et accès remis ont été restitués.", 112, y + 18)

  y += 28

  // ── ÉTAT DÉTAILLÉ PAR PIÈCE ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...darkColor)
  doc.text('ÉTAT DÉTAILLÉ PAR PIÈCE & ÉQUIPEMENTS', 14, y)

  y += 3

  // Table header
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, 182, 7, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text('Pièce / Espace', 18, y + 5)
  doc.text('État constaté', 68, y + 5)
  doc.text('Observations & Remarques', 115, y + 5)

  y += 7

  // Rows
  pieces.forEach((p, idx) => {
    const rowH = 7.5
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(14, y, 182, rowH, 'F')
    }
    doc.setDrawColor(...borderLight)
    doc.rect(14, y, 182, rowH, 'D')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...darkColor)
    doc.text(p.nom || '', 18, y + 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(51, 65, 85)
    doc.text(p.etat || '', 68, y + 5)
    doc.text(doc.splitTextToSize(p.obs || 'RAS', 75), 115, y + 5)

    y += rowH
  })

  y += 4

  // ── SYNTHÈSE DÉPÔT DE GARANTIE ──
  doc.setFillColor(...bgLight)
  doc.roundedRect(14, y, 182, 16, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('SYNTHÈSE DU DÉPÔT DE GARANTIE (CAUTION)', 18, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Caution initiale : ${formatEuro(depotGarantieInitial)}`, 18, y + 11)
  doc.text(`Retenue : ${formatEuro(montantRetenu)} (${motifRetenue || 'Aucune'})`, 75, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text(`Solde net à restituer : ${formatEuro(soldeRestitue)}`, 140, y + 11)

  y += 20

  // ── OBSERVATIONS GÉNÉRALES ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('OBSERVATIONS GÉNÉRALES & CLAUSES', 14, y)

  y += 3
  doc.setFillColor(...bgLight)
  doc.roundedRect(14, y, 182, 12, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(51, 65, 85)
  const wrappedObs = doc.splitTextToSize(observationsGenerales || 'Logement restitué propre et en bon état général.', 174)
  doc.text(wrappedObs, 18, y + 5)

  y += 18

  // ── SIGNATURES ──
  doc.setDrawColor(...borderLight)
  doc.line(14, y, 196, y)

  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('Signature du Bailleur :', 18, y)
  doc.text('Signature du Locataire Sortant :', 112, y)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...textMuted)
  doc.text('Mention manuscrite "Lu et approuvé"', 18, y + 4)
  doc.text('Mention manuscrite "Lu et approuvé"', 112, y + 4)

  // Lignes pointillées de signature
  doc.setLineDashPattern([1, 1.5], 0)
  doc.line(18, y + 20, 85, y + 20)
  doc.line(112, y + 20, 180, y + 20)
  doc.setLineDashPattern([], 0)

  // ── PIED DE PAGE ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...textMuted)
  doc.text(
    `Fait en deux exemplaires originaux le ${formatDate(dateEdl)}. Document généré officiellement par KeyFolio — Gestion Immobilière.`,
    105, 288, { align: 'center' }
  )

  return doc
}

/**
 * Génère un PDF officiel de Quittance de Loyer
 */
export function buildQuittancePDF({
  paiement, bien, locataire, bail,
  bailleurNom = 'Bailleur / Propriétaire',
  bailleurAdresse = ''
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const primaryColor = [37, 99, 235]
  const darkColor = [15, 23, 42]
  const textMuted = [100, 116, 139]
  const bgLight = [248, 250, 252]
  const borderLight = [203, 213, 225]

  const locataireNom = locataire ? `${locataire.prenom} ${locataire.nom}` : (paiement?.locataire_nom || 'Locataire')
  const bienNom = bien?.nom || paiement?.bien_nom || 'Logement'
  const bienAdresse = bien?.adresse || ''
  const datePaye = paiement?.date_reelle || paiement?.date_prevue || todayISO()
  const montantTotal = paiement?.montant || (bail?.loyer_mensuel || 0) + (bail?.charges_mensuelles || 0)
  const loyerHC = bail?.loyer_mensuel || (montantTotal - (bail?.charges_mensuelles || 0))
  const charges = bail?.charges_mensuelles || 0

  let y = 20

  // Titre
  doc.setFillColor(...primaryColor)
  doc.rect(16, y, 4, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...darkColor)
  doc.text('QUITTANCE DE LOYER', 24, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...textMuted)
  doc.text('Reçu délivré conformément à l’article 21 de la Loi n° 89-462 du 6 juillet 1989', 24, y + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.text('KeyFolio', 194, y + 6, { align: 'right' })

  y += 26
  doc.setDrawColor(...borderLight)
  doc.line(16, y, 194, y)
  y += 6

  // Box Bailleur & Locataire
  const boxW = 86
  doc.setFillColor(...bgLight)
  doc.roundedRect(16, y, boxW, 26, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...textMuted)
  doc.text('BAILLEUR', 20, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkColor)
  doc.text(bailleurNom, 20, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(bailleurAdresse || 'Adresse non spécifiée', 20, y + 18)

  // Box Locataire
  doc.roundedRect(108, y, boxW, 26, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...textMuted)
  doc.text('LOCATAIRE', 112, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkColor)
  doc.text(locataireNom, 112, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(`Logement : ${bienNom}`, 112, y + 18)
  if (bienAdresse) doc.text(bienAdresse, 112, y + 23)

  y += 34

  // Détail de la période
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(16, y, 178, 10, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(`Période d'échéance : ${formatDate(paiement?.date_prevue)}`, 20, y + 6.5)
  doc.text(`Date du règlement : ${formatDate(datePaye)}`, 110, y + 6.5)

  y += 16

  // Tableau Montants
  doc.setFillColor(241, 245, 249)
  doc.rect(16, y, 178, 8, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text('Désignation', 20, y + 5.5)
  doc.text('Montant (€)', 188, y + 5.5, { align: 'right' })

  y += 8

  // Loyer HC
  doc.rect(16, y, 178, 8, 'D')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...darkColor)
  doc.text('Loyer principal (hors charges)', 20, y + 5.5)
  doc.text(formatEuro(loyerHC), 188, y + 5.5, { align: 'right' })

  y += 8

  // Charges
  doc.rect(16, y, 178, 8, 'D')
  doc.text('Provisions sur charges locatives', 20, y + 5.5)
  doc.text(formatEuro(charges), 188, y + 5.5, { align: 'right' })

  y += 8

  // Total
  doc.setFillColor(241, 245, 249)
  doc.rect(16, y, 178, 10, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(22, 101, 52)
  doc.text('TOTAL REÇU ET ACQUITTÉ', 20, y + 6.5)
  doc.text(formatEuro(montantTotal), 188, y + 6.5, { align: 'right' })

  y += 20

  // Attestation
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const attestation = `Je soussigné ${bailleurNom}, propriétaire du logement désigné ci-dessus, atteste avoir reçu de ${locataireNom} la somme de ${formatEuro(montantTotal)} au titre du paiement du loyer et des charges pour la période mentionnée.`
  doc.text(doc.splitTextToSize(attestation, 178), 16, y)

  y += 24

  // Signature
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...darkColor)
  doc.text('Signature du Bailleur :', 130, y)

  doc.setLineDashPattern([1, 1.5], 0)
  doc.line(130, y + 25, 188, y + 25)
  doc.setLineDashPattern([], 0)

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...textMuted)
  doc.text('Document certifié et émis via KeyFolio.', 105, 286, { align: 'center' })

  return doc
}

/**
 * Génère un Contrat de Location Type officiel conforme à la Loi ALUR (Décret n° 2015-587)
 */
export function buildContratBailPDF({
  bail, bien, locataire,
  bailleurNom = 'Bailleur / Propriétaire',
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
  equipements = 'Cuisine équipée, literie, rangements, luminaires',
  clausesParticulieres = ''
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const primaryColor = [37, 99, 235]    // #2563eb
  const darkColor = [15, 23, 42]        // #0f172a
  const textMuted = [100, 116, 139]     // #64748b
  const bgLight = [248, 250, 252]       // #f8fafc
  const borderLight = [203, 213, 225]   // #cbd5e1

  const isMeuble = typeBail === 'meuble' || typeBail === 'etudiant' || typeBail === 'mobilite'
  const dureeLegale = isMeuble ? (typeBail === 'etudiant' ? '9 mois' : typeBail === 'mobilite' ? '1 à 10 mois' : '1 an (tacitement reconductible)') : '3 ans (tacitement reconductible)'
  const typeLabel = isMeuble ? 'CONTRAT DE LOCATION DE LOGEMENT MEUBLÉ' : 'CONTRAT DE LOCATION DE LOGEMENT NON MEUBLÉ'

  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}` : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const totalLoyer = parseFloat(loyerHC || 0) + parseFloat(charges || 0)

  // ═══════════════════════════════════════════════════════════
  // PAGE 1 : DÉSIGNATION DES PARTIES & OBJET DU CONTRAT
  // ═══════════════════════════════════════════════════════════
  let y = 16

  // En-tête officiel
  doc.setFillColor(...primaryColor)
  doc.rect(14, y, 4, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...darkColor)
  doc.text(typeLabel, 22, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...textMuted)
  doc.text('Contrat type régi par la Loi n° 89-462 du 6 juillet 1989 modifiée par la Loi ALUR (Décret n° 2015-587)', 22, y + 11)
  doc.text('Soumis au titre Ier bis de la loi du 6 juillet 1989', 22, y + 15)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...primaryColor)
  doc.text('KeyFolio', 196, y + 6, { align: 'right' })

  y += 24
  doc.setDrawColor(...borderLight)
  doc.line(14, y, 196, y)
  y += 5

  // 1. DÉSIGNATION DES PARTIES
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text('I. DÉSIGNATION DES PARTIES', 14, y)
  y += 4

  const boxW = 88
  // Box Bailleur
  doc.setFillColor(...bgLight)
  doc.setDrawColor(...borderLight)
  doc.roundedRect(14, y, boxW, 30, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...textMuted)
  doc.text('LE BAILLEUR (OU SON MANDATAIRE)', 18, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...darkColor)
  doc.text(bailleurNom, 18, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Adresse : ${bailleurAdresse || 'Non spécifiée'}`, 18, y + 16)
  if (bailleurEmail) doc.text(`Email : ${bailleurEmail}`, 18, y + 21)
  if (bailleurTelephone) doc.text(`Tél : ${bailleurTelephone}`, 18, y + 26)

  // Box Locataire
  doc.roundedRect(108, y, boxW, 30, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...textMuted)
  doc.text('LE LOCATAIRE', 112, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...darkColor)
  doc.text(locataireFullName, 112, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  if (locataire?.email) doc.text(`Email : ${locataire.email}`, 112, y + 16)
  if (locataire?.telephone) doc.text(`Tél : ${locataire.telephone}`, 112, y + 21)
  if (locataire?.profession) doc.text(`Profession : ${locataire.profession}`, 112, y + 26)

  y += 35

  // 2. OBJET DU CONTRAT & LOGEMENT
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text('II. OBJET DU CONTRAT & DÉSIGNATION DU LOGEMENT', 14, y)
  y += 4

  doc.setFillColor(...bgLight)
  doc.roundedRect(14, y, 182, 34, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(`• Dénomination du bien : ${bien?.nom || 'Logement'}`, 18, y + 6)
  doc.text(`• Adresse : ${bien?.adresse || 'Non spécifiée'}`, 18, y + 12)
  doc.text(`• Surface habitable : ${bien?.surface_m2 ? bien.surface_m2 + ' m²' : 'Non précisée'} | Type : ${bien?.type_bien || 'Appartement'}`, 18, y + 18)
  doc.text(`• Destination des lieux : Usage exclusif d'habitation principale`, 18, y + 24)
  doc.text(`• Régime juridique : Logement ${isMeuble ? 'meublé équipé' : 'nu / vide'} selon inventaire annexé`, 18, y + 30)

  y += 39

  // 3. CONDITIONS FINANCIÈRES
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text('III. CONDITIONS FINANCIÈRES & MODALITÉS DE PAIEMENT', 14, y)
  y += 4

  // Tableau loyer
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, 182, 7, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text('Élément financier', 18, y + 5)
  doc.text('Montant mensuel (€)', 190, y + 5, { align: 'right' })

  y += 7
  doc.setDrawColor(...borderLight)
  doc.rect(14, y, 182, 7, 'D')
  doc.setFont('helvetica', 'normal')
  doc.text('Loyer principal de base (hors charges)', 18, y + 5)
  doc.text(formatEuro(loyerHC), 190, y + 5, { align: 'right' })

  y += 7
  doc.rect(14, y, 182, 7, 'D')
  doc.text('Provisions sur charges locatives (avec régularisation annuelle)', 18, y + 5)
  doc.text(formatEuro(charges), 190, y + 5, { align: 'right' })

  y += 7
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, 182, 8, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('TOTAL MENSUEL CHARGES COMPRISES', 18, y + 5.5)
  doc.text(formatEuro(totalLoyer), 190, y + 5.5, { align: 'right' })

  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`• Modalité de paiement : Le loyer est payable d'avance le ${jourPaiement} de chaque mois par virement bancaire.`, 18, y)
  y += 5
  doc.text(`• Dépôt de garantie (Caution) : ${formatEuro(depotGarantie)} versé à la signature du bail.`, 18, y)
  y += 5
  doc.text(`• Révision annuelle du loyer : ${clauseIRL ? "Prévue selon l'Indice de Référence des Loyers (IRL) publié par l'INSEE." : 'Non applicable.'}`, 18, y)

  y += 12

  // 4. DURÉE & PRISE D'EFFET
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text('IV. DURÉE DU CONTRAT & PRISE D\'EFFET', 14, y)
  y += 4

  doc.setFillColor(...bgLight)
  doc.roundedRect(14, y, 182, 20, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`• Date de prise d'effet du contrat : ${formatDate(dateDebut)}`, 18, y + 5)
  doc.text(`• Durée du bail : ${dureeLegale}`, 18, y + 10)
  doc.text(`• Conditions de congé : Préavis légal de 1 mois pour le locataire (meublé/zone tendue) et 3 mois pour le bailleur (pour vente ou reprise).`, 18, y + 15)

  y += 26

  // 5. COMPTEURS D'ENTRÉE & CLAUSES
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text('V. RELEVÉ DES COMPTEURS & CLAUSES', 14, y)
  y += 4

  doc.setFillColor(...bgLight)
  doc.roundedRect(14, y, 182, 16, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Index entrée — Électricité : ${elecEntree ? elecEntree + ' kWh' : '—'} | Eau : ${eauEntree ? eauEntree + ' m³' : '—'} | Gaz : ${gazEntree ? gazEntree + ' m³' : '—'}`, 18, y + 5)
  doc.text(`Clause résolutoire : Résiliation de plein droit en cas de non-paiement du loyer ou des charges, ou de défaut d'assurance.`, 18, y + 11)

  y += 22

  // 6. SIGNATURES
  doc.setDrawColor(...borderLight)
  doc.line(14, y, 196, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('Fait le ' + formatDate(dateDebut || todayISO()) + ' en autant d’exemplaires originaux que de parties.', 14, y)

  y += 6
  doc.text('Le Bailleur (ou mandataire) :', 18, y)
  doc.text('Le Locataire :', 112, y)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...textMuted)
  doc.text('Mention manuscrite "Lu et approuvé"', 18, y + 4)
  doc.text('Mention manuscrite "Lu et approuvé"', 112, y + 4)

  doc.setLineDashPattern([1, 1.5], 0)
  doc.line(18, y + 18, 85, y + 18)
  doc.line(112, y + 18, 180, y + 18)
  doc.setLineDashPattern([], 0)

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...textMuted)
  doc.text('Contrat type conforme Loi ALUR généré via KeyFolio.', 105, 288, { align: 'center' })

  return doc
}

