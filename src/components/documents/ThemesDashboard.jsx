import React, { useMemo } from 'react'
import { FOLDER_THEMES } from '../../lib/folderThemes'
import Icon from '../common/Icon'
import { formatBytes } from '../../lib/utils'

export default function ThemesDashboard({
  bien,
  treeNodes = [],
  onSelectFolderByPath,
  onGenerateDocument
}) {
  // Calculer le nombre de fichiers par grand dossier racine
  const folderStats = useMemo(() => {
    const stats = {}

    const countFiles = (node) => {
      let count = 0
      let totalBytes = 0
      if (!node) return { count: 0, totalBytes: 0 }

      if (node.is_dir && node.children) {
        for (const child of node.children) {
          if (!child.is_dir) {
            count += 1
            totalBytes += (child.size_bytes || 0)
          } else {
            const sub = countFiles(child)
            count += sub.count
            totalBytes += sub.totalBytes
          }
        }
      }
      return { count, totalBytes }
    }

    Object.keys(FOLDER_THEMES).forEach(folderKey => {
      const matchingNode = treeNodes.find(n => n.relative_path === folderKey || n.name === folderKey)
      if (matchingNode) {
        stats[folderKey] = countFiles(matchingNode)
      } else {
        stats[folderKey] = { count: 0, totalBytes: 0 }
      }
    })

    return stats
  }, [treeNodes])

  const totalFiles = Object.values(folderStats).reduce((s, x) => s + x.count, 0)
  const totalSize = Object.values(folderStats).reduce((s, x) => s + x.totalBytes, 0)

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', padding: '18px 22px', background: '#fafbfc', width: '100%', boxSizing: 'border-box' }}>
      {/* ── BANNIÈRE D'ACCUEIL DU DOSSIER ── */}
      <div style={{
        padding: '18px 22px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, #eef4ff 0%, #f5f3ff 100%)',
        border: '1px solid #e0e7ff',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)'
            }}>
              <Icon name="folderOpen" size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Dossier Documentaire : {bien?.nom || 'Logement'}
              </h2>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {bien?.adresse || 'Adresse non spécifiée'} • {totalFiles} document{totalFiles > 1 ? 's' : ''} classé{totalFiles > 1 ? 's' : ''} ({formatBytes(totalSize)})
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => onGenerateDocument(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: 12.5,
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
          }}
        >
          <Icon name="filePlus" size={15} /> Générer un document
        </button>
      </div>

      {/* ── GRILLE DES THÈMES & DOSSIERS ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
            Thématiques & Dossiers de Gestion
          </h3>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Cliquez sur un thème pour ouvrir son arborescence
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
          {Object.values(FOLDER_THEMES).map(theme => {
            const stat = folderStats[theme.id] || { count: 0, totalBytes: 0 }
            const hasFiles = stat.count > 0

            return (
              <div
                key={theme.id}
                onClick={() => onSelectFolderByPath(theme.id)}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: `1.5px solid ${theme.border}`,
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.06)`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)'
                }}
              >
                {/* Barre colorée latérale */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  background: theme.primary
                }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: theme.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon name={theme.icon} size={16} color={theme.primary} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>
                        {theme.label}
                      </span>
                    </div>

                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      background: hasFiles ? theme.bg : '#f1f5f9',
                      color: hasFiles ? theme.badgeText : '#64748b',
                      border: `1px solid ${hasFiles ? theme.border : '#e2e8f0'}`
                    }}>
                      {stat.count} doc{stat.count > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                    {theme.desc}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 10,
                  borderTop: '1px solid #f1f5f9',
                  fontSize: 11.5
                }}>
                  <span style={{ color: theme.primary, fontWeight: 700 }}>
                    {theme.shortLabel}
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Accéder →
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
