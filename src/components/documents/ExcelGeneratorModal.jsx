import React, { useEffect, useState } from 'react'
import { getBiens, generateQuestionnaireExcel } from '../../lib/db'
import { SUBFOLDERS } from '../../lib/utils'
import Icon from '../common/Icon'

const PRESET_TEMPLATES = [
  {
    id: 'tresorerie_travaux',
    title: 'Trésorerie de travaux avec échéancier',
    desc: 'Tableau de suivi des devis, acomptes versés, échéances futures et solde restant à payer.',
    defaultSubfolder: '05_TRAVAUX',
    filename: 'Tresorerie_Travaux.xlsx',
    headers: ['Date', 'Artisan / Entreprise', 'Nature des travaux', 'Montant Devis (€)', 'Acompte Versé (€)', 'Reste à Payer (€)', 'Échéance'],
    sampleRows: [
      ['2026-03-10', 'EURL Plomberie Martin', 'Rénovation Salle de Bain', '4500.00', '1500.00', '3000.00', '2026-04-15'],
      ['2026-03-15', 'Electricité Dupont', 'Mise aux normes tableau', '1800.00', '600.00', '1200.00', '2026-04-30']
    ]
  },
  {
    id: 'suivi_annuel',
    title: 'Suivi recettes & dépenses annuel (façon comptable)',
    desc: 'Synthèse des loyers perçus mois par mois, dépenses déductibles et résultat net.',
    defaultSubfolder: '04_FISCAL_FINANCIER',
    filename: 'Synthese_Comptable_Annuelle.xlsx',
    headers: ['Mois / Période', 'Loyers Perçus (€)', 'Charges Copro (€)', 'Travaux (€)', 'Assurances (€)', 'Taxes (€)', 'Résultat Net (€)'],
    sampleRows: [
      ['Janvier 2026', '750.00', '60.00', '0.00', '15.00', '0.00', '675.00'],
      ['Février 2026', '750.00', '60.00', '120.00', '15.00', '0.00', '555.00'],
      ['Mars 2026', '750.00', '60.00', '0.00', '15.00', '0.00', '675.00']
    ]
  },
  {
    id: 'custom',
    title: 'Tableau sur mesure par questionnaire',
    desc: 'Créez votre propre tableau Excel personnalisé avec formules automatiques.',
    defaultSubfolder: '01_ADMINISTRATIF',
    filename: 'Tableau_Sur_Mesure.xlsx',
    headers: ['Date', 'Libellé / Objet', 'Catégorie', 'Recette (€)', 'Dépense (€)'],
    sampleRows: [
      ['2026-01-05', 'Loyer Janvier', 'Recette', '750.00', '0.00'],
      ['2026-01-12', 'Facture EDF', 'Dépense', '0.00', '45.00']
    ]
  }
]

export default function ExcelGeneratorModal({ initialBienId = null, targetSubfolder = null, onClose, onSuccess }) {
  const [biens, setBiens] = useState([])
  const [bienId, setBienId] = useState(initialBienId || '')
  const [selectedTemplate, setSelectedTemplate] = useState('tresorerie_travaux')
  const [subfolder, setSubfolder] = useState(targetSubfolder || '05_TRAVAUX')
  const [filename, setFilename] = useState('Tresorerie_Travaux.xlsx')
  const [customTitle, setCustomTitle] = useState('Trésorerie de travaux avec échéancier')
  const [hasTotals, setHasTotals] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    getBiens().then(bList => {
      setBiens(bList)
      if (!bienId && bList.length > 0) setBienId(bList[0].id)
    })
  }, [])

  const handleTemplateChange = (tplId) => {
    setSelectedTemplate(tplId)
    const tpl = PRESET_TEMPLATES.find(t => t.id === tplId)
    if (tpl) {
      setFilename(tpl.filename)
      setCustomTitle(tpl.title)
      if (!targetSubfolder && tpl.defaultSubfolder) {
        setSubfolder(tpl.defaultSubfolder)
      }
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!bienId) {
      setError('Veuillez sélectionner un bien.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    const tpl = PRESET_TEMPLATES.find(t => t.id === selectedTemplate) || PRESET_TEMPLATES[0]
    const chosenSubfolder = subfolder || targetSubfolder || tpl.defaultSubfolder || '04_FISCAL_FINANCIER'

    // Préfixer le nom de fichier avec le sous-dossier
    const finalFilename = `${chosenSubfolder}/${filename}`

    try {
      const path = await generateQuestionnaireExcel({
        bienId: parseInt(bienId, 10),
        filename: finalFilename,
        title: customTitle,
        headers: tpl.headers,
        sampleRows: tpl.sampleRows,
        hasTotals,
        hasCumul: true
      })
      setSuccessMsg(`Fichier Excel généré avec succès dans le dossier ${chosenSubfolder} !`)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Générateur de tableau Excel (Modèles Comptables)
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}
        {successMsg && <div className="alert alert-success" style={{ marginBottom: 14 }}>{successMsg}</div>}

        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label>Bien destinataire *</label>
            <select className="form-control" value={bienId} onChange={e => setBienId(e.target.value)}>
              {biens.map(b => (
                <option key={b.id} value={b.id}>{b.nom} ({b.chemin_dossier})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Sous-dossier de destination *</label>
            <select className="form-control" value={subfolder} onChange={e => setSubfolder(e.target.value)}>
              {SUBFOLDERS.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Choisissez un modèle de tableau</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              {PRESET_TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleTemplateChange(tpl.id)}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    border: selectedTemplate === tpl.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: selectedTemplate === tpl.id ? 'rgba(79, 70, 229, 0.05)' : 'var(--color-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{tpl.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{tpl.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Nom du fichier Excel (.xlsx)</label>
              <input type="text" className="form-control" value={filename} onChange={e => setFilename(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Titre de l'en-tête du tableau</label>
              <input type="text" className="form-control" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" id="chk-totals" checked={hasTotals} onChange={e => setHasTotals(e.target.checked)} />
            <label htmlFor="chk-totals" style={{ fontSize: 13, cursor: 'pointer' }}>Inclure automatiquement les formules de totaux `=SUM(...)` et de soldes</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Génération...' : 'Générer dans le sous-dossier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

