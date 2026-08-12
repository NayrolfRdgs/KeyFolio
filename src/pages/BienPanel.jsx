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
import Icon from '../components/Icon'
import MailboxPanel from '../components/MailboxPanel'
import QuickDocumentModal from '../components/QuickDocumentModal'
import ExcelGeneratorModal from '../components/ExcelGeneratorModal'
import BienOverviewTab from '../components/biens/BienOverviewTab'
import BienFilesTab from '../components/biens/BienFilesTab'

const TABS = [
  { id: 'generale',    icon: '📋', label: 'Infos' },
  { id: 'finances',    icon: '💶', label: 'Finances' },
  { id: 'occupation',  icon: '🏠', label: 'Occupation & Bail' },
  { id: 'documents',   icon: '📄', label: 'Documents' },
  { id: 'maintenance', icon: '🔧', label: 'Maintenance' },
  { id: 'email',       icon: '✉️', label: 'Email' },
]

export default function BienPanel({ bienId, initialTab = 'generale', mailOptions = null, onNavigate, onOpenMail, onOpenInDocuments }) {
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
    if (!absPath || (!absPath.includes(':') && !absPath.startsWith('/'))) {
      return ''
    }

    try {
      return convertFileSrc(absPath)
    } catch (e) {
      return `file://${String(absPath).replace(/\\/g, '/')}`
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
    setBailForm({ bien_id: bienId, locataire_id: null, locataire_nom: '', locataire_prenom: '', date_debut: todayISO(), date_fin: '', loyer_mensuel: '', charges_mensuelles: 0, depot_garantie: 0, jour_paiement: 5, statut: 'actif', notes: '' })
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
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
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

  return (
    <div className="bien-panel" style={{ padding: '16px 24px', overflowY: 'auto' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn-back-link" onClick={() => onNavigate && onNavigate('biens')} style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ← Retour aux logements
        </button>
        {syncMsg && <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>{syncMsg}</span>}
      </div>

      {/* ── Dashboard Top Header Banner (Exactement comme dans l'image modèle) ── */}
      <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: 24, alignItems: 'stretch' }}>
          
          {/* Colonne 1: Photos Principale + Miniature */}
          <div>
            <div style={{ position: 'relative', width: '100%', height: 190, borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface-2)', border: '1px solid var(--border-color)' }}>
              {allPhotoPaths.length > 0 ? (
                <img src={getPhotoUrl(allPhotoPaths[0])} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6, color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: 36, opacity: 0.5 }}>📸</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Aucune photo</span>
                </div>
              )}
              <button
                className="btn btn-secondary btn-sm"
                style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(15,23,42,0.75)', color: '#FFF', border: 'none', padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                onClick={() => setGalleryModalOpen(true)}
              >
                📷 Voir toutes les photos ({allPhotoPaths.length})
              </button>
            </div>

            {/* Vignettes sous la photo principale */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 1.2fr', gap: 6, marginTop: 8 }}>
              {allPhotoPaths.slice(1, 6).map((pPath, idx) => (
                <div key={idx} style={{ height: 42, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => { setActivePhotoIdx(idx + 1); setGalleryModalOpen(true) }}>
                  <img src={getPhotoUrl(pPath)} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              <button
                style={{ height: 42, background: 'var(--color-surface-2)', border: '1px dashed var(--border-color)', borderRadius: 6, fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 2 }}
                onClick={() => handleUploadPhotos('00_ACHAT-VENTE/Annonce - Photos')}
                title="Ajouter des photos"
              >
                + Ajouter des photos
              </button>
            </div>
          </div>

          {/* Colonne 2: Infos principales & KPIs */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>🏠 {bien.nom}</h2>
                <span className={`badge ${bien.statut === 'en_cours' ? 'badge-success' : 'badge-warning'}`} style={{ background: '#DCFCE7', color: '#166534', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                  {bien.statut === 'en_cours' ? 'Actif' : bien.statut}
                </span>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                {propertyAddress || '—'}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                {champsMap['surface_m2'] || bien.surface_m2 ? `${champsMap['surface_m2'] || bien.surface_m2} m²` : '—'}  •  {champsMap['pieces'] ? `${champsMap['pieces']} pièce(s)` : ''}  •  {champsMap['type_bien'] || bien.type_bien || 'Logement'}  •  {champsMap['mode_occupation'] || (activeBail ? 'Location' : 'Résidence / Occupation libre')}
              </div>

              {/* Locataire / Occupation actuelle */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Statut / Occupation actuelle</div>
                {activeBail ? (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('locataires')}>
                      👤 {activeBail.locataire_prenom} {activeBail.locataire_nom}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      Bail {activeBail.type_bail || 'Location'} depuis le {formatDate(activeBail.date_debut)}
                    </div>
                  </div>
                ) : champsMap['mode_occupation'] ? (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                      🏠 {champsMap['mode_occupation']}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                    Non loué / Sans bail actif
                  </div>
                )}
              </div>
            </div>

            {/* Rangée de 4 Cartes KPIs Pastel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '8px 12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#10B981' }}>{loyerMensuel ? formatEuro(loyerMensuel) : '—'}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 1 }}>Loyer mensuel</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '8px 12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#3B82F6' }}>{rendNet}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 1 }}>Rendement net</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '8px 12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#F59E0B' }}>{dpeNote}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 1 }}>DPE</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '8px 12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#8B5CF6' }}>{activeBail ? 'Occupé' : (champsMap['mode_occupation'] || 'Libre')}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 1 }}>Occupation</div>
              </div>
            </div>
          </div>

          {/* Colonne 3: RÉSUMÉ (Carte latérale identique au modèle image) */}
          <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  RÉSUMÉ
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setTab('generale')
                      setIsEditingOverview(true)
                    }}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    ✏️ Modifier
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setQuickDocBienId(bienId)} style={{ padding: '3px 8px', fontSize: 11 }}>📎 Joindre</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Type de bien</span>
                  <strong>{champsMap['type_bien'] || bien.type_bien || 'Appartement'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Surface</span>
                  <strong>{bien.surface_m2 || champsMap['surface_m2'] ? `${bien.surface_m2 || champsMap['surface_m2']} m²` : '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Pièces</span>
                  <strong>{champsMap['pieces'] || '2'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Étage</span>
                  <strong>{champsMap['etage'] || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Année de construction</span>
                  <strong>{champsMap['annee_construction'] || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Statut</span>
                  <strong style={{ color: activeBail ? '#10B981' : '#F59E0B' }}>{activeBail ? '● Occupé' : '○ Libre'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Type de bail</span>
                  <strong>{activeBail?.type_bail || 'Location'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Début de bail</span>
                  <strong>{activeBail ? formatDate(activeBail.date_debut) : '—'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '3px 6px', fontSize: 11 }} onClick={() => setMapModalOpen(true)}>
                🗺️ Carte / Map
              </button>
              <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px', fontSize: 11 }} onClick={handleSyncExcel} title="Régénérer Excel">
                🔄 Excel
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main Dashboard Content Layout (Grille Principale à Gauche + Barre Latérale Droite Plus Large) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        
        {/* Colonne Gauche: Onglets & Contenu du Tab (Infos, Finances, Bail...) */}
        <div>
          {/* Navigation Onglets */}
          <div className="bien-panel-tabs" style={{ marginBottom: 16, background: 'var(--color-surface)', borderRadius: 10, padding: '4px 12px', border: '1px solid var(--border-color)' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`bien-tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Corps de l'onglet sélectionné */}
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

            {/* ── TAB FINANCES ── */}
            {tab === 'finances' && (
              <div className="card" style={{ padding: 20 }}>
                <div className="finances-kpi-grid" style={{ marginBottom: 20 }}>
                  <FinKpi label="Loyer mensuel" value={formatEuro(totalLoyer)} sub={`${formatEuro(loyerMensuel)} + ${formatEuro(charges)} charges`} color="#6366f1" />
                  <FinKpi label="Encaissé ce mois" value={formatEuro(encaisseM)} sub={`${payesMois.length} paiement(s)`} color="#22c55e" />
                  <FinKpi label="Dépenses ce mois" value={`-${formatEuro(depensesMois)}`} sub="charges du bien" color="#f59e0b" />
                  <FinKpi label="Bilan net" value={formatEuro(bilanNet)} sub="encaissé - dépenses" color={bilanNet >= 0 ? '#22c55e' : '#ef4444'} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Loyers & Paiements</h4>
                  <button className="btn btn-primary btn-sm" onClick={openNewPaiement}>
                    <Icon name="plus" size={13} /> Saisir un paiement
                  </button>
                </div>

                {paiements.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <div className="empty-state-icon">💳</div>
                    <p>Aucun paiement enregistré pour ce logement</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead><tr><th>Date prévue</th><th>Date réelle</th><th>Montant</th><th>Méthode</th><th>Statut</th><th></th></tr></thead>
                      <tbody>
                        {paiements.map(p => (
                          <tr key={p.id}>
                            <td>{formatDate(p.date_prevue)}</td>
                            <td className="text-muted">{p.date_reelle ? formatDate(p.date_reelle) : '—'}</td>
                            <td className="fw-600">{formatEuro(p.montant)}</td>
                            <td className="text-muted">{p.methode || '—'}</td>
                            <td>{statutPaiementBadge(p.statut)}</td>
                            <td>
                              <div className="actions-cell">
                                {p.statut !== 'paye' && (
                                  <button className="btn btn-success btn-sm" onClick={() => markPaid(p)}>Payer</button>
                                )}
                                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deletePmt(p.id)}><Icon name="trash" size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB OCCUPATION ── */}
            {tab === 'occupation' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Baux du logement</h4>
                  <button className="btn btn-primary btn-sm" onClick={openNewBail}>
                    <Icon name="plus" size={13} /> Nouveau bail
                  </button>
                </div>

                {baux.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏠</div>
                    <h3>Aucun bail pour ce logement</h3>
                    <button className="btn btn-primary btn-sm" onClick={openNewBail}>+ Nouveau bail</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {baux.map(b => (
                      <div key={b.id} className={`card ${b.statut === 'actif' ? 'border-primary' : ''}`} style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`badge ${b.statut === 'actif' ? 'badge-success' : 'badge-muted'}`}>
                                {b.statut === 'actif' ? 'Actif' : 'Terminé'}
                              </span>
                              <strong style={{ fontSize: 16 }}>
                                👤 {b.locataire_prenom} {b.locataire_nom}
                              </strong>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                              Du {formatDate(b.date_debut)} au {b.date_fin ? formatDate(b.date_fin) : 'Indéterminé'}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                              {formatEuro(b.loyer_mensuel)} / mois
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB DOCUMENTS ── */}
            {tab === 'documents' && (
              <BienFilesTab
                bienFiles={bienFiles}
                onOpen={(path) => openFilePath(path)}
                onDeposer={() => setQuickDocBienId(bienId)}
              />
            )}

            {/* ── TAB MAINTENANCE ── */}
            {tab === 'maintenance' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Tickets de maintenance ({maintenance.length})</h4>
                  <button className="btn btn-primary btn-sm" onClick={openNewMaintenance}>
                    <Icon name="plus" size={13} /> Nouveau ticket
                  </button>
                </div>

                {maintenance.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔧</div>
                    <p>Aucun ticket de maintenance pour ce logement</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead><tr><th>Titre</th><th>Priorité</th><th>Statut</th><th>Prestataire</th><th>Coût</th><th></th></tr></thead>
                      <tbody>
                        {maintenance.map(m => (
                          <tr key={m.id}>
                            <td className="fw-600">{m.titre}</td>
                            <td>{prioriteBadge(m.priorite)}</td>
                            <td>{statutMaintenanceBadge(m.statut)}</td>
                            <td className="text-muted">{m.prestataire || '—'}</td>
                            <td className="fw-600">{m.cout ? formatEuro(m.cout) : '—'}</td>
                            <td>
                              <div className="actions-cell">
                                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteMainI(m.id)}><Icon name="trash" size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB EMAIL ── */}
            {tab === 'email' && (
              <MailboxPanel bienId={bienId} initialMailOptions={mailOptions} />
            )}

          </div>
        </div>

        {/* Colonne Droite Plus Large (ALERTES, DOCUMENTS RAPIDES, ACTIVITÉ) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Bloc ALERTES */}
          <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                ALERTES ({impayes.length > 0 ? '3' : '2'})
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>DPE à renouveler</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Valide jusqu'à la fin d'année</div>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🛡️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>Assurance PNO</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attestation annuelle à jour</div>
                </div>
              </div>

              {impayes.length > 0 && (
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>Loyers en retard ({impayes.length})</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Paiement de loyer non reçu</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bloc DOCUMENTS RAPIDES */}
          <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                DOCUMENTS RAPIDES ({bienFiles.length})
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bienFiles.slice(0, 5).map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <span>📄</span>
                    <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {f.filename}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '1px 6px', fontSize: 10 }}
                    onClick={() => {
                      if (onOpenInDocuments) onOpenInDocuments(bienId, f.relative_path || f.absolute_path)
                      else if (onNavigate) onNavigate('documents', { bienId, filePath: f.relative_path || f.absolute_path })
                    }}
                  >
                    Voir dans Documents
                  </button>
                </div>
              ))}
            </div>

            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 10, fontSize: 11 }}
              onClick={() => {
                if (onOpenInDocuments) onOpenInDocuments(bienId)
                else if (onNavigate) onNavigate('documents', bienId)
              }}
            >
              Voir tous les documents ({bienFiles.length}) →
            </button>
          </div>

          {/* Bloc ACTIVITÉ RÉCENTE */}
          <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              ACTIVITÉS RÉCENTES
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14 }}>💵</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Paiement enregistré</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loyer de {formatEuro(loyerMensuel)}</div>
                </div>
              </div>

              {activeBail && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>📑</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Bail actif</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeBail.locataire_prenom} {activeBail.locataire_nom}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── MAP INTERACTIVE MODAL ── */}
      {mapModalOpen && (
        <div className="modal-overlay" onClick={() => setMapModalOpen(false)}>
          <div className="modal-content card" style={{ maxWidth: 720, width: '92%', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>🗺️ Carte & Localisation : {bien.nom}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setMapModalOpen(false)}>✕</button>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              📍 <strong>Adresse :</strong> {propertyAddress || 'Adresse non renseignée'}
            </p>

            {propertyAddress ? (
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', height: 360, position: 'relative' }}>
                <iframe
                  title="Carte du logement"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(propertyAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                📍 Renseignez l'adresse complète du logement pour afficher la carte interactive.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              {propertyAddress && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openFilePath(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyAddress)}`)}
                >
                  📍 Ouvrir dans Google Maps (Navigateur)
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setMapModalOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS AUXILIAIRES ── */}
      {quickDocBienId && (
        <QuickDocumentModal bienId={quickDocBienId} onClose={() => setQuickDocBienId(null)} onSuccess={() => loadAll()} />
      )}

      {excelBienId && (
        <ExcelGeneratorModal bienId={excelBienId} onClose={() => setExcelBienId(null)} onSuccess={() => loadAll()} />
      )}
    </div>
  )
}

function FinKpi({ label, value, sub, color, alert }) {
  return (
    <div className={`fin-kpi-card ${alert ? 'alert-card' : ''}`} style={{ borderTopColor: color }}>
      <div className="fin-kpi-label">{label}</div>
      <div className="fin-kpi-val" style={{ color, fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div className="fin-kpi-sub">{sub}</div>
    </div>
  )
}
