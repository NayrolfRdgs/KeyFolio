import React from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function WatchlistAlerts({
  alerts = [],
  onNavigate
}) {
  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            À Surveiller & Points d'Attention
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Détection automatique d'anomalies financières, opérationnelles et locatives
          </p>
        </div>

        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 6,
          background: alerts.length > 0 ? '#fee2e2' : '#dcfce7',
          color: alerts.length > 0 ? '#991b1b' : '#166534'
        }}>
          {alerts.length > 0 ? `${alerts.length} point${alerts.length > 1 ? 's' : ''} à traiter` : '✅ Tout est en ordre'}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div style={{
          padding: '32px 16px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.06) 0%, rgba(255, 255, 255, 0.9) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(22, 163, 74, 0.2)'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px'
          }}>
            <Icon name="checkCircle" size={24} color="#16a34a" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Aucun point critique détecté
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Tous vos biens sont loués, les cash-flows sont stables et aucune anomalie majeure n'est en attente.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((al, idx) => {
            const isCritique = al.level === 'critique'
            const isAttention = al.level === 'attention'

            const borderColor = isCritique ? '#fca5a5' : isAttention ? '#fde047' : '#93c5fd'
            const bgColor = isCritique ? '#fef2f2' : isAttention ? '#fffbeb' : '#eff6ff'
            const textColor = isCritique ? '#991b1b' : isAttention ? '#92400e' : '#1e40af'
            const badgeBg = isCritique ? '#fee2e2' : isAttention ? '#fef3c7' : '#dbeafe'

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: badgeBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2
                  }}>
                    <Icon
                      name={isCritique ? 'alertCircle' : isAttention ? 'triangleAlert' : 'info'}
                      size={16}
                      color={textColor}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        {al.title}
                      </span>
                      {al.targetName && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#fff', padding: '1px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}>
                          {al.targetName}
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: textColor, background: badgeBg, padding: '1px 5px', borderRadius: 3 }}>
                        {isCritique ? 'Urgent' : isAttention ? 'Attention' : 'Info'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.35 }}>
                      {al.message}
                    </div>
                  </div>
                </div>

                {al.action && (
                  <button
                    type="button"
                    onClick={() => al.actionUrl && onNavigate && onNavigate(al.actionUrl.page, al.actionUrl.param)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#0f172a',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {al.actionLabel || 'Voir'} <Icon name="chevronRight" size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
