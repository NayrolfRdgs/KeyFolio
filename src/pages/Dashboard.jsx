import React, { useEffect, useState } from 'react'
import { getDashboardStats, getBiens, getPaiements, getBaux } from '../lib/db'
import { formatEuro, formatDate } from '../lib/utils'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [biens, setBiens] = useState([])
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getBiens(),
      getBaux(),
      getPaiements(),
    ])
      .then(([s, b, bx, p]) => {
        setStats(s)
        setBiens(b)
        setBaux(bx)
        setPaiements(p)
      })
      .catch(e => setError(e?.toString()))
  }, [])

  if (error) return (
    <div className="page-content">
      <div className="alert alert-danger">⚠ Erreur : {error}</div>
    </div>
  )

  // Calculs finances globales
  const loyersMensuels = baux
    .filter(b => b.statut === 'actif')
    .reduce((s, b) => s + (b.loyer_mensuel || 0) + (b.charges_mensuelles || 0), 0)

  const now = new Date()
  const thisMo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const encaisseM = paiements
    .filter(p => p.statut === 'paye' && p.date_prevue?.startsWith(thisMo))
    .reduce((s, p) => s + p.montant, 0)
  const impayes = paiements.filter(p => p.statut === 'impaye' || p.statut === 'en_retard')

  // Prochaines échéances (30 jours)
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const upcoming = paiements
    .filter(p => {
      if (p.statut === 'paye') return false
      const d = new Date(p.date_prevue)
      return d >= now && d <= in30
    })
    .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
    .slice(0, 8)

  // Par bien : loyer + statut
  const getBienBail = (bienId) => baux.find(b => b.bien_id === bienId && b.statut === 'actif')
  const getBienImpayes = (bienId) => {
    const bail = getBienBail(bienId)
    if (!bail) return 0
    return paiements.filter(p => p.bail_id === bail.id && (p.statut === 'impaye' || p.statut === 'en_retard')).length
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Tableau de bord</h2>
          <p>Vue globale de votre patrimoine · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('biens')}>
          + Ajouter un logement
        </button>
      </div>

      {/* ── KPI Globaux ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <StatCard icon="🏠" color="#6366f1" bg="rgba(99,102,241,0.12)"
          value={stats?.total_biens ?? '—'} label="Logements" onClick={() => onNavigate('biens')} />
        <StatCard icon="🔑" color="#22c55e" bg="rgba(34,197,94,0.12)"
          value={stats?.biens_en_location ?? '—'} label="En location" />
        <StatCard icon="💶" color="#818cf8" bg="rgba(129,140,248,0.12)"
          value={formatEuro(loyersMensuels)} label="Loyers / mois" />
        <StatCard icon="✅" color="#22c55e" bg="rgba(34,197,94,0.12)"
          value={formatEuro(encaisseM)} label="Encaissé ce mois" onClick={() => onNavigate('paiements')} />
        <StatCard icon="⚠" color="#ef4444" bg="rgba(239,68,68,0.12)"
          value={impayes.length} label="Impayés" onClick={() => onNavigate('paiements')} alert={impayes.length > 0} />
        <StatCard icon="📉" color="#f59e0b" bg="rgba(245,158,11,0.12)"
          value={formatEuro(stats?.depenses_mois)} label="Dépenses ce mois" onClick={() => onNavigate('depenses')} />
        <StatCard icon="🔧" color="#3b82f6" bg="rgba(59,130,246,0.12)"
          value={stats?.tickets_ouverts ?? '—'} label="Tickets ouverts" onClick={() => onNavigate('maintenance')} />
      </div>

      {/* ── Alertes ── */}
      {impayes.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          ⚠&nbsp; <strong>{impayes.length} paiement{impayes.length > 1 ? 's' : ''}</strong> en retard ou impayé{impayes.length > 1 ? 's' : ''}
          &nbsp;—&nbsp;
          {impayes.slice(0, 3).map(p => (
            <span key={p.id} className="badge badge-danger" style={{ marginRight: 4 }}>
              {p.bien_nom || 'Bien'} · {formatEuro(p.montant)}
            </span>
          ))}
        </div>
      )}
      {stats?.tickets_ouverts > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          🔧&nbsp; <strong>{stats.tickets_ouverts} ticket{stats.tickets_ouverts > 1 ? 's' : ''}</strong> de maintenance ouvert{stats.tickets_ouverts > 1 ? 's' : ''}
          &nbsp;—&nbsp;
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('maintenance')}>Voir</button>
        </div>
      )}

      <div className="dashboard-bottom-grid">
        {/* ── Logements ── */}
        <div>
          <h3 className="dashboard-section-title">Mes logements</h3>
          {biens.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">🏠</div>
              <h3>Aucun logement</h3>
              <p>Commencez par ajouter votre premier bien</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate('biens')}>
                + Ajouter un logement
              </button>
            </div>
          ) : (
            <div className="property-cards-grid">
              {biens.map(b => {
                const bail = getBienBail(b.id)
                const imp = getBienImpayes(b.id)
                return (
                  <div key={b.id} className={`property-dash-card ${imp > 0 ? 'property-dash-card-alert' : ''}`}>
                    <div className="property-dash-header">
                      <div>
                        <div className="property-dash-name">{b.nom}</div>
                        <div className="property-dash-addr">{b.adresse || '—'}</div>
                      </div>
                      <span className={`badge ${b.statut === 'en_cours' ? 'badge-success' : b.statut === 'en_vente' ? 'badge-warning' : 'badge-muted'}`}>
                        {b.statut === 'en_cours' ? 'Actif' : b.statut}
                      </span>
                    </div>

                    {bail && (
                      <div className="property-dash-bail">
                        <span>👤 {bail.locataire_prenom} {bail.locataire_nom}</span>
                        <span className="fw-600">{formatEuro(bail.loyer_mensuel + (bail.charges_mensuelles || 0))}/mois</span>
                      </div>
                    )}

                    {imp > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, marginTop: 6 }}>
                        ⚠ {imp} paiement{imp > 1 ? 's' : ''} en attente
                      </div>
                    )}

                    <div className="property-dash-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => onNavigate('bien', b.id)}>
                        Ouvrir
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('bien', b.id)}>
                        ✉️ Mail
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Prochaines échéances ── */}
        <div>
          <h3 className="dashboard-section-title">Prochaines échéances (30j)</h3>
          {upcoming.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucune échéance dans les 30 prochains jours 🎉
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Bien</th><th>Locataire</th><th>Date</th><th>Montant</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {upcoming.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('bien', p.bien_id)}>
                      <td className="fw-600">{p.bien_nom || '—'}</td>
                      <td>{p.locataire_nom || '—'}</td>
                      <td className={`${new Date(p.date_prevue) < now ? 'text-danger fw-600' : 'text-muted'}`}>
                        {formatDate(p.date_prevue)}
                        {new Date(p.date_prevue) < now && ' ⚠'}
                      </td>
                      <td className="fw-600">{formatEuro(p.montant)}</td>
                      <td>
                        <span className={`badge ${p.statut === 'impaye' ? 'badge-danger' : p.statut === 'en_retard' ? 'badge-warning' : 'badge-muted'}`}>
                          {p.statut === 'impaye' ? 'Impayé' : p.statut === 'en_retard' ? 'En retard' : p.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, color, bg, value, label, onClick, alert }) {
  return (
    <div
      className={`stat-card ${alert ? 'stat-card-alert' : ''}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="stat-card-icon" style={{ background: bg, color }}>{icon}</div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}
