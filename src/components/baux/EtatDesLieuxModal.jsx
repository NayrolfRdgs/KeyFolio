import React, { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { saveEtatDesLieuxPdf, saveFileToDisk, openFilePath } from '../../lib/db'
import { buildEtatDesLieuxPDF } from '../../lib/pdfGenerator'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

// Helper pour extraire les informations sauvegardées depuis notes_fin
function parseNotesFin(notesStr) {
  if (!notesStr || typeof notesStr !== 'string') return {}
  const res = {}
  
  const elecMatch = notesStr.match(/Elec=([^,\s|]+)/)
  if (elecMatch) res.compteurElec = elecMatch[1]

  const eauMatch = notesStr.match(/Eau=([^,\s|]+)/)
  if (eauMatch) res.compteurEau = eauMatch[1]

  const gazMatch = notesStr.match(/Gaz=([^,\s|]+)/)
  if (gazMatch) res.compteurGaz = gazMatch[1]

  const clesMatch = notesStr.match(/Clés\s*:\s*([^|]+)/)
  if (clesMatch) res.clesRemises = clesMatch[1].trim()

  const cautionRetenueMatch = notesStr.match(/Retenue de ([0-9.]+)€ \(([^)]+)\)/)
  if (cautionRetenueMatch) {
    res.montantRetenu = cautionRetenueMatch[1]
    res.motifRetenue = cautionRetenueMatch[2]
  }

  const obsMatch = notesStr.match(/Observations\s*:\s*([^|]+)/)
  if (obsMatch) res.notesFin = obsMatch[1].trim()

  return res
}

export default function EtatDesLieuxModal({ bail, bien, locataire, terminationInfo, onClose, onSendMail }) {
  const bailId = bail?.id || 'new'
  const storageKey = `keyfolio_edl_cache_${bailId}`
  const parsedFromBail = parseNotesFin(bail?.notes_fin || terminationInfo?.notesFin || '')

  // Chargement des données sauvegardées en cache local ou depuis le bail
  const initialData = (() => {
    try {
      const cached = localStorage.getItem(storageKey)
      if (cached) return JSON.parse(cached)
    } catch (e) {}
    return {}
  })()

  const [bailleurNom, setBailleurNom] = useState(initialData.bailleurNom || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(initialData.bailleurAdresse || 'Adresse du bailleur')
  const [dateEdl, setDateEdl] = useState(
    initialData.dateEdl || terminationInfo?.dateFin || bail?.date_fin || todayISO()
  )
  
  // Compteurs
  const [elecIndex, setElecIndex] = useState(
    initialData.elecIndex || terminationInfo?.compteurElec || parsedFromBail.compteurElec || ''
  )
  const [eauIndex, setEauIndex] = useState(
    initialData.eauIndex || terminationInfo?.compteurEau || parsedFromBail.compteurEau || ''
  )
  const [gazIndex, setGazIndex] = useState(
    initialData.gazIndex || terminationInfo?.compteurGaz || parsedFromBail.compteurGaz || ''
  )

  // Clés
  const [clesRemises, setClesRemises] = useState(
    initialData.clesRemises || terminationInfo?.clesRemises || parsedFromBail.clesRemises || '2 jeux complets (porte + boîte aux lettres + badge)'
  )

  // Caution
  const depotGarantieInitial = bail?.depot_garantie || 0
  const [montantRetenu, setMontantRetenu] = useState(
    initialData.montantRetenu ?? terminationInfo?.montantRetenu ?? parsedFromBail.montantRetenu ?? 0
  )
  const [motifRetenue, setMotifRetenue] = useState(
    initialData.motifRetenue || terminationInfo?.motifRetenue || parsedFromBail.motifRetenue || ''
  )
  
  const soldeRestitue = Math.max(0, depotGarantieInitial - parseFloat(montantRetenu || 0))

  // Pièces
  const defaultPieces = [
    { nom: 'Entrée / Dégagement', etat: 'Bon état', obs: 'RAS, peinture propre' },
    { nom: 'Séjour / Salon', etat: 'Très bon état', obs: 'Murs et sols propres, fenêtres en état' },
    { nom: 'Cuisine', etat: 'Bon état', obs: 'Évier, placards et plaques nettoyés et fonctionnels' },
    { nom: 'Chambre(s)', etat: 'Très bon état', obs: 'Revêtement sol et prises électriques conformes' },
    { nom: 'Salle d\'eau / WC', etat: 'Bon état', obs: 'Robinetterie et sanitaires sans fuite ni tartre' },
  ]
  const [pieces, setPieces] = useState(initialData.pieces || defaultPieces)

  const [observationsGenerales, setObservationsGenerales] = useState(
    initialData.observationsGenerales || terminationInfo?.notesFin || parsedFromBail.notesFin || 'Logement restitué propre et vidé de tout meuble et encombrant. Clés remises en main propre.'
  )

  // État de sauvegarde sur disque
  const [savedPath, setSavedPath] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const locataireFullName = locataire ? `${locataire.prenom} ${locataire.nom}` : `${bail?.locataire_prenom || ''} ${bail?.locataire_nom || ''}`.trim() || 'Locataire'
  const targetBienId = bien?.id || bail?.bien_id

  // Sauvegarde synchrone dans localStorage à chaque modification
  useEffect(() => {
    try {
      const stateToPersist = {
        bailleurNom,
        bailleurAdresse,
        dateEdl,
        elecIndex,
        eauIndex,
        gazIndex,
        clesRemises,
        montantRetenu,
        motifRetenue,
        pieces,
        observationsGenerales
      }
      localStorage.setItem(storageKey, JSON.stringify(stateToPersist))
    } catch (e) {}
  }, [bailleurNom, bailleurAdresse, dateEdl, elecIndex, eauIndex, gazIndex, clesRemises, montantRetenu, motifRetenue, pieces, observationsGenerales])

  const getPdfDoc = () => {
    return buildEtatDesLieuxPDF({
      bail,
      bien,
      locataire,
      bailleurNom,
      bailleurAdresse,
      dateEdl,
      elecIndex,
      eauIndex,
      gazIndex,
      clesRemises,
      depotGarantieInitial,
      montantRetenu,
      motifRetenue,
      pieces,
      observationsGenerales
    })
  }

  // Sauvegarde automatique du PDF dans le dossier du bien
  const handleSaveToProperty = async () => {
    if (!targetBienId) return
    setSaving(true)
    try {
      const doc = getPdfDoc()
      const pdfBase64 = doc.output('datauristring')
      const relPath = await saveEtatDesLieuxPdf(targetBienId, locataireFullName, dateEdl, pdfBase64)
      setSavedPath(relPath)
      return relPath
    } catch (err) {
      console.warn('Erreur sauvegarde PDF état des lieux :', err)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    handleSaveToProperty()
  }, [])

  // Export & Téléchargement direct du fichier PDF avec dialogue natif
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const doc = getPdfDoc()
      const safeNom = locataireFullName.replace(/[^a-zA-Z0-9_-]/g, '_')
      const defaultFilename = `Etat_des_lieux_sortie_${dateEdl}_${safeNom}.pdf`
      
      // 1. Sauvegarde dans le dossier du bien
      const relPath = await handleSaveToProperty()
      
      // 2. Demande à l'utilisateur où exporter
      const chosenPath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
      })

      if (chosenPath) {
        const pdfBase64 = doc.output('datauristring')
        await saveFileToDisk(chosenPath, pdfBase64)
        setToastMsg(`✅ PDF enregistré avec succès dans : ${chosenPath}`)
        await openFilePath(chosenPath)
      } else if (relPath) {
        // Si l'utilisateur annule le dialogue, on ouvre quand même le PDF du dossier du bien
        await openFilePath(relPath)
      }
    } catch (err) {
      console.error('Erreur export PDF :', err)
    } finally {
      setExporting(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  // Ouvrir le PDF généré
  const handleOpenPDFDirect = async () => {
    if (savedPath) {
      await openFilePath(savedPath)
    } else {
      const rel = await handleSaveToProperty()
      if (rel) await openFilePath(rel)
    }
  }

  const handleEtatChange = (idx, field, val) => {
    const updated = [...pieces]
    updated[idx][field] = val
    setPieces(updated)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-card" style={{ maxWidth: 880, width: '96%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>📋 Édition & Export PDF de l'État des Lieux</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Édition directe et génération PDF vectoriel officiel (Loi n° 89-462)
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? '⏳ Exportation...' : '📥 Exporter le PDF'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenPDFDirect}>
              📄 Ouvrir le PDF
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSaveToProperty} disabled={saving}>
              {saving ? '⏳ Enregistrement...' : '💾 Sauvegarder'}
            </button>
            {onSendMail && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onSendMail(targetBienId, {
                  recipientEmail: locataire?.email || bail?.locataire_email || '',
                  initialTemplate: 'fin_bail'
                })}
              >
                ✉️ Mail
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Toast info */}
        {toastMsg && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12 }}>
            {toastMsg}
          </div>
        )}

        {/* Bannière de confirmation de sauvegarde PDF dans le dossier du bien */}
        {savedPath && (
          <div style={{ marginBottom: 14, padding: '8px 14px', background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📁</span>
              <span><strong>Fichier PDF archivé :</strong> {savedPath}</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: '2px 8px', color: '#166534', fontWeight: 700 }}
              onClick={() => openFilePath(savedPath)}
            >
              Ouvrir le PDF →
            </button>
          </div>
        )}

        {/* Options Bailleur & Date */}
        <div style={{ marginBottom: 16, background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>Nom du Bailleur</label>
            <input type="text" className="form-control" style={{ fontSize: 12 }} value={bailleurNom} onChange={e => setBailleurNom(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>Adresse du Bailleur</label>
            <input type="text" className="form-control" style={{ fontSize: 12 }} value={bailleurAdresse} onChange={e => setBailleurAdresse(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>Date de sortie effective</label>
            <input type="date" className="form-control" style={{ fontSize: 12 }} value={dateEdl} onChange={e => setDateEdl(e.target.value)} />
          </div>
        </div>

        {/* FEUILLE D'ÉDITION ÉTAT DES LIEUX */}
        <div style={{ background: '#ffffff', color: '#0f172a', padding: 28, borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'Arial, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          
          {/* Entête */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>
                ÉTAT DES LIEUX CONTRADICTOIRE DE SORTIE
              </h2>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                Établi en application de la Loi n° 89-462 du 6 juillet 1989 modifiée — Décret n° 2016-382
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#2563eb' }}>KeyFolio</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Date : {formatDate(dateEdl)}</div>
            </div>
          </div>

          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>BAILLEUR / REPRÉSENTANT</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{bailleurNom}</div>
              <div style={{ fontSize: 11, color: '#334155' }}>{bailleurAdresse}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>LOCATAIRE SORTANT</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{locataireFullName}</div>
              <div style={{ fontSize: 11, color: '#334155' }}>
                <strong>Logement :</strong> {bien?.nom || bail?.bien_nom || 'Logement'} — {bien?.adresse || ''}
              </div>
            </div>
          </div>

          {/* Dates du bail */}
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
            <div><strong>Date d'entrée :</strong> {formatDate(bail?.date_debut)}</div>
            <div><strong>Date de sortie :</strong> {formatDate(dateEdl)}</div>
            <div><strong>Motif :</strong> {terminationInfo?.motifFin || bail?.motif_fin || 'Congé locataire'}</div>
          </div>

          {/* Relevé des Compteurs & Clés */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
                ⚡ RELEVÉ DES COMPTEURS DE SORTIE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Électricité (kWh) :</span>
                  <input
                    type="text"
                    style={{ width: 130, padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                    value={elecIndex}
                    placeholder="ex: 14500"
                    onChange={e => setElecIndex(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Eau froide (m³) :</span>
                  <input
                    type="text"
                    style={{ width: 130, padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                    value={eauIndex}
                    placeholder="ex: 380"
                    onChange={e => setEauIndex(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Gaz (m³) :</span>
                  <input
                    type="text"
                    style={{ width: 130, padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                    value={gazIndex}
                    placeholder="ex: 125"
                    onChange={e => setGazIndex(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
                🔑 RESTITUTION DES CLÉS
              </div>
              <input
                type="text"
                style={{ width: '100%', padding: '5px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                value={clesRemises}
                onChange={e => setClesRemises(e.target.value)}
              />
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                L'ensemble des clés et moyens d'accès remis à l'entrée ont été restitués ce jour.
              </div>
            </div>
          </div>

          {/* Grille des pièces */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
              🏠 ÉTAT DÉTAILLÉ PAR PIÈCE
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', width: '25%' }}>Pièce / Espace</th>
                  <th style={{ padding: '6px 8px', width: '25%' }}>État constaté</th>
                  <th style={{ padding: '6px 8px' }}>Observations & Équipements</th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.nom}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        style={{ padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4, width: '100%' }}
                        value={p.etat}
                        onChange={e => handleEtatChange(idx, 'etat', e.target.value)}
                      >
                        <option value="Très bon état">✨ Très bon état</option>
                        <option value="Bon état">✅ Bon état</option>
                        <option value="État d'usage normal">⚠️ État d'usage</option>
                        <option value="Dégradé / Travaux">❌ Dégradé / Réparations</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="text"
                        style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                        value={p.obs}
                        onChange={e => handleEtatChange(idx, 'obs', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Synthèse Caution */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                💶 SYNTHÈSE DU DÉPÔT DE GARANTIE (CAUTION)
              </span>
              <span style={{ fontSize: 12, fontWeight: 800 }}>
                Initial : {formatEuro(depotGarantieInitial)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 11 }}>
              <div>
                <span>Montant retenu : </span>
                <input
                  type="number"
                  step="0.01"
                  style={{ width: 80, padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                  value={montantRetenu}
                  onChange={e => setMontantRetenu(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span>Motif : </span>
                <input
                  type="text"
                  style={{ width: '75%', padding: '3px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
                  placeholder="ex: Nettoyage approfondi..."
                  value={motifRetenue}
                  onChange={e => setMotifRetenue(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 12, color: '#166534' }}>
              <span>Solde net à restituer au locataire :</span>
              <span>{formatEuro(soldeRestitue)}</span>
            </div>
          </div>

          {/* Observations générales */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
              📝 OBSERVATIONS GÉNÉRALES & CLAUSE DE CLÔTURE
            </div>
            <textarea
              rows={2}
              style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 4 }}
              value={observationsGenerales}
              onChange={e => setObservationsGenerales(e.target.value)}
            />
          </div>

          {/* Bloc Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #cbd5e1', paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Signature du Bailleur :</div>
              <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>Mention "Lu et approuvé"</div>
              <div style={{ height: 50, borderBottom: '1px dotted #94a3b8', marginTop: 8 }}></div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Signature du Locataire Sortant :</div>
              <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>Mention "Lu et approuvé"</div>
              <div style={{ height: 50, borderBottom: '1px dotted #94a3b8', marginTop: 8 }}></div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? '⏳ Exportation...' : '📥 Exporter en PDF direct'}
          </button>
        </div>
      </div>
    </div>
  )
}
