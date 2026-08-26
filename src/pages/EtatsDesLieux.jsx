import React, { useEffect, useState, useMemo } from 'react'
import { getBiens, getLocataires, getBaux, getEtatsDesLieux, saveEtatDesLieuxRecord, deleteEtatDesLieuxRecord } from '../lib/db'
import { formatDate } from '../lib/utils'
import Icon from '../components/common/Icon'
import EtatDesLieuxModal from '../components/baux/EtatDesLieuxModal'

export default function EtatsDesLieux({ onNavigate, onOpenMail }) {
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [baux, setBaux] = useState([])
  const [edlList, setEdlList] = useState([])
  const [selectedBailForEdl, setSelectedBailForEdl] = useState(null)

  const load = () => {
    Promise.all([
      getBiens().catch(() => []),
      getLocataires().catch(() => []),
      getBaux().catch(() => []),
      Promise.resolve(getEtatsDesLieux()).catch(() => [])
    ]).then(([bi, lo, ba, ed]) => {
      setBiens(bi || [])
      setLocataires(lo || [])
      setBaux(ba || [])
      setEdlList(ed || [])
    })
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = (id) => {
    if (!confirm('Supprimer cet enregistrement d\'état des lieux ?')) return
    deleteEtatDesLieuxRecord(id)
    load()
  }

  const handleOpenNewEdl = (b = null) => {
    if (b) {
      setSelectedBailForEdl(b)
    } else if (baux.length > 0) {
      setSelectedBailForEdl(baux[0])
    } else {
      alert("Veuillez d'abord créer un bail pour réaliser un état des lieux.")
    }
  }

  const kpis = useMemo(() => {
    const totalBaux = baux.length
    const bauxActifs = baux.filter(b => b.statut === 'actif').length
    const totalEdl = edlList.length
    return { totalBaux, bauxActifs, totalEdl }
  }, [baux, edlList])

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <div className="page-header">
        <div>
          <h2>États des Lieux</h2>
          <p className="page-subtitle">
            Inventaires contradictoires numériques, relevés de compteurs, clés et documents d'entrée/sortie
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => handleOpenNewEdl()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={15} /> + Rédiger un état des lieux
        </button>
      </div>

      {/* ── BANDEAU KPI DÉTACHÉ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Baux sous gestion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{kpis.totalBaux}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{kpis.bauxActifs} en cours</div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>EDL Signés & Archivés</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{kpis.totalEdl}</div>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Conformes Loi ALUR</div>
        </div>
      </div>

      {/* ── SECTION 1 : LOGEMENTS & BAUX DISPONIBLES EN CARTES DÉTACHÉES ── */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          Logements sous bail ({baux.length})
        </h3>
        
        {baux.length === 0 ? (
          <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="fileText" size={36} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <div>Aucun contrat de location actif. Créez un bail pour générer un état des lieux.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {baux.map(b => {
              const locataire = locataires.find(l => l.id === b.locataire_id)
              const bien = biens.find(bi => bi.id === b.bien_id)

              return (
                <div key={b.id} className="card" style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="house" size={14} color="var(--color-accent)" />
                      {bien?.nom || b.bien_nom || 'Logement'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                      Locataire : <strong>{locataire ? `${locataire.prenom} ${locataire.nom}` : b.locataire_nom || 'Locataire'}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Bail : {b.type_bail === 'meuble' ? 'Meublé' : 'Nu'} • Entrée le {formatDate(b.date_debut)}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenNewEdl(b)}
                    style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                    title="Générer l'état des lieux pour ce bail"
                  >
                    <Icon name="fileSignature" size={12} color="var(--color-accent)" /> Rédiger EDL
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2 : HISTORIQUE DES ÉTATS DES LIEUX ── */}
      <div>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          Historique des États des Lieux Réalisés
        </h3>

        {edlList.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Aucun état des lieux finalisé pour l'instant.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Logement</th>
                  <th>Locataire</th>
                  <th>Type EDL</th>
                  <th>Date Réalisation</th>
                  <th>Clés remises</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {edlList.map(edl => (
                  <tr key={edl.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{edl.bien_nom || 'Logement'}</td>
                    <td>{edl.locataire_nom || 'Locataire'}</td>
                    <td>
                      <span className={`badge ${edl.type_edl === 'entree' ? 'badge-success' : 'badge-neutral'}`}>
                        {edl.type_edl === 'entree' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(edl.date_edl)}</td>
                    <td style={{ fontSize: 12 }}>{edl.cles_remises || 'Toutes les clés'}</td>
                    <td>
                      <span className="badge badge-success" style={{ fontSize: 10 }}>Signé & Conforme</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDelete(edl.id)}
                        title="Supprimer l'enregistrement"
                      >
                        <Icon name="trash2" size={13} color="#ef4444" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALE ÉTAT DES LIEUX COMPLET ── */}
      {selectedBailForEdl && (
        <EtatDesLieuxModal
          bail={selectedBailForEdl}
          bien={biens.find(bi => bi.id === selectedBailForEdl.bien_id)}
          locataire={locataires.find(l => l.id === selectedBailForEdl.locataire_id)}
          onClose={() => { setSelectedBailForEdl(null); load() }}
          onSendMail={onOpenMail}
        />
      )}
    </div>
  )
}
