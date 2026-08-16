import React from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate } from '../../lib/utils'

export default function BienOccupationTab({
  isOwnerOccupied,
  champsMap,
  baux,
  onOpenNewBail,
  onNavigateToEdit
}) {
  if (isOwnerOccupied) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', background: 'var(--color-surface)', borderRadius: 14 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🏠</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
          Logement en Occupation Personnelle
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 520, margin: '0 auto 18px auto', lineHeight: 1.5 }}>
          Ce logement est actuellement configuré comme <strong>{champsMap['mode_occupation'] || 'Résidence Principale'}</strong> (occupation personnelle par le propriétaire). La gestion des baux et des locataires est donc désactivée pour ce bien.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={onNavigateToEdit}>
            ✏️ Modifier les caractéristiques / Mode d'occupation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Baux du logement</h4>
        <button className="btn btn-primary btn-sm" onClick={onOpenNewBail}>
          <Icon name="plus" size={13} /> Nouveau bail
        </button>
      </div>

      {baux.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3>Aucun bail pour ce logement</h3>
          <button className="btn btn-primary btn-sm" onClick={onOpenNewBail}>+ Nouveau bail</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {baux.map(b => (
            <div key={b.id} className={`card ${b.statut === 'actif' ? 'border-primary' : ''}`} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${b.statut === 'actif' ? 'badge-success' : 'badge-muted'}`}>
                      {b.statut === 'actif' ? 'Actif' : 'Terminé'}
                    </span>
                    <strong style={{ fontSize: 16 }}>
                      👤 {b.locataire_prenom} {b.locataire_nom}
                    </strong>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Du {formatDate(b.date_debut)} au {b.date_fin ? formatDate(b.date_fin) : 'Indéterminé'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatEuro(b.loyer_mensuel)} / mois
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
