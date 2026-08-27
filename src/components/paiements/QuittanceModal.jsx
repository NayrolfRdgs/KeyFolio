import React, { useState } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { buildQuittancePDF } from '../../lib/pdfGenerator'
import { getLoadedTemplateConfig } from '../../lib/pdfTemplateEngine'
import PdfTemplateManagerModal from '../documents/PdfTemplateManagerModal'
import { saveFileToDisk, openFilePath } from '../../lib/db'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

export default function QuittanceModal({ paiement, bien, locataire, bail, onClose, onSendMail }) {
  const quittanceTpl = getLoadedTemplateConfig('quittance_template.json') || {}

  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [bailleurNom, setBailleurNom] = useState(quittanceTpl?.bailleur?.nomParDefaut || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(quittanceTpl?.bailleur?.adresseParDefaut || 'Adresse du bailleur')
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
      bailleurAdresse,
      datePaiement: dateQuittance,
      periode: moisNom,
      montantLoyer: loyerHC,
      montantCharges: charges
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
        setToastMsg(` Quittance PDF enregistrée : ${chosenPath}`)
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
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}> Quittance de Loyer — Édition & Export PDF</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Quittance certifiée pour le mois de {moisNom}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTemplateEditorOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 700,
                color: '#4f46e5',
                borderColor: '#c7d2fe',
                background: '#eef2ff'
              }}
            >
              <Icon name="sparkles" size={13} color="#4f46e5" /> Modèle & Balises
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? ' Exportation...' : ' Exporter le PDF'}
            </button>
            {onSendMail && (
              <button className="btn btn-secondary btn-sm" onClick={() => onSendMail(bien?.id, { recipientEmail: locataire?.email || '', initialTemplate: 'quittance' })}>
                 Envoyer par Mail
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
              <div style={{ fontSize: 11, color: '#64748b' }}>Date d'émission</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(dateQuittance)}</div>
            </div>
          </div>

          {/* Adresses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Bailleur / Propriétaire</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{bailleurNom}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{bailleurAdresse}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Locataire</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{locataire ? `${locataire.prenom} ${locataire.nom}` : (paiement?.locataire_nom || 'Locataire')}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Logement : {bien?.nom || paiement?.bien_nom || 'Logement'}</div>
              {bien?.adresse && <div style={{ fontSize: 12, color: '#475569' }}>{bien.adresse}</div>}
            </div>
          </div>

          {/* Tableau des montants */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#334155' }}>Désignation</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, color: '#334155' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>Loyer principal (hors charges)</td>
                <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{formatEuro(loyerHC)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>Provisions sur charges locatives</td>
                <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{formatEuro(charges)}</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                <td style={{ padding: '12px', fontSize: 14, color: '#16a34a' }}>TOTAL PAYÉ ET ACQUITTÉ</td>
                <td style={{ textAlign: 'right', padding: '12px', fontSize: 15, color: '#16a34a' }}>{formatEuro(total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Mention légale & attestation */}
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#334155', background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 24 }}>
            Je soussigné <strong>{bailleurNom}</strong>, propriétaire du logement désigné ci-dessus, atteste avoir reçu de Monsieur/Madame <strong>{locataire ? `${locataire.prenom} ${locataire.nom}` : (paiement?.locataire_nom || 'le locataire')}</strong> la somme de <strong>{formatEuro(total)}</strong> au titre du loyer et des charges pour la période du {formatDate(debutMois)} au {formatDate(finMois)}.
          </div>

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', width: 220, borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Signature du Bailleur</div>
              <div style={{ height: 48 }}></div>
            </div>
          </div>

        </div>
      </div>

      {templateEditorOpen && (
        <PdfTemplateManagerModal
          isOpen={templateEditorOpen}
          initialTemplateId="quittance_template"
          onClose={() => {
            setTemplateEditorOpen(false)
            const updated = getLoadedTemplateConfig('quittance_template.json')
            if (updated?.bailleur?.nomParDefaut) setBailleurNom(updated.bailleur.nomParDefaut)
            if (updated?.bailleur?.adresseParDefaut) setBailleurAdresse(updated.bailleur.adresseParDefaut)
          }}
        />
      )}
    </div>
  )
}
