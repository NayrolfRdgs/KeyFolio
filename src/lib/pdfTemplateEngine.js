import { PDFDocument, PDFName } from 'pdf-lib'
import { inflate, inflateRaw, deflate } from 'pako'
import { formatEuro, formatDate, todayISO } from './utils.js'

/**
 * Dictionnaire complet des variables de données disponibles dans KeyFolio
 */
export const AVAILABLE_VARIABLES = [
  // Bailleur
  { key: 'bailleur_nom', label: 'Nom du Bailleur', category: 'Bailleur', sample: 'M. Jean DUPONT' },
  { key: 'bailleur_adresse', label: 'Adresse du Bailleur', category: 'Bailleur', sample: '12 rue de la Paix, 75002 Paris' },
  { key: 'bailleur_email', label: 'Email du Bailleur', category: 'Bailleur', sample: 'contact@sci-dupont.fr' },
  { key: 'bailleur_telephone', label: 'Téléphone du Bailleur', category: 'Bailleur', sample: '06 12 34 56 78' },
  { key: 'bailleur_iban', label: 'IBAN du Bailleur', category: 'Bailleur', sample: 'FR76 3000 4000 5000 6000 7000 890' },
  { key: 'bailleur_bic', label: 'BIC / SWIFT', category: 'Bailleur', sample: 'BNPAFRPP' },

  // Locataire
  { key: 'locataire_nom', label: 'Nom & Prénom du Locataire', category: 'Locataire', sample: 'Mme Sophie MARTIN' },
  { key: 'locataire_prenom', label: 'Prénom du Locataire', category: 'Locataire', sample: 'Sophie' },
  { key: 'locataire_email', label: 'Email du Locataire', category: 'Locataire', sample: 'sophie.martin@email.fr' },
  { key: 'locataire_telephone', label: 'Téléphone du Locataire', category: 'Locataire', sample: '06 98 76 54 32' },

  // Bien
  { key: 'bien_nom', label: 'Nom du Bien', category: 'Bien', sample: 'Appartement T2 Centre' },
  { key: 'bien_adresse', label: 'Adresse complète du Bien', category: 'Bien', sample: '45 avenue Victor Hugo, 69006 Lyon' },
  { key: 'bien_surface', label: 'Surface habitable (m²)', category: 'Bien', sample: '52 m²' },
  { key: 'bien_pieces', label: 'Nombre de pièces', category: 'Bien', sample: '2 pièces' },
  { key: 'bien_type', label: 'Type de bien / Régime', category: 'Bien', sample: 'Meublé' },

  // Financier
  { key: 'loyer_hc', label: 'Loyer Hors Charges (€)', category: 'Financier', sample: '680,00 €' },
  { key: 'charges', label: 'Provisions sur Charges (€)', category: 'Financier', sample: '70,00 €' },
  { key: 'montant_total', label: 'Montant Total Loyer + Charges (€)', category: 'Financier', sample: '750,00 €' },
  { key: 'depot_garantie', label: 'Dépôt de Garantie / Caution (€)', category: 'Financier', sample: '680,00 €' },
  { key: 'montant_retenu', label: 'Montant Retenu sur Caution (€)', category: 'Financier', sample: '50,00 €' },
  { key: 'solde_restitue', label: 'Solde Net Restitué (€)', category: 'Financier', sample: '630,00 €' },
  { key: 'motif_retenue', label: 'Motif de la Retenue', category: 'Financier', sample: 'Nettoyage moquette et réfection joint' },

  // Dates & Période
  { key: 'periode', label: 'Période / Mois concerné', category: 'Date', sample: 'Août 2026' },
  { key: 'date_jour', label: 'Date du jour', category: 'Date', sample: '27/08/2026' },
  { key: 'date_paiement', label: 'Date de règlement', category: 'Date', sample: '05/08/2026' },
  { key: 'date_echeance', label: 'Date d\'échéance', category: 'Date', sample: '05/08/2026' },
  { key: 'date_debut_bail', label: 'Date d\'entrée / Début du bail', category: 'Date', sample: '01/09/2024' },
  { key: 'date_fin_bail', label: 'Date de sortie / Fin du bail', category: 'Date', sample: '31/08/2026' },
  { key: 'motif_fin', label: 'Motif de fin de bail', category: 'Gestion', sample: 'Départ convenu / Congé locataire' },

  // Technique / Compteurs
  { key: 'index_elec', label: 'Index Électricité (kWh)', category: 'Technique', sample: '14 250 kWh' },
  { key: 'index_eau', label: 'Index Eau (m³)', category: 'Technique', sample: '385 m³' },
  { key: 'index_gaz', label: 'Index Gaz (m³)', category: 'Technique', sample: '890 m³' },
  { key: 'cles_remises', label: 'Clés & Accès remis', category: 'Technique', sample: '2 jeux complets + 1 badge Vigik' }
]

/**
 * Décodeur ASCII85 pour les flux PDF
 */
function decodeAscii85(str) {
  let clean = str.replace(/\s+/g, '')
  if (clean.startsWith('<~')) clean = clean.slice(2)
  if (clean.endsWith('~>')) clean = clean.slice(0, -2)

  const out = []
  let count = 0
  let tuple = 0
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i)
    if (c === 122 && count === 0) {
      out.push(0, 0, 0, 0)
      continue
    }
    if (c < 33 || c > 117) continue
    tuple = tuple * 85 + (c - 33)
    count++
    if (count === 5) {
      out.push((tuple >> 24) & 255, (tuple >> 16) & 255, (tuple >> 8) & 255, tuple & 255)
      tuple = 0
      count = 0
    }
  }
  if (count > 0) {
    const padding = 5 - count
    for (let i = 0; i < padding; i++) tuple = tuple * 85 + 84
    for (let i = 0; i < count - 1; i++) {
      out.push((tuple >> (24 - 8 * i)) & 255)
    }
  }
  return new Uint8Array(out)
}

/**
 * Échappement des caractères spéciaux et accents français en notation PDF Standard
 */
function escapePdfString(str) {
  if (!str) return ''
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/é/g, '\\351')
    .replace(/è/g, '\\350')
    .replace(/ê/g, '\\352')
    .replace(/ë/g, '\\353')
    .replace(/à/g, '\\340')
    .replace(/â/g, '\\342')
    .replace(/ù/g, '\\371')
    .replace(/û/g, '\\373')
    .replace(/ô/g, '\\364')
    .replace(/î/g, '\\356')
    .replace(/ï/g, '\\357')
    .replace(/ç/g, '\\347')
    .replace(/É/g, '\\311')
    .replace(/È/g, '\\310')
    .replace(/À/g, '\\300')
    .replace(/Ô/g, '\\324')
    .replace(/—/g, '\\227')
    .replace(/–/g, '-')
    .replace(/€/g, '\\200')
}

/**
 * Construit un objet de contexte de données complet à partir des modèles de la BDD
 */
export function buildDataContext({
  bail = null,
  bien = null,
  locataire = null,
  periode = '',
  dateDoc = '',
  loyerHC = null,
  charges = null,
  depotGarantie = null,
  montantRetenu = 0,
  motifRetenue = '',
  motifFin = '',
  elecIndex = '',
  eauIndex = '',
  gazIndex = '',
  clesRemises = '',
  bailleurNom = '',
  bailleurAdresse = '',
  bailleurEmail = '',
  bailleurTelephone = '',
  bailleurIban = '',
  bailleurBic = '',
  customValues = {}
}) {
  const locFullName = locataire
    ? `${locataire.prenom || ''} ${locataire.nom || ''}`.trim()
    : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'

  const finalLoyerHC = loyerHC !== null && loyerHC !== undefined
    ? parseFloat(loyerHC)
    : parseFloat(bail?.loyer_mensuel || 0)

  const finalCharges = charges !== null && charges !== undefined
    ? parseFloat(charges)
    : parseFloat(bail?.charges_mensuelles || 0)

  const total = finalLoyerHC + finalCharges

  const caution = depotGarantie !== null && depotGarantie !== undefined
    ? parseFloat(depotGarantie)
    : parseFloat(bail?.depot_garantie || 0)

  const retenu = parseFloat(montantRetenu || 0)
  const solde = Math.max(0, caution - retenu)

  const getLs = (k) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null
    } catch (e) {
      return null
    }
  }

  return {
    bailleur_nom: bailleurNom || customValues.bailleur_nom || getLs('bailleur_nom') || 'Bailleur / Propriétaire',
    bailleur_adresse: bailleurAdresse || customValues.bailleur_adresse || getLs('bailleur_adresse') || 'Adresse du bailleur',
    bailleur_email: bailleurEmail || customValues.bailleur_email || getLs('bailleur_email') || '',
    bailleur_telephone: bailleurTelephone || customValues.bailleur_telephone || getLs('bailleur_telephone') || '',
    bailleur_iban: bailleurIban || customValues.bailleur_iban || getLs('bailleur_iban') || 'FR76 3000 4000 5000 6000 7000 890',
    bailleur_bic: bailleurBic || customValues.bailleur_bic || getLs('bailleur_bic') || 'BNPAFRPP',

    locataire_nom: locFullName,
    locataire_prenom: locataire?.prenom || bail?.locataire_prenom || '',
    locataire_email: locataire?.email || bail?.locataire_email || '',
    locataire_telephone: locataire?.telephone || bail?.locataire_telephone || '',

    bien_nom: bien?.nom || bail?.bien_nom || 'Logement',
    bien_adresse: bien?.adresse || bail?.bien_adresse || 'Adresse du logement',
    bien_surface: bien?.surface_m2 ? `${bien.surface_m2} m²` : (bail?.bien_surface ? `${bail.bien_surface} m²` : ''),
    bien_pieces: bien?.nb_pieces ? `${bien.nb_pieces} pièce(s)` : '2 pièces',
    bien_type: (bail?.type_bail === 'meuble' || bien?.type_bien?.toLowerCase().includes('meubl')) ? 'Meublé' : 'Nu',

    loyer_hc: formatEuro(finalLoyerHC),
    charges: formatEuro(finalCharges),
    montant_total: formatEuro(total),
    depot_garantie: formatEuro(caution),
    montant_retenu: formatEuro(retenu),
    solde_restitue: formatEuro(solde),
    motif_retenue: motifRetenue || '',

    periode: periode || formatDate(dateDoc || todayISO()),
    date_jour: formatDate(todayISO()),
    date_paiement: formatDate(dateDoc || todayISO()),
    date_echeance: formatDate(dateDoc || todayISO()),
    date_debut_bail: formatDate(bail?.date_debut || todayISO()),
    date_fin_bail: formatDate(dateDoc || bail?.date_fin || todayISO()),
    motif_fin: motifFin || bail?.motif_fin || 'Départ convenu / Congé locataire',

    index_elec: elecIndex ? (String(elecIndex).includes('kWh') ? elecIndex : `${elecIndex} kWh`) : '—',
    index_eau: eauIndex ? (String(eauIndex).includes('m³') ? eauIndex : `${eauIndex} m³`) : '—',
    index_gaz: gazIndex ? (String(gazIndex).includes('m³') ? gazIndex : `${gazIndex} m³`) : '—',
    cles_remises: clesRemises || '2 jeux complets (porte + boîte aux lettres + badge)'
  }
}

/**
 * Remplit directement un fichier PDF modèle en remplaçant toutes les balises textuelles {{...}}
 */
export async function fillPdfTemplate(pdfBytes, dataContext) {
  const doc = await PDFDocument.load(pdfBytes)

  // 1. Remplissage des formulaires interactifs s'il y en a (AcroForm)
  try {
    const form = doc.getForm()
    const fields = form ? form.getFields() : []
    if (fields && fields.length > 0) {
      fields.forEach(field => {
        const name = field.getName().toLowerCase().replace(/[{}_-]/g, '').trim()
        const matchedEntry = Object.entries(dataContext).find(([k]) => {
          const cleanK = k.toLowerCase().replace(/_/g, '')
          return cleanK === name || name.includes(cleanK) || cleanK.includes(name)
        })
        if (matchedEntry && matchedEntry[1] !== undefined && matchedEntry[1] !== null) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              field.setText(String(matchedEntry[1]))
            }
          } catch (e) {}
        }
      })
      try { form.flatten() } catch (e) {}
    }
  } catch (e) {}

  // 2. Remplacement direct dans les flux textuels du PDF
  const pageCount = doc.getPageCount()
  for (let p = 0; p < pageCount; p++) {
    const page = doc.getPage(p)
    const contentsRef = page.node.get(PDFName.of('Contents'))
    if (!contentsRef) continue

    const contentsObj = doc.context.lookup(contentsRef)
    if (!contentsObj) continue

    const streamList = Array.isArray(contentsObj) ? contentsObj : [contentsObj]

    for (const stream of streamList) {
      if (!stream.getContents) continue

      const filterObj = stream.dict.get(PDFName.of('Filter'))
      const filterStr = filterObj ? filterObj.toString() : ''

      let rawBuffer = new Uint8Array(stream.getContents())
      let decodedText = ''

      if (filterStr.includes('ASCII85Decode')) {
        let latinStr = ''
        for (let i = 0; i < rawBuffer.length; i++) latinStr += String.fromCharCode(rawBuffer[i])
        rawBuffer = decodeAscii85(latinStr)
      }

      if (filterStr.includes('FlateDecode') || !filterStr) {
        try {
          const decomp = inflate(rawBuffer)
          let decStr = ''
          for (let i = 0; i < decomp.length; i++) decStr += String.fromCharCode(decomp[i])
          decodedText = decStr
        } catch (e) {
          try {
            const decomp = inflateRaw(rawBuffer)
            let decStr = ''
            for (let i = 0; i < decomp.length; i++) decStr += String.fromCharCode(decomp[i])
            decodedText = decStr
          } catch (e2) {
            let decStr = ''
            for (let i = 0; i < rawBuffer.length; i++) decStr += String.fromCharCode(rawBuffer[i])
            decodedText = decStr
          }
        }
      } else {
        let decStr = ''
        for (let i = 0; i < rawBuffer.length; i++) decStr += String.fromCharCode(rawBuffer[i])
        decodedText = decStr
      }

      let modifiedText = decodedText

      // Remplacement de chaque balise
      Object.entries(dataContext).forEach(([k, val]) => {
        if (val === undefined || val === null) return
        const escVal = escapePdfString(val)

        // Remplacement formes avec et sans guillemets
        modifiedText = modifiedText.split(`"{{${k}}}"`).join(escVal)
        modifiedText = modifiedText.split(`{{${k}}}`).join(escVal)
        modifiedText = modifiedText.split(`"{${k}}"`).join(escVal)
        modifiedText = modifiedText.split(`{${k}}`).join(escVal)
        modifiedText = modifiedText.split(`""{{${k}}}""`).join(escVal)
        modifiedText = modifiedText.split(`""{${k}}""`).join(escVal)
      })

      // Re-compression Flate standard
      const textBytes = new Uint8Array(modifiedText.length)
      for (let i = 0; i < modifiedText.length; i++) {
        textBytes[i] = modifiedText.charCodeAt(i) & 0xff
      }
      const newCompressed = deflate(textBytes)

      stream.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'))
      stream.dict.set(PDFName.of('Length'), doc.context.obj(newCompressed.length))
      stream.contents = newCompressed
    }
  }

  const outputBytes = await doc.save()
  return {
    bytes: outputBytes,
    doc
  }
}
