import React, { useEffect, useState } from 'react'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import {
  getBiens, getBienChampsLibres, saveBienChampLibre, deleteBienChampLibre,
  getBaux, getPaiements, getDepenses, getDocuments, getMaintenance, listBienFiles,
  syncBienExcel, updateBien, createPaiement, updatePaiement, deletePaiement,
  createDepense, updateDepense, deleteDepense, createMaintenance, updateMaintenance,
  deleteMaintenance, createBail, updateBail,
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

export default function BienPanel({ bienId, initialTab = 'generale', onNavigate }) {
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

  // Modals
  const [quickDocBienId, setQuickDocBienId] = useState(null)
  const [excelBienId, setExcelBienId] = useState(null)
  const [syncMsg, setSyncMsg] = useState(null)

  // Documents par dossier
  const [bienFiles, setBienFiles] = useState([])
  const [docFolderFilter, setDocFolderFilter] = useState('')

  // Inline form states
  const [newCle, setNewCle] = useState('')
  const [newVal, setNewVal] = useState('')
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

  const activeBail = baux.find(b => b.statut === 'actif') || baux[0]

  // Finances KPIs
  const loyerMensuel = activeBail?.loyer_mensuel || 0
  const charges = activeBail?.charges_mensuelles || 0
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

  // --- Champs libres ---
  const handleAddChamp = async (e) => {
    e.preventDefault()
    if (!newCle.trim() || !newVal.trim()) return
    await saveBienChampLibre(bienId, newCle.trim(), newVal.trim())
    setNewCle(''); setNewVal('')
    const updated = await getBienChampsLibres(bienId)
    setChamps(updated)
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

  // --- Dépenses inline CRUD ---
  const openNewDepense = () => {
    setDepenseForm({ bien_id: bienId, date: todayISO(), categorie: 'autre', description: '', montant: '', fournisseur: '' })
    setDepenseModal(true)
  }
  const openEditDepense = (d) => { setDepenseForm({ ...d }); setDepenseModal(true) }
  const saveDepense = async (e) => {
    e.preventDefault()
    const payload = { ...depenseForm, bien_id: parseInt(depenseForm.bien_id), montant: parseFloat(depenseForm.montant) }
    if (payload.id) await updateDepense(payload)
    else await createDepense(payload)
    setDepenseModal(false)
    loadAll()
  }
  const deleteDepI = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await deleteDepense(id); loadAll()
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
    // Copier le devis dans 05_TRAVAUX si sélectionné
    if (maintenanceForm._devisPath) {
      try {
        await copyFileToBien({
          bienId: parseInt(maintenanceForm.bien_id),
          subfolder: '05_TRAVAUX/Factures travaux',
          sourcePath: maintenanceForm._devisPath,
          typeDoc: 'facture',
          notes: `Devis: ${maintenanceForm.titre}`
        })
      } catch (e) { console.error('Copie devis échouée:', e) }
    }
    delete payload._devisPath
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

  return (
    <div className="bien-panel">
      {/* ── Header du logement ── */}
      <div className="bien-panel-header">
        <div className="bien-panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
                🏠 {bien.nom}
                <span className={`badge ${bien.statut === 'en_cours' ? 'badge-success' : bien.statut === 'en_vente' ? 'badge-warning' : 'badge-muted'}`} style={{ marginLeft: 8, fontWeight: 600, fontSize: 11, verticalAlign: 'middle' }}>
                  {bien.statut === 'en_cours' ? 'Actif' : bien.statut === 'en_vente' ? 'En vente' : bien.statut}
                </span>
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {bien.adresse || '—'} {bien.surface_m2 ? `· ${bien.surface_m2} m²` : ''} {bien.type_bien ? `· ${labelTypeBien(bien.type_bien)}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="bien-panel-actions">
          {syncMsg && <span style={{ fontSize: 12, color: 'var(--color-success)' }}>{syncMsg}</span>}
          <button className="btn btn-primary btn-sm" onClick={handleSyncExcel}>
            🔄 Synchro
          </button>
        </div>
      </div>

      {/* ── Navigation Onglets ── */}
      <div className="bien-panel-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`bien-tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span> {t.label}
            {t.id === 'finances' && impayes.length > 0 && (
              <span className="tab-badge">{impayes.length}</span>
            )}
            {t.id === 'maintenance' && maintenance.filter(m => m.statut !== 'resolu').length > 0 && (
              <span className="tab-badge tab-badge-warning">
                {maintenance.filter(m => m.statut !== 'resolu').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Corps ── */}
      <div className="bien-panel-body">

        {/* ── TAB INFOS ── */}
        {tab === 'generale' && (
          <div>
            <div className="bien-info-grid">
              <InfoBlock label="Type" value={labelTypeBien(bien.type_bien)} />
              <InfoBlock label="Statut" value={bien.statut} />
              <InfoBlock label="Surface" value={bien.surface_m2 ? `${bien.surface_m2} m²` : '—'} />
              <InfoBlock label="Date d'acquisition" value={formatDate(bien.date_acquisition)} />
              <InfoBlock label="Adresse" value={bien.adresse || '—'} wide />
              <InfoBlock label="Notes" value={bien.notes || '—'} wide />
              {bien.chemin_dossier && (
                <InfoBlock label="📁 Dossier" value={bien.chemin_dossier} wide mono />
              )}
            </div>

            <h4 style={{ marginTop: 24, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Champs libres
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>Code alarme, compteur, syndic…</span>
            </h4>
            <form onSubmit={handleAddChamp} className="champ-libre-form">
              <input className="form-control" placeholder="Clé (ex: Code Alarme)" value={newCle} onChange={e => setNewCle(e.target.value)} />
              <input className="form-control" placeholder="Valeur (ex: 4819B)" value={newVal} onChange={e => setNewVal(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> Ajouter</button>
            </form>
            {champs.length > 0 && (
              <div className="table-wrapper" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead><tr><th>Clé</th><th>Valeur</th><th></th></tr></thead>
                  <tbody>
                    {champs.map(c => (
                      <tr key={c.id}>
                        <td className="fw-600">{c.cle}</td>
                        <td>{c.valeur}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={async () => { await deleteBienChampLibre(c.id); setChamps(champs.filter(x => x.id !== c.id)) }}>
                            <Icon name="trash" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB FINANCES ── */}
        {tab === 'finances' && (
          <div>
            {/* KPIs Finances */}
            <div className="finances-kpi-grid">
              <FinKpi label="Loyer mensuel" value={formatEuro(totalLoyer)} sub={`${formatEuro(loyerMensuel)} + ${formatEuro(charges)} charges`} color="#6366f1" />
              <FinKpi label="Encaissé ce mois" value={formatEuro(encaisseM)} sub={`${payesMois.length} paiement(s)`} color="#22c55e" />
              <FinKpi label="Dépenses ce mois" value={`-${formatEuro(depensesMois)}`} sub="charges du bien" color="#f59e0b" />
              <FinKpi
                label="Bilan net"
                value={formatEuro(bilanNet)}
                sub="encaissé - dépenses"
                color={bilanNet >= 0 ? '#22c55e' : '#ef4444'}
              />
              {impayes.length > 0 && (
                <FinKpi label="⚠ Impayés" value={`${impayes.length} loyer(s)`} sub="en attente ou retard" color="#ef4444" alert />
              )}
            </div>

            {/* Paiements */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 24 }}>
              <h4 style={{ margin: 0 }}>Loyers & Paiements</h4>
              <button className="btn btn-primary btn-sm" onClick={openNewPaiement}>
                <Icon name="plus" size={13} /> Saisir un paiement
              </button>
            </div>
            {paiements.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon">💳</div>
                <p>Aucun paiement — commencez par créer un bail dans l'onglet Occupation</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ marginBottom: 24 }}>
                <table className="data-table">
                  <thead><tr><th>Date prévue</th><th>Date réelle</th><th>Montant</th><th>Méthode</th><th>Justificatif / Virement</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {paiements.map(p => (
                      <tr
                        key={p.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault()
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            const f = e.dataTransfer.files[0]
                            const path = f.path || f.name
                            if (path) {
                              try {
                                await attachQuittanceToPaiement(p.id, path)
                                loadAll()
                              } catch(err) { alert(`Erreur: ${err}`) }
                            }
                          }
                        }}
                      >
                        <td>{formatDate(p.date_prevue)}</td>
                        <td className="text-muted">{p.date_reelle ? formatDate(p.date_reelle) : '—'}</td>
                        <td className="fw-600">{formatEuro(p.montant)}</td>
                        <td className="text-muted">{p.methode || '—'}</td>
                        <td>
                          {p.fichier_quittance ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => openFilePath(p.fichier_quittance)}
                              title="Ouvrir le justificatif attaché"
                            >
                              📄 Justificatif PDF
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11, border: '1px dashed var(--color-border)' }}
                              onClick={async () => {
                                try {
                                  const sel = await openFileDialog({
                                    multiple: false,
                                    title: 'Sélectionner le virement ou justificatif PDF',
                                    filters: [{ name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }]
                                  })
                                  if (sel) {
                                    await attachQuittanceToPaiement(p.id, sel)
                                    loadAll()
                                  }
                                } catch(e) {}
                              }}
                              title="Attacher un PDF de virement"
                            >
                              📎 Glisser PDF
                            </button>
                          )}
                        </td>
                        <td><span className={`badge ${statutPaiementBadge(p.statut)}`}>{labelStatutPaiement(p.statut)}</span></td>
                        <td>
                          <div className="actions-cell">
                            {p.statut !== 'paye' && (
                              <button className="btn btn-success btn-sm" style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600 }} onClick={() => markPaid(p)}>
                                <Icon name="check" size={12} /> Payé
                              </button>
                            )}
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditPaiement(p)}>
                              <Icon name="edit" size={13} />
                            </button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => deletePmt(p.id)}>
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dépenses */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Dépenses du bien</h4>
              <button className="btn btn-primary btn-sm" onClick={openNewDepense}>
                <Icon name="plus" size={13} /> Nouvelle dépense
              </button>
            </div>
            {depenses.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p style={{ fontSize: 13 }}>Aucune dépense enregistrée pour ce logement.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Montant</th><th>Fournisseur</th><th></th></tr></thead>
                  <tbody>
                    {depenses.map(d => (
                      <tr key={d.id}>
                        <td>{formatDate(d.date)}</td>
                        <td><span className="badge badge-warning">{d.categorie}</span></td>
                        <td>{d.description || '—'}</td>
                        <td className="fw-600 text-danger">-{formatEuro(d.montant)}</td>
                        <td className="text-muted">{d.fournisseur || '—'}</td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditDepense(d)}>
                              <Icon name="edit" size={13} />
                            </button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteDepI(d.id)}>
                              <Icon name="trash" size={13} />
                            </button>
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
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>Baux ({baux.length})</h4>
              <button className="btn btn-primary btn-sm" onClick={openNewBail}>
                <Icon name="plus" size={13} /> Nouveau bail
              </button>
            </div>

            {activeBail && (
              <div className="bail-active-card">
                <div className="bail-active-header">
                  <span>🔑 Bail actif</span>
                  <span className="badge badge-success">Actif</span>
                </div>
                <div className="bail-active-grid">
                  <div><span className="bail-label">Locataire</span><strong>{activeBail.locataire_nom} {activeBail.locataire_prenom}</strong></div>
                  <div><span className="bail-label">Loyer mensuel</span><strong>{formatEuro(activeBail.loyer_mensuel)}</strong></div>
                  <div><span className="bail-label">Charges</span><strong>{formatEuro(activeBail.charges_mensuelles || 0)}</strong></div>
                  <div><span className="bail-label">Jour de paiement</span><strong>Le {activeBail.jour_paiement || 5} du mois</strong></div>
                  <div><span className="bail-label">Début du bail</span><strong>{formatDate(activeBail.date_debut)}</strong></div>
                  <div><span className="bail-label">Dépôt de garantie</span><strong>{formatEuro(activeBail.depot_garantie || 0)}</strong></div>
                </div>
              </div>
            )}

            {baux.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">🔑</div>
                <h3>Aucun bail</h3>
                <p>Créez le premier bail pour commencer à suivre les paiements</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead><tr><th>Locataire</th><th>Début</th><th>Fin</th><th>Loyer</th><th>Statut</th></tr></thead>
                  <tbody>
                    {baux.map(b => (
                      <tr key={b.id}>
                        <td className="fw-600">{b.locataire_nom} {b.locataire_prenom}</td>
                        <td>{formatDate(b.date_debut)}</td>
                        <td>{b.date_fin ? formatDate(b.date_fin) : '—'}</td>
                        <td>{formatEuro(b.loyer_mensuel)}</td>
                        <td><span className={`badge ${b.statut === 'actif' ? 'badge-success' : 'badge-muted'}`}>{b.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB DOCUMENTS ── */}
        {tab === 'documents' && (
          <DocumentsTab
            bienFiles={bienFiles}
            docFolderFilter={docFolderFilter}
            setDocFolderFilter={setDocFolderFilter}
            onDeposer={() => setQuickDocBienId(bienId)}
            onOpen={openFilePath}
          />
        )}

        {/* ── TAB MAINTENANCE ── */}
        {tab === 'maintenance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>Tickets de maintenance ({maintenance.length})</h4>
              <button className="btn btn-primary btn-sm" onClick={openNewMaintenance}>
                <Icon name="plus" size={13} /> Nouveau ticket
              </button>
            </div>
            {maintenance.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">🔧</div>
                <h3>Aucun ticket</h3>
                <p>Signalez une intervention ou réparation pour ce logement</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Titre</th><th>Priorité</th><th>Statut</th><th>Prestataire</th><th>Coût</th><th></th></tr></thead>
                  <tbody>
                    {maintenance.map(m => (
                      <tr key={m.id}>
                        <td className="fw-600">{m.titre}</td>
                        <td><span className={`badge ${prioriteBadge(m.priorite)}`}>{labelPriorite(m.priorite)}</span></td>
                        <td><span className={`badge ${statutMaintenanceBadge(m.statut)}`}>{m.statut}</span></td>
                        <td>{m.prestataire || '—'}</td>
                        <td>{m.cout ? formatEuro(m.cout) : '—'}</td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditMaintenance(m)}>
                              <Icon name="edit" size={13} />
                            </button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteMainI(m.id)}>
                              <Icon name="trash" size={13} />
                            </button>
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
          <MailboxPanel bienId={bienId} bienNom={bien.nom} />
        )}
      </div>

      {/* ── Modales Inline ── */}
      {paiementModal && (
        <InlineModal title={paiementForm?.id ? 'Modifier le paiement' : 'Nouveau paiement'} onClose={() => setPaiementModal(false)}>
          <form onSubmit={savePaiement}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date prévue *</label>
                <input type="date" className="form-control" required value={paiementForm.date_prevue || ''} onChange={e => setPaiementForm({...paiementForm, date_prevue: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Montant (€) *</label>
                <input type="number" step="0.01" className="form-control" required value={paiementForm.montant || ''} onChange={e => setPaiementForm({...paiementForm, montant: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date réelle</label>
                <input type="date" className="form-control" value={paiementForm.date_reelle || ''} onChange={e => setPaiementForm({...paiementForm, date_reelle: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Méthode</label>
                <select className="form-control" value={paiementForm.methode} onChange={e => setPaiementForm({...paiementForm, methode: e.target.value})}>
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="prelevement">Prélèvement</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-control" value={paiementForm.statut} onChange={e => setPaiementForm({...paiementForm, statut: e.target.value})}>
                <option value="impaye">Impayé</option>
                <option value="paye">Payé</option>
                <option value="en_retard">En retard</option>
                <option value="partiel">Partiel</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPaiementModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </InlineModal>
      )}

      {depenseModal && (
        <InlineModal title={depenseForm?.id ? 'Modifier la dépense' : 'Nouvelle dépense'} onClose={() => setDepenseModal(false)}>
          <form onSubmit={saveDepense}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-control" required value={depenseForm.date || ''} onChange={e => setDepenseForm({...depenseForm, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Montant (€) *</label>
                <input type="number" step="0.01" className="form-control" required value={depenseForm.montant || ''} onChange={e => setDepenseForm({...depenseForm, montant: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-control" value={depenseForm.categorie} onChange={e => setDepenseForm({...depenseForm, categorie: e.target.value})}>
                  {['travaux','energie','assurance','taxe','entretien','frais_gestion','autre'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fournisseur</label>
                <input className="form-control" value={depenseForm.fournisseur || ''} onChange={e => setDepenseForm({...depenseForm, fournisseur: e.target.value})} placeholder="Nom du prestataire" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={depenseForm.description || ''} onChange={e => setDepenseForm({...depenseForm, description: e.target.value})} placeholder="Détail de la dépense" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDepenseModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </InlineModal>
      )}

      {maintenanceModal && (
        <InlineModal title={maintenanceForm?.id ? 'Modifier le ticket' : 'Nouveau ticket'} onClose={() => setMaintenanceModal(false)}>
          <form onSubmit={saveMaintenance}>
            <div className="form-group">
              <label className="form-label">Titre *</label>
              <input className="form-control" required value={maintenanceForm.titre || ''} onChange={e => setMaintenanceForm({...maintenanceForm, titre: e.target.value})} placeholder="Ex: Fuite robinet cuisine" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priorité</label>
                <select className="form-control" value={maintenanceForm.priorite} onChange={e => setMaintenanceForm({...maintenanceForm, priorite: e.target.value})}>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="faible">Faible</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select className="form-control" value={maintenanceForm.statut} onChange={e => setMaintenanceForm({...maintenanceForm, statut: e.target.value})}>
                  <option value="ouvert">Ouvert</option>
                  <option value="en_cours">En cours</option>
                  <option value="resolu">Résolu</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prestataire</label>
                <input className="form-control" value={maintenanceForm.prestataire || ''} onChange={e => setMaintenanceForm({...maintenanceForm, prestataire: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Coût estimé (€)</label>
                <input type="number" step="0.01" className="form-control" value={maintenanceForm.cout || ''} onChange={e => setMaintenanceForm({...maintenanceForm, cout: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={maintenanceForm.description || ''} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">📎 Devis / Justificatif</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-control" style={{ flex: 1, fontSize: 12 }} readOnly
                  value={maintenanceForm._devisPath ? maintenanceForm._devisPath.split(/[/\\]/).pop() : ''}
                  placeholder="Aucun fichier sélectionné" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={async () => {
                  try {
                    const f = await openFileDialog({ multiple: false, title: 'Sélectionner le devis ou justificatif' })
                    if (f) setMaintenanceForm(prev => ({...prev, _devisPath: f }))
                  } catch {}
                }}>
                  Parcourir
                </button>
                {maintenanceForm._devisPath && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMaintenanceForm(prev => ({...prev, _devisPath: null}))}>
                    ✕
                  </button>
                )}
              </div>
              {maintenanceForm._devisPath && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  📁 Sera copié dans <em>05_TRAVAUX/Factures travaux</em>
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setMaintenanceModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </InlineModal>
      )}

      {bailModal && (
        <InlineModal title="Nouveau bail" onClose={() => setBailModal(false)}>
          <form onSubmit={saveBail}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prénom locataire *</label>
                <input className="form-control" required value={bailForm.locataire_prenom || ''} onChange={e => setBailForm({...bailForm, locataire_prenom: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom locataire *</label>
                <input className="form-control" required value={bailForm.locataire_nom || ''} onChange={e => setBailForm({...bailForm, locataire_nom: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Loyer mensuel (€) *</label>
                <input type="number" step="0.01" className="form-control" required value={bailForm.loyer_mensuel || ''} onChange={e => setBailForm({...bailForm, loyer_mensuel: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Charges (€)</label>
                <input type="number" step="0.01" className="form-control" value={bailForm.charges_mensuelles || ''} onChange={e => setBailForm({...bailForm, charges_mensuelles: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date de début *</label>
                <input type="date" className="form-control" required value={bailForm.date_debut || ''} onChange={e => setBailForm({...bailForm, date_debut: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Dépôt de garantie (€)</label>
                <input type="number" step="0.01" className="form-control" value={bailForm.depot_garantie || ''} onChange={e => setBailForm({...bailForm, depot_garantie: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setBailModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Créer le bail</button>
            </div>
          </form>
        </InlineModal>
      )}

      {quickDocBienId && (
        <QuickDocumentModal
          initialBienId={quickDocBienId}
          onClose={() => setQuickDocBienId(null)}
          onSuccess={loadAll}
        />
      )}
      {excelBienId && (
        <ExcelGeneratorModal
          initialBienId={excelBienId}
          onClose={() => setExcelBienId(null)}
          onSuccess={loadAll}
        />
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoBlock({ label, value, wide, mono }) {
  return (
    <div style={{ gridColumn: wide ? 'span 2' : undefined }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</div>
    </div>
  )
}

function FinKpi({ label, value, sub, color, alert }) {
  return (
    <div className={`fin-kpi-card ${alert ? 'fin-kpi-alert' : ''}`} style={{ borderColor: alert ? '#ef4444' : undefined }}>
      <div className="fin-kpi-label">{label}</div>
      <div className="fin-kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="fin-kpi-sub">{sub}</div>}
    </div>
  )
}

function InlineModal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── DocumentsTab : vue par dossiers ─────────────────────────────────────────

function fileIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (['pdf'].includes(ext)) return '📕'
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx','csv'].includes(ext)) return '📊'
  if (['zip','rar','7z'].includes(ext)) return '🗜️'
  return '📄'
}

function DocumentsTab({ bienFiles, docFolderFilter, setDocFolderFilter, onDeposer, onOpen }) {
  const [openFolders, setOpenFolders] = React.useState({})
  const [search, setSearch] = React.useState('')

  // Group files by subfolder
  const grouped = React.useMemo(() => {
    const g = {}
    const flat = Array.isArray(bienFiles) ? bienFiles : []
    flat.forEach(f => {
      const folder = f.subfolder || 'Racine'
      if (!g[folder]) g[folder] = []
      g[folder].push(f)
    })
    return g
  }, [bienFiles])

  const folderNames = Object.keys(grouped).sort()
  const totalFiles = bienFiles?.length || 0

  const filtered = React.useMemo(() => {
    if (!search) return grouped
    const q = search.toLowerCase()
    const g = {}
    folderNames.forEach(f => {
      const matches = grouped[f].filter(file => (file.filename || file.name)?.toLowerCase().includes(q))
      if (matches.length) g[f] = matches
    })
    return g
  }, [grouped, folderNames, search])

  const toggleFolder = (name) => setOpenFolders(prev => ({ ...prev, [name]: !prev[name] }))

  return (
    <div>
      {/* Header toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>📁 Documents</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalFiles} fichier{totalFiles !== 1 ? 's' : ''}</span>
          <input
            className="form-control"
            style={{ flex: 1, maxWidth: 200, fontSize: 12, padding: '4px 10px' }}
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={onDeposer}>
          + Déposer un document
        </button>
      </div>

      {/* Folder tree */}
      {Object.keys(filtered).length === 0 ? (
        <div className="empty-state" style={{ padding: 48 }}>
          <div className="empty-state-icon">📂</div>
          <h3>{search ? 'Aucun fichier trouvé' : 'Aucun document'}</h3>
          <p>{search ? `Aucun fichier ne correspond à "${search}"` : 'Déposez des contrats, factures, photos pour ce logement'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.keys(filtered).sort().map(folder => {
            const files = filtered[folder]
            const isOpen = openFolders[folder] !== false // default open
            return (
              <div key={folder} style={{
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--surface-card)'
              }}>
                {/* Folder row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                    cursor: 'pointer', userSelect: 'none',
                    background: isOpen ? 'var(--surface-hover)' : 'transparent',
                    borderBottom: isOpen ? '1px solid var(--border-color)' : 'none'
                  }}
                  onClick={() => toggleFolder(folder)}
                >
                  <span style={{ fontSize: 16 }}>{isOpen ? '📂' : '📁'}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{folder}</span>
                  <span style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 7px'
                  }}>{files.length}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Files list */}
                {isOpen && (
                  <div>
                    {files.map((file, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 14px 7px 36px',
                        borderBottom: i < files.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        fontSize: 13
                      }}>
                        <span style={{ fontSize: 14 }}>{fileIcon(file.filename || file.name)}</span>
                        <span style={{ flex: 1, fontWeight: 500, wordBreak: 'break-all' }}>{file.filename || file.name}</span>
                        {file.size_bytes != null && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {file.size_bytes < 1024*1024
                              ? `${Math.round(file.size_bytes/1024)} Ko`
                              : `${(file.size_bytes/1024/1024).toFixed(1)} Mo`}
                          </span>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 10px', fontSize: 12 }}
                          onClick={() => onOpen(file.absolute_path || file.path)}
                        >
                          Ouvrir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
