import React from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate } from '../../lib/utils'

export default function AttentionFeed({ impayes = [], ticketsUrgents = [], echeancesProches = [], onNavigate }) {
  const hasItems = impayes.length > 0 || ticketsUrgents.length > 0 || echeancesProches.length > 0

  if (!hasItems) {
    return (
      <div
        style={{
          background: 'rgba(22, 163, 74, 0.06)',
          border: '1px solid rgba(22, 163, 74, 0.2)',
          borderRadius: 10,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#15803d'
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(22, 163, 74, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="checkCircle" size={18} color="#16a34a" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Tout est en ordre</div>
          <div style={{ fontSize: 11, color: '#166534' }}>Aucun impayé, ticket urgent ou échéance critique à signaler.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Impayés */}
      {impayes.map(p => (
        <div
          key={`imp-${p.id}`}
          onClick={() => onNavigate && onNavigate('paiements')}
          style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="alert" size={16} color="#ef4444" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                Impayé / Retard : {p.bien_nom || 'Bien'}
              </div>
              <div style={{ fontSize: 11, color: '#b91c1c' }}>
                {p.locataire_nom ? `Locataire : ${p.locataire_nom} · ` : ''}Échéance du {formatDate(p.date_prevue)}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{formatEuro(p.montant)}</span>
          </div>
        </div>
      ))}

      {/* Tickets urgents */}
      {ticketsUrgents.map(t => (
        <div
          key={`tick-${t.id}`}
          onClick={() => onNavigate && onNavigate('maintenance')}
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="flame" size={16} color="#f59e0b" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                Maintenance urgente : {t.titre}
              </div>
              <div style={{ fontSize: 11, color: '#b45309' }}>
                {t.bien_nom ? `Bien : ${t.bien_nom} · ` : ''}{t.description || 'Intervention requise'}
              </div>
            </div>
          </div>
          <span className="badge badge-warning" style={{ fontSize: 10 }}>Urgent</span>
        </div>
      ))}

      {/* Échéances proches */}
      {echeancesProches.map((e, idx) => (
        <div
          key={`ech-${idx}`}
          onClick={() => onNavigate && onNavigate('taches')}
          style={{
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clock" size={16} color="#6366f1" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3730a3' }}>
                {e.titre}
              </div>
              <div style={{ fontSize: 11, color: '#4338ca' }}>
                Échéance le {formatDate(e.echeance)}
              </div>
            </div>
          </div>
          <span className="badge badge-info" style={{ fontSize: 10 }}>À venir</span>
        </div>
      ))}
    </div>
  )
}
