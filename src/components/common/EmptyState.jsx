import React from 'react'
import Icon from './Icon'

export default function EmptyState({
  icon = 'folder',
  title = 'Aucun élément trouvé',
  description = 'Commencez par ajouter un premier élément ou modifiez vos filtres de recherche.',
  actionLabel = null,
  onAction = null,
  actionIcon = 'plus',
  secondaryActionLabel = null,
  onSecondaryAction = null,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--color-surface, rgba(255, 255, 255, 0.5))',
        borderRadius: 'var(--radius-lg, 14px)',
        border: '1px dashed var(--color-border, rgba(148, 163, 184, 0.3))',
        margin: '20px 0',
        ...style
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-accent-dim, #e0e7ff)',
          color: 'var(--color-accent, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16
        }}
      >
        <Icon name={icon} size={28} />
      </div>

      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: 13.5,
            color: 'var(--text-secondary, #64748b)',
            maxWidth: 440,
            lineHeight: 1.5
          }}
        >
          {description}
        </p>
      )}

      {(onAction || onSecondaryAction) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {onAction && actionLabel && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-accent, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
              }}
            >
              {actionIcon && <Icon name={actionIcon} size={15} />}
              {actionLabel}
            </button>
          )}

          {onSecondaryAction && secondaryActionLabel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSecondaryAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-surface-2, rgba(255, 255, 255, 0.8))',
                color: 'var(--text-primary)',
                border: '1px solid var(--color-border)',
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
