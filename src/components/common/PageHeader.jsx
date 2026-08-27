import React from 'react'
import Icon from './Icon'

export default function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`page-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.08) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent, #4f46e5)',
              flexShrink: 0
            }}
          >
            <Icon name={icon} size={22} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              {title}
            </h1>
            {badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 99,
                  background: 'var(--color-accent-dim, #e0e7ff)',
                  color: 'var(--color-accent, #4f46e5)'
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: 13,
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.4
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {(actions || children) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {children}
          {actions}
        </div>
      )}
    </div>
  )
}
