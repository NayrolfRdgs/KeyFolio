import React from 'react'
import BienImage from './BienImage'
import { formatEuro, formatDate } from '../../lib/utils'
import Icon from '../common/Icon'

export default function BienHeaderCard({
  bien,
  champsMap,
  activeBail,
  allPhotoPaths,
  propertyAddress,
  loyerMensuel,
  rendNet,
  dpeNote,
  onOpenGallery,
  setActivePhotoIdx,
  onUploadPhotos,
  onOpenMap,
  onSyncExcel,
  onNavigateToEdit,
  onAttachDoc,
  onNavigateLocataires
}) {
  const modeOccRaw = champsMap['mode_occupation'] || bien.statut || ''
  const modeOccNorm = modeOccRaw.toLowerCase()

  let badgeText = 'Vacant'
  let badgeBg = '#FEE2E2'
  let badgeColor = '#DC2626'

  if (modeOccNorm.includes('principale') || bien.statut === 'residence_principale') {
    badgeText = 'Résidence Principale'
    badgeBg = '#EFF6FF'
    badgeColor = '#2563EB'
  } else if (modeOccNorm.includes('secondaire') || bien.statut === 'residence_secondaire') {
    badgeText = 'Résidence Secondaire'
    badgeBg = '#F3E8FF'
    badgeColor = '#7C3AED'
  } else if (activeBail) {
    badgeText = 'Loué / Occupé'
    badgeBg = '#DCFCE7'
    badgeColor = '#166534'
  } else if (modeOccNorm.includes('vente') || bien.statut === 'en_vente') {
    badgeText = 'En Vente'
    badgeBg = '#FEF3C7'
    badgeColor = '#D97706'
  } else {
    badgeText = 'Vacant'
    badgeBg = '#FEE2E2'
    badgeColor = '#DC2626'
  }

  const typeBienStr = champsMap['type_bien'] || bien.type_bien || 'Logement'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20, alignItems: 'stretch' }}>
      {/* Carte Principale Gauche (Photos + Infos clés + KPIs) */}
      <div className="card" style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'center' }}>
          
          {/* Colonne 1: Photos */}
          <div>
            <div style={{ position: 'relative', width: '100%', height: 155, borderRadius: 8, overflow: 'hidden', background: 'var(--color-surface-2)', border: '1px solid var(--border-color)' }}>
              {allPhotoPaths.length > 0 ? (
                <BienImage src={allPhotoPaths[0]} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4, color: 'var(--text-muted)' }}>
                  <Icon name="camera" size={32} color="#94a3b8" />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Aucune photo</span>
                </div>
              )}
              <button
                className="btn btn-secondary btn-sm"
                style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(15,23,42,0.75)', color: '#FFF', border: 'none', padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={onOpenGallery}
              >
                <Icon name="camera" size={12} color="#ffffff" /> Voir photos ({allPhotoPaths.length})
              </button>
            </div>

            {/* Vignettes sous la photo principale */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 1.2fr', gap: 4, marginTop: 6 }}>
              {allPhotoPaths.slice(1, 6).map((pPath, idx) => (
                <div
                  key={idx}
                  style={{ height: 34, borderRadius: 5, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                  onClick={() => { setActivePhotoIdx(idx + 1); onOpenGallery() }}
                >
                  <BienImage src={pPath} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              <button
                style={{ height: 34, background: 'var(--color-surface-2)', border: '1px dashed var(--border-color)', borderRadius: 5, fontSize: 9, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 1 }}
                onClick={() => onUploadPhotos('00_ACHAT-VENTE/Annonce - Photos')}
                title="Ajouter des photos"
              >
                + Photos
              </button>
            </div>
          </div>

          {/* Colonne 2: Infos principales + KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'center' }}>
            
            {/* Infos bien */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="house" size={20} color="var(--color-accent)" />
                  {bien.nom}
                </h2>
                <span className="badge" style={{ background: badgeBg, color: badgeColor, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
                  ● {badgeText}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="mapPin" size={13} color="#64748b" /> {propertyAddress || '—'}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {champsMap['surface_m2'] || bien.surface_m2 ? `${champsMap['surface_m2'] || bien.surface_m2} m²` : '—'}
                </span> {champsMap['pieces'] ? `• ${champsMap['pieces']} pièces` : ''} • {typeBienStr}
              </div>

              {/* Locataire / Occupation actuelle */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                {activeBail ? (
                  <div>
                    <span
                      style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={onNavigateLocataires}
                    >
                      <Icon name="user" size={14} color="#64748b" />
                      {activeBail.locataire_prenom} {activeBail.locataire_nom}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      Bail {activeBail.type_bail || 'Location'} · Début : {formatDate(activeBail.date_debut)}
                    </div>
                  </div>
                ) : champsMap['mode_occupation'] ? (
                  <div style={{ fontSize: 12, fontWeight: 800, color: badgeColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="house" size={13} color={badgeColor} />
                    {champsMap['mode_occupation']}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="alert" size={12} color="#DC2626" />
                    Logement vacant / Sans bail actif
                  </div>
                )}
              </div>
            </div>

            {/* 4 Cartes KPIs en Grille 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#10B981' }}>{loyerMensuel ? formatEuro(loyerMensuel) : '—'}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>Loyer mensuel</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#3B82F6' }}>{rendNet}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>Rendement net</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#F59E0B' }}>{dpeNote}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>DPE</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: badgeColor, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{badgeText}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>Occupation</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Résumé Card Right (340px) */}
      <div className="card" style={{ padding: 14, background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              RÉSUMÉ DU LOGEMENT
            </h4>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-primary btn-sm" onClick={onNavigateToEdit} style={{ padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="edit" size={11} /> Modifier
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onAttachDoc} style={{ padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="paperclip" size={11} /> Joindre
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Nombre de pièces</span>
              <strong>{champsMap['pieces'] || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Étage</span>
              <strong>{champsMap['etage'] || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Année construction</span>
              <strong>{champsMap['annee_construction'] || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Type de bail</span>
              <strong>{activeBail?.type_bail || 'Aucun bail'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Début de bail</span>
              <strong>{activeBail ? formatDate(activeBail.date_debut) : '—'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '4px 6px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={onOpenMap}>
            <Icon name="map" size={12} /> Carte / Map
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 6px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }} onClick={onSyncExcel} title="Régénérer Excel">
            <Icon name="refresh" size={12} /> Excel
          </button>
        </div>
      </div>
    </div>
  )
}
