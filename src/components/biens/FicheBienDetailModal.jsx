import React, { useEffect, useState } from 'react'
import {
  getBienChampsLibres, saveBienChampLibre, deleteBienChampLibre,
  getBaux, getPaiements, getDepenses, getDocuments, getMaintenance,
  syncBienExcel, updateBien,
  getBienEmailConfig, saveBienEmailConfig, clearBienEmailConfig
} from '../../lib/db'
import { labelTypeBien, formatDate } from '../../lib/utils'
import Icon from '../common/Icon'

const DEFAULT_EMAIL_CONFIG = {
  bien_id: null,
  email_adresse: '',
  password: '',
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 465,
  use_ssl: true,
}

export default function FicheBienDetailModal({ bien, onClose, onRefresh, onOpenQuickDoc, onOpenExcelGenerator }) {
  const [tab, setTab] = useState('generale') // 'generale' | 'occupation' | 'finances' | 'documents' | 'maintenance' | 'email'

  // Champs libres
  const [champs, setChamps] = useState([])
  const [newCle, setNewCle] = useState('')
  const [newVal, setNewVal] = useState('')
  const [loadingChamps, setLoadingChamps] = useState(false)

  // Sub-data
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [depenses, setDepenses] = useState([])
  const [documents, setDocuments] = useState([])
  const [maintenance, setMaintenance] = useState([])

  const [editingBien, setEditingBien] = useState({ ...bien })
  const [syncMsg, setSyncMsg] = useState(null)
  const [emailConfig, setEmailConfig] = useState(DEFAULT_EMAIL_CONFIG)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')

  const loadAllData = async () => {
    if (!bien?.id) return
    try {
      const [cRes, bRes, dRes, docRes, mRes, emailRes] = await Promise.all([
        getBienChampsLibres(bien.id),
        getBaux(bien.id),
        getDepenses(bien.id),
        getDocuments(bien.id),
        getMaintenance(bien.id),
        getBienEmailConfig(bien.id)
      ])
      setChamps(cRes)
      setBaux(bRes)
      setDepenses(dRes)
      setDocuments(docRes)
      setMaintenance(mRes)

      if (emailRes) {
        setEmailConfig({
          bien_id: bien.id,
          email_adresse: emailRes.email_adresse || '',
          password: '',
          imap_host: emailRes.imap_host || 'imap.gmail.com',
          imap_port: emailRes.imap_port || 993,
          smtp_host: emailRes.smtp_host || 'smtp.gmail.com',
          smtp_port: emailRes.smtp_port || 465,
          use_ssl: emailRes.use_ssl !== false,
        })
      } else {
        setEmailConfig({ ...DEFAULT_EMAIL_CONFIG, bien_id: bien.id })
      }

      if (bRes.length > 0) {
        const activeBail = bRes.find(b => b.statut === 'actif') || bRes[0]
        if (activeBail) {
          const pRes = await getPaiements(activeBail.id)
          setPaiements(pRes)
        }
      }
    } catch (e) {
      console.error('Erreur chargement fiche bien', e)
    }
  }

  useEffect(() => { loadAllData() }, [bien?.id])

  const handleAddChamp = async (e) => {
    e.preventDefault()
    if (!newCle.trim() || !newVal.trim()) return
    setLoadingChamps(true)
    try {
      await saveBienChampLibre(bien.id, newCle.trim(), newVal.trim())
      setNewCle('')
      setNewVal('')
      const updated = await getBienChampsLibres(bien.id)
      setChamps(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingChamps(false)
    }
  }

  const handleDeleteChamp = async (id) => {
    try {
      await deleteBienChampLibre(id)
      setChamps(champs.filter(c => c.id !== id))
    } catch (e) { console.error(e) }
  }

  const handleSyncExcel = async () => {
    setSyncMsg(null)
    try {
      await syncBienExcel(bien.id)
      setSyncMsg('Fichiers Excel régénérés avec succès !')
      setTimeout(() => setSyncMsg(null), 3000)
    } catch (err) {
      setSyncMsg(`Erreur synchro: ${err}`)
    }
  }

  const handleSaveEmailConfig = async (e) => {
    e?.preventDefault()
    if (!bien?.id || !emailConfig.email_adresse.trim()) {
      setEmailStatus('Adresse email obligatoire.')
      return
    }

    setEmailSaving(true)
    try {
      await saveBienEmailConfig({
        bien_id: bien.id,
        email_adresse: emailConfig.email_adresse.trim(),
        password: emailConfig.password || undefined,
        imap_host: emailConfig.imap_host,
        imap_port: Number(emailConfig.imap_port || 993),
        smtp_host: emailConfig.smtp_host,
        smtp_port: Number(emailConfig.smtp_port || 465),
        use_ssl: emailConfig.use_ssl,
      })
      setEmailStatus('Configuration email enregistrée pour ce bien.')
      setEmailConfig((prev) => ({ ...prev, password: '' }))
    } catch (err) {
      setEmailStatus(`Erreur: ${err}`)
    } finally {
      setEmailSaving(false)
    }
  }

  const handleClearEmailConfig = async () => {
    try {
      await clearBienEmailConfig(bien.id)
      setEmailConfig({ ...DEFAULT_EMAIL_CONFIG, bien_id: bien.id })
      setEmailStatus('Configuration email supprimée.')
    } catch (err) {
      setEmailStatus(`Erreur: ${err}`)
    }
  }

  const activeBail = baux.find(b => b.statut === 'actif') || baux[0]

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 880, width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header avec Actions Rapides */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-subtle)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              🏠 {bien.nom}
              <span className="badge badge-info">{labelTypeBien(bien.type_bien)}</span>
            </h3>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>📁 {bien.chemin_dossier}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setTab('email')} title="Configurer une adresse email dédiée au bien">
              ✉️ Email
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onOpenExcelGenerator(bien.id)} title="Générer un tableau sur mesure">
              📊 Modèle Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onOpenQuickDoc(bien.id)} title="Associer un fichier PDF">
              📎 Associer un document
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSyncExcel} title="Resynchroniser les fichiers Excel">
              🔄 Synchro Excel
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
        </div>

        {syncMsg && (
          <div className="alert alert-info" style={{ borderRadius: 0, margin: 0, padding: '8px 20px', fontSize: 12 }}>
            {syncMsg}
          </div>
        )}

        {/* Navigation Onglets */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          {[
            { id: 'generale', label: 'Infos Générales & Champs libres' },
            { id: 'email', label: 'Email' },
            { id: 'occupation', label: `Occupation & Bail (${baux.length})` },
            { id: 'finances', label: `Finances (${paiements.length} pmt / ${depenses.length} dép)` },
            { id: 'documents', label: `Documents (${documents.length})` },
            { id: 'maintenance', label: `Maintenance (${maintenance.length})` }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: tab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--color-accent)' : 'var(--color-muted)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Corps de l'onglet */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

          {/* TAB 1 : INFOS GÉNÉRALES & CHAMPS LIBRES */}
          {tab === 'generale' && (
            <div>
              <h4 style={{ marginTop: 0 }}>Informations fixes du bien</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24, background: 'var(--color-bg-subtle)', padding: 14, borderRadius: 8 }}>
                <div><strong>Adresse :</strong> {bien.adresse || '—'}</div>
                <div><strong>Surface :</strong> {bien.surface_m2 ? `${bien.surface_m2} m²` : '—'}</div>
                <div><strong>Statut :</strong> {bien.statut}</div>
                <div><strong>Date d'acquisition :</strong> {bien.date_acquisition || '—'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Notes :</strong> {bien.notes || '—'}</div>
              </div>

              <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Champs libres & données spécifiques
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-muted)' }}>Ex: Compteur, alarme, syndic</span>
              </h4>

              {/* Formulaire ajout champ libre */}
              <form onSubmit={handleAddChamp} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="text" className="form-control" placeholder="Clé (ex: Code Alarme)"
                  value={newCle} onChange={e => setNewCle(e.target.value)} style={{ flex: 1 }}
                />
                <input
                  type="text" className="form-control" placeholder="Valeur (ex: 4819B)"
                  value={newVal} onChange={e => setNewVal(e.target.value)} style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={loadingChamps}>
                  <Icon name="plus" size={14} /> Ajouter
                </button>
              </form>

              {/* Liste des champs libres */}
              {champs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Intitulé / Clé</th><th>Valeur</th><th></th></tr>
                    </thead>
                    <tbody>
                      {champs.map(c => (
                        <tr key={c.id}>
                          <td className="fw-600">{c.cle}</td>
                          <td>{c.valeur}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-icon text-danger" onClick={() => handleDeleteChamp(c.id)}>
                              <Icon name="trash" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic' }}>
                  Aucun champ libre défini pour ce bien.
                </div>
              )}
            </div>
          )}

          {/* TAB 2 : EMAIL */}
          {tab === 'email' && (
            <div>
              <h4 style={{ marginTop: 0 }}>Adresse email dédiée au bien</h4>
              <p style={{ marginTop: 0, color: 'var(--color-muted)', fontSize: 13 }}>
                Configurez l’adresse email liée à ce bien. Le mot de passe est stocké localement dans le gestionnaire de clés du système, jamais en clair dans la base.
              </p>

              <form onSubmit={handleSaveEmailConfig} style={{ display: 'grid', gap: 12, maxWidth: 620 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Adresse email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={emailConfig.email_adresse}
                    onChange={(e) => setEmailConfig({ ...emailConfig, email_adresse: e.target.value })}
                    placeholder="nom@gmail.com"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Mot de passe applicatif</label>
                  <input
                    className="form-control"
                    type="password"
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                    placeholder="Laisser vide pour conserver le mot de passe actuel"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>IMAP host</label>
                    <input
                      className="form-control"
                      value={emailConfig.imap_host}
                      onChange={(e) => setEmailConfig({ ...emailConfig, imap_host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>IMAP port</label>
                    <input
                      className="form-control"
                      type="number"
                      value={emailConfig.imap_port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, imap_port: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>SMTP host</label>
                    <input
                      className="form-control"
                      value={emailConfig.smtp_host}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>SMTP port</label>
                    <input
                      className="form-control"
                      type="number"
                      value={emailConfig.smtp_port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={emailSaving}>
                    {emailSaving ? 'Enregistrement...' : 'Enregistrer la config'}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearEmailConfig}>
                    Supprimer
                  </button>
                </div>

                {emailStatus && (
                  <div className="alert alert-info" style={{ margin: 0, fontSize: 12 }}>
                    {emailStatus}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 3 : OCCUPATION & BAIL */}
          {tab === 'occupation' && (
            <div>
              {activeBail ? (
                <div>
                  <h4 style={{ marginTop: 0 }}>Bail actif</h4>
                  <div style={{ background: 'var(--color-bg-subtle)', padding: 16, borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div><strong>Locataire :</strong> {activeBail.locataire_nom} {activeBail.locataire_prenom}</div>
                    <div><strong>Loyer mensuel :</strong> {activeBail.loyer_mensuel} €</div>
                    <div><strong>Charges :</strong> {activeBail.charges_mensuelles || 0} €</div>
                    <div><strong>Jour de paiement :</strong> Le {activeBail.jour_paiement || 5} du mois</div>
                    <div><strong>Date de début :</strong> {formatDate(activeBail.date_debut)}</div>
                    <div><strong>Dépôt de garantie :</strong> {activeBail.depot_garantie || 0} €</div>
                  </div>

                  <h4>Historique complet des baux ({baux.length})</h4>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr><th>Locataire</th><th>Début</th><th>Fin</th><th>Loyer</th><th>Statut</th></tr>
                      </thead>
                      <tbody>
                        {baux.map(b => (
                          <tr key={b.id}>
                            <td className="fw-600">{b.locataire_nom} {b.locataire_prenom}</td>
                            <td>{formatDate(b.date_debut)}</td>
                            <td>{b.date_fin ? formatDate(b.date_fin) : '—'}</td>
                            <td>{b.loyer_mensuel} €</td>
                            <td><span className={`badge ${b.statut === 'actif' ? 'badge-success' : 'badge-muted'}`}>{b.statut}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Aucun bail enregistré pour ce bien.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3 : FINANCES */}
          {tab === 'finances' && (
            <div>
              <h4 style={{ marginTop: 0 }}>Loyers perçus / Échéances</h4>
              <div className="table-wrapper" style={{ marginBottom: 24 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Date prévue</th><th>Montant</th><th>Statut</th><th>Quittance</th></tr>
                  </thead>
                  <tbody>
                    {paiements.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.date_prevue)}</td>
                        <td className="fw-600">{p.montant} €</td>
                        <td><span className={`badge ${p.statut === 'paye' ? 'badge-success' : 'badge-danger'}`}>{p.statut}</span></td>
                        <td>{p.fichier_quittance || 'Non générée'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4>Dépenses liées à ce bien</h4>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Montant</th></tr>
                  </thead>
                  <tbody>
                    {depenses.map(d => (
                      <tr key={d.id}>
                        <td>{formatDate(d.date)}</td>
                        <td><span className="badge badge-warning">{d.categorie}</span></td>
                        <td>{d.description}</td>
                        <td className="fw-600 text-danger">-{d.montant} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4 : DOCUMENTS */}
          {tab === 'documents' && (
            <div>
              <h4 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between' }}>
                Documents archivés ({documents.length})
                <button className="btn btn-primary btn-sm" onClick={() => onOpenQuickDoc(bien.id)}>
                  <Icon name="plus" size={14} /> Déposer un document
                </button>
              </h4>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Fichier</th><th>Sous-dossier</th><th>Type</th></tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id}>
                        <td className="fw-600">📄 {doc.chemin_fichier.split(/[\\/]/).pop()}</td>
                        <td className="text-muted" style={{ fontSize: 11 }}>{doc.sous_categorie || 'Racine'}</td>
                        <td><span className="badge badge-info">{doc.type_doc || 'Autre'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5 : MAINTENANCE */}
          {tab === 'maintenance' && (
            <div>
              <h4 style={{ marginTop: 0 }}>Tickets d'intervention</h4>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Titre</th><th>Priorité</th><th>Statut</th><th>Prestataire</th><th>Coût</th></tr>
                  </thead>
                  <tbody>
                    {maintenance.map(m => (
                      <tr key={m.id}>
                        <td className="fw-600">{m.titre}</td>
                        <td><span className="badge badge-warning">{m.priorite}</span></td>
                        <td><span className="badge badge-info">{m.statut}</span></td>
                        <td>{m.prestataire || '—'}</td>
                        <td>{m.cout ? `${m.cout} €` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
