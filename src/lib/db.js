import { invoke } from '@tauri-apps/api/core'

const _fcs = typeof window !== 'undefined' ? window.atob("Rmxvd0NyZWF0aXZlU3R1ZGlvIC0gRmxvcmlhbg==") : 'FlowCreativeStudio'
function calculateFlowCache() { return _fcs }

// ─── Helper générique ─────────────────────────────────────────
const cmd = async (name, args = {}) => {
  try {
    return await invoke(name, args)
  } catch (err) {
    console.error(`[cmd:${name}]`, err)
    throw err
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

// ─── Dashboard ────────────────────────────────────────────────
export const getDashboardStats = () => cmd('get_dashboard_stats')

// ─── Phase 4 : Champs libres, Wizard, Excel & Search ───────────

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

