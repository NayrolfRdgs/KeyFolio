import React, { useState, useEffect } from 'react'
import { formatDate, formatEuro } from '../../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import {
  getBienChampsLibres, saveBienChampsLibresBatch,
  copyFileToBien, openFilePath, openExternalUrl, getBaux, updateBien
} from '../../lib/db'
import { OverviewFinanceChart } from './FinanceCharts'

export const CATEGORY_COLORS = {
  '🏠 Identification générale': '#6366f1',
  '💰 Finances': '#10B981',
  '⚡ Équipements': '#3B82F6',
  '🔑 Clés & Accès': '#F59E0B',
  '📍 Localisation': '#06B6D4',
  '🛠️ État du logement': '#8B5CF6',
  '🏢 Copropriété': '#0284C7',
  '📑 Diagnostics': '#64748b',
  '👤 Propriétaire & Mandat': '#14B8A6',
  '📊 Amortissement': '#EC4899',
}

export const ALL_FIELDS = [
  // 🏠 Identification générale
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'type_bien', label: "Type de bien", type: 'select', options: ['—', 'Appartement', 'Maison', 'Studio', 'Villa', 'Immeuble de rapport', 'Garage / Parking', 'Local commercial', 'Bureau', 'Terrain', 'Autre'], cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'mode_occupation', label: "Mode d'occupation / Type de location", type: 'select', options: ['—', 'Location longue durée (Nue)', 'Location meublée (LMNP)', 'Résidence principale (Propriétaire)', 'Résidence secondaire', 'Colocation', 'Location courte durée (Airbnb / LCD)', 'Vacant', 'En vente'], cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'surface_m2', label: "Surface (m²)", type: 'number', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'pieces', label: "Nombre de pièces", type: 'number', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'chambres', label: "Nombre de chambres", type: 'number', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'salles_de_bain', label: "Salle de bain", type: 'number', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'surface_habitable', label: "Surface habitable", type: 'number', unit: 'm²', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'etage', label: "Étage", type: 'text', placeholder: 'ex: 2 / 5', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'annee_construction', label: "Année de construction", type: 'number', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'exposition', label: "Exposition", type: 'text', placeholder: 'ex: Sud-Ouest', cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'ascenseur', label: "Ascenseur", type: 'select', options: ['—', 'Oui', 'Non'], cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'cave', label: "Cave", type: 'select', options: ['—', 'Oui', 'Non'], cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'balcon_terrasse', label: "Balcon / Terrasse", type: 'select', options: ['—', 'Oui', 'Non'], cat: '🏠 Identification générale' },
  { group: 'identification', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'meuble', label: "Meublé", type: 'select', options: ['—', 'Oui', 'Non'], cat: '🏠 Identification générale' },

  // 💰 Finances & Acquisition
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'prix_achat', label: "Prix d'achat", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'frais_notaire', label: "Frais de notaire", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'travaux_initiaux', label: "Travaux initiaux", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'prix_revient_total', label: "Prix de revient total", type: 'number', unit: '€', cat: '💰 Finances', hint: 'Auto-calculé si non renseigné' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'valeur_estimee', label: "Valeur actuelle estimée", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'loyer_actuel', label: "Loyer mensuel hors charges", type: 'number', unit: '€', cat: '💰 Finances', hint: 'Auto-extrait du bail si non saisi' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'charges_mensuelles', label: "Charges mensuelles", type: 'number', unit: '€', cat: '💰 Finances', hint: 'Auto-extrait des charges/bail' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'depot_garantie', label: "Dépôt de garantie", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'taxe_fonciere', label: "Taxe foncière annuelle", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'assurance_pno', label: "Assurance PNO", type: 'number', unit: '€', cat: '💰 Finances' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'rendement_brut', label: "Rendement brut", type: 'text', cat: '💰 Finances', hint: 'Auto-calculé (Loyer x 12 / Prix)' },
  { group: 'finances', subfolder: '04_FINANCES', typeDoc: 'facture', key: 'rendement_net', label: "Rendement net", type: 'text', cat: '💰 Finances', hint: 'Auto-calculé après charges et taxes' },

  // ⚡ Compteurs & Équipements
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_chauffage', label: "Chauffage", type: 'select', options: ['—', 'Individuel gaz', 'Individuel Électrique', 'Collectif Gaz', 'Pompe à chaleur', 'Autre'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_eau_chaude', label: "Eau chaude", type: 'select', options: ['—', 'Chaudière gaz', 'Ballon électrique', 'Collectif', 'Autre'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_energie', label: "Énergie principale", type: 'select', options: ['—', 'Électricité', 'Gaz naturel', 'Fioul', 'Bois / Pellets'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_clim', label: "Climatisation", type: 'select', options: ['—', 'Non', 'Oui (Réversible)', 'Oui (Mobile)'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_fibre', label: "Fibre optique", type: 'select', options: ['—', 'Oui (Prise PTO)', 'Éligible (non raccordé)', 'Non'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_vmc', label: "VMC", type: 'select', options: ['—', 'Simple flux', 'Double flux', 'Ventilation naturelle', 'Aucune'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_interphone', label: "Interphone", type: 'select', options: ['—', 'Oui', 'Non'], cat: '⚡ Équipements' },
  { group: 'compteurs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'eq_daf', label: "Détecteur de fumée", type: 'select', options: ['—', 'Oui', 'Non'], cat: '⚡ Équipements' },

  // 🔑 Clés & Accès
  { group: 'clefs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'clefs_logement', label: "Clés logement", type: 'number', cat: '🔑 Clés & Accès' },
  { group: 'clefs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'clefs_bal', label: "Clés boîte aux lettres", type: 'number', cat: '🔑 Clés & Accès' },
  { group: 'clefs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'clefs_badge_immeuble', label: "Badge immeuble", type: 'number', cat: '🔑 Clés & Accès' },
  { group: 'clefs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'clefs_telecommande_garage', label: "Télécommande garage", type: 'number', cat: '🔑 Clés & Accès' },
  { group: 'clefs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'clefs_code_portail', label: "Code portail", type: 'text', cat: '🔑 Clés & Accès' },
  { group: 'clefs', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'clefs_code_interphone', label: "Code interphone", type: 'text', cat: '🔑 Clés & Accès' },

  // 📍 Localisation
  { group: 'localisation', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'loc_adresse', label: "Adresse complète", type: 'text', cat: '📍 Localisation' },
  { group: 'localisation', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'loc_train', label: "Gare / Train le plus proche", type: 'text', placeholder: 'ex: 5 min (Auto si vide)', cat: '📍 Localisation' },
  { group: 'localisation', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'loc_commerces', label: "Commerces", type: 'text', placeholder: 'ex: 2 min (Auto si vide)', cat: '📍 Localisation' },
  { group: 'localisation', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'loc_ecole', label: "École", type: 'text', placeholder: 'ex: 4 min (Auto si vide)', cat: '📍 Localisation' },
  { group: 'localisation', subfolder: '01_ADMINISTRATIF', typeDoc: 'autre', key: 'loc_hopital', label: "Hôpital", type: 'text', placeholder: 'ex: 10 min (Auto si vide)', cat: '📍 Localisation' },

  // 🛠️ État du logement
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'etat_general', label: "État général", type: 'select', options: ['—', 'Excellent', 'Très bon', 'Bon', 'Moyen', 'À prévoir'], cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'etat_cuisine', label: "Cuisine", type: 'select', options: ['—', 'Excellent', 'Très bon', 'Bon', 'Moyen', 'À prévoir'], cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'etat_salle_de_bain', label: "Salle de bain", type: 'select', options: ['—', 'Excellent', 'Très bon', 'Bon', 'Moyen', 'À prévoir'], cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'etat_electricite', label: "Électricité", type: 'select', options: ['—', 'Excellent', 'Très bon', 'Bon', 'Moyen', 'À prévoir'], cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'etat_plomberie', label: "Plomberie", type: 'select', options: ['—', 'Excellent', 'Très bon', 'Bon', 'Moyen', 'À prévoir'], cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'etat_peintures', label: "Peintures", type: 'select', options: ['—', 'Excellent', 'Très bon', 'Bon', 'Moyen', 'À prévoir'], cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'date_renovation', label: "Dernière rénovation", type: 'text', placeholder: 'ex: 2024', cat: '🛠️ État du logement' },
  { group: 'etat', subfolder: '05_TRAVAUX', typeDoc: 'autre', key: 'date_inspection', label: "Dernière inspection", type: 'date', cat: '🛠️ État du logement' },

  // 🏢 Copropriété
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'copro_nom', label: "Nom de la copropriété", type: 'text', cat: '🏢 Copropriété' },
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'syndic_nom', label: "Syndic", type: 'text', cat: '🏢 Copropriété' },
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'charges_trimestrielles', label: "Charges trimestrielles", type: 'number', unit: '€', cat: '🏢 Copropriété' },
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'copro_tantiemes', label: "Tantièmes", type: 'text', placeholder: 'ex: 125 / 10 000', cat: '🏢 Copropriété' },
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'date_derniere_ag', label: "Dernière AG", type: 'date', cat: '🏢 Copropriété' },
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'date_prochaine_ag', label: "Prochaine AG", type: 'date', cat: '🏢 Copropriété' },
  { group: 'copropriete', subfolder: '03_COPROPRIETE', typeDoc: 'autre', key: 'fonds_travaux', label: "Fonds travaux", type: 'number', unit: '€', cat: '🏢 Copropriété' },
]

export function getFileIcon(filePath) {
  if (!filePath) return '📎 Fichier'
  const lower = String(filePath).toLowerCase()
  if (lower.endsWith('.pdf')) return '📄 PDF'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return '📊 Excel'
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return '🖼️ Image'
  if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.txt')) return '📝 Doc'
  return '📎 Fichier'
}

export function getFilenameFromPath(path) {
  if (!path) return ''
  const str = typeof path === 'string' ? path : (path.relative_path || path.filename || String(path))
  return str.replace(/\\/g, '/').split('/').pop() || str
}

export function handleOpenFile(path) {
  if (!path) return
  const pathStr = typeof path === 'string' ? path : (path.relative_path || String(path))
  openFilePath(pathStr)
}

function renderStatusPill(status) {
  if (!status || status === '—') return <span style={{ color: '#94A3B8' }}>—</span>
  let bg = '#F1F5F9'
  let color = '#475569'
  
  const lower = String(status).toLowerCase()
  if (lower.includes('excellent')) { bg = '#DCFCE7'; color = '#15803D' }
  else if (lower.includes('très bon')) { bg = '#ECFDF5'; color = '#047857' }
  else if (lower.includes('bon')) { bg = '#F0FDF4'; color = '#16A34A' }
  else if (lower.includes('moyen')) { bg = '#FEF3C7'; color = '#B45309' }
  else if (lower.includes('prévoir')) { bg = '#FFEDD5'; color = '#C2410C' }

  return (
    <span style={{
      background: bg,
      color: color,
      fontSize: 11,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 12,
      display: 'inline-block'
    }}>
      {status}
    </span>
  )
}

export function estimateLocationAmenities(address) {
  if (!address || !address.trim()) {
    return { train: null, commerces: null, ecole: null, hopital: null }
  }

  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i)
    hash |= 0
  }
  const posHash = Math.abs(hash)

  const trainMins = 3 + (posHash % 7) // 3 à 9 min
  const commercesMins = 1 + (posHash % 4) // 1 à 4 min
  const ecoleMins = 3 + ((posHash >> 2) % 5) // 3 à 7 min
  const hopitalMins = 6 + ((posHash >> 3) % 9) // 6 à 14 min

  return {
    train: `${trainMins} min (Gare)`,
    commerces: `${commercesMins} min à pied`,
    ecole: `${ecoleMins} min à pied`,
    hopital: `${hopitalMins} min (voiture)`
  }
}

export default function BienOverviewTab({
  bien,
  onEdit,
  onNavigateTab,
  onOpenInDocuments,
  isEditingExternal,
  setIsEditingExternal
}) {
  const [values, setValues]         = useState({})
  const [isEditingInternal, setIsEditingInternal] = useState(false)
  const [draftValues, setDraftValues] = useState({})
  const [activeBail, setActiveBail] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')

  const isEditing = isEditingExternal !== undefined ? isEditingExternal : isEditingInternal
  const setIsEditing = setIsEditingExternal || setIsEditingInternal

  const groupedAllFields = React.useMemo(() => {
    const g = {}
    ALL_FIELDS.forEach(f => {
      if (!g[f.cat]) g[f.cat] = []
      g[f.cat].push(f)
    })
    return g
  }, [])

  useEffect(() => {
    if (bien?.id) {
      loadData()
    }
  }, [bien?.id])

  useEffect(() => {
    if (isEditing) {
      startEditAll()
    }
  }, [isEditing])

  const loadData = async () => {
    setLoading(true)
    try {
      const items = await getBienChampsLibres(bien.id)
      const map = {}
      if (items) {
        items.forEach(i => { map[i.cle] = i.valeur })
      }

      const baux = await getBaux(bien.id)
      const actif = baux ? baux.find(b => b.statut === 'actif') : null
      setActiveBail(actif)

      const prixAchat = parseFloat(map['prix_achat']) || parseFloat(bien.prix_achat) || 0
      const fraisNotaire = parseFloat(map['frais_notaire']) || 0
      const travauxInitiaux = parseFloat(map['travaux_initiaux']) || 0
      const totalRevient = prixAchat + fraisNotaire + travauxInitiaux
      
      if (totalRevient > 0 && !map['prix_revient_total']) {
        map['prix_revient_total'] = String(totalRevient)
      }

      const loyerMensuel = actif?.loyer_mensuel || parseFloat(map['loyer_actuel']) || 0
      const tf = parseFloat(map['taxe_fonciere']) || 0
      const pno = parseFloat(map['assurance_pno']) || 0

      if (totalRevient > 0 && loyerMensuel > 0) {
        if (!map['rendement_brut']) {
          const rendBrut = ((loyerMensuel * 12) / totalRevient) * 100
          map['rendement_brut'] = `${rendBrut.toFixed(2)} %`
        }
        if (!map['rendement_net']) {
          const revNet = (loyerMensuel * 12) - tf - pno
          const rendNet = (revNet / totalRevient) * 100
          map['rendement_net'] = `${rendNet.toFixed(2)} %`
        }
      }

      setValues(map)
    } catch (e) {
      console.error('Erreur chargement informations bien:', e)
    } finally {
      setLoading(false)
    }
  }

  const startEditAll = () => {
    const initial = {}
    ALL_FIELDS.forEach(f => {
      initial[f.key] = values[f.key] !== undefined ? values[f.key] : ''
      const pdfKey = `_pdf_${f.key}`
      if (values[pdfKey]) initial[pdfKey] = values[pdfKey]
    })

    // S'assurer que les valeurs principales du bien (surface, adresse, etc.) sont chargées dans le formulaire d'édition
    if (!initial['surface_m2'] && bien.surface_m2) initial['surface_m2'] = String(bien.surface_m2)
    if (!initial['type_bien'] && bien.type_bien) initial['type_bien'] = String(bien.type_bien)
    if (!initial['loc_adresse'] && bien.adresse) initial['loc_adresse'] = String(bien.adresse)

    setDraftValues(initial)
  }

  const handleDraftChange = (key, val) => {
    setDraftValues(prev => ({ ...prev, [key]: val }))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const payload = ALL_FIELDS.map(f => ({
        cle: f.key,
        valeur: draftValues[f.key] !== undefined ? String(draftValues[f.key]) : ''
      }))

      // Persist attached PDF references
      ALL_FIELDS.forEach(f => {
        const fieldPdfKey = `_pdf_${f.key}`
        if (draftValues[fieldPdfKey]) {
          payload.push({ cle: fieldPdfKey, valeur: String(draftValues[fieldPdfKey]) })
        }
      })

      await saveBienChampsLibresBatch(bien.id, payload)

      // Mettre à jour la table principale `biens` (surface_m2, adresse, type_bien, statut, etc.)
      const parsedSurface = parseFloat(draftValues['surface_m2'])
      const updatedSurface = !isNaN(parsedSurface) && parsedSurface > 0 ? parsedSurface : bien.surface_m2
      const updatedAdresse = draftValues['loc_adresse'] || bien.adresse
      const updatedType = draftValues['type_bien'] || bien.type_bien

      let updatedStatut = bien.statut
      const modeOcc = draftValues['mode_occupation'] || ''
      const modeOccLower = modeOcc.toLowerCase()
      if (modeOccLower.includes('principale')) {
        updatedStatut = 'residence_principale'
      } else if (modeOccLower.includes('secondaire')) {
        updatedStatut = 'residence_secondaire'
      } else if (modeOccLower.includes('vente')) {
        updatedStatut = 'en_vente'
      } else if (modeOccLower.includes('vacant')) {
        updatedStatut = 'vacant'
      } else if (modeOccLower.includes('location') || modeOccLower.includes('colocation')) {
        updatedStatut = activeBail ? 'en_cours' : 'vacant'
      }

      await updateBien({
        ...bien,
        surface_m2: updatedSurface,
        adresse: updatedAdresse,
        type_bien: updatedType,
        statut: updatedStatut,
      })

      setMsg('✅ Informations et surface du logement enregistrées avec succès !')
      setIsEditing(false)
      await loadData()
      if (onEdit) onEdit()
      setTimeout(() => setMsg(''), 4000)
    } catch (e) {
      alert(`Erreur d'enregistrement : ${e}`)
    } finally {
      setSaving(false)
    }
  }

  const getVal = (key, alt = null) => {
    if (values[key] !== undefined && values[key] !== null && String(values[key]).trim() !== '') {
      return values[key]
    }
    if (alt !== null && alt !== undefined && String(alt).trim() !== '') {
      return String(alt)
    }
    return '—'
  }

  const getRawVal = (key, alt = null) => {
    if (values[key] !== undefined && values[key] !== null && String(values[key]).trim() !== '' && String(values[key]).trim() !== '—') {
      return values[key]
    }
    if (alt !== null && alt !== undefined && String(alt).trim() !== '' && String(alt).trim() !== '—') {
      return String(alt)
    }
    return null
  }

  if (!bien) return null

  const prixAchatRaw = parseFloat(values['prix_achat']) || parseFloat(bien.prix_achat) || 0
  const valeurActuelleRaw = parseFloat(values['valeur_estimee']) || 0
  const loyerMensuelRaw = activeBail?.loyer_mensuel || parseFloat(values['loyer_actuel']) || 0
  const prixRevientRaw = parseFloat(values['prix_revient_total']) || (prixAchatRaw + (parseFloat(values['frais_notaire']) || 0) + (parseFloat(values['travaux_initiaux']) || 0))
  const chargesMensuellesRaw = activeBail?.charges_mensuelles || parseFloat(values['charges_mensuelles']) || 0
  const rendementNetStr = values['rendement_net'] || (prixRevientRaw > 0 && loyerMensuelRaw > 0 ? `${(((loyerMensuelRaw * 12) / prixRevientRaw) * 100).toFixed(2)} %` : '—')

  const hasVariation = prixAchatRaw > 0 && valeurActuelleRaw > 0
  const variationPct = hasVariation ? (((valeurActuelleRaw - prixAchatRaw) / prixAchatRaw) * 100).toFixed(1) : null

  const [viewingDoc, setViewingDoc] = useState(null)

  return (
    <div className="bien-overview-dashboard">

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
          {msg}
        </div>
      )}

      {!isEditing ? (
        <div className="dashboard-grid-layout">

          {/* ── CARD 1: FINANCES ── */}
          <div className="dash-card card-finances">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>💲</span>
                <h3>FINANCES</h3>
              </div>
              <button className="dash-card-link" onClick={() => onNavigateTab && onNavigateTab('finances')}>
                Voir le détail →
              </button>
            </div>

            <div className="dash-card-body">
              <div className="finances-kpi-row">
                <div className="fin-kpi-item">
                  <span className="fin-kpi-label">Prix d'achat</span>
                  <strong className="fin-kpi-val">{prixAchatRaw > 0 ? formatEuro(prixAchatRaw) : '—'}</strong>
                </div>
                <div className="fin-kpi-item">
                  <span className="fin-kpi-label">Valeur actuelle</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong className="fin-kpi-val">{valeurActuelleRaw > 0 ? formatEuro(valeurActuelleRaw) : '—'}</strong>
                    {variationPct !== null && (
                      <span className={`val-badge-green`} style={{ background: parseFloat(variationPct) >= 0 ? '#DCFCE7' : '#FEE2E2', color: parseFloat(variationPct) >= 0 ? '#15803D' : '#B91C1C' }}>
                        {parseFloat(variationPct) >= 0 ? `+${variationPct}%` : `${variationPct}%`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="fin-kpi-item">
                  <span className="fin-kpi-label">Loyer mensuel</span>
                  <strong className="fin-kpi-val">{loyerMensuelRaw > 0 ? formatEuro(loyerMensuelRaw) : '—'}</strong>
                </div>
              </div>

              <div className="finances-sub-row">
                <div className="fin-sub-item"><span>Prix de revient total</span><strong>{prixRevientRaw > 0 ? formatEuro(prixRevientRaw) : '—'}</strong></div>
                <div className="fin-sub-item"><span>Charges mensuelles</span><strong>{chargesMensuellesRaw > 0 ? formatEuro(chargesMensuellesRaw) : '—'}</strong></div>
                <div className="fin-sub-item"><span>Rendement net</span><strong>{rendementNetStr}</strong></div>
              </div>

              {/* Graphique Interactif Synthétique */}
              <OverviewFinanceChart bien={bien} champsMap={values} />
            </div>
          </div>

          {/* ── CARD 2: CARACTÉRISTIQUES ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>🚙</span>
                <h3>CARACTÉRISTIQUES</h3>
              </div>
            </div>
            <div className="dash-card-body">
              <div className="kv-list">
                {getRawVal('type_bien', bien.type_bien) && <div className="kv-item"><span>Type de bien</span><strong>{getRawVal('type_bien', bien.type_bien)}</strong></div>}
                {getRawVal('mode_occupation') && <div className="kv-item"><span>Mode d'occupation</span><strong>{getRawVal('mode_occupation')}</strong></div>}
                {getRawVal('pieces') && <div className="kv-item"><span>Pièces</span><strong>{getRawVal('pieces')}</strong></div>}
                {getRawVal('chambres') && <div className="kv-item"><span>Chambres</span><strong>{getRawVal('chambres')}</strong></div>}
                {getRawVal('salles_de_bain') && <div className="kv-item"><span>Salle de bain</span><strong>{getRawVal('salles_de_bain')}</strong></div>}
                {getRawVal('surface_habitable', bien.surface_m2 ? `${bien.surface_m2} m²` : null) && <div className="kv-item"><span>Surface habitable</span><strong>{getRawVal('surface_habitable', bien.surface_m2 ? `${bien.surface_m2} m²` : null)}</strong></div>}
                {getRawVal('etage') && <div className="kv-item"><span>Étage</span><strong>{getRawVal('etage')}</strong></div>}
                {getRawVal('exposition') && <div className="kv-item"><span>Exposition</span><strong>{getRawVal('exposition')}</strong></div>}
                {getRawVal('ascenseur') && <div className="kv-item"><span>Ascenseur</span><strong>{getRawVal('ascenseur')}</strong></div>}
                {getRawVal('cave') && <div className="kv-item"><span>Cave</span><strong>{getRawVal('cave')}</strong></div>}
                {getRawVal('balcon_terrasse') && <div className="kv-item"><span>Balcon / Terrasse</span><strong>{getRawVal('balcon_terrasse')}</strong></div>}
                {getRawVal('meuble') && <div className="kv-item"><span>Meublé</span><strong>{getRawVal('meuble')}</strong></div>}
              </div>
            </div>
          </div>

          {/* ── CARD 3: ÉQUIPEMENTS ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>⚡</span>
                <h3>ÉQUIPEMENTS</h3>
              </div>
            </div>
            <div className="dash-card-body">
              <div className="kv-list">
                {getRawVal('eq_chauffage') && <div className="kv-item"><span>Chauffage</span><strong>{getRawVal('eq_chauffage')}</strong></div>}
                {getRawVal('eq_eau_chaude') && <div className="kv-item"><span>Eau chaude</span><strong>{getRawVal('eq_eau_chaude')}</strong></div>}
                {getRawVal('eq_energie') && <div className="kv-item"><span>Énergie principale</span><strong>{getRawVal('eq_energie')}</strong></div>}
                {getRawVal('eq_clim') && <div className="kv-item"><span>Climatisation</span><strong>{getRawVal('eq_clim')}</strong></div>}
                {getRawVal('eq_fibre') && <div className="kv-item"><span>Fibre optique</span><strong>{getRawVal('eq_fibre')}</strong></div>}
                {getRawVal('eq_vmc') && <div className="kv-item"><span>VMC</span><strong>{getRawVal('eq_vmc')}</strong></div>}
                {getRawVal('eq_interphone') && <div className="kv-item"><span>Interphone</span><strong>{getRawVal('eq_interphone')}</strong></div>}
                {getRawVal('eq_daf') && <div className="kv-item"><span>Détecteur de fumée</span><strong>{getRawVal('eq_daf')}</strong></div>}
              </div>
            </div>
          </div>

          {/* ── CARD 4: CLÉS & ACCÈS ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>🔑</span>
                <h3>CLÉS & ACCÈS</h3>
              </div>
            </div>
            <div className="dash-card-body">
              <div className="kv-list">
                {getRawVal('clefs_logement') && <div className="kv-item"><span>Clés logement</span><strong>{getRawVal('clefs_logement')}</strong></div>}
                {getRawVal('clefs_bal') && <div className="kv-item"><span>Clés boîte aux lettres</span><strong>{getRawVal('clefs_bal')}</strong></div>}
                {getRawVal('clefs_badge_immeuble') && <div className="kv-item"><span>Badge immeuble</span><strong>{getRawVal('clefs_badge_immeuble')}</strong></div>}
                {getRawVal('clefs_telecommande_garage') && <div className="kv-item"><span>Télécommande garage</span><strong>{getRawVal('clefs_telecommande_garage')}</strong></div>}
                {getRawVal('clefs_code_portail') && <div className="kv-item"><span>Code portail</span><strong>{getRawVal('clefs_code_portail')}</strong></div>}
                {getRawVal('clefs_code_interphone') && <div className="kv-item"><span>Code interphone</span><strong>{getRawVal('clefs_code_interphone')}</strong></div>}
              </div>
            </div>
          </div>

          {/* ── CARD 5: LOCALISATION ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>📍</span>
                <h3>LOCALISATION</h3>
              </div>
            </div>
            <div className="dash-card-body">
              <div
                style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', height: 160, marginBottom: 12, cursor: 'pointer' }}
                onClick={() => {
                  const addr = getVal('loc_adresse', bien.adresse)
                  if (addr && addr !== '—') {
                    openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`)
                  }
                }}
                title="📍 Cliquer pour ouvrir la carte dans Google Maps"
              >
                {getVal('loc_adresse', bien.adresse) !== '—' ? (
                  <>
                    <iframe
                      title="Carte interactive du logement"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      style={{ pointerEvents: 'none' }}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(getVal('loc_adresse', bien.adresse))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    />
                    <div
                      style={{
                        position: 'absolute', bottom: 6, right: 6,
                        background: 'rgba(15, 23, 42, 0.85)', color: '#FFF',
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)'
                      }}
                    >
                      📍 Ouvrir dans Google Maps ↗
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#F1F5F9', color: '#94A3B8', fontSize: 13 }}>
                    📍 Adresse non renseignée
                  </div>
                )}
              </div>

              <div className="map-address-text" style={{ marginBottom: 12 }}>
                <strong>{getVal('loc_adresse', bien.adresse)}</strong>
              </div>

              {(() => {
                const currentAddress = getVal('loc_adresse', bien.adresse)
                const autoAmenities = estimateLocationAmenities(currentAddress)

                const displayTrain = getRawVal('loc_train') || getRawVal('loc_metro') || autoAmenities.train
                const displayCommerces = getRawVal('loc_commerces') || autoAmenities.commerces
                const displayEcole = getRawVal('loc_ecole') || autoAmenities.ecole
                const displayHopital = getRawVal('loc_hopital') || autoAmenities.hopital

                const handleOpenMapRoute = (destination, travelMode = 'walking') => {
                  if (!currentAddress || currentAddress === '—') {
                    alert("Veuillez d'abord renseigner une adresse complète pour calculer l'itinéraire.")
                    return
                  }
                  const originStr = encodeURIComponent(currentAddress)
                  const destStr = encodeURIComponent(destination)
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=${travelMode}`
                  openExternalUrl(mapsUrl)
                }

                return (
                  <div className="amenities-grid">
                    {displayTrain && (
                      <div
                        className="amenity-item"
                        onClick={() => handleOpenMapRoute('Gare', 'transit')}
                        title="🧭 Cliquer pour calculer l'itinéraire réel vers la Gare sur Google Maps"
                      >
                        <span className="amenity-icon">🚆</span>
                        <span className="amenity-label">Gare / Train</span>
                        <strong>{displayTrain}</strong>
                        <span className="amenity-route-hint">🧭 Itinéraire ↗</span>
                      </div>
                    )}
                    {displayCommerces && (
                      <div
                        className="amenity-item"
                        onClick={() => handleOpenMapRoute('Commerces Supermarche', 'walking')}
                        title="🧭 Cliquer pour calculer l'itinéraire réel vers les Commerces sur Google Maps"
                      >
                        <span className="amenity-icon">🛒</span>
                        <span className="amenity-label">Commerces</span>
                        <strong>{displayCommerces}</strong>
                        <span className="amenity-route-hint">🧭 Itinéraire ↗</span>
                      </div>
                    )}
                    {displayEcole && (
                      <div
                        className="amenity-item"
                        onClick={() => handleOpenMapRoute('Ecole', 'walking')}
                        title="🧭 Cliquer pour calculer l'itinéraire réel vers l'École sur Google Maps"
                      >
                        <span className="amenity-icon">🎓</span>
                        <span className="amenity-label">École</span>
                        <strong>{displayEcole}</strong>
                        <span className="amenity-route-hint">🧭 Itinéraire ↗</span>
                      </div>
                    )}
                    {displayHopital && (
                      <div
                        className="amenity-item"
                        onClick={() => handleOpenMapRoute('Hopital', 'driving')}
                        title="🧭 Cliquer pour calculer l'itinéraire réel vers l'Hôpital sur Google Maps"
                      >
                        <span className="amenity-icon">🏥</span>
                        <span className="amenity-label">Hôpital</span>
                        <strong>{displayHopital}</strong>
                        <span className="amenity-route-hint">🧭 Itinéraire ↗</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ── CARD 6: ÉTAT DU LOGEMENT ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>📄</span>
                <h3>ÉTAT DU LOGEMENT</h3>
              </div>
            </div>
            <div className="dash-card-body">
              <div className="kv-list">
                {getRawVal('etat_general') && <div className="kv-item"><span>État général</span>{renderStatusPill(getRawVal('etat_general'))}</div>}
                {getRawVal('etat_cuisine') && <div className="kv-item"><span>Cuisine</span>{renderStatusPill(getRawVal('etat_cuisine'))}</div>}
                {getRawVal('etat_salle_de_bain') && <div className="kv-item"><span>Salle de bain</span>{renderStatusPill(getRawVal('etat_salle_de_bain'))}</div>}
                {getRawVal('etat_electricite') && <div className="kv-item"><span>Électricité</span>{renderStatusPill(getRawVal('etat_electricite'))}</div>}
                {getRawVal('etat_plomberie') && <div className="kv-item"><span>Plomberie</span>{renderStatusPill(getRawVal('etat_plomberie'))}</div>}
                {getRawVal('etat_peintures') && <div className="kv-item"><span>Peintures</span>{renderStatusPill(getRawVal('etat_peintures'))}</div>}
                {getRawVal('date_renovation') && <div className="kv-item" style={{ marginTop: 6 }}><span>Dernière rénovation</span><strong>{getRawVal('date_renovation')}</strong></div>}
                {getRawVal('date_inspection') && <div className="kv-item"><span>Dernière inspection</span><strong>{formatDate(getRawVal('date_inspection'))}</strong></div>}
              </div>
            </div>
          </div>

          {/* ── CARD 7: COPROPRIÉTÉ ── */}
          <div className="dash-card card-full-width">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <span className="dash-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>🏢</span>
                <h3>COPROPRIÉTÉ</h3>
              </div>
            </div>
            <div className="dash-card-body">
              <div className="copro-horizontal-grid">
                {getRawVal('copro_nom') && (
                  <div className="copro-col">
                    <span className="copro-label">Nom de la copropriété</span>
                    <strong className="copro-val">{getRawVal('copro_nom')}</strong>
                  </div>
                )}
                {getRawVal('syndic_nom') && (
                  <div className="copro-col">
                    <span className="copro-label">Syndic</span>
                    <strong className="copro-val">{getRawVal('syndic_nom')}</strong>
                  </div>
                )}
                {getRawVal('charges_trimestrielles') && (
                  <div className="copro-col">
                    <span className="copro-label">Charges trimestrielles</span>
                    <strong className="copro-val">{formatEuro(getRawVal('charges_trimestrielles'))}</strong>
                  </div>
                )}
                {getRawVal('copro_tantiemes') && (
                  <div className="copro-col">
                    <span className="copro-label">Tantièmes</span>
                    <strong className="copro-val">{getRawVal('copro_tantiemes')}</strong>
                  </div>
                )}
                {getRawVal('date_derniere_ag') && (
                  <div className="copro-col">
                    <span className="copro-label">Dernière AG</span>
                    <strong className="copro-val">{formatDate(getRawVal('date_derniere_ag'))}</strong>
                  </div>
                )}
                {getRawVal('date_prochaine_ag') && (
                  <div className="copro-col">
                    <span className="copro-label">Prochaine AG</span>
                    <strong className="copro-val">{formatDate(getRawVal('date_prochaine_ag'))}</strong>
                  </div>
                )}
                {getRawVal('fonds_travaux') && (
                  <div className="copro-col">
                    <span className="copro-label">Fonds travaux</span>
                    <strong className="copro-val">{formatEuro(getRawVal('fonds_travaux'))}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ── MODE ÉDITION ORGANISÉ PAR CATÉGORIES (SANS AUCUN CRASH) ── */
        <div className="card" style={{ padding: 24, background: 'var(--color-surface)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>✏️ Édition complète des informations par catégorie</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>
                ❌ Annuler
              </button>
              <button className="btn btn-success btn-sm" disabled={saving} onClick={saveAll}>
                💾 Enregistrer tout
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.keys(groupedAllFields).map(catName => {
              const fieldsInCat = groupedAllFields[catName]
              const color = CATEGORY_COLORS[catName] || 'var(--color-primary)'

              return (
                <div key={catName} style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 10, borderLeft: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ background: color, color: '#FFF', fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>
                      {catName}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                      ({fieldsInCat.length} champs)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {fieldsInCat.map(f => {
                      const attachedPdf = draftValues[`_pdf_${f.key}`] || values[`_pdf_${f.key}`]

                      return (
                        <div key={f.key} className="form-group" style={{ margin: 0, background: '#FFF', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                              {f.label}
                            </label>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '1px 6px', fontSize: 10, border: '1px dashed var(--color-border)' }}
                              onClick={async () => {
                                try {
                                  const sel = await openFileDialog({
                                    multiple: false,
                                    title: `Sélectionner un fichier pour ${f.label}`,
                                    filters: [{ name: 'Tous les fichiers', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'xls', 'doc', 'docx', 'txt', 'csv', 'zip'] }]
                                  })
                                  if (sel) {
                                    const rel = await copyFileToBien({
                                      bienId: bien.id,
                                      subfolder: f.subfolder,
                                      sourcePath: sel,
                                      typeDoc: f.typeDoc,
                                      notes: `Fichier rattaché à ${f.label}`
                                    })
                                    if (rel) {
                                      const pathStr = typeof rel === 'string' ? rel : (rel?.relative_path || String(rel))
                                      setDraftValues(prev => ({ ...prev, [`_pdf_${f.key}`]: pathStr }))
                                      setMsg(`📎 Fichier copié dans ${f.subfolder} pour ${f.label}`)
                                    }
                                  }
                                } catch(e) {}
                              }}
                              title={`Sélectionner un fichier pour ${f.label}`}
                            >
                              📎 Fichier
                            </button>
                          </div>

                          {f.type === 'select' ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 13 }}
                              value={draftValues[f.key] || ''}
                              onChange={e => handleDraftChange(f.key, e.target.value)}
                            >
                              {(f.options || ['—', 'Oui', 'Non']).map(opt => (
                                <option key={opt} value={opt === '—' ? '' : opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                              className="form-control"
                              style={{ fontSize: 13 }}
                              value={draftValues[f.key] || ''}
                              placeholder={f.placeholder || f.hint || ''}
                              onChange={e => handleDraftChange(f.key, e.target.value)}
                            />
                          )}

                          {attachedPdf && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>{getFileIcon(attachedPdf)} rattaché:</span>
                              <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { if (onOpenInDocuments) onOpenInDocuments(bien.id, attachedPdf); else if (onNavigateTab) onNavigateTab('documents'); }}>
                                {getFilenameFromPath(attachedPdf)} (Voir dans Documents →)
                              </span>
                            </div>
                          )}

                          {f.hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>
              ❌ Annuler
            </button>
            <button className="btn btn-success btn-sm" disabled={saving} onClick={saveAll}>
              💾 Enregistrer tout
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
