import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { formatEuro, formatDate, todayISO } from './utils'
import { getPdfTemplate, savePdfTemplate } from './db'

/**
 * Modèles JSON par défaut intégrés (utilisés immédiatement en mémoire et comme fallback)
 */
export const DEFAULT_TEMPLATES = {
  'quittance_template.json': {
    theme: {
      primaryColor: '#2563eb',
      darkColor: '#0f172a',
      textColor: '#334155',
      textMuted: '#64748b',
      badgeBg: '#e0e7ff',
      badgeText: '#3730a3'
    },
    bailleur: {
      nomParDefaut: 'Bailleur / Propriétaire',
      adresseParDefaut: 'Adresse du bailleur',
      villeParDefaut: '75000 Paris',
      telephone: '',
      email: ''
    },
    mentions: {
      titre: 'QUITTANCE DE LOYER',
      sousTitre: 'Loi n° 89-462 du 6 juillet 1989 modifiée — Article 21',
      texteAttestation: 'Je soussigné {bailleur_nom}, propriétaire du logement situé au {bien_adresse}, atteste avoir reçu de {locataire_nom} la somme de {montant_total} au titre du loyer et des charges pour la période mentionnée.',
      mentionPiedDePage: 'Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte. Document émis via KeyFolio.'
    },
    options: {
      afficherLogoKeyFolio: true,
      afficherCadreSignature: true,
      mentionSignature: 'Signature du Bailleur :'
    }
  },

  'avis_echeance_template.json': {
    theme: {
      primaryColor: '#2563eb',
      darkColor: '#0f172a',
      textColor: '#334155',
      textMuted: '#64748b'
    },
    bailleur: {
      nomParDefaut: 'Bailleur / Propriétaire',
      adresseParDefaut: 'Adresse du bailleur',
      iban: 'FR76 3000 4000 5000 6000 7000 890',
      bic: 'BNPAFRPP'
    },
    mentions: {
      titre: 'AVIS D\'ÉCHÉANCE — APPEL DE LOYER',
      sousTitre: 'Appel de loyer et provisions sur charges locatives',
      texteIntro: 'Nous vous prions de bien vouloir trouver ci-dessous le détail de votre appel de loyer pour la période de {periode}.',
      mentionPiedDePage: 'Cet avis d\'échéance ne constitue pas une quittance de loyer. Document émis via KeyFolio.'
    }
  },

  'etat_des_lieux_template.json': {
    theme: {
      couleurEntree: '#16a34a',
      couleurSortie: '#2563eb',
      darkColor: '#0f172a',
      textColor: '#334155',
      textMuted: '#64748b'
    },
    bailleur: {
      nomParDefaut: 'Bailleur / Propriétaire',
      adresseParDefaut: 'Adresse du bailleur'
    },
    mentions: {
      titreEntree: 'ÉTAT DES LIEUX CONTRADICTOIRE D\'ENTRÉE',
      titreSortie: 'ÉTAT DES LIEUX CONTRADICTOIRE DE SORTIE',
      sousTitre: 'Établi en application de la Loi n° 89-462 du 6 juillet 1989 modifiée — Décret n° 2016-382',
      observationsEntreeDefaut: 'Logement remis en bon état général d\'usage et d\'entretien. L\'ensemble des clés et accès mentionnés ont été remis en main propre ce jour.',
      observationsSortieDefaut: 'Logement restitué propre et vidé de tout meuble et encombrant. Clés remises en main propre au bailleur ce jour.',
      clesDefaut: '2 jeux complets (porte d\'entrée + boîte aux lettres + badge d\'accès)'
    },
    piecesParDefaut: [
      { nom: 'Entrée / Dégagement', etat: 'Bon état', obs: 'Peinture propre, interphone fonctionnel' },
      { nom: 'Séjour / Salon', etat: 'Très bon état', obs: 'Murs et sols propres, fenêtres en bon état' },
      { nom: 'Cuisine', etat: 'Bon état', obs: 'Évier, placards et plaques nettoyés et fonctionnels' },
      { nom: 'Chambre(s)', etat: 'Très bon état', obs: 'Revêtement de sol et prises électriques conformes' },
      { nom: 'Salle d\'eau / WC', etat: 'Bon état', obs: 'Robinetterie et sanitaires sans fuite ni tartre' }
    ]
  },

  'fin_bail_template.json': {
    theme: {
      primaryColor: '#dc2626',
      darkColor: '#0f172a',
      textColor: '#334155',
      textMuted: '#64748b'
    },
    bailleur: {
      nomParDefaut: 'Bailleur / Propriétaire',
      adresseParDefaut: 'Adresse du bailleur'
    },
    mentions: {
      titre: 'ATTESTATION DE FIN DE CONTRAT DE LOCATION',
      sousTitre: 'Restitution des clés et solde du dépôt de garantie (Loi n° 89-462, art. 22)',
      texteAttestation: 'Je soussigné {bailleur_nom}, propriétaire du logement situé au {bien_adresse}, atteste avoir procédé à la clôture du contrat de bail consenti à {locataire_nom}.',
      mentionPiedDePage: 'Document certifié conforme émis via KeyFolio.'
    }
  },

  'contrat_bail_template.json': {
    theme: {
      primaryColor: '#2563eb',
      darkColor: '#0f172a',
      textColor: '#334155',
      textMuted: '#64748b'
    },
    bailleur: {
      nomParDefaut: 'Bailleur / Propriétaire',
      adresseParDefaut: 'Adresse du bailleur',
      email: 'contact@bailleur.fr',
      telephone: '06 00 00 00 00'
    },
    clauses: {
      clauseIRL: true,
      texteClauseIRL: 'Le loyer sera révisé annuellement à la date anniversaire du contrat selon la variation de l\'Indice de Référence des Loyers (IRL) publié par l\'INSEE.',
      clauseResolutoire: true,
      texteClauseResolutoire: 'Il est expressément convenu qu\'à défaut de paiement de tout ou partie du loyer ou des charges au terme convenu, ou à défaut d\'assurance des risques locatifs, le présent contrat sera résilié de plein droit après commandement demeuré infructueux.',
      equipementsMeuble: 'Cuisine équipée, literie conforme, rangements, luminaires, table et chaises, nécessaire d\'entretien ménager',
      clausesParticulieres: 'Interdiction de sous-louer sans accord exprès et écrit du bailleur. Respect de la tranquillité et du règlement de copropriété.'
    }
  }
}

/**
 * Dictionnaire complet des variables de données disponibles dans KeyFolio
 */
export const AVAILABLE_VARIABLES = [
  { key: 'bailleur_nom', label: 'Nom du Bailleur', category: 'Bailleur', sample: 'SCI Immobilière Dupont' },
  { key: 'bailleur_adresse', label: 'Adresse du Bailleur', category: 'Bailleur', sample: '12 rue de la Paix, 75002 Paris' },
  { key: 'bailleur_email', label: 'Email du Bailleur', category: 'Bailleur', sample: 'contact@sci-dupont.fr' },
  { key: 'bailleur_telephone', label: 'Téléphone du Bailleur', category: 'Bailleur', sample: '06 12 34 56 78' },
  { key: 'bailleur_iban', label: 'IBAN du Bailleur', category: 'Bailleur', sample: 'FR76 3000 4000 5000 6000 7000 890' },
  { key: 'bailleur_bic', label: 'BIC / SWIFT', category: 'Bailleur', sample: 'BNPAFRPP' },

  { key: 'locataire_nom', label: 'Nom & Prénom du Locataire', category: 'Locataire', sample: 'Thomas Bernard' },
  { key: 'locataire_prenom', label: 'Prénom du Locataire', category: 'Locataire', sample: 'Thomas' },
  { key: 'locataire_email', label: 'Email du Locataire', category: 'Locataire', sample: 'thomas.bernard@email.fr' },
  { key: 'locataire_telephone', label: 'Téléphone du Locataire', category: 'Locataire', sample: '06 98 76 54 32' },

  { key: 'bien_nom', label: 'Nom du Bien', category: 'Bien', sample: 'Appartement T3 Centre' },
  { key: 'bien_adresse', label: 'Adresse complète du Bien', category: 'Bien', sample: '15 avenue des Lilas, 69003 Lyon' },
  { key: 'bien_surface', label: 'Surface habitable (m²)', category: 'Bien', sample: '65 m²' },
  { key: 'bien_pieces', label: 'Nombre de pièces', category: 'Bien', sample: '3 pièces' },

  { key: 'loyer_hc', label: 'Loyer Hors Charges (€)', category: 'Financier', sample: '680.00 €' },
  { key: 'charges', label: 'Provisions sur Charges (€)', category: 'Financier', sample: '70.00 €' },
  { key: 'montant_total', label: 'Montant Total Loyer + Charges (€)', category: 'Financier', sample: '750.00 €' },
  { key: 'depot_garantie', label: 'Dépôt de Garantie / Caution (€)', category: 'Financier', sample: '680.00 €' },
  { key: 'montant_retenu', label: 'Montant Retenu sur Caution (€)', category: 'Financier', sample: '50.00 €' },
  { key: 'solde_restitue', label: 'Solde Net Restitué (€)', category: 'Financier', sample: '630.00 €' },
  { key: 'motif_retenue', label: 'Motif de la Retenue', category: 'Financier', sample: 'Nettoyage moquette' },

  { key: 'periode', label: 'Période / Mois concerné', category: 'Date', sample: 'Mars 2026' },
  { key: 'date_jour', label: 'Date du jour', category: 'Date', sample: '27/08/2026' },
  { key: 'date_paiement', label: 'Date de règlement', category: 'Date', sample: '05/03/2026' },
  { key: 'date_echeance', label: 'Date d\'échéance', category: 'Date', sample: '05/03/2026' },
  { key: 'date_debut_bail', label: 'Date d\'entrée / Début du bail', category: 'Date', sample: '01/09/2024' },
  { key: 'date_fin_bail', label: 'Date de sortie / Fin du bail', category: 'Date', sample: '28/02/2026' },
  { key: 'motif_fin', label: 'Motif de fin de bail', category: 'Gestion', sample: 'Congé donné par le locataire' },

  { key: 'index_elec', label: 'Index Électricité (kWh)', category: 'Technique', sample: '14250 kWh' },
  { key: 'index_eau', label: 'Index Eau (m³)', category: 'Technique', sample: '385 m³' },
  { key: 'index_gaz', label: 'Index Gaz (m³)', category: 'Technique', sample: '890 m³' },
  { key: 'cles_remises', label: 'Clés & Accès', category: 'Technique', sample: '2 jeux complets + badge' }
]

/**
 * Récupère la configuration d'un template avec double couche de cache (LocalStorage + Tauri + Fallback)
 */
export function getLoadedTemplateConfig(filename) {
  try {
    const cached = localStorage.getItem(`keyfolio_tpl_${filename}`)
    if (cached) return JSON.parse(cached)
  } catch (e) {}

  return DEFAULT_TEMPLATES[filename] || {}
}

/**
 * Remplace toutes les balises textuelles {cle}, {{cle}}, "{cle}", etc. par les vraies valeurs
 */
export function replaceTextTags(text, dataContext) {
  if (!text || typeof text !== 'string') return ''
  let result = text

  // Alias courants
  const fullContext = {
    ...dataContext,
    bailleurNom: dataContext.bailleur_nom,
    bailleurAdresse: dataContext.bailleur_adresse,
    locataireNom: dataContext.locataire_nom,
    locatairePrenom: dataContext.locataire_prenom,
    bienNom: dataContext.bien_nom,
    bienAdresse: dataContext.bien_adresse,
    montantTotal: dataContext.montant_total,
    loyerHC: dataContext.loyer_hc,
    depotGarantie: dataContext.depot_garantie,
    soldeRestitue: dataContext.solde_restitue
  }

  Object.entries(fullContext).forEach(([key, val]) => {
    if (val === undefined || val === null) return
    // Formes {key}, {{key}}, "{key}", "{{key}}", "[key]", ""{{key}}""
    result = result.split(`""{{${key}}}""`).join(strVal)
    result = result.split(`"{{${key}}}"`).join(strVal)
    result = result.split(`""{${key}}""`).join(strVal)
    result = result.split(`"{${key}}"`).join(strVal)
    result = result.split(`{{${key}}}`).join(strVal)
    result = result.split(`{${key}}`).join(strVal)
    result = result.split(`"${key}"`).join(strVal)
    result = result.split(`[${key.toUpperCase()}]`).join(strVal)
  })

  return result
}

export const replacePlaceholdersInText = replacePlaceholders

/**
 * Construit un objet de contexte de données complet
 */
export function buildDataContext({
  bail,
  bien,
  locataire,
  periode = '',
  dateDoc = '',
  loyerHC = 0,
  charges = 0,
  depotGarantie = 0,
  montantRetenu = 0,
  motifRetenue = '',
  motifFin = '',
  elecIndex = '',
  eauIndex = '',
  gazIndex = '',
  clesRemises = '',
  customValues = {}
}) {
  const locFullName = locataire
    ? `${locataire.prenom} ${locataire.nom}`
    : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'

  const total = parseFloat(loyerHC || 0) + parseFloat(charges || 0)
  const solde = Math.max(0, parseFloat(depotGarantie || 0) - parseFloat(montantRetenu || 0))

  return {
    bailleur_nom: customValues.bailleur_nom || 'Bailleur / Propriétaire',
    bailleur_adresse: customValues.bailleur_adresse || 'Adresse du bailleur',
    bailleur_email: customValues.bailleur_email || '',
    bailleur_telephone: customValues.bailleur_telephone || '',
    bailleur_iban: customValues.bailleur_iban || 'FR76 3000 4000 5000 6000 7000 890',
    bailleur_bic: customValues.bailleur_bic || 'BNPAFRPP',

    locataire_nom: locFullName,
    locataire_prenom: locataire?.prenom || bail?.locataire_prenom || '',
    locataire_email: locataire?.email || '',
    locataire_telephone: locataire?.telephone || '',

    bien_nom: bien?.nom || bail?.bien_nom || 'Logement',
    bien_adresse: bien?.adresse || 'Adresse non spécifiée',
    bien_surface: bien?.surface_m2 ? `${bien.surface_m2} m²` : '',
    bien_pieces: bien?.nb_pieces ? `${bien.nb_pieces} pièce(s)` : '',

    loyer_hc: formatEuro(loyerHC || bail?.loyer_mensuel || 0),
    charges: formatEuro(charges || bail?.charges_mensuelles || 0),
    montant_total: formatEuro(total),
    depot_garantie: formatEuro(depotGarantie || bail?.depot_garantie || 0),
    montant_retenu: formatEuro(montantRetenu || 0),
    solde_restitue: formatEuro(solde),
    motif_retenue: motifRetenue || '',

    periode: periode || 'Période courante',
    date_jour: formatDate(todayISO()),
    date_paiement: formatDate(dateDoc || todayISO()),
    date_echeance: formatDate(dateDoc || todayISO()),
    date_debut_bail: formatDate(bail?.date_debut || todayISO()),
    date_fin_bail: formatDate(dateDoc || bail?.date_fin || todayISO()),
    motif_fin: motifFin || bail?.motif_fin || 'Congé donné par le locataire',

    index_elec: elecIndex ? `${elecIndex} kWh` : '—',
    index_eau: eauIndex ? `${eauIndex} m³` : '—',
    index_gaz: gazIndex ? `${gazIndex} m³` : '—',
    cles_remises: clesRemises || '2 jeux complets (porte d\'entrée + boîte aux lettres + badge)'
  }
}

/**
 * Charge un fichier PDF modèle et remplit les balises textuelles et champs
 */
export async function fillPdfTemplate(pdfBytes, dataContext, mappingConfig = null) {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  let filledFieldsCount = 0

  if (fields.length > 0) {
    fields.forEach(field => {
      const fieldName = field.getName().toLowerCase().trim().replace(/[{}]/g, '')

      const matchedKey = Object.keys(dataContext).find(k => {
        const cleanK = k.toLowerCase().replace(/_/g, '')
        const cleanF = fieldName.replace(/_/g, '')
        return cleanF === cleanK || cleanF.includes(cleanK) || cleanK.includes(cleanF)
      })

      if (matchedKey && dataContext[matchedKey] !== undefined) {
        try {
          const type = field.constructor.name
          if (type === 'PDFTextField') {
            field.setText(String(dataContext[matchedKey]))
            filledFieldsCount++
          }
        } catch (e) {
          console.warn(`Erreur champ ${fieldName}:`, e)
        }
      }
    })

    try {
      form.flatten()
    } catch (e) {}
  }

  const outputBytes = await pdfDoc.save()
  return {
    bytes: outputBytes,
    filledFieldsCount
  }
}
