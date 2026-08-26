import React from 'react'
import Icon from '../common/Icon'
import StatusBadge from '../common/StatusBadge'
import BienImage from './BienImage'
import { formatEuro } from '../../lib/utils'

export default function BienCardGrid({ biens = [], baux = [], onSelectBien, onNavigate }) {
  const getBailForBien = (bienId) => baux.find(b => b.bien_id === bienId && b.statut === 'actif')

  if (biens.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
        <Icon name="house" size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun bien ne correspond à votre recherche</div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        padding: '16px 0'
      }}
    >
      {biens.map(b => {
        const bail = getBailForBien(b.id)
        const isProjet = String(b.statut).toLowerCase() === 'projet'
        const loyer = bail ? (bail.loyer_mensuel + (bail.charges_mensuelles || 0)) : 0
        const valeur = b.valeur_estimee || b.prix_achat || 0
        const rendement = valeur > 0 && loyer > 0 ? Number(((loyer * 12 / valeur) * 100).toFixed(1)) : null

        return (
          <div
            key={b.id}
            onClick={() => onSelectBien && onSelectBien(b)}
            onDoubleClick={() => onNavigate && onNavigate('bien', b.id)}
            title="Double-clic pour ouvrir la fiche complète"
            style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Image d'en-tête */}
            <div style={{ position: 'relative', height: 140, background: '#f1f5f9' }}>
              <BienImage
                bienId={b.id}
                alt={b.nom}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <StatusBadge status={b.statut} type={isProjet ? 'projet' : 'bien'} size="sm" />
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 10,
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'capitalize'
                }}
              >
                {b.type_bien || 'Bien'}
              </div>
            </div>

            {/* Corps de carte */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{b.nom}</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.adresse || '—'}
                </p>
              </div>

              {/* Surface & Pièces */}
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569' }}>
                {b.surface_m2 ? <span><strong>{b.surface_m2}</strong> m²</span> : null}
                {b.nb_pieces ? <span><strong>{b.nb_pieces}</strong> p.</span> : null}
                {b.nb_chambres ? <span><strong>{b.nb_chambres}</strong> ch.</span> : null}
              </div>

              {/* Métriques financières */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 8,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>VALEUR</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{formatEuro(valeur)}</div>
                </div>

                {loyer > 0 ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                      LOYER {rendement ? `(${rendement}%)` : ''}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{formatEuro(loyer)}/m</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>
                    {isProjet ? 'En projet' : 'Sans bail actif'}
                  </div>
                )}
              </div>
            </div>

            {/* Barre d'action */}
            <div
              style={{
                padding: '8px 16px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8
              }}
            >
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('bien', b.id) }}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                Ouvrir la fiche →
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
