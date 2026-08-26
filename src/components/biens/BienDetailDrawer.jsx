import React, { useState, useEffect } from 'react'
import {
  listBienFiles, getFilePreview, openFilePath,
  getBaux, getPaiements, getDepenses
} from '../../lib/db'
import { formatEuro, formatDate } from '../../lib/utils'
import Icon from '../common/Icon'
import { getStatutColor } from './BiensMapView'

export default function BienDetailDrawer({
  bien,
  onClose,
  onNavigate,
  onFocusMap,
  onEditBien
}) {
  const [photos, setPhotos] = useState([])
  const [heroPhotoPreview, setHeroPhotoPreview] = useState(null)
  const [baux, setBaux] = useState([])
  const [activeBail, setActiveBail] = useState(null)
  const [depenses, setDepenses] = useState([])

  const isProjet = String(bien?.statut || '').toLowerCase() === 'projet' || Boolean(bien?.is_projet_entity)
  const color = getStatutColor(bien?.statut)

  const loadData = async () => {
    if (!bien?.id) return
    const cleanId = typeof bien.id === 'string' && bien.id.startsWith('p-') ? bien.projet_id : bien.id

    try {
      const [files, bRes, dRes] = await Promise.all([
        listBienFiles(cleanId).catch(() => []),
        getBaux(cleanId).catch(() => []),
        getDepenses(cleanId).catch(() => [])
      ])

      setBaux(bRes || [])
      const currentBail = (bRes || []).find(b => b.statut === 'actif') || (bRes || [])[0]
      setActiveBail(currentBail || null)
      setDepenses(dRes || [])

      // Filtrer les photos
      const photoFiles = (files || []).filter(f =>
        /\.(jpg|jpeg|png|webp|avif)$/i.test(f.filename) ||
        f.subfolder?.toLowerCase().includes('photo') ||
        f.type_doc === 'photo'
      )
      setPhotos(photoFiles)

      if (photoFiles.length > 0) {
        getFilePreview(photoFiles[0].relative_path || photoFiles[0].absolute_path)
          .then(data => setHeroPhotoPreview(`data:${data.mime_type};base64,${data.base64_data}`))
          .catch(() => setHeroPhotoPreview(null))
      } else {
        setHeroPhotoPreview(null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [bien?.id])

  if (!bien) return null

  const handleOpenFullProperty = () => {
    const cleanId = typeof bien.id === 'string' && bien.id.startsWith('p-') ? bien.projet_id : bien.id
    if (onNavigate) {
      onNavigate('bien', cleanId)
    }
  }

  const loyerTotal = activeBail ? (Number(activeBail.loyer_mensuel || 0) + Number(activeBail.charges_mensuelles || 0)) : 0
  const loyerNu = activeBail ? Number(activeBail.loyer_mensuel || 0) : 0
  const charges = activeBail ? Number(activeBail.charges_mensuelles || 0) : 0
  const valeurActif = Number(bien.valeur_estimee || bien.prix_achat || 0)
  const rdtBrut = (valeurActif > 0 && loyerTotal > 0) ? ((loyerTotal * 12 / valeurActif) * 100).toFixed(1) : null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* ── 1. EN-TÊTE ÉPURÉ AVEC ACCÈS RAPIDE ── */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              background: isProjet ? '#2563eb' : color.bg || '#4f46e5',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              flexShrink: 0
            }}
          >
            {isProjet ? 'Projet' : color.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Aperçu express</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onEditBien && (
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => onEditBien(bien)}
              title="Modifier les données du logement"
            >
              <Icon name="edit" size={14} color="#64748b" />
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            title="Fermer cet aperçu"
          >
            <Icon name="close" size={16} color="#64748b" />
          </button>
        </div>
      </div>

      {/* ── 2. CONTENU DU VOLET (VISUALISATION LÉGÈRE & ACCESSIBLE) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* Photo & Nom du bien (Cliquable vers fiche complète) */}
        <div
          onClick={handleOpenFullProperty}
          style={{
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            background: '#f8fafc',
            cursor: 'pointer',
            position: 'relative',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          title="Cliquer pour ouvrir la fiche complète du logement"
        >
          <div style={{ height: 140, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {heroPhotoPreview ? (
              <img src={heroPhotoPreview} alt={bien.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <Icon name={isProjet ? "hardHat" : "house"} size={32} color="#94a3b8" />
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>Aucune photo</div>
              </div>
            )}
            
            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="externalLink" size={11} color="#ffffff" /> Voir la fiche
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: '#ffffff' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{bien.nom}</span>
              <span style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700 }}>→</span>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {bien.adresse || 'Adresse non renseignée'}
            </div>
          </div>
        </div>

        {/* BOUTON CLÉ : ACCÉDER À LA FICHE COMPLÈTE */}
        <button
          className="btn btn-primary"
          onClick={handleOpenFullProperty}
          style={{
            width: '100%',
            padding: '11px 16px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}
        >
          <Icon name="folderOpen" size={16} /> Ouvrir la fiche complète & gestion →
        </button>

        {/* Caractéristiques clés (Cliquables) */}
        <div
          onClick={handleOpenFullProperty}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            background: 'var(--color-surface-2)',
            padding: 10,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            cursor: 'pointer'
          }}
          title="Cliquer pour accéder aux détails"
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Surface</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>
              {bien.surface_m2 ? `${bien.surface_m2} m²` : '—'}
            </div>
          </div>

          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Type</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bien.type_bien || 'Logement'}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Valeur</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
              {valeurActif > 0 ? formatEuro(valeurActif) : '—'}
            </div>
          </div>
        </div>

        {/* SI PROJET : Avancement & Budget */}
        {isProjet && (
          <div
            onClick={handleOpenFullProperty}
            style={{
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: 12,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="hardHat" size={13} color="#2563eb" /> Avancement Travaux
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>
                {bien.pourcentage_avancement || 0}%
              </span>
            </div>
            
            <div style={{ height: 6, width: '100%', background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', width: `${bien.pourcentage_avancement || 0}%`, background: '#2563eb', borderRadius: 99 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Budget prévisionnel :</span>
              <strong style={{ color: '#0f172a' }}>{formatEuro(bien.budget_prevision || 0)}</strong>
            </div>
          </div>
        )}

        {/* SI LOCATION : Synthèse du Bail & Locataire */}
        {!isProjet && activeBail && (
          <div
            onClick={handleOpenFullProperty}
            style={{
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="userCheck" size={13} color="#16a34a" /> Locataire en place
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Depuis {formatDate(activeBail.date_debut)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>
                {activeBail.locataire_nom ? `${activeBail.locataire_prenom || ''} ${activeBail.locataire_nom}` : 'Locataire actif'}
              </strong>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>
                {formatEuro(loyerTotal)}<span style={{ fontSize: 10, fontWeight: 500 }}>/m CC</span>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
              <span>Loyer nu : {formatEuro(loyerNu)} • Charges : {formatEuro(charges)}</span>
              {rdtBrut && <span style={{ color: '#16a34a', fontWeight: 700 }}>Rendement : {rdtBrut}%</span>}
            </div>
          </div>
        )}

        {/* SI VACANT OU SANS BAIL */}
        {!isProjet && !activeBail && (
          <div
            onClick={handleOpenFullProperty}
            style={{
              background: '#fffbeb',
              borderRadius: 8,
              border: '1px solid #fef3c7',
              padding: 12,
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>Logement actuellement vacant</div>
            <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>Cliquez pour créer un nouveau bail ou ajouter un locataire</div>
          </div>
        )}

        {/* Accès rapide aux sections de gestion */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate && onNavigate('baux')}
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Icon name="fileText" size={12} color="#4f46e5" /> Gestion des Baux
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate && onNavigate('paiements')}
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Icon name="circleDollarSign" size={12} color="#16a34a" /> Loyers & Paiements
          </button>
        </div>

      </div>
    </div>
  )
}
