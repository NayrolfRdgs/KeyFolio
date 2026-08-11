import React, { useState } from 'react'
import { globalSearch } from '../lib/db'
import Icon from './Icon'

export default function GlobalSearchModal({ onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (val) => {
    setQuery(val)
    if (!val.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await globalSearch(val)
      setResults(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (item) => {
    onNavigate(item.target_page, item.param)
    onClose()
  }

  const categoryBadge = (cat) => {
    switch (cat) {
      case 'Bien': return 'badge-success'
      case 'Locataire': return 'badge-info'
      case 'Dépense': return 'badge-warning'
      case 'Document': return 'badge-muted'
      default: return 'badge-muted'
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 640, top: 60, position: 'absolute' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)', paddingBottom: 12, marginBottom: 16 }}>
          <Icon name="search" size={20} />
          <input
            type="text"
            className="form-control"
            style={{ border: 'none', boxShadow: 'none', fontSize: 16, padding: 0 }}
            placeholder="Rechercher partout (bien, locataire, facture, document...)"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            autoFocus
          />
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 12, color: 'var(--color-muted)', fontSize: 13 }}>Recherche en cours...</div>}

          {!loading && query && results.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
              Aucun résultat correspondant à "{query}".
            </div>
          )}

          {results.map((res, i) => (
            <div
              key={i}
              onClick={() => handleSelect(res)}
              style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                marginBottom: 4,
                transition: 'background 0.15s'
              }}
              className="search-item-hover"
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{res.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{res.subtitle}</div>
              </div>
              <span className={`badge ${categoryBadge(res.category)}`}>{res.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
