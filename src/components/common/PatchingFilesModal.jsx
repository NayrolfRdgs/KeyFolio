import React, { useState, useEffect } from 'react'
import { auditBienFiles, applyPatch } from '../../lib/db'
import Icon from './Icon'

/**
 * PatchingFilesModal — Affiché au lancement de KeyFolio.
 * Détecte les fichiers Excel manquants ou mal placés dans les dossiers de biens.
 * Propose de les créer automatiquement ou d'ignorer.
 */
export default function PatchingFilesModal({ onClose }) {
  const [phase, setPhase] = useState('scanning') // 'scanning' | 'results' | 'patching' | 'done'
  const [entries, setEntries] = useState([])
  const [errors, setErrors] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [patchErrors, setPatchErrors] = useState([])

  useEffect(() => {
    runAudit()
  }, [])

  const runAudit = async () => {
    setPhase('scanning')
    try {
      const result = await auditBienFiles()
      setEntries(result)
      if (result.length === 0) {
        // Rien à corriger → fermer silencieusement
        onClose()
        return
      }
      // Tout sélectionner par défaut
      setSelectedIds(new Set(result.map(e => e.bien_id)))
      setPhase('results')
    } catch (err) {
      console.warn('[PatchingFiles] audit_bien_files non disponible (mode web ou dev):', err)
      onClose()
    }
  }

  const handleToggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map(e => e.bien_id)))
    }
  }

  const handlePatch = async () => {
    setPhase('patching')
    try {
      const ids = Array.from(selectedIds)
      const errs = await applyPatch(ids)
      setPatchErrors(errs || [])
      setPhase('done')
    } catch (err) {
      setPatchErrors([String(err)])
      setPhase('done')
    }
  }

  const totalFichiers = entries
    .filter(e => selectedIds.has(e.bien_id))
    .reduce((sum, e) => sum + e.fichiers_manquants.length, 0)

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
        borderRadius: 18,
        width: '100%',
        maxWidth: 560,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(15, 23, 42, 0.28)',
        overflow: 'hidden'
      }}>

        {/* ── En-tête ── */}
        <div style={{
          padding: '24px 28px 20px',
          background: 'linear-gradient(135deg, #eef4ff 0%, #f0f7ff 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: phase === 'done' && patchErrors.length === 0 ? '#dcfce7' : '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {phase === 'scanning' || phase === 'patching' ? (
              <div style={{ width: 22, height: 22, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : phase === 'done' && patchErrors.length === 0 ? (
              <Icon name="checkCircle" size={22} color="#16a34a" />
            ) : (
              <Icon name="folderOpen" size={22} color="#2563eb" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 3 }}>
              {phase === 'scanning' && 'Vérification des fichiers…'}
              {phase === 'results' && `${entries.length} bien${entries.length > 1 ? 's' : ''} avec fichiers manquants`}
              {phase === 'patching' && 'Création des fichiers en cours…'}
              {phase === 'done' && (patchErrors.length === 0 ? 'Patch appliqué avec succès !' : 'Patch terminé avec avertissements')}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>
              {phase === 'scanning' && 'KeyFolio vérifie que tous les fichiers Excel sont à jour dans vos dossiers…'}
              {phase === 'results' && 'Sélectionnez les biens à corriger. Cliquez sur « Appliquer » pour créer les fichiers manquants.'}
              {phase === 'patching' && 'Génération des tableaux Excel dans les dossiers des biens…'}
              {phase === 'done' && patchErrors.length === 0 && 'Tous vos fichiers Excel sont désormais à jour dans les bons dossiers.'}
              {phase === 'done' && patchErrors.length > 0 && 'Certains fichiers n\'ont pas pu être générés. Vérifiez ci-dessous.'}
            </div>
          </div>
        </div>

        {/* ── Corps ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>

          {/* Phase : résultats */}
          {phase === 'results' && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12
              }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  {selectedIds.size}/{entries.length} bien(s) sélectionné(s) · {totalFichiers} fichier(s) à créer
                </span>
                <button
                  onClick={handleSelectAll}
                  style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {selectedIds.size === entries.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map(entry => (
                  <div
                    key={entry.bien_id}
                    onClick={() => handleToggle(entry.bien_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 14px',
                      background: selectedIds.has(entry.bien_id) ? '#eff6ff' : '#f8fafc',
                      border: `1.5px solid ${selectedIds.has(entry.bien_id) ? '#bfdbfe' : '#e2e8f0'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      border: `2px solid ${selectedIds.has(entry.bien_id) ? '#2563eb' : '#cbd5e1'}`,
                      background: selectedIds.has(entry.bien_id) ? '#2563eb' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1
                    }}>
                      {selectedIds.has(entry.bien_id) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a', marginBottom: 4 }}>
                        🏠 {entry.bien_nom}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {entry.fichiers_manquants.map((f, i) => (
                          <span key={i} style={{
                            fontSize: 11,
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '2px 7px',
                            borderRadius: 5,
                            fontWeight: 500
                          }}>
                            📄 {f.split('/').pop()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Phase : patching */}
          {phase === 'patching' && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: 14 }}>
              <div style={{ width: 40, height: 40, border: '4px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              Génération des fichiers Excel en cours…<br/>
              <span style={{ fontSize: 12 }}>Ne fermez pas l'application</span>
            </div>
          )}

          {/* Phase : terminé */}
          {phase === 'done' && (
            <div style={{ padding: '8px 0' }}>
              {patchErrors.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  color: '#15803d',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <Icon name="checkCircle" size={18} color="#16a34a" />
                  Tous les fichiers ont été créés avec succès dans les bons sous-dossiers.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
                    {patchErrors.length} erreur(s) rencontrée(s) :
                  </div>
                  {patchErrors.map((e, i) => (
                    <div key={i} style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#7f1d1d',
                      fontFamily: 'monospace'
                    }}>
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pied de page ── */}
        {(phase === 'results' || phase === 'done') && (
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#f8fafc'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {phase === 'done' ? 'Fermer' : 'Ignorer'}
            </button>

            {phase === 'results' && selectedIds.size > 0 && (
              <button
                onClick={handlePatch}
                style={{
                  padding: '9px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                <Icon name="zap" size={15} color="#fff" />
                Appliquer le patch ({totalFichiers} fichier{totalFichiers > 1 ? 's' : ''})
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
