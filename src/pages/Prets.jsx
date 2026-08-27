import React, { useEffect, useState, useMemo } from 'react'
import { getPrets, deletePret, getBiens, getProjets } from '../lib/db'
import { formatEuro, formatDate } from '../lib/utils'
import { getLoanStatusAtDate } from '../lib/financialCalculations'
import Icon from '../components/common/Icon'
import LoanFormModal from '../components/prets/LoanFormModal'
import LoanScheduleModal from '../components/prets/LoanScheduleModal'
import LoanSimulatorModal from '../components/prets/LoanSimulatorModal'

import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'

export default function Prets({ onNavigate }) {
  const [prets, setPrets] = useState([])
  const [biens, setBiens] = useState([])
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editPret, setEditPret] = useState(null)
  const [schedulePret, setSchedulePret] = useState(null)
  const [simuModalOpen, setSimuModalOpen] = useState(false)

  const load = async () => {
    try {
      const [p, b, pr] = await Promise.all([
        getPrets().catch(() => []),
        getBiens().catch(() => []),
        getProjets().catch(() => [])
      ])
      setPrets(p || [])
      setBiens(b || [])
      setProjets(pr || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce prêt immobilier ?')) return
    await deletePret(id)
    load()
  }

  // KPIs Financement
  const kpis = useMemo(() => {
    let detteInitiale = 0
    let capitalRestant = 0
    let mensualitesTotal = 0
    let interetsTotal = 0

    prets.forEach(p => {
      const st = getLoanStatusAtDate(p)
      detteInitiale += (p.montant_emprunt || 0)
      capitalRestant += st.capitalRestantDu
      mensualitesTotal += st.mensualite
      interetsTotal += (st.interetsPayes + st.interetsRestants)
    })

    const valeurPatrimoine = biens.reduce((s, b) => s + (b.valeur_estimee || b.prix_achat || 180000), 0)
    const ltv = valeurPatrimoine > 0 ? Math.round((capitalRestant / valeurPatrimoine) * 100) : 0

    return {
      detteInitiale,
      capitalRestant,
      capitalAmorti: Math.max(0, detteInitiale - capitalRestant),
      mensualitesTotal,
      interetsTotal,
      ltv,
      nbPrets: prets.length
    }
  }, [prets, biens])

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <PageHeader
        title="Prêts & Financements"
        subtitle="Suivi du passif, tableau d'amortissement, ratios dette/valeur et simulateur de crédit"
        icon="circleDollarSign"
        badge={prets.length > 0 ? `${prets.length} prêt${prets.length > 1 ? 's' : ''}` : null}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setSimuModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="calculator" size={14} color="#4f46e5" /> Simulateur de prêt
            </button>
            <button className="btn btn-primary" onClick={() => { setEditPret(null); setFormModalOpen(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="plus" size={14} /> + Nouveau prêt
            </button>
          </>
        }
      />

      {/* ── BANDEAU KPI DÉTACHÉ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dette restante</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{formatEuro(kpis.capitalRestant)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>sur {formatEuro(kpis.detteInitiale)} empruntés</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Capital déjà remboursé</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{formatEuro(kpis.capitalAmorti)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>constituant votre patrimoine net</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Mensualités globales</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{formatEuro(kpis.mensualitesTotal)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>débitées chaque mois</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ratio Dette / Valeur (LTV)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: kpis.ltv <= 70 ? 'var(--color-accent)' : '#f59e0b', marginTop: 4 }}>{kpis.ltv}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{kpis.ltv <= 70 ? 'Niveau d\'endettement sain' : 'Endettement élevé'}</div>
        </div>
      </div>

      {/* ── CARTES DES PRÊTS DÉTACHÉES ── */}
      {prets.length === 0 ? (
        <EmptyState
          icon="circleDollarSign"
          title="Aucun prêt immobilier enregistré"
          description="Ajoutez vos crédits en cours pour suivre l'amortissement du capital et le coût total de vos financements."
          actionLabel="+ Ajouter un prêt"
          onAction={() => { setEditPret(null); setFormModalOpen(true) }}
          secondaryActionLabel="Simulateur de crédit"
          onSecondaryAction={() => setSimuModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {prets.map(p => {
            const st = getLoanStatusAtDate(p)
            const targetBien = biens.find(b => b.id === p.bien_id)
            const targetProjet = projets.find(pr => pr.id === p.projet_id)

            return (
              <div key={p.id} className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* En-tête de carte */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{p.nom_banque}</h3>
                      <span className="badge badge-accent" style={{ fontSize: 10 }}>{p.type_taux === 'variable' ? 'Taux Variable' : 'Taux Fixe'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {targetBien ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: 0, fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}
                          onClick={() => onNavigate && onNavigate('bien', targetBien.id)}
                        >
                          📍 {targetBien.nom}
                        </button>
                      ) : targetProjet ? (
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>🏗️ Projet : {targetProjet.nom}</span>
                      ) : (
                        <span>Prêt général</span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{formatEuro(st.mensualite)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>par mois ({p.taux_interet}% • {p.duree_mois / 12} ans)</div>
                  </div>
                </div>

                {/* Jauge d'amortissement */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Amortissement : {st.pourcentageRembourse}%</span>
                    <span>Fin : {formatDate(st.dateFin)}</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${st.pourcentageRembourse}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #4f46e5 0%, #16a34a 100%)',
                        borderRadius: 99
                      }}
                    />
                  </div>
                </div>

                {/* Cartouches de détails chiffrés */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, background: 'var(--color-surface-2)', padding: '12px 14px', borderRadius: 8 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Capital Restant</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', marginTop: 2 }}>{formatEuro(st.capitalRestantDu)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Capital Remboursé</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{formatEuro(st.capitalRembourse)}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSchedulePret(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
                  >
                    <Icon name="fileSpreadsheet" size={12} color="#4f46e5" /> Échéancier mois par mois
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditPret(p); setFormModalOpen(true) }}
                      title="Modifier les conditions"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(p.id)}
                      title="Supprimer"
                    >
                      <Icon name="trash2" size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALES ── */}
      {formModalOpen && (
        <LoanFormModal
          loan={editPret}
          biens={biens}
          projets={projets}
          onClose={() => { setFormModalOpen(false); setEditPret(null) }}
          onSaved={() => { setFormModalOpen(false); setEditPret(null); load() }}
        />
      )}

      {schedulePret && (
        <LoanScheduleModal
          loan={schedulePret}
          onClose={() => setSchedulePret(null)}
        />
      )}

      {simuModalOpen && (
        <LoanSimulatorModal
          onClose={() => setSimuModalOpen(false)}
          onSuccess={() => { setSimuModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
