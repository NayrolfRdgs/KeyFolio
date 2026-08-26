import React from 'react'
import Icon from '../common/Icon'
import { getStatutColor } from './BiensMapView'
import { formatEuro } from '../../lib/utils'

export default function BiensSidebarList({
  searchQuery,
  setSearchQuery,
  statutFilter,
  setStatutFilter,
  filteredBiens,
  selectedBien,
  onSelectBien,
  onNavigate
}) {
  return (
    <div
      className="card"
      style={{
        width: 320,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 0,
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {/* Barre de recherche & filtres rapides */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={13} />
          </span>
          <input
            type="text"
            placeholder="Rechercher bien, projet, ville..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              outline: 'none',
              background: 'var(--color-surface-2)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 13,
                padding: 0
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filtres par statut */}
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'actif', label: 'Actifs' },
            { key: 'projet', label: 'Projets' },
            { key: 'vacant', label: 'Vacants' },
            { key: 'inactif', label: 'Inactifs' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatutFilter(f.key)}
              style={{
                flex: 1,
                padding: '4px 4px',
                fontSize: 10,
                fontWeight: statutFilter === f.key ? 700 : 500,
                borderRadius: 4,
                border: 'none',
                background: statutFilter === f.key ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: statutFilter === f.key ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste déroulante */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {filteredBiens.map(b => {
          const isSelected = selectedBien?.id === b.id || (b.is_projet_entity && selectedBien?.projet_id === b.projet_id)
          const color = getStatutColor(b.statut)
          const isProjet = String(b.statut).toLowerCase() === 'projet'

          return (
            <div
              key={b.id}
              onClick={() => onSelectBien(b)}
              onDoubleClick={() => {
                if (!b.is_projet_entity && onNavigate) onNavigate('bien', b.id)
              }}
              title="Cliquer pour afficher la fiche flottante"
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'var(--color-surface-2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
            >
              {/* Pastille / Icône */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: isProjet ? 'rgba(37, 99, 235, 0.12)' : color.dot ? `${color.dot}18` : 'var(--color-surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isProjet ? '#2563eb' : color.dot || 'var(--text-secondary)',
                  flexShrink: 0,
                  border: `1px solid ${isProjet ? 'rgba(37, 99, 235, 0.25)' : color.dot ? `${color.dot}30` : 'var(--color-border)'}`
                }}
              >
                {isProjet ? (
                  <Icon name="hardHat" size={17} color="#2563eb" />
                ) : (
                  <Icon name="house" size={17} color={color.dot || 'var(--text-secondary)'} />
                )}
              </div>

              {/* Infos Texte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 12.5,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {b.nom}
                  </div>
                  {isProjet && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '1px 5px', borderRadius: 4 }}>
                      PROJET
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                  {b.adresse || 'Adresse non renseignée'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {isProjet ? b.phase_actuelle || 'En cours' : `${b.surface_m2 ? `${b.surface_m2} m²` : b.type_bien || 'Bien'}`}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {b.valeur_estimee || b.budget_prevision ? formatEuro(b.valeur_estimee || b.budget_prevision) : ''}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {filteredBiens.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Aucun bien ne correspond aux filtres.
          </div>
        )}
      </div>
    </div>
  )
}
