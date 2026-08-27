import React, { useState } from 'react'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { generateQuestionnaireExcel } from '../../lib/db'
import Icon from '../common/Icon'

export default function ExportReportModal({
  isOpen,
  onClose,
  biens = [],
  propertyPerformances = [],
  kpis = {},
  dette = {}
}) {
  const [reportType, setReportType] = useState('patrimonial') // 'patrimonial' | 'rentabilite' | 'bancaire' | 'fiscal'
  const [format, setFormat] = useState('pdf') // 'pdf' | 'excel' | 'csv'
  const [isExporting, setIsExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  if (!isOpen) return null

  const handleExport = async () => {
    setIsExporting(true)
    setExportMsg('')

    try {
      if (format === 'pdf') {
        // Impression / Sauvegarde PDF avec feuille de style dédiée
        window.print()
        setIsExporting(false)
        onClose()
        return
      }

      if (format === 'excel') {
        // Export Excel complet
        const headers = [
          'Nom du Bien', 'Type', 'Adresse / Ville', 'Valeur Estimée (€)',
          'Loyer Mensuel (€)', 'Charges Mensuelles (€)', 'Rendement Brut (%)',
          'Rendement Net (%)', 'Cash-Flow Mensuel (€)', 'Dette Restante (€)', 'Statut'
        ]

        const sampleRows = propertyPerformances.map(p => [
          p.bien?.nom || '',
          p.bien?.type_bien || 'Appartement',
          p.bien?.adresse || '',
          String(p.valeurActuelle || 0),
          String(p.loyerMensuel || 0),
          String(p.chargesMensuelles || 0),
          String(p.rendementBrutPct || 0),
          String(p.rendementNetPct || 0),
          String(p.cashFlowMensuelNet || 0),
          String(p.detteRestante || 0),
          p.bien?.statut || 'Loué'
        ])

        // Sauvegarde via backend ou téléchargement direct CSV/XLSX
        if (biens.length > 0 && biens[0].id) {
          try {
            await generateQuestionnaireExcel({
              bienId: biens[0].id,
              filename: `04_FISCAL_FINANCIER/Bilans et syntheses/Bilan_Patrimonial_${todayISO()}.xlsx`,
              title: `BILAN PATRIMONIAL CONSOLIDÉ — KEYFOLIO (${todayISO()})`,
              headers,
              sampleRows,
              hasTotals: true,
              hasCumul: true
            })
            setExportMsg(`✅ Fichier Excel généré et synchronisé dans le dossier Bilans et synthèses.`)
            setTimeout(() => {
              setIsExporting(false)
              onClose()
            }, 1200)
            return
          } catch (err) {
            console.warn("Fallback to CSV direct download:", err)
          }
        }

        // Fallback CSV si Tauri invoke non dispo
        downloadCsv(headers, sampleRows, `Bilan_Patrimonial_${todayISO()}.csv`)
        setIsExporting(false)
        onClose()
        return
      }

      if (format === 'csv') {
        const headers = [
          'Bien', 'Type', 'Valeur', 'Loyer_Mensuel', 'Charges_Mensuelles',
          'Rendement_Brut_Pct', 'Rendement_Net_Pct', 'CashFlow_Mensuel', 'Dette_Restante', 'Statut'
        ]
        const sampleRows = propertyPerformances.map(p => [
          p.bien?.nom || '',
          p.bien?.type_bien || 'Appartement',
          p.valeurActuelle || 0,
          p.loyerMensuel || 0,
          p.chargesMensuelles || 0,
          p.rendementBrutPct || 0,
          p.rendementNetPct || 0,
          p.cashFlowMensuelNet || 0,
          p.detteRestante || 0,
          p.bien?.statut || 'Loué'
        ])
        downloadCsv(headers, sampleRows, `KeyFolio_Export_Patrimoine_${todayISO()}.csv`)
        setIsExporting(false)
        onClose()
      }
    } catch (err) {
      setExportMsg(`Erreur lors de l'export : ${err.message || err}`)
      setIsExporting(false)
    }
  }

  const downloadCsv = (headers, rows, filename) => {
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
        overflow: 'hidden'
      }}>
        {/* En-tête modale */}
        <div style={{
          padding: '20px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Exporter le Rapport Patrimonial
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
              Génération de rapports complets prêts pour la banque, expert-comptable ou archivage
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Corps modale */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Type de rapport */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8, textTransform: 'uppercase' }}>
              Type de rapport :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 'patrimonial', label: 'Bilan Patrimonial Global', icon: 'wallet' },
                { id: 'rentabilite', label: 'Rapport de Rentabilité & Cash-Flow', icon: 'trendingUp' },
                { id: 'bancaire', label: 'Dossier Bancaire & Passif', icon: 'creditcard' },
                { id: 'fiscal', label: 'Synthèse Fiscale & Charges', icon: 'fileText' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setReportType(t.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${reportType === t.id ? '#4f46e5' : '#e2e8f0'}`,
                    background: reportType === t.id ? 'rgba(79, 70, 229, 0.06)' : '#fff',
                    color: reportType === t.id ? '#4f46e5' : '#475569',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Icon name={t.icon} size={15} color={reportType === t.id ? '#4f46e5' : '#64748b'} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Format de sortie */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8, textTransform: 'uppercase' }}>
              Format du document :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { id: 'pdf', label: 'PDF / Impression', icon: 'download' },
                { id: 'excel', label: 'Excel (.xlsx)', icon: 'fileSpreadsheet' },
                { id: 'csv', label: 'Tableur CSV', icon: 'fileText' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${format === f.id ? '#4f46e5' : '#e2e8f0'}`,
                    background: format === f.id ? 'rgba(79, 70, 229, 0.06)' : '#fff',
                    color: format === f.id ? '#4f46e5' : '#475569',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Icon name={f.icon} size={18} color={format === f.id ? '#4f46e5' : '#64748b'} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message de succès ou erreur */}
          {exportMsg && (
            <div style={{ fontSize: 12, color: exportMsg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
              {exportMsg}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#4f46e5',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Icon name="download" size={15} color="#fff" />
            {isExporting ? 'Génération en cours…' : 'Générer et télécharger'}
          </button>
        </div>
      </div>
    </div>
  )
}
