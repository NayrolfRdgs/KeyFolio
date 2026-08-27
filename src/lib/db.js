import { invoke } from '@tauri-apps/api/core'

const _fcs = typeof window !== 'undefined' ? window.atob("Rmxvd0NyZWF0aXZlU3R1ZGlvIC0gRmxvcmlhbg==") : 'FlowCreativeStudio'
function calculateFlowCache() { return _fcs }

// ─── Helper générique Tauri Invoke avec Fallback LocalStorage ──
const cmd = async (name, args = {}) => {
  try {
    return await invoke(name, args)
  } catch (err) {
    // Si la commande n'est pas encore enregistrée dans le backend Rust ou en mode dev web,
    // on gère élégamment en retournant des structures cohérentes.
    console.warn(`[cmd:${name}] (fallback mode)`, err)
    throw err
  }
}

// ─── Helper LocalStorage réactif pour les entités étendues ─────
function getStorage(key, defaultVal = []) {
  try {
    const data = localStorage.getItem(`keyfolio_${key}`)
    return data ? JSON.parse(data) : defaultVal
  } catch {
    return defaultVal
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(`keyfolio_${key}`, JSON.stringify(value))
  } catch (e) {
    console.error(`Erreur écriture storage keyfolio_${key}`, e)
  }
}

// ─── Biens ────────────────────────────────────────────────────
export const getBiens = () => cmd('get_biens')
export const createBien = (bien) => cmd('create_bien', { bien })
export const updateBien = (bien) => cmd('update_bien', { bien })
export const deleteBien = (id) => cmd('delete_bien', { id })
export const getBienChampsLibres = (bienId) => cmd('get_bien_champs_libres', { bienId })
export const saveBienChampLibre = (bienId, cle, valeur) => cmd('save_bien_champ_libre', { bienId, cle, valeur })
export const saveBienChampsLibresBatch = (bienId, items) => cmd('save_bien_champs_libres_batch', { bienId, items })
export const deleteBienChampLibre = (id) => cmd('delete_bien_champ_libre', { id })

// ─── Gestion Fichiers & Arborescence ──────────────────────────
export const copyFileToBien = ({ bienId, subfolder, sourcePath, typeDoc = null, dateDocument = null, notes = null }) =>
  cmd('copy_file_to_bien', { bienId, subfolder, sourcePath, typeDoc, dateDocument, notes })

export const openFilePath = (path) => cmd('open_file_path', { path })
export const openBienFolder = (bienId) => cmd('open_bien_folder', { bienId })
export const saveFileToDisk = (targetPath, base64Data) => cmd('save_file_to_disk', { targetPath, base64Data })
export const getFilePreview = (path) => cmd('get_file_preview', { path })
export const readExcelFilePreview = (path) => cmd('read_excel_file_preview', { path })
export const readExcelSheet = (path, sheetName) => cmd('read_excel_sheet', { path, sheetName })
export const saveExcelFile = (path, sheetsData) => cmd('save_excel_file', { path, sheetsData })
export const saveBienEmailConfig = (config) => cmd('save_bien_email_config', { config })
export const getBienEmailConfig = (bienId) => cmd('get_bien_email_config', { bienId })
export const clearBienEmailConfig = (bienId) => cmd('clear_bien_email_config', { bienId })
export const scanBienDirectory = (bienId) => cmd('scan_bien_directory', { bienId })
export const listBienFiles = (bienId) => cmd('list_bien_files', { bienId })
export const deleteDocumentFile = (id) => cmd('delete_document_file', { id })
export const deleteFileByPath = (relativePath) => cmd('delete_file_by_path', { relativePath })
export const renameDocumentFile = (relativePath, newFilename) =>
  cmd('rename_document_file', { relativePath, newFilename })

export const moveFileToSubfolder = (bienId, sourceRelativePath, targetSubfolder) =>
  cmd('move_file_to_subfolder', { bienId, sourceRelativePath, targetSubfolder })

export const savePdfToBien = (bienId, subfolder, filename, pdfBase64, docTitle = null) =>
  cmd('save_pdf_to_bien', { bienId, subfolder, filename, pdfBase64, docTitle })

export const openTemplatesFolder = () => cmd('open_templates_folder')
export const getPdfTemplate = (templateName) => cmd('get_pdf_template', { templateName })
export const savePdfTemplate = (templateName, content) => cmd('save_pdf_template', { templateName, content })
export const getPdfTemplateBytes = (templateName) => cmd('get_pdf_template_bytes', { templateName })

// ─── Locataires ───────────────────────────────────────────────
export const getLocataires = () => cmd('get_locataires')
export const createLocataire = (locataire, sourcePath = null) => cmd('create_locataire', { locataire, sourcePath })
export const updateLocataire = (locataire, sourcePath = null) => cmd('update_locataire', { locataire, sourcePath })
export const deleteLocataire = (id) => cmd('delete_locataire', { id })
export const getLocataireStats = (locataireId) => cmd('get_locataire_stats', { locataireId })

// ─── Baux ─────────────────────────────────────────────────────
export const getBaux = (bienId = null) => cmd('get_baux', { bienId })
export const createBail = (bail) => cmd('create_bail', { bail })
export const updateBail = (bail) => cmd('update_bail', { bail })
export const deleteBail = (id) => cmd('delete_bail', { id })
export const terminateBail = (bailId, dateFin = null, motifFin = null, notesFin = null) =>
  cmd('terminate_bail', { bailId, dateFin, motifFin, notesFin })
export const saveEtatDesLieux = (bienId, locataireNom, dateEdl, htmlContent) =>
  cmd('save_etat_des_lieux', { bienId, locataireNom, dateEdl, htmlContent })
export const saveEtatDesLieuxPdf = (bienId, locataireNom, dateEdl, pdfBase64, typeEdl = 'sortie') =>
  cmd('save_etat_des_lieux_pdf', { bienId, locataireNom, dateEdl, pdfBase64, typeEdl })
export const saveContratBailPdf = (bailId, bienId, locataireNom, dateDebut, pdfBase64) =>
  cmd('save_contrat_bail_pdf', { bailId, bienId, locataireNom, dateDebut, pdfBase64 })

// ─── Candidatures ─────────────────────────────────────────────
export const getCandidatures = (bienId = null) => cmd('get_candidatures', { bienId })
export const createCandidature = (candidature, sourcePath = null) => cmd('create_candidature', { candidature, sourcePath })
export const updateCandidature = (candidature, sourcePath = null) => cmd('update_candidature', { candidature, sourcePath })
export const updateCandidatureStatut = (id, statut) => cmd('update_candidature_statut', { id, statut })
export const deleteCandidature = (id) => cmd('delete_candidature', { id })

// ─── Paiements ────────────────────────────────────────────────
export const getPaiements = (bailId = null) => cmd('get_paiements', { bailId })
export const createPaiement = (paiement) => cmd('create_paiement', { paiement })
export const updatePaiement = (paiement) => cmd('update_paiement', { paiement })
export const deletePaiement = (id) => cmd('delete_paiement', { id })

// ─── Dépenses ─────────────────────────────────────────────────
export const getDepenses = (bienId = null) => cmd('get_depenses', { bienId })
export const createDepense = (depense) => cmd('create_depense', { depense })
export const updateDepense = (depense) => cmd('update_depense', { depense })
export const deleteDepense = (id) => cmd('delete_depense', { id })

// ─── Documents ────────────────────────────────────────────────
export const getDocuments = (bienId = null) => cmd('get_documents', { bienId })
export const createDocument = (document) => cmd('create_document', { document })
export const deleteDocument = (id) => cmd('delete_document', { id })

// ─── Maintenance ──────────────────────────────────────────────
export const getMaintenance = (bienId = null) => cmd('get_maintenance', { bienId })
export const createMaintenance = (item) => cmd('create_maintenance', { item })
export const updateMaintenance = (item) => cmd('update_maintenance', { item })
export const deleteMaintenance = (id) => cmd('delete_maintenance', { id })

// ─── Dashboard & Recherche ────────────────────────────────────
export const getDashboardStats = () => cmd('get_dashboard_stats')
export const createBienWizard = (payload) => cmd('create_bien_wizard', { payload })
export const syncBienExcel = (bienId) => cmd('sync_bien_excel', { bienId })
export const importBienFolder = (folderPath) => cmd('import_bien_folder', { folderPath })
export const generateQuestionnaireExcel = (params) => cmd('generate_questionnaire_excel', params)
export const globalSearch = (query) => cmd('global_search', { query })
export const fetchEmails = (bienId) => cmd('fetch_emails', { bienId })
export const sendEmail = ({ bienId, to, subject, body, attachments = null }) =>
  cmd('send_email', { bienId, to, subject, body, attachments })
export const openExternalUrl = (url) => cmd('open_external_url', { url })
export const startGoogleOauth = (bienId, customClientId = null, customClientSecret = null) =>
  cmd('start_google_oauth', { bienId, customClientId, customClientSecret })
export const saveEmailAttachmentToBien = ({ bienId, subfolder, filename, base64Data }) =>
  cmd('save_email_attachment_to_bien', { bienId, subfolder, filename, base64Data })
export const attachQuittanceToPaiement = (paiementId, sourcePath) =>
  cmd('attach_quittance_to_paiement', { paiementId, sourcePath })

// ─── Patching Files ───────────────────────────────────────────
export const auditBienFiles = () => cmd('audit_bien_files')
export const applyPatch = (bienIds) => cmd('apply_patch', { bienIds })

// ═══════════════════════════════════════════════════════════════
// ─── EXTENSIONS OS PATRIMOINE : PROJETS, PRÊTS, TÂCHES, SIMUS ──
// ═══════════════════════════════════════════════════════════════

// ─── 1. PROJETS IMMOBILIERS ───────────────────────────────────
export async function getProjets() {
  // Projets peuvent être extraits des biens dont statut='projet' ou du store de projets dédié
  try {
    const biens = await getBiens()
    const projetsBiens = biens.filter(b => String(b.statut).toLowerCase() === 'projet')
    const storedProjets = getStorage('projets', [])
    
    // Fusionner harmonieusement
    const map = new Map()
    storedProjets.forEach(p => map.set(p.id, p))
    projetsBiens.forEach(b => {
      if (!map.has(b.id)) {
        map.set(b.id, {
          id: b.id,
          nom: b.nom,
          type_projet: b.type_bien || 'renovation',
          statut: b.phase_actuelle || 'travaux',
          adresse: b.adresse || '',
          surface_m2: b.surface_m2 || 0,
          budget_prevu: b.budget_prevision || 0,
          budget_engage: 0,
          budget_paye: 0,
          pourcentage_avancement: b.pourcentage_avancement || 0,
          date_debut: b.date_acquisition || new Date().toISOString().split('T')[0],
          date_livraison_prevue: b.date_livraison_prevue || '',
          description: b.description || b.notes || '',
          photos: [],
          created_at: b.created_at
        })
      }
    })
    return Array.from(map.values())
  } catch {
    return getStorage('projets', [])
  }
}

export async function createProjet(projet) {
  const projets = getStorage('projets', [])
  const newId = Date.now()
  const newProjet = {
    ...projet,
    id: newId,
    budget_prevu: Number(projet.budget_prevu) || 0,
    budget_engage: Number(projet.budget_engage) || 0,
    budget_paye: Number(projet.budget_paye) || 0,
    pourcentage_avancement: Number(projet.pourcentage_avancement) || 0,
    created_at: new Date().toISOString()
  }
  projets.unshift(newProjet)
  setStorage('projets', projets)

  // Créer également le bien correspondant avec statut='projet'
  try {
    await createBien({
      nom: newProjet.nom,
      adresse: newProjet.adresse,
      type_bien: newProjet.type_projet,
      statut: 'projet',
      surface_m2: Number(newProjet.surface_m2) || null,
      budget_prevision: Number(newProjet.budget_prevu) || null,
      pourcentage_avancement: Number(newProjet.pourcentage_avancement) || 0,
      date_livraison_prevue: newProjet.date_livraison_prevue || null,
      description: newProjet.description || null
    })
  } catch (e) {
    console.warn("Bien projet non synchronisé avec le backend :", e)
  }

  return newProjet
}

export async function updateProjet(projet) {
  const projets = getStorage('projets', [])
  const index = projets.findIndex(p => p.id === projet.id)
  if (index !== -1) {
    projets[index] = { ...projets[index], ...projet }
    setStorage('projets', projets)
  }
  return projet
}

export async function deleteProjet(id) {
  const projets = getStorage('projets', [])
  setStorage('projets', projets.filter(p => p.id !== id))
  try {
    await deleteBien(id)
  } catch {}
  return true
}

export async function convertProjetToBien(projetId, bienData) {
  const projets = getStorage('projets', [])
  const projet = projets.find(p => p.id === projetId)
  if (!projet) throw new Error("Projet introuvable")

  // Marquer le projet comme terminé
  projet.statut = 'termine'
  projet.pourcentage_avancement = 100
  setStorage('projets', projets)

  // Créer ou mettre à jour le bien comme actif
  const newBien = {
    nom: bienData.nom || projet.nom,
    adresse: bienData.adresse || projet.adresse,
    type_bien: bienData.type_bien || 'appartement',
    statut: 'actif',
    surface_m2: bienData.surface_m2 || projet.surface_m2,
    valeur_estimee: bienData.valeur_estimee || (projet.budget_prevu * 1.2),
    notes: `Converti depuis le projet : ${projet.nom}`,
    date_acquisition: new Date().toISOString().split('T')[0]
  }

  const result = await createBien(newBien)
  return result
}

// ─── 2. BUDGET DE PROJET ──────────────────────────────────────
export function getProjetBudget(projetId) {
  const allBudgets = getStorage('projet_budgets', {})
  return allBudgets[projetId] || []
}

export function saveProjetBudgetItem(projetId, item) {
  const allBudgets = getStorage('projet_budgets', {})
  const list = allBudgets[projetId] || []
  if (item.id) {
    const idx = list.findIndex(x => x.id === item.id)
    if (idx !== -1) list[idx] = item
    else list.push(item)
  } else {
    list.push({ ...item, id: Date.now() })
  }
  allBudgets[projetId] = list
  setStorage('projet_budgets', allBudgets)
  return list
}

export function deleteProjetBudgetItem(projetId, itemId) {
  const allBudgets = getStorage('projet_budgets', {})
  const list = (allBudgets[projetId] || []).filter(x => x.id !== itemId)
  allBudgets[projetId] = list
  setStorage('projet_budgets', allBudgets)
  return list
}

// ─── 3. PLANS DE PROJET & BIEN ────────────────────────────────
export function getProjetPlans(targetId) {
  const plans = getStorage('plans', [])
  return plans.filter(p => p.target_id === targetId || p.projet_id === targetId || p.bien_id === targetId)
}

export function saveProjetPlan(plan) {
  const plans = getStorage('plans', [])
  const newPlan = { ...plan, id: plan.id || Date.now(), created_at: new Date().toISOString() }
  const idx = plans.findIndex(p => p.id === newPlan.id)
  if (idx !== -1) plans[idx] = newPlan
  else plans.push(newPlan)
  setStorage('plans', plans)
  return newPlan
}

export function deleteProjetPlan(id) {
  const plans = getStorage('plans', [])
  setStorage('plans', plans.filter(p => p.id !== id))
  return true
}

// ─── 4. PRÊTS IMMOBILIERS ─────────────────────────────────────
export async function getPrets(targetId = null) {
  const prets = getStorage('prets', [])
  if (targetId) {
    return prets.filter(p => p.bien_id === targetId || p.projet_id === targetId)
  }
  return prets
}

export async function createPret(pret) {
  const prets = getStorage('prets', [])
  const newPret = {
    ...pret,
    id: Date.now(),
    montant_emprunt: Number(pret.montant_emprunt) || 0,
    apport_personnel: Number(pret.apport_personnel) || 0,
    taux_interet: Number(pret.taux_interet) || 0,
    taux_assurance: Number(pret.taux_assurance) || 0,
    duree_annees: Number(pret.duree_annees) || 20,
    date_debut: pret.date_debut || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
  prets.unshift(newPret)
  setStorage('prets', prets)
  return newPret
}

export async function updatePret(pret) {
  const prets = getStorage('prets', [])
  const idx = prets.findIndex(p => p.id === pret.id)
  if (idx !== -1) {
    prets[idx] = { ...prets[idx], ...pret }
    setStorage('prets', prets)
  }
  return pret
}

export async function deletePret(id) {
  const prets = getStorage('prets', [])
  setStorage('prets', prets.filter(p => p.id !== id))
  return true
}

// ─── 5. SIMULATIONS D'INVESTISSEMENT ──────────────────────────
export function getSimulations() {
  return getStorage('simulations', [])
}

export function saveSimulation(simulation) {
  const simus = getStorage('simulations', [])
  const newSimu = { ...simulation, id: simulation.id || Date.now(), updated_at: new Date().toISOString() }
  const idx = simus.findIndex(s => s.id === newSimu.id)
  if (idx !== -1) simus[idx] = newSimu
  else simus.unshift(newSimu)
  setStorage('simulations', simus)
  return newSimu
}

export function deleteSimulation(id) {
  const simus = getStorage('simulations', [])
  setStorage('simulations', simus.filter(s => s.id !== id))
  return true
}

// ─── 6. TÂCHES & ÉCHÉANCES ────────────────────────────────────
export function getTaches() {
  const defaultTaches = [
    { id: 1, titre: 'Renouveler attestation assurance PNO', categorie: 'assurance', echeance: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], priorite: 'urgent', statut: 'a_faire', termine: false },
    { id: 2, titre: 'Révision annuelle de loyer (Indice IRL)', categorie: 'revision_loyer', echeance: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], priorite: 'normal', statut: 'a_faire', termine: false },
    { id: 3, titre: 'Entretien annuel chaudière gaz', categorie: 'entretien', echeance: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0], priorite: 'normal', statut: 'a_faire', termine: false },
    { id: 4, titre: 'Paiement Taxe Foncière', categorie: 'fiscalite', echeance: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0], priorite: 'normal', statut: 'planifie', termine: false },
  ]
  return getStorage('taches', defaultTaches)
}

export function createTache(tache) {
  const taches = getStorage('taches', getTaches())
  const newTache = {
    ...tache,
    id: Date.now(),
    statut: 'a_faire',
    termine: false,
    created_at: new Date().toISOString()
  }
  taches.unshift(newTache)
  setStorage('taches', taches)
  return newTache
}

export function updateTache(tache) {
  const taches = getStorage('taches', getTaches())
  const idx = taches.findIndex(t => t.id === tache.id)
  if (idx !== -1) {
    taches[idx] = { ...taches[idx], ...tache }
    setStorage('taches', taches)
  }
  return tache
}

export function toggleTacheComplete(id) {
  const taches = getStorage('taches', getTaches())
  const idx = taches.findIndex(t => t.id === id)
  if (idx !== -1) {
    taches[idx].termine = !taches[idx].termine
    taches[idx].statut = taches[idx].termine ? 'termine' : 'a_faire'
    setStorage('taches', taches)
  }
  return taches
}

export function deleteTache(id) {
  const taches = getStorage('taches', getTaches())
  setStorage('taches', taches.filter(t => t.id !== id))
  return true
}

// ─── 7. ÉTATS DES LIEUX ───────────────────────────────────────
export function getEtatsDesLieux(bienId = null) {
  const list = getStorage('etats_des_lieux', [])
  if (bienId) return list.filter(e => e.bien_id === bienId)
  return list
}

export function saveEtatDesLieuxRecord(edl) {
  const list = getStorage('etats_des_lieux', [])
  const newEdl = { ...edl, id: edl.id || Date.now(), created_at: new Date().toISOString() }
  const idx = list.findIndex(e => e.id === newEdl.id)
  if (idx !== -1) list[idx] = newEdl
  else list.unshift(newEdl)
  setStorage('etats_des_lieux', list)
  return newEdl
}

export function deleteEtatDesLieuxRecord(id) {
  const list = getStorage('etats_des_lieux', [])
  setStorage('etats_des_lieux', list.filter(e => e.id !== id))
  return true
}
