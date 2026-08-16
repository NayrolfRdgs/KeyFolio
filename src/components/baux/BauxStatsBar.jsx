import React from 'react'

export default function BauxStatsBar({
  filterStatut,
  setFilterStatut,
  countActifs,
  countAnciens,
  totalBaux,
  filterBien,
  setFilterBien,
  biens
}) {
  return (
    <div className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className={`btn btn-sm ${filterStatut === 'actif' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterStatut('actif')}
        >
          🟢 Baux en cours ({countActifs})
        </button>
        <button
          className={`btn btn-sm ${filterStatut === 'termine' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterStatut('termine')}
        >
          📁 Baux antérieurs / Archives ({countAnciens})
        </button>
        <button
          className={`btn btn-sm ${filterStatut === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterStatut('all')}
        >
          Tous les baux ({totalBaux})
        </button>
      </div>

      <select
        className="form-control"
        style={{ maxWidth: 200, marginLeft: 'auto' }}
        value={filterBien}
        onChange={e => setFilterBien(e.target.value)}
      >
        <option value="">Tous les logements</option>
        {biens.map(b => (
          <option key={b.id} value={b.id}>🏠 {b.nom}</option>
        ))}
      </select>
    </div>
  )
}
