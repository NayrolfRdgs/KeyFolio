import React, { useEffect, useState } from 'react'
import { getBiens, deleteBien } from '../lib/db'
import { labelTypeBien } from '../lib/utils'
import Icon from '../components/Icon'
import WizardCreateBien from '../components/WizardCreateBien'
import FicheBienDetailModal from '../components/FicheBienDetailModal'
import FolderImportModal from '../components/FolderImportModal'
import QuickDocumentModal from '../components/QuickDocumentModal'
import ExcelGeneratorModal from '../components/ExcelGeneratorModal'

export default function Biens({ onNavigate }) {
  const [biens, setBiens] = useState([])
  const [error, setError] = useState(null)

  // Modales Phase 4
  const [wizardModal, setWizardModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [detailBien, setDetailBien] = useState(null)
  const [quickDocBienId, setQuickDocBienId] = useState(null)
  const [excelGenBienId, setExcelGenBienId] = useState(null)

  const load = () => getBiens().then(setBiens).catch(e => setError(e?.toString()))
  useEffect(() => { load() }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce bien ? Toutes les données liées seront effacées.')) return
    try {
      await deleteBien(id)
      load()
    } catch(err) {
      setError(err?.toString())
    }
  }

  const statutLabel = (s) => {
    if (!s) return '—'
    const lower = String(s).toLowerCase()
    if (lower.includes('principale')) return 'Résidence principale'
    if (lower.includes('secondaire')) return 'Résidence secondaire'
    if (lower === 'en_cours' || lower === 'loue') return 'Loué'
    if (lower === 'en_vente') return 'En vente'
    if (lower === 'vendu') return 'Vendu'
    if (lower === 'vacant') return 'Vacant'
    return s
  }

  const statutBadge = (s) => {
    if (!s) return 'badge-muted'
    const lower = String(s).toLowerCase()
    if (lower.includes('principale')) return 'badge-info'
    if (lower.includes('secondaire')) return 'badge-purple'
    if (lower === 'en_cours' || lower === 'loue') return 'badge-success'
    if (lower === 'en_vente') return 'badge-warning'
    if (lower === 'vacant') return 'badge-danger'
    return 'badge-muted'
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Biens immobiliers</h2>
          <p>{biens.length} bien{biens.length !== 1 ? 's' : ''} dans le patrimoine — Source de vérité : dossiers physiques & Excel</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setImportModal(true)}>
            📂 Importer un dossier bien
          </button>
          <button id="btn-add-bien" className="btn btn-primary" onClick={() => setWizardModal(true)}>
            <Icon name="plus" size={14} /> + Ajouter un bien (Assistant)
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {biens.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <h3>Aucun bien enregistré</h3>
            <p>Cliquez sur "+ Ajouter un bien" pour démarrer l'assistant ou "Importer un dossier bien"</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom du bien</th><th>Adresse</th><th>Type</th><th>Statut</th>
                <th>Surface</th><th>Fichiers & Dossier</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {biens.map(b => (
                <tr key={b.id} onClick={() => onNavigate ? onNavigate('bien', b.id) : setDetailBien(b)} style={{ cursor: 'pointer' }}>
                  <td className="fw-600">
                    <span style={{ color: 'var(--color-accent)' }}>🏠 {b.nom}</span>
                  </td>
                  <td className="text-muted">{b.adresse || '—'}</td>
                  <td>{labelTypeBien(b.type_bien)}</td>
                  <td><span className={`badge ${statutBadge(b.statut)}`}>{statutLabel(b.statut)}</span></td>
                  <td>{b.surface_m2 ? `${b.surface_m2} m²` : '—'}</td>
                  <td>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-accent)' }}>
                      📁 {b.chemin_dossier || 'Automatique'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="actions-cell">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDetailBien(b)}
                        title="Ouvrir la fiche complète par onglets"
                      >
                        👁️ Consulter
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setQuickDocBienId(b.id)}
                        title="Associer un document PDF"
                      >
                        📎 PDF
                      </button>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={(e) => handleDelete(e, b.id)}
                        title="Supprimer"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assistant de Création Wizard */}
      {wizardModal && (
        <WizardCreateBien
          onClose={() => setWizardModal(false)}
          onSuccess={load}
        />
      )}

      {/* Fiche Bien Réorganisée par Onglets */}
      {detailBien && (
        <FicheBienDetailModal
          bien={detailBien}
          onClose={() => setDetailBien(null)}
          onRefresh={load}
          onOpenQuickDoc={(bid) => setQuickDocBienId(bid)}
          onOpenExcelGenerator={(bid) => setExcelGenBienId(bid)}
        />
      )}

      {/* Importation / Adoption de Dossier Bien */}
      {importModal && (
        <FolderImportModal
          onClose={() => setImportModal(false)}
          onSuccess={load}
        />
      )}

      {/* Quick Document Modal */}
      {quickDocBienId && (
        <QuickDocumentModal
          initialBienId={quickDocBienId}
          onClose={() => setQuickDocBienId(null)}
          onSuccess={load}
        />
      )}

      {/* Excel Generator Modal */}
      {excelGenBienId && (
        <ExcelGeneratorModal
          initialBienId={excelGenBienId}
          onClose={() => setExcelGenBienId(null)}
          onSuccess={load}
        />
      )}
    </div>
  )
}
