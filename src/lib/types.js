// KeyFolio — Types, constantes & catégories
// OS de gestion de patrimoine immobilier

export const TYPE_BIEN = [
  { id: 'appartement', label: 'Appartement', icon: 'building' },
  { id: 'maison', label: 'Maison', icon: 'house' },
  { id: 'studio', label: 'Studio', icon: 'doorClosed' },
  { id: 'immeuble', label: 'Immeuble', icon: 'building2' },
  { id: 'parking', label: 'Parking / Box', icon: 'parking' },
  { id: 'garage', label: 'Garage', icon: 'warehouse' },
  { id: 'terrain', label: 'Terrain', icon: 'trees' },
  { id: 'local_commercial', label: 'Local commercial', icon: 'store' },
  { id: 'autre', label: 'Autre', icon: 'house' },
]

export const STATUT_BIEN = [
  { id: 'actif', label: 'Actif / Loué', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  { id: 'occupe', label: 'Occupé', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  { id: 'vacant', label: 'Vacant', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'en_travaux', label: 'En travaux', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
  { id: 'a_vendre', label: 'À vendre', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'inactif', label: 'Inactif / Vendu', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
]

export const TYPE_PROJET = [
  { id: 'construction', label: 'Construction neuve', icon: 'hardHat' },
  { id: 'renovation', label: 'Rénovation lourde', icon: 'wrench' },
  { id: 'achat_envisage', label: 'Achat envisagé', icon: 'search' },
  { id: 'transformation', label: 'Transformation / Division', icon: 'draftingCompass' },
  { id: 'amenagement', label: 'Aménagement / Finitions', icon: 'sparkles' },
  { id: 'autre', label: 'Autre opération', icon: 'folder' },
]

export const STATUT_PROJET = [
  { id: 'etude', label: 'Étude / Prospection', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'acquisition', label: 'Acquisition en cours', color: '#0ea5e9', bg: 'rgba(145, 165, 233, 0.12)' },
  { id: 'permis', label: 'Permis / Plans', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  { id: 'travaux', label: 'Travaux en cours', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'finitions', label: 'Finitions / Réception', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'termine', label: 'Terminé / Livré', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  { id: 'annule', label: 'Annulé / Abandonné', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
]

export const CATEGORIES_BUDGET_PROJET = [
  { id: 'terrain', label: 'Terrain' },
  { id: 'acquisition', label: 'Acquisition / FAI' },
  { id: 'notaire', label: 'Frais de notaire' },
  { id: 'architecte', label: 'Architecte & Géomètre' },
  { id: 'etudes', label: 'Études & Diagnostics' },
  { id: 'construction', label: 'Gros œuvre / Construction' },
  { id: 'materiaux', label: 'Matériaux & Équipements' },
  { id: 'main_oeuvre', label: 'Second œuvre / Main d\'œuvre' },
  { id: 'travaux', label: 'Travaux généraux' },
  { id: 'ameublement', label: 'Ameublement / Décoration' },
  { id: 'assurances', label: 'Assurances DO / Chantier' },
  { id: 'taxes', label: 'Taxes d\'aménagement' },
  { id: 'frais_divers', label: 'Frais divers & Imprévus' },
]

export const CATEGORIES_PLANS = [
  { id: 'terrain', label: 'Plan du terrain' },
  { id: 'masse', label: 'Plan de masse' },
  { id: 'rdc', label: 'Plan RDC' },
  { id: 'etage', label: 'Plan Étage' },
  { id: 'sous_sol', label: 'Plan Sous-sol' },
  { id: 'electricite', label: 'Plan Électricité' },
  { id: 'plomberie', label: 'Plan Plomberie / Chauffage' },
  { id: 'facade', label: 'Plan Façades & Toiture' },
  { id: 'autre', label: 'Autre plan' },
]

export const STATUTS_MAINTENANCE = [
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
  { id: 'a_faire', label: 'À faire', color: '#f59e0b' },
  { id: 'planifie', label: 'Planifié', color: '#6366f1' },
  { id: 'en_cours', label: 'En cours', color: '#3b82f6' },
  { id: 'termine', label: 'Terminé', color: '#16a34a' },
  { id: 'annule', label: 'Annulé', color: '#64748b' },
]

export const CATEGORIES_TACHES = [
  { id: 'assurance', label: 'Assurance / PNO', icon: 'shield' },
  { id: 'revision_loyer', label: 'Révision de loyer IRL', icon: 'trendingUp' },
  { id: 'dpe', label: 'Diagnostics / DPE', icon: 'zap' },
  { id: 'entretien', label: 'Entretien & Chaudière', icon: 'wrench' },
  { id: 'fiscalite', label: 'Taxes & Fiscalité', icon: 'fileText' },
  { id: 'travaux', label: 'Suivi travaux', icon: 'hardHat' },
  { id: 'locataire', label: 'Relance locataire', icon: 'user' },
  { id: 'autre', label: 'Autre tâche', icon: 'check' },
]
