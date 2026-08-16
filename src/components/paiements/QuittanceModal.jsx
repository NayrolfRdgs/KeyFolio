import React, { useState } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { buildQuittancePDF } from '../../lib/pdfGenerator'
import { saveFileToDisk, openFilePath } from '../../lib/db'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

export default function QuittanceModal({ paiement, bien, locataire, bail, onClose, onSendMail }) {
  const [bailleurNom, setBailleurNom] = useState('Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState('Adresse du bailleur')
  const [dateQuittance, setDateQuittance] = useState(todayISO())
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const loyerHC = bail?.loyer_mensuel || (paiement?.montant ? paiement.montant - (bail?.charges_mensuelles || 0) : 0)
  const charges = bail?.charges_mensuelles || 0
  const total = paiement?.montant || (loyerHC + charges)

  const datePrevue = paiement?.date_prevue ? new Date(paiement.date_prevue) : new Date()
  const moisNom = datePrevue.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  
  const debutMois = new Date(datePrevue.getFullYear(), datePrevue.getMonth(), 1).toISOString().split('T')[0]
  const finMois = new Date(datePrevue.getFullYear(), datePrevue.getMonth() + 1, 0).toISOString().split('T')[0]

  const getDoc = () => {
    return buildQuittancePDF({
      paiement,
      bien,
      locataire,
      bail,
      bailleurNom,
      bailleurAdresse
    })
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const doc = getDoc()
      const locNom = locataire ? `${locataire.nom}_${locataire.prenom}` : 'locataire'
      const moisSlug = datePrevue.toISOString().slice(0, 7)
      const defaultFilename = `Quittance_${moisSlug}_${locNom}.pdf`

      const chosenPath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
      })

      if (chosenPath) {
        const pdfBase64 = doc.output('datauristring')
        await saveFileToDisk(chosenPath, pdfBase64)
        setToastMsg(`✅ Quittance PDF enregistrée : ${chosenPath}`)
        await openFilePath(chosenPath)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-card" style={{ maxWidth: 780, width: '95%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>📄 Quittance de Loyer — Édition & Export PDF</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Quittance certifiée pour le mois de {moisNom}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? '⏳ Exportation...' : '📥 Exporter le PDF'}
            </button>
            {onSendMail && (
              <button className="btn btn-secondary btn-sm" onClick={() => onSendMail(bien?.id, { recipientEmail: locataire?.email || '', initialTemplate: 'quittance' })}>
                ✉️ Envoyer par Mail
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12 }}>
            {toastMsg}
          </div>
        )}

        {/* Options de personnalisation */}
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
            <label style={{ fontSize: 11, fontWeight: 700 }}>Date de quittance</label>
            <input type="date" className="form-control" style={{ fontSize: 12 }} value={dateQuittance} onChange={e => setDateQuittance(e.target.value)} />
          </div>
        </div>

        {/* CONTENU OFFICIEL DE LA QUITTANCE */}
        <div style={{ background: '#ffffff', color: '#0f172a', padding: 32, borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'Arial, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          
          {/* Entête Document */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 22, fontWeight: 800 }}>QUITTANCE DE LOYER</h2>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Période du {formatDate(debutMois)} au {formatDate(finMois)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>KeyFolio</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Fait le {formatDate(dateQuittance)}</div>
            </div>
          </div>

          {/* Coordonnées */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>BAILLEUR / PROPRIÉTAIRE</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{bailleurNom}</div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{bailleurAdresse}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>LOCATAIRE</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {locataire ? `${locataire.prenom} ${locataire.nom}` : (paiement?.locataire_nom || 'Locataire')}
              </div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                <strong>Logement :</strong> {bien?.nom || 'Logement'} — {bien?.adresse || ''}
              </div>
            </div>
          </div>

          {/* Corps de la quittance */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              Je soussigné(e) <strong>{bailleurNom}</strong>, propriétaire du logement situé au <em>{bien?.adresse || 'adresse du logement'}</em>, atteste avoir reçu de Monsieur/Madame <strong>{locataire ? `${locataire.prenom} ${locataire.nom}` : (paiement?.locataire_nom || 'le locataire')}</strong> la somme de :
            </div>

            {/* Tableau récapitulatif des montants */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px 0' }}>Loyer principal (hors charges) :</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEuro(loyerHC)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px 0' }}>Provisions sur charges :</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEuro(charges)}</td>
                </tr>
                <tr style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>
                  <td style={{ padding: '10px 0' }}>TOTAL PAYÉ & ENCAISSÉ :</td>
                  <td style={{ textAlign: 'right' }}>{formatEuro(total)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
              Pour le paiement du loyer et des charges de la période susvisée. Cette quittance annule tous les reçus qui auraient pu être donnés pour le même mois.
            </div>
          </div>

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
            <div style={{ textAlign: 'center', width: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Le Bailleur / Propriétaire</div>
              <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 40 }}>Signature et cachet :</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
