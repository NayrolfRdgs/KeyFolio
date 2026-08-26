import React, { useEffect, useState } from 'react'
import { getPaiements, getMaintenance, getTaches } from '../lib/db'
import { formatDate, formatEuro } from '../lib/utils'
import Icon from '../components/common/Icon'

export default function NotificationsPage({ onNavigate }) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    Promise.all([
      getPaiements().catch(() => []),
      getMaintenance().catch(() => []),
      Promise.resolve(getTaches()).catch(() => [])
    ]).then(([pa, ma, ta]) => {
      const list = []

      // Impayés
      pa.filter(p => p.statut === 'impaye' || p.statut === 'en_retard').forEach(p => {
        list.push({
          id: `imp-${p.id}`,
          titre: `Paiement en retard (${formatEuro(p.montant)})`,
          desc: `Échéance du ${formatDate(p.date_prevue)} pour le bien ${p.bien_nom || ''}`,
          type: 'danger',
          icon: 'alert',
          page: 'paiements'
        })
      })

      // Maintenance urgente
      ma.filter(m => m.priorite === 'urgent' && m.statut !== 'resolu').forEach(m => {
        list.push({
          id: `ma-${m.id}`,
          titre: `Ticket urgent : ${m.titre}`,
          desc: m.description || 'Intervention de maintenance requise',
          type: 'warning',
          icon: 'flame',
          page: 'maintenance'
        })
      })

      // Échéances
      ta.filter(t => !t.termine && t.echeance).forEach(t => {
        const isPast = new Date(t.echeance) < new Date()
        list.push({
          id: `ta-${t.id}`,
          titre: t.titre,
          desc: `Échéance : ${formatDate(t.echeance)}${isPast ? ' (En retard)' : ''}`,
          type: isPast ? 'danger' : 'info',
          icon: 'clock',
          page: 'taches'
        })
      })

      setNotifications(list)
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
      
      {/* ── EN-TÊTE ── */}
      <div
        style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="bell" size={22} color="#4f46e5" /> Centre de Notifications & Alertes
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Rappels automatiques d'échéances, impayés locatifs et urgences
          </p>
        </div>

        <span className="badge badge-purple">
          {notifications.length} notification{notifications.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── LISTE DES NOTIFICATIONS ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <Icon name="checkCircle" size={40} color="#16a34a" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>Aucune notification en attente</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Tous vos loyers et tâches sont à jour.</div>
            </div>
          ) : (
            notifications.map(n => {
              const bg = n.type === 'danger' ? 'rgba(239, 68, 68, 0.08)' : n.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)'
              const border = n.type === 'danger' ? 'rgba(239, 68, 68, 0.25)' : n.type === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(99, 102, 241, 0.25)'
              const color = n.type === 'danger' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#4f46e5'

              return (
                <div
                  key={n.id}
                  onClick={() => onNavigate && onNavigate(n.page)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: `1px solid ${border}`,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={n.icon} size={18} color={color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{n.titre}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{n.desc}</div>
                    </div>
                  </div>

                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>
                    Consulter →
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}
