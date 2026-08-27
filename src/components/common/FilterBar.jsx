import React from 'react'
import Icon from './Icon'

export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  filters = null,
  actions = null,
  children,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`filter-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
        background: 'var(--color-surface, rgba(255, 255, 255, 0.6))',
        padding: '10px 14px',
        borderRadius: 'var(--radius, 10px)',
        border: '1px solid var(--color-border, rgba(148, 163, 184, 0.2))',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 220, flexWrap: 'wrap' }}>
        {onSearchChange && (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 200px',
              maxWidth: 320
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 10,
                color: 'var(--text-muted, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}
            >
              <Icon name="search" size={15} />
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--color-border, rgba(148, 163, 184, 0.3))',
                background: 'var(--color-surface-2, rgba(255, 255, 255, 0.8))',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex'
                }}
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
        )}

        {filters}
        {children}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
