import React, { useState, useEffect } from 'react'
import {
  globalSearch, getBiens, getProjets, getLocataires, getBaux, getPrets, getTaches, getMaintenance
} from '../../lib/db'
import Icon from '../common/Icon'

export default function GlobalSearchModal({ onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  // Données locales en cache pour recherche universelle instantanée
  const [cache, setCache] = useState({
    biens: [],
    projets: [],
    locataires: [],
    baux: [],
    prets: [],
    taches: [],
    maintenance: []
  })

  useEffect(() => {
    Promise.all([
      getBiens().catch(() => []),
      getProjets().catch(() => []),
      getLocataires().catch(() => []),
      getBaux().catch(() => []),
      getPrets().catch(() => []),
      Promise.resolve(getTaches()).catch(() => []),
      getMaintenance().catch(() => [])
    ]).then(([bi, pr, lo, ba, loPrets, ta, ma]) => {
      setCache({
        biens: bi || [],
        projets: pr || [],
        locataires: lo || [],
        baux: ba || [],
        prets: loPrets || [],
        taches: ta || [],
        maintenance: ma || []
      })
    })
  }, [])

  const handleSearch = async (val) => {
    setQuery(val)
    if (!val.trim()) {
      setResults([])
      return
    }

    const q = val.toLowerCase().trim()
    const list = []

    // 1. Biens
    cache.biens.forEach(b => {
      if ((b.nom || '').toLowerCase().includes(q) || (b.adresse || '').toLowerCase().includes(q)) {
        list.push({
          category: 'Bien',
          title: b.nom,
          subtitle: b.adresse || 'Logement',
          target_page: 'bien',
          param: b.id,
          icon: 'house'
        })
      }
    })

    // 2. Projets
    cache.projets.forEach(p => {
      if ((p.nom || '').toLowerCase().includes(q) || (p.adresse || '').toLowerCase().includes(q)) {
        list.push({
          category: 'Projet',
          title: p.nom,
          subtitle: `${p.statut || 'En cours'} · ${p.adresse || 'Projet'}`,
          target_page: 'projets',
          param: p.id,
          icon: 'hardHat'
        })
      }
    })

    // 3. Locataires
    cache.locataires.forEach(l => {
      if (`${l.prenom} ${l.nom}`.toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q)) {
        list.push({
          category: 'Locataire',
          title: `${l.prenom} ${l.nom}`,
          subtitle: l.email || l.telephone || 'Locataire',
          target_page: 'locataires',
          param: l.id,
          icon: 'user'
        })
      }
    })

    // 4. Prêts
    cache.prets.forEach(p => {
      if ((p.nom_banque || '').toLowerCase().includes(q)) {
        list.push({
          category: 'Prêt',
          title: p.nom_banque,
          subtitle: `${p.montant_emprunt} € · ${p.taux_interet}%`,
          target_page: 'prets',
          param: p.id,
          icon: 'circleDollarSign'
        })
      }
    })

    // 5. Tâches
    cache.taches.forEach(t => {
      if ((t.titre || '').toLowerCase().includes(q)) {
        list.push({
          category: 'Tâche',
          title: t.titre,
          subtitle: `Échéance : ${t.echeance || 'Non fixée'}`,
          target_page: 'taches',
          param: t.id,
          icon: 'checkSquare'
        })
      }
    })

    // 6. Maintenance
    cache.maintenance.forEach(m => {
      if ((m.titre || '').toLowerCase().includes(q)) {
        list.push({
          category: 'Maintenance',
          title: m.titre,
          subtitle: m.prestataire || 'Intervention',
          target_page: 'maintenance',
          param: m.id,
          icon: 'wrench'
        })
      }
    })

    // Fallback SQLite globalSearch si besoin
    try {
      const backendResults = await globalSearch(val).catch(() => [])
      if (backendResults && backendResults.length > 0) {
        backendResults.forEach(br => {
          if (!list.some(x => x.title === br.title && x.category === br.category)) {
            list.push(br)
          }
        })
      }
    } catch {}

    setResults(list)
  }

  const handleSelect = (item) => {
    onNavigate(item.target_page, item.param)
    onClose()
  }

  const categoryBadgeStyle = (cat) => {
    switch (cat) {
      case 'Bien': return { bg: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }
      case 'Projet': return { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }
      case 'Locataire': return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }
      case 'Prêt': return { bg: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }
      case 'Tâche': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
      case 'Maintenance': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
      default: return { bg: '#f1f5f9', color: '#64748b' }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ display: 'flex', justifyContent: 'center', paddingTop: 60, zIndex: 1200 }}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 600,
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <Icon name="search" size={18} color="#4f46e5" />
          <input
            type="text"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontWeight: 500,
              color: '#0f172a',
              background: 'transparent'
            }}
            placeholder="Rechercher partout (biens, projets, locataires, baux, prêts, tâches...)"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 8 }}>
          {query && results.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Aucun résultat correspondant à "{query}".
            </div>
          )}

          {!query && (
            <div style={{ padding: '16px 20px', color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Tapez un mot-clé pour effectuer une recherche instantanée dans tout votre patrimoine.</span>
              <span style={{ fontSize: 10, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                Ctrl + K
              </span>
            </div>
          )}

          {results.map((res, i) => {
            const bStyle = categoryBadgeStyle(res.category)
            return (
              <div
                key={i}
                onClick={() => handleSelect(res)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  marginBottom: 2,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name={res.icon || 'search'} size={16} color="#64748b" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{res.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{res.subtitle}</div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: bStyle.bg,
                    color: bStyle.color
                  }}
                >
                  {res.category}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
