export const FOLDER_THEMES = {
  '00_ACHAT-VENTE': {
    id: '00_ACHAT-VENTE',
    label: 'Acquisition & Vente',
    shortLabel: 'Achat & Vente',
    desc: 'Actes notariés, compromis, plans cadastraux, offres et diagnostics d\'achat',
    primary: '#059669', // Emerald
    bg: '#ecfdf5',
    border: '#a7f3d0',
    badgeText: '#065f46',
    icon: 'key',
    emoji: '🏷️'
  },
  '01_ADMINISTRATIF': {
    id: '01_ADMINISTRATIF',
    label: 'Administratif & Général',
    shortLabel: 'Administratif',
    desc: 'Titre de propriété, assurances PNO, fiches techniques, inventaire mobilier',
    primary: '#4f46e5', // Indigo
    bg: '#eef2ff',
    border: '#c7d2fe',
    badgeText: '#3730a3',
    icon: 'fileText',
    emoji: '📋'
  },
  '02_DIAGNOSTICS_DDT': {
    id: '02_DIAGNOSTICS_DDT',
    label: 'Diagnostics & DDT',
    shortLabel: 'Diagnostics',
    desc: 'DPE, audit énergétique, amiante, plomb, électricité, gaz, ERP',
    primary: '#0891b2', // Cyan / Teal
    bg: '#ecfeff',
    border: '#a5f3fc',
    badgeText: '#155e75',
    icon: 'activity',
    emoji: '🔬'
  },
  '03_COPROPRIETE': {
    id: '03_COPROPRIETE',
    label: 'Copropriété & Syndic',
    shortLabel: 'Copropriété',
    desc: 'Règlement de copropriété, PV d\'assemblées générales, appels de fonds ALUR',
    primary: '#7c3aed', // Purple
    bg: '#f5f3ff',
    border: '#ddd6fe',
    badgeText: '#5b21b6',
    icon: 'building',
    emoji: '🏢'
  },
  '04_FISCAL_FINANCIER': {
    id: '04_FISCAL_FINANCIER',
    label: 'Fiscalité & Crédits',
    shortLabel: 'Fiscal & Banque',
    desc: 'Offres de prêt, tableaux d\'amortissement, déclarations 2044/LMNP, taxe foncière',
    primary: '#d97706', // Amber / Gold
    bg: '#fffbeb',
    border: '#fde68a',
    badgeText: '#92400e',
    icon: 'landmark',
    emoji: '📊'
  },
  '05_TRAVAUX': {
    id: '05_TRAVAUX',
    label: 'Travaux & Chantiers',
    shortLabel: 'Travaux',
    desc: 'Devis artisans, factures, plans de rénovation, garanties décennales et DOE',
    primary: '#ea580c', // Orange
    bg: '#fff7ed',
    border: '#fed7aa',
    badgeText: '#9a3412',
    icon: 'hammer',
    emoji: '🔨'
  },
  '06_ENERGIE_CONTRATS': {
    id: '06_ENERGIE_CONTRATS',
    label: 'Énergie & Contrats',
    shortLabel: 'Énergie',
    desc: 'Contrats et factures d\'électricité, gaz, eau, internet, attestations d\'entretien',
    primary: '#ca8a04', // Yellow
    bg: '#fefce8',
    border: '#fef08a',
    badgeText: '#854d0e',
    icon: 'zap',
    emoji: '⚡'
  },
  '07_LOCATION': {
    id: '07_LOCATION',
    label: 'Gestion Locative & Baux',
    shortLabel: 'Location & Baux',
    desc: 'Baux, quittances de loyer, états des lieux d\'entrée/sortie, dossiers locataires',
    primary: '#2563eb', // Blue
    bg: '#eff6ff',
    border: '#bfdbfe',
    badgeText: '#1e40af',
    icon: 'users',
    emoji: '🔑'
  },
  '08_JURIDIQUE_LITIGES': {
    id: '08_JURIDIQUE_LITIGES',
    label: 'Juridique & Litiges',
    shortLabel: 'Juridique',
    desc: 'Courriers recommandés, mises en demeure, constats d\'huissier, recours',
    primary: '#e11d48', // Rose / Red
    bg: '#fff1f2',
    border: '#fecdd3',
    badgeText: '#9f1239',
    icon: 'scale',
    emoji: '⚖️'
  },
  '09_PHOTOS_PLANS': {
    id: '09_PHOTOS_PLANS',
    label: 'Photos, Plans & Médias',
    shortLabel: 'Photos & Médias',
    desc: 'Plans d\'architecte, schémas techniques, photos haute définition du bien',
    primary: '#c026d3', // Fuchsia
    bg: '#fdf4ff',
    border: '#f5d0fe',
    badgeText: '#86198f',
    icon: 'camera',
    emoji: '📸'
  }
}

export function getThemeForPath(path) {
  if (!path) return FOLDER_THEMES['01_ADMINISTRATIF']
  const root = path.split('/')[0]
  return FOLDER_THEMES[root] || {
    id: root,
    label: root,
    shortLabel: root,
    desc: 'Dossier de gestion',
    primary: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    badgeText: '#3730a3',
    icon: 'folder',
    emoji: '📁'
  }
}
