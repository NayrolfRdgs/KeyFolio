import React, { useState, useEffect, useCallback, useRef } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { buildQuittancePDF } from '../../lib/pdfGenerator'
import { buildDataContext } from '../../lib/pdfTemplateEngine'
import { createPdfFromTemplate } from '../../lib/pdfTemplateCreator'
import { saveFileToDisk, openFilePath, openTemplatesFolder, savePdfToBien } from '../../lib/db'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

import { useBailleurProfile } from '../../hooks/useBailleurProfile'

export default function QuittanceModal({ paiement, bien, locataire, bail, onClose, onSendMail, onSaved }) {
  const { profile } = useBailleurProfile()
  const [bailleurNom, setBailleurNom] = useState(profile?.nom || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(profile?.adresse || 'Adresse du bailleur')
  const [dateQuittance, setDateQuittance] = useState(todayISO())
  const [modePaiement, setModePaiement] = useState('Virement bancaire')

  const datePrevue = paiement?.date_prevue ? new Date(paiement.date_prevue) : new Date()
  const defaultPeriode = `Mois de ${datePrevue.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
  const [periode, setPeriode] = useState(defaultPeriode)

  const initialLoyer = bail?.loyer_mensuel || (paiement?.montant ? paiement.montant - (bail?.charges_mensuelles || 0) : 650)
  const initialCharges = bail?.charges_mensuelles || 50
  const [loyerHC, setLoyerHC] = useState(String(initialLoyer))
  const [charges, setCharges] = useState(String(initialCharges))

  const [locataireNomCustom, setLocataireNomCustom] = useState(() => {
    if (locataire) return `${locataire.prenom} ${locataire.nom}`.trim()
    if (paiement?.locataire_nom) return paiement.locataire_nom
    return 'Locataire'
  })
  const [bienNomCustom, setBienNomCustom] = useState(bien?.nom || paiement?.bien_nom || 'Logement')
  const [bienAdresseCustom, setBienAdresseCustom] = useState(bien?.adresse || 'Adresse du bien')

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [savedPath, setSavedPath] = useState(null)

  const debounceRef = useRef(null)

  const getFallbackDoc = useCallback(() => {
    return buildQuittancePDF({
      paiement,
      bien: { ...(bien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
      locataire: { ...(locataire || {}), nom: locataireNomCustom },
      bail,
      bailleurNom,
      bailleurAdresse,
      datePaiement: dateQuittance,
      periode,
      loyerHC: parseFloat(loyerHC || 0),
      charges: parseFloat(charges || 0),
      modePaiement
    })
  }, [paiement, bien, locataire, bail, bienNomCustom, bienAdresseCustom, locataireNomCustom, bailleurNom, bailleurAdresse, dateQuittance, periode, loyerHC, charges, modePaiement])

  const getPdfResult = useCallback(async () => {
    const dataCtx = buildDataContext({
      bail,
      bien: { ...(bien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
      locataire: { ...(locataire || {}), nom: locataireNomCustom },
      periode,
      dateDoc: dateQuittance,
      loyerHC: parseFloat(loyerHC || 0),
      charges: parseFloat(charges || 0),
      customValues: {
        bailleur_nom: bailleurNom,
        bailleur_adresse: bailleurAdresse
      }
    })

    return await createPdfFromTemplate({
      templatePdfName: 'modele_quittance.pdf',
      dataContext: dataCtx,
      fallbackGenerator: getFallbackDoc
    })
  }, [bail, bien, locataire, bienNomCustom, bienAdresseCustom, locataireNomCustom, periode, dateQuittance, loyerHC, charges, bailleurNom, bailleurAdresse, getFallbackDoc])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getPdfResult()
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return res.blobUrl })
      } catch (e) {
        console.warn('PDF preview error', e)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [getPdfResult])

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }
  }, [])

  // Sauvegarder dans le sous-dossier 07_LOCATION/Quittances de loyer du bien
  const handleSaveToProperty = async () => {
    const targetId = bien?.id || paiement?.bien_id
    if (!targetId) {
      setToastMsg('⚠️ Veuillez associer un bien pour enregistrer la quittance.')
      return null
    }
    setSaving(true)
    try {
      const res = await getPdfResult()
      const sanitizedLoc = locataireNomCustom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const sanitizedPeriode = periode.replace(/[^a-zA-Z0-9_-]/g, '_')
      const filename = `Quittance_${sanitizedPeriode}_${sanitizedLoc}.pdf`
      const title = `Quittance de Loyer - ${periode} - ${locataireNomCustom}`

      const relPath = await savePdfToBien(targetId, '07_LOCATION/Quittances de loyer', filename, res.dataUri, title)
      setSavedPath(relPath)
      setToastMsg(`✅ Quittance archivée avec succès : ${relPath}`)
      if (onSaved) onSaved(relPath)
      return relPath
    } catch (err) {
      setToastMsg(`❌ Erreur d'enregistrement : ${err?.toString()}`)
      return null
    } finally {
      setSaving(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  // Export PDF direct
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const res = await getPdfResult()
      const sanitizedLoc = locataireNomCustom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const sanitizedPeriode = periode.replace(/[^a-zA-Z0-9_-]/g, '_')
      const defaultFilename = `Quittance_${sanitizedPeriode}_${sanitizedLoc}.pdf`

      const savePath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
      })

      if (savePath) {
        const rawBase64 = res.dataUri.split(',')[1]
        await saveFileToDisk(savePath, rawBase64)
        setToastMsg(`✅ Quittance exportée : ${savePath}`)
      }
    } catch (err) {
      setToastMsg(`❌ Erreur export PDF : ${err?.toString()}`)
    } finally {
      setExporting(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  const total = parseFloat(loyerHC || 0) + parseFloat(charges || 0)

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: 1480,
          width: '96vw',
          height: '92vh',
          maxHeight: '92vh',
          overflow: 'hidden',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── EN-TÊTE PRINCIPAL ─── */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}>
              <Icon name="receipt" size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                Quittance de Loyer & Attestation de Paiement
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Document officiel conforme Loi n° 89-462 (Article 21) • {periode}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={openTemplatesFolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 700,
                fontSize: 11.5,
                color: '#4f46e5',
                borderColor: '#c7d2fe',
                background: '#eef2ff'
              }}
              title="Ouvrir le dossier contenant les fichiers modèles PDF"
            >
              <Icon name="folder" size={13} color="#4f46e5" /> 📂 Modèles PDF
            </button>

            {onSendMail && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onSendMail(bien?.id, { recipientEmail: locataire?.email || '', initialTemplate: 'quittance' })}
                style={{ fontWeight: 700, fontSize: 11.5 }}
              >
                <Icon name="mail" size={13} /> Envoyer par Mail
              </button>
            )}

            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* ─── CORPS SPLIT-SCREEN (Gauche: Formulaire | Droite: Aperçu PDF) ─── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* COLONNE GAUCHE (46%) : Formulaire */}
          <div style={{
            width: '46%',
            borderRight: '1px solid var(--border-color)',
            overflowY: 'auto',
            background: '#f8fafc',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {/* PARTIES */}
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                1. Bailleur & Locataire
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Nom du Bailleur</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bailleurNom}
                    onChange={e => setBailleurNom(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Nom du Locataire</label>
                  <input
                    type="text"
                    className="form-control"
                    value={locataireNomCustom}
                    onChange={e => setLocataireNomCustom(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Adresse du Bailleur</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bailleurAdresse}
                    onChange={e => setBailleurAdresse(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Adresse du Logement Loué</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bienAdresseCustom}
                    onChange={e => setBienAdresseCustom(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* PÉRIODE & MONTANTS */}
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                2. Période & Sommes Acquittées
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Période de Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={periode}
                    onChange={e => setPeriode(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Date de règlement</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateQuittance}
                    onChange={e => setDateQuittance(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Loyer Hors Charges (€)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={loyerHC}
                    onChange={e => setLoyerHC(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Provisions Charges (€)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={charges}
                    onChange={e => setCharges(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Total Reçu Net</label>
                  <div style={{ padding: '7px 10px', background: '#dcfce7', borderRadius: 6, fontWeight: 800, fontSize: 13, color: '#166534' }}>
                    {formatEuro(total)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE (54%) : Prévisualisation PDF Live */}
          <div style={{
            width: '54%',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '10px 16px',
              background: '#1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ color: '#f8fafc', fontSize: 12, fontWeight: 700 }}>
                  Aperçu Quittance PDF — Temps Réel
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: '#475569',
                    color: '#ffffff',
                    fontSize: 11.5,
                    fontWeight: 700
                  }}
                >
                  <Icon name="download" size={13} color="#ffffff" /> Exporter PDF
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveToProperty}
                  disabled={saving}
                  style={{
                    background: '#059669',
                    borderColor: '#059669',
                    fontSize: 11.5,
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)'
                  }}
                >
                  <Icon name="save" size={13} color="#ffffff" /> Sauvegarder & Archiver
                </button>
              </div>
            </div>

            {toastMsg && (
              <div style={{
                background: toastMsg.startsWith('✅') ? '#059669' : '#dc2626',
                color: '#ffffff',
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center'
              }}>
                {toastMsg}
              </div>
            )}

            <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                  title="Quittance Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Génération de l'aperçu Quittance...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
