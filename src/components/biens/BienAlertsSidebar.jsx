import Icon from '../common/Icon'
import React from 'react'
import { formatEuro } from '../../lib/utils'

export default function BienAlertsSidebar({
  bienId,
  impayes,
  bienFiles,
  loyerMensuel,
  activeBail,
  onOpenInDocuments,
  onNavigate
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Bloc ALERTES */}
      <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            ALERTES ({impayes.length > 0 ? '3' : '2'})
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>DPE à renouveler</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Valide jusqu'à la fin d'année</div>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={16} color="#2563eb" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>Assurance PNO</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attestation annuelle à jour</div>
            </div>
          </div>

          {impayes.length > 0 && (
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>Loyers en retard ({impayes.length})</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Paiement de loyer non reçu</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bloc DOCUMENTS RAPIDES */}
      <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            DOCUMENTS RAPIDES ({bienFiles.length})
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bienFiles.slice(0, 5).map((f, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span></span>
                <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 180 }}>
                  {f.filename}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '1px 6px', fontSize: 10 }}
                onClick={() => {
                  if (onOpenInDocuments) onOpenInDocuments(bienId, f.relative_path || f.absolute_path)
                  else if (onNavigate) onNavigate('documents', { bienId, filePath: f.relative_path || f.absolute_path })
                }}
              >
                Voir dans Documents
              </button>
            </div>
          ))}
        </div>

        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: 10, fontSize: 11 }}
          onClick={() => {
            if (onOpenInDocuments) onOpenInDocuments(bienId)
            else if (onNavigate) onNavigate('documents', bienId)
          }}
        >
          Voir tous les documents ({bienFiles.length}) →
        </button>
      </div>

      {/* Bloc ACTIVITÉ RÉCENTE */}
      <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 12 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          ACTIVITÉS RÉCENTES
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Icon name="wallet" size={14} color="#16a34a" />
            <div>
              <div style={{ fontWeight: 700 }}>Paiement enregistré</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loyer de {formatEuro(loyerMensuel)}</div>
            </div>
          </div>

          {activeBail && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Icon name="fileText" size={14} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 700 }}>Bail actif</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeBail.locataire_prenom} {activeBail.locataire_nom}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
