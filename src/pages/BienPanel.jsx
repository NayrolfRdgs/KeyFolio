import React, { useEffect, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import {
  getBiens, getBienChampsLibres, saveBienChampLibre, deleteBienChampLibre,
  getBaux, getPaiements, getDepenses, getDocuments, getMaintenance, listBienFiles,
  syncBienExcel, updateBien, createPaiement, updatePaiement, deletePaiement,
  createDepense, updateDepense, deleteDepense, createMaintenance, updateMaintenance,
  deleteMaintenance, createBail, updateBail, terminateBail,
  getBienEmailConfig, saveBienEmailConfig, clearBienEmailConfig,
  copyFileToBien, openFilePath, attachQuittanceToPaiement
} from '../lib/db'
import { labelTypeBien, formatDate, formatEuro, statutPaiementBadge,
         labelStatutPaiement, todayISO, prioriteBadge, labelPriorite,
         statutMaintenanceBadge } from '../lib/utils'
import Icon from '../components/common/Icon'
import MailboxPanel from '../components/mailbox/MailboxPanel'
import QuickDocumentModal from '../components/documents/QuickDocumentModal'
import ExcelGeneratorModal from '../components/documents/ExcelGeneratorModal'
import BienHeaderCard from '../components/biens/BienHeaderCard'
import BienOverviewTab from '../components/biens/BienOverviewTab'
import BienFilesTab from '../components/biens/BienFilesTab'
import BienFinanceTab from '../components/biens/BienFinanceTab'
import BienOccupationTab from '../components/biens/BienOccupationTab'
import BienMaintenanceTab from '../components/biens/BienMaintenanceTab'
import BienAlertsSidebar from '../components/biens/BienAlertsSidebar'
import BienMapModal from '../components/biens/BienMapModal'
import BienPhotosGalleryModal from '../components/biens/BienPhotosGalleryModal'
import BienImage from '../components/biens/BienImage'
import NewBailModal from '../components/baux/NewBailModal'

import BienPlanViewerTab from '../components/biens/BienPlanViewerTab'

const TABS = [
  { id: 'generale',    icon: 'fileText', label: 'Infos' },
  { id: 'plan',        icon: 'plan', label: 'Plan' },
  { id: 'finances',    icon: 'wallet', label: 'Finances' },
  { id: 'occupation',  icon: 'house', label: 'Occupation & Bail' },
  { id: 'documents',   icon: 'folder', label: 'Documents' },
  { id: 'maintenance', icon: 'wrench', label: 'Maintenance' },
  { id: 'email',       icon: 'mail', label: 'Email' },
]

export default function BienPanel({ bienId, initialTab = 'generale', mailOptions = null, onNavigate, onOpenMail, onOpenInDocuments, onOpenSettings }) {
  const [bien, setBien] = useState(null)
  const [tab, setTab] = useState(initialTab)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Data
  const [champs, setChamps] = useState([])
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [depenses, setDepenses] = useState([])
  const [documents, setDocuments] = useState([])
  const [maintenance, setMaintenance] = useState([])

  // Modals & Photo Gallery & Map
  const [quickDocBienId, setQuickDocBienId] = useState(null)
  const [excelBienId, setExcelBienId] = useState(null)
  const [syncMsg, setSyncMsg] = useState(null)
  const [galleryModalOpen, setGalleryModalOpen] = useState(false)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [mapModalOpen, setMapModalOpen] = useState(false)

  const [isEditingOverview, setIsEditingOverview] = useState(false)
  const [viewingDoc, setViewingDoc] = useState(null)

  // Documents par dossier
  const [bienFiles, setBienFiles] = useState([])

  // Inline form states
  const [paiementModal, setPaiementModal] = useState(false)
  const [paiementForm, setPaiementForm] = useState(null)
  const [depenseModal, setDepenseModal] = useState(false)
  const [depenseForm, setDepenseForm] = useState(null)
  const [maintenanceModal, setMaintenanceModal] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState(null)
  const [bailModal, setBailModal] = useState(false)
  const [bailForm, setBailForm] = useState(null)

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab, bienId])

  const loadAll = async () => {
    if (!bienId) return
    setLoading(true)
    try {
      const biens = await getBiens()
      const b = biens.find(x => x.id === bienId)
      if (!b) { setError('Logement introuvable'); return }
      setBien(b)
      const [cRes, bRes, dRes, docRes, mRes] = await Promise.all([
        getBienChampsLibres(bienId),
        getBaux(bienId),
        getDepenses(bienId),
        getDocuments(bienId),
        getMaintenance(bienId),
      ])
      setChamps(cRes)
      setBaux(bRes)
      setDepenses(dRes)
      setDocuments(docRes)
      setMaintenance(mRes)
      // Load paiements for active bail
      const activeBail = bRes.find(x => x.statut === 'actif') || bRes[0]
      if (activeBail) {
        const pRes = await getPaiements(activeBail.id)
        setPaiements(pRes)
      } else {
        setPaiements([])
      }
      // Load physical file tree
      try {
        const files = await listBienFiles(bienId)
        setBienFiles(files || [])
      } catch { setBienFiles([]) }
    } catch (e) {
      setError(e?.toString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [bienId])

  const champsMap = champs.reduce((acc, c) => ({...acc, [c.cle]: c.valeur}), {})
  const activeBail = baux.find(b => b.statut === 'actif') || baux[0]

  // Photo upload and storage logic
  const handleUploadPhotos = async (subfolder = '00_ACHAT-VENTE/Annonce - Photos') => {
    try {
      const selected = await openFileDialog({
        multiple: true,
        title: 'Sélectionner des photos pour le logement',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
      })
      if (!selected) return

      const srcFiles = Array.isArray(selected) ? selected : [selected]
      const addedRelPaths = []

      for (const srcPath of srcFiles) {
        const relPath = await copyFileToBien({
          bienId: bienId,
          subfolder: subfolder,
          sourcePath: srcPath,
          typeDoc: 'photo',
          notes: 'Photo annonce / bien'
        })
        if (relPath) {
          const cleanPath = typeof relPath === 'string' ? relPath : (relPath.relative_path || String(relPath))
          addedRelPaths.push(cleanPath)
        }
      }

      if (addedRelPaths.length > 0) {
        let existingList = []
        try {
          if (champsMap['bien_photos_list']) existingList = JSON.parse(champsMap['bien_photos_list'])
        } catch(e) {}
        const updatedList = Array.from(new Set([...existingList, ...addedRelPaths]))
        await saveBienChampLibre(bienId, 'bien_photos_list', JSON.stringify(updatedList))
        await loadAll()
      }
    } catch (err) {
      console.error('Erreur téléversement photos:', err)
    }
  }

  // Convert image relative or absolute path to a valid webview asset URL
  const getPhotoUrl = (pPath) => {
    if (!pPath) return ''
    if (pPath.startsWith('http://') || pPath.startsWith('https://') || pPath.startsWith('data:')) return pPath

    const fname = String(pPath).split(/[/\\]/).pop()
    const match = bienFiles.find(f =>
      f.absolute_path === pPath ||
      f.relative_path === pPath ||
      f.relative_path?.endsWith(pPath) ||
      (f.filename && fname && f.filename.toLowerCase() === fname.toLowerCase())
    )

    const absPath = match ? match.absolute_path : pPath
    if (!absPath) return ''

    try {
      return convertFileSrc(absPath)
    } catch (e) {
      return ''
    }
  }

  // Scanned photo files from property directory
  const scannedPhotoFiles = bienFiles.filter(f =>
    f.filename && (
      f.filename.toLowerCase().endsWith('.jpg') ||
      f.filename.toLowerCase().endsWith('.jpeg') ||
      f.filename.toLowerCase().endsWith('.png') ||
      f.filename.toLowerCase().endsWith('.webp')
    )
  )

  let savedPhotos = []
  try {
    if (champsMap['bien_photos_list']) savedPhotos = JSON.parse(champsMap['bien_photos_list'])
  } catch(e) {}

  const allPhotoPaths = Array.from(new Set([
    ...scannedPhotoFiles.map(f => f.absolute_path),
    ...savedPhotos.map(p => {
      const match = bienFiles.find(f => f.relative_path === p || f.relative_path?.endsWith(p) || f.filename === String(p).split(/[/\\]/).pop())
      return match ? match.absolute_path : p
    })
  ]))

  // Finances KPIs
  const loyerMensuel = activeBail?.loyer_mensuel || parseFloat(champsMap['loyer_actuel']) || 0
  const charges = activeBail?.charges_mensuelles || parseFloat(champsMap['charges_mensuelles']) || 0
  const totalLoyer = loyerMensuel + charges
  const now = new Date()
  const thisMo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const payesMois = paiements.filter(p => p.statut === 'paye' && p.date_prevue?.startsWith(thisMo))
  const encaisseM = payesMois.reduce((s, p) => s + p.montant, 0)
  const depensesMois = depenses.filter(d => d.date?.startsWith(thisMo)).reduce((s, d) => s + d.montant, 0)
  const impayes = paiements.filter(p => p.statut === 'impaye' || p.statut === 'en_retard')
  const bilanNet = encaisseM - depensesMois

  const handleSyncExcel = async () => {
    setSyncMsg(null)
    try {
      await syncBienExcel(bienId)
      setSyncMsg('Fichiers Excel régénérés !')
      setTimeout(() => setSyncMsg(null), 3000)
    } catch (err) { setSyncMsg(`Erreur: ${err}`) }
  }

  // --- Paiements inline CRUD ---
  const openNewPaiement = () => {
    if (!activeBail) return alert('Aucun bail actif pour ce logement.')
    setPaiementForm({ bail_id: activeBail.id, date_prevue: todayISO(), montant: loyerMensuel || '', methode: 'virement', statut: 'impaye', notes: '' })
    setPaiementModal(true)
  }
  const openEditPaiement = (p) => { setPaiementForm({ ...p }); setPaiementModal(true) }
  const savePaiement = async (e) => {
    e.preventDefault()
    const payload = { ...paiementForm, bail_id: parseInt(paiementForm.bail_id), montant: parseFloat(paiementForm.montant) }
    if (payload.id) await updatePaiement(payload)
    else await createPaiement(payload)
    setPaiementModal(false)
    loadAll()
  }
  const markPaid = async (p) => {
    await updatePaiement({ ...p, statut: 'paye', date_reelle: todayISO() })
    loadAll()
  }
  const deletePmt = async (id) => {
    if (!confirm('Supprimer ce paiement ?')) return
    await deletePaiement(id); loadAll()
  }

  // --- Maintenance inline CRUD ---
  const openNewMaintenance = () => {
    setMaintenanceForm({ bien_id: bienId, titre: '', description: '', priorite: 'normal', statut: 'ouvert', prestataire: '', cout: '' })
    setMaintenanceModal(true)
  }
  const openEditMaintenance = (m) => { setMaintenanceForm({ ...m }); setMaintenanceModal(true) }
  const saveMaintenance = async (e) => {
    e.preventDefault()
    const payload = { ...maintenanceForm, bien_id: parseInt(maintenanceForm.bien_id), cout: maintenanceForm.cout ? parseFloat(maintenanceForm.cout) : null }
    if (payload.id) await updateMaintenance(payload)
    else await createMaintenance(payload)
    setMaintenanceModal(false)
    loadAll()
  }
  const deleteMainI = async (id) => {
    if (!confirm('Supprimer ce ticket ?')) return
    await deleteMaintenance(id); loadAll()
  }

  // --- Bail inline ---
  const openNewBail = () => {
    setBailModal(true)
  }
  const saveBail = async (e) => {
    e.preventDefault()
    const payload = {
      ...bailForm,
      bien_id: parseInt(bailForm.bien_id),
      loyer_mensuel: parseFloat(bailForm.loyer_mensuel),
      charges_mensuelles: parseFloat(bailForm.charges_mensuelles || 0),
      depot_garantie: parseFloat(bailForm.depot_garantie || 0),
      jour_paiement: parseInt(bailForm.jour_paiement || 5),
    }
    if (payload.id) await updateBail(payload)
    else await createBail(payload)
    setBailModal(false)
    loadAll()
  }

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}></div>
        <p>Chargement du logement...</p>
      </div>
    </div>
  )

  if (error || !bien) return (
    <div className="page-content">
      <div className="alert alert-danger">{error || 'Logement introuvable'}</div>
    </div>
  )

  const propertyAddress = champsMap['loc_adresse'] || bien.adresse || ''
  const dpeNote = champsMap['dpe_note'] || '—'
  const rendNet = champsMap['rendement_net'] || (champsMap['prix_achat'] && loyerMensuel ? `${(((loyerMensuel * 12) / parseFloat(champsMap['prix_achat'])) * 100).toFixed(2)} %` : '—')
  const modeOccRaw = champsMap['mode_occupation'] || bien.statut || ''
  const modeOccNorm = modeOccRaw.toLowerCase()
  const isResidencePrincipale = modeOccNorm.includes('principale')
  const isResidenceSecondaire = modeOccNorm.includes('secondaire')
  const isOwnerOccupied = isResidencePrincipale || isResidenceSecondaire

  return (
    <div className="bien-panel" style={{ padding: '16px 24px', overflowY: 'auto' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn-back-link" onClick={() => onNavigate && onNavigate('biens')} style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ← Retour aux logements
        </button>
        {syncMsg && <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>{syncMsg}</span>}
      </div>

      {/* ── Top Header Section (Photos + Infos + KPIs + Résumé) ── */}
      <BienHeaderCard
        bien={bien}
        champsMap={champsMap}
        activeBail={activeBail}
        allPhotoPaths={allPhotoPaths}
        propertyAddress={propertyAddress}
        loyerMensuel={loyerMensuel}
        rendNet={rendNet}
        dpeNote={dpeNote}
        onOpenGallery={() => setGalleryModalOpen(true)}
        setActivePhotoIdx={setActivePhotoIdx}
        onUploadPhotos={handleUploadPhotos}
        onOpenMap={() => setMapModalOpen(true)}
        onSyncExcel={handleSyncExcel}
        onNavigateToEdit={() => {
          setTab('generale')
          setIsEditingOverview(true)
        }}
        onAttachDoc={() => setQuickDocBienId(bienId)}
        onNavigateLocataires={() => onNavigate && onNavigate('locataires')}
      />

      {/* ── Main Dashboard Content Layout (Grille 1fr 340px) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        
        {/* Colonne Gauche: Barre d'onglets d'espace + Contenu du Tab */}
        <div>
          {/* Navigation Onglets (Alignée uniquement sur la colonne de gauche) */}
          <div className="bien-panel-tabs" style={{ marginBottom: 16, background: 'var(--color-surface)', borderRadius: 10, padding: '0 12px', border: '1px solid var(--border-color)', display: 'flex', gap: 4 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`bien-tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name={t.icon} size={15} color={tab === t.id ? 'var(--color-accent)' : 'var(--text-muted)'} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="bien-panel-body" style={{ padding: 0 }}>

                  {/* ── TAB INFOS ── */}
                  {tab === 'generale' && (
                    <BienOverviewTab
                      bien={bien}
                      onEdit={() => loadAll()}
                      onNavigateTab={(t) => setTab(t)}
                      onOpenInDocuments={onOpenInDocuments || ((bId, fp) => onNavigate && onNavigate('documents', { bienId: bId, filePath: fp }))}
                      isEditingExternal={isEditingOverview}
                      setIsEditingExternal={setIsEditingOverview}
                    />
                  )}

                  {/* ── TAB PLAN ── */}
                  {tab === 'plan' && (
                    <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <BienPlanViewerTab bien={bien} />
                    </div>
                  )}

                  {/* ── TAB FINANCES ── */}
                  {tab === 'finances' && (
                    <BienFinanceTab
                      bien={bien}
                      champsMap={champsMap}
                      paiements={paiements}
                      depenses={depenses}
                      totalLoyer={totalLoyer}
                      loyerMensuel={loyerMensuel}
                      charges={charges}
                      encaisseM={encaisseM}
                      payesMois={payesMois}
                      depensesMois={depensesMois}
                      bilanNet={bilanNet}
                      onOpenNewPaiement={openNewPaiement}
                      onMarkPaid={markPaid}
                      onDeletePaiement={deletePmt}
                    />
                  )}

                  {/* ── TAB OCCUPATION ── */}
                  {tab === 'occupation' && (
                    <BienOccupationTab
                      isOwnerOccupied={isOwnerOccupied}
                      champsMap={champsMap}
                      baux={baux}
                      onOpenNewBail={openNewBail}
                      onNavigateToEdit={() => {
                        setTab('generale')
                        setIsEditingOverview(true)
                      }}
                    />
                  )}

                  {/* ── TAB DOCUMENTS ── */}
                  {tab === 'documents' && (
                    <BienFilesTab
                      bienFiles={bienFiles}
                      onOpen={(path) => openFilePath(path)}
                      onDeposer={() => setQuickDocBienId(bienId)}
                      onEditFile={(file) => setEditingPdfDoc(file)}
                    />
                  )}

                  {/* ── TAB MAINTENANCE ── */}
                  {tab === 'maintenance' && (
                    <BienMaintenanceTab
                      maintenance={maintenance}
                      onOpenNewMaintenance={openNewMaintenance}
                      onDeleteMaintenance={deleteMainI}
                    />
                  )}

                  {/* ── TAB EMAIL ── */}
                  {tab === 'email' && (
                    <MailboxPanel bienId={bienId} bienNom={bien.nom} initialMailOptions={mailOptions} onOpenSettings={onOpenSettings} />
                  )}

                </div>
              </div>

        {/* Colonne Droite Persistante (ALERTES, DOCUMENTS RAPIDES, ACTIVITÉ) */}
        <BienAlertsSidebar
          bienId={bienId}
          impayes={impayes}
          bienFiles={bienFiles}
          loyerMensuel={loyerMensuel}
          activeBail={activeBail}
          onOpenInDocuments={onOpenInDocuments}
          onNavigate={onNavigate}
        />
      </div>

      {/* ── MAP INTERACTIVE MODAL ── */}
      <BienMapModal
        isOpen={mapModalOpen}
        bienNom={bien.nom}
        propertyAddress={propertyAddress}
        onOpenBrowser={openFilePath}
        onClose={() => setMapModalOpen(false)}
      />

      {/* ── GALERIE PHOTOS MODAL ── */}
      <BienPhotosGalleryModal
        isOpen={galleryModalOpen}
        photoPaths={allPhotoPaths}
        activePhotoIdx={activePhotoIdx}
        setActivePhotoIdx={setActivePhotoIdx}
        onUploadPhotos={handleUploadPhotos}
        onClose={() => setGalleryModalOpen(false)}
      />

      {/* ── MODALS AUXILIAIRES ── */}
      {quickDocBienId && (
        <QuickDocumentModal bienId={quickDocBienId} onClose={() => setQuickDocBienId(null)} onSuccess={() => loadAll()} />
      )}

      {excelBienId && (
        <ExcelGeneratorModal bienId={excelBienId} onClose={() => setExcelBienId(null)} onSuccess={() => loadAll()} />
      )}

      {/* Modal Création / Renouvellement de Bail & Candidature */}
      {bailModal && (
        <NewBailModal
          bien={bien}
          activeBail={activeBail}
          champsMap={champsMap}
          onClose={() => setBailModal(false)}
          onSuccess={() => {
            setSyncMsg(' Nouveau bail et locataire enregistrés avec succès !')
            loadAll()
            setTimeout(() => setSyncMsg(''), 4000)
          }}
        />
      )}
    </div>
  )
}
