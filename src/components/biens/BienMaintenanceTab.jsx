import React from 'react'
import Icon from '../Icon'
import { formatEuro, prioriteBadge, statutMaintenanceBadge } from '../../lib/utils'

export default function BienMaintenanceTab({
  maintenance,
  onOpenNewMaintenance,
  onDeleteMaintenance
}) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          Tickets de maintenance ({maintenance.length})
        </h4>
        <button className="btn btn-primary btn-sm" onClick={onOpenNewMaintenance}>
          <Icon name="plus" size={13} /> Nouveau ticket
        </button>
      </div>

      {maintenance.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔧</div>
          <p>Aucun ticket de maintenance pour ce logement</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Prestataire</th>
                <th>Coût</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {maintenance.map(m => (
                <tr key={m.id}>
                  <td className="fw-600">{m.titre}</td>
                  <td>{prioriteBadge(m.priorite)}</td>
                  <td>{statutMaintenanceBadge(m.statut)}</td>
                  <td className="text-muted">{m.prestataire || '—'}</td>
                  <td className="fw-600">{m.cout ? formatEuro(m.cout) : '—'}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => onDeleteMaintenance(m.id)}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
