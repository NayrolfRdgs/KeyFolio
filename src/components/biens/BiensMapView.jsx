import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from '../common/Icon'

// Helper pour déterminer la couleur du statut
export const getStatutColor = (statut) => {
  const s = String(statut || '').toLowerCase()
  if (s === 'projet') return { bg: '#2563eb', border: '#1d4ed8', label: 'Projet', textColor: '#ffffff' }
  if (s.includes('principale') || s.includes('secondaire') || s === 'en_cours' || s === 'loue' || s === 'actif') {
    return { bg: '#16a34a', border: '#15803d', label: 'Actif', textColor: '#ffffff' }
  }
  if (s === 'en_attente' || s === 'en_vente') {
    return { bg: '#d97706', border: '#b45309', label: 'En attente', textColor: '#ffffff' }
  }
  return { bg: '#64748b', border: '#475569', label: 'Inactif', textColor: '#ffffff' }
}

// Algorithme de clustering simple par distance géographique
function clusterBiens(biensWithCoords, zoom) {
  const radius = zoom >= 14 ? 0.005 : zoom >= 10 ? 0.08 : zoom >= 6 ? 0.8 : 3.0
  const clusters = []
  const visited = new Set()

  for (let i = 0; i < biensWithCoords.length; i++) {
    if (visited.has(i)) continue
    const b1 = biensWithCoords[i]
    const cluster = [b1]
    visited.add(i)

    for (let j = i + 1; j < biensWithCoords.length; j++) {
      if (visited.has(j)) continue
      const b2 = biensWithCoords[j]
      const dist = Math.sqrt(Math.pow(b1.latitude - b2.latitude, 2) + Math.pow(b1.longitude - b2.longitude, 2))
      if (dist < radius) {
        cluster.push(b2)
        visited.add(j)
      }
    }

    // Calcul du centre moyen du cluster
    const avgLat = cluster.reduce((sum, b) => sum + b.latitude, 0) / cluster.length
    const avgLon = cluster.reduce((sum, b) => sum + b.longitude, 0) / cluster.length

    // Statut dominant du cluster
    const hasProjet = cluster.some(b => String(b.statut).toLowerCase() === 'projet')
    const hasActif = cluster.some(b => {
      const s = String(b.statut).toLowerCase()
      return s === 'en_cours' || s === 'loue' || s.includes('principale') || s === 'actif'
    })
    const dominantStatut = hasProjet && !hasActif ? 'projet' : hasActif ? 'actif' : cluster[0].statut

    clusters.push({
      id: `cluster-${i}`,
      latitude: avgLat,
      longitude: avgLon,
      count: cluster.length,
      biens: cluster,
      dominantStatut
    })
  }

  return clusters
}

export default function BiensMapView({
  biens = [],
  selectedBienId,
  onSelectBien,
  isFullscreen,
  onToggleFullscreen,
  onMapInteract
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const onMapInteractRef = useRef(onMapInteract)
  const onSelectBienRef = useRef(onSelectBien)

  useEffect(() => {
    onMapInteractRef.current = onMapInteract
    onSelectBienRef.current = onSelectBien
  })

  // Filtrer les biens qui ont des coordonnées valides
  const biensWithCoords = biens.filter(b => b.latitude && b.longitude && !isNaN(b.latitude) && !isNaN(b.longitude))

  // Initialisation de la carte Leaflet (UNIQUE AU MONTAGE)
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return
    if (mapInstanceRef.current) return

    // Centre initial sur la France
    const initialLat = 46.603354
    const initialLon = 1.888334
    const initialZoom = 5

    const map = L.map(container, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    })

    // Fond de carte OpenStreetMap clair et épuré (CartoDB Positron / OSM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    // Layer group pour les marqueurs
    const markersLayer = L.layerGroup().addTo(map)
    markersLayerRef.current = markersLayer
    mapInstanceRef.current = map

    // ── GESTION ROBUSTE DU GLISSEMENT ET DU ZOOM PAR POINTER / MOUSE / WHEEL ──
    let isPointerDown = false
    let startX = 0
    let startY = 0

    const handlePointerDown = (e) => {
      // Ne pas déclencher sur les boutons ou marqueurs
      if (e.target.closest('.custom-map-marker') || e.target.closest('button')) return
      isPointerDown = true
      startX = e.clientX
      startY = e.clientY
    }

    const handlePointerMove = (e) => {
      if (!isPointerDown) return
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
      // Dès que l'utilisateur fait un glissement franc de plus de 90 pixels :
      if (dist >= 90) {
        isPointerDown = false // Ne déclenche qu'une seule fois par glissement
        if (onMapInteractRef.current) {
          onMapInteractRef.current()
        }
      }
    }

    const handlePointerUp = () => {
      isPointerDown = false
    }

    const handleWheel = (e) => {
      // Zoom molette
      if (Math.abs(e.deltaY) > 8) {
        if (onMapInteractRef.current) {
          onMapInteractRef.current()
        }
      }
    }

    container.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('wheel', handleWheel, { passive: true })

    // Nettoyage au démontage
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('wheel', handleWheel)
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Mise à jour des clusters et marqueurs
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersLayer = markersLayerRef.current
    if (!map || !markersLayer) return

    const updateClusters = () => {
      markersLayer.clearLayers()
      const zoom = map.getZoom()
      const clusters = clusterBiens(biensWithCoords, zoom)

      clusters.forEach(c => {
        const isSingle = c.count === 1
        const singleBien = isSingle ? c.biens[0] : null
        const isSelected = isSingle && singleBien && singleBien.id === selectedBienId
        const color = getStatutColor(c.dominantStatut)
        const isProjet = isSingle && String(singleBien.statut).toLowerCase() === 'projet'

        // SVG vectoriel pour le marqueur unique
        const svgIcon = isProjet
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6h0"/><path d="M14 6h0a6 6 0 0 1 6 6v3"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`

        // Création de l'icône HTML personnalisée
        const size = isSingle ? 32 : 36
        const html = `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${color.bg};
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: ${isSingle ? 12 : 13}px;
            font-weight: 800;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            cursor: pointer;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            ${isSelected ? 'transform: scale(1.25); border-color: #facc15; box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.4);' : ''}
          ">
            ${isSingle ? svgIcon : c.count}
          </div>
        `

        const customIcon = L.divIcon({
          html,
          className: 'custom-map-marker',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        })

        const marker = L.marker([c.latitude, c.longitude], { icon: customIcon })

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          if (isSingle) {
            if (onSelectBienRef.current) onSelectBienRef.current(singleBien)
          } else {
            // Zoomer sur le cluster pour éclater les marqueurs
            map.flyTo([c.latitude, c.longitude], Math.min(map.getZoom() + 3, 17), {
              duration: 0.8
            })
            // Ouvrir le 1er bien du cluster
            if (onSelectBienRef.current) onSelectBienRef.current(c.biens[0])
          }
        })

        // Tooltip au survol
        const tooltipContent = isSingle
          ? `<strong>${singleBien.nom}</strong><br/><span style="font-size:11px;color:#64748b;">${singleBien.adresse || ''}</span>`
          : `<strong>${c.count} logements dans cette zone</strong><br/><span style="font-size:11px;color:#2563eb;">Cliquer pour agrandir</span>`

        marker.bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -size / 2],
          opacity: 0.95
        })

        markersLayer.addLayer(marker)
      })
    }

    updateClusters()

    // Écouter les changements de zoom pour recalculer les clusters
    map.on('zoomend', updateClusters)

    return () => {
      map.off('zoomend', updateClusters)
    }
  }, [biensWithCoords, selectedBienId])

  // Centrer sur le bien sélectionné si changé (sans détruire la carte)
  const lastSelectedRef = useRef(null)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !selectedBienId) return

    // Éviter flyTo intempestif si c'est le même bien déjà centré
    if (lastSelectedRef.current === selectedBienId) return
    lastSelectedRef.current = selectedBienId

    const target = biensWithCoords.find(b => b.id === selectedBienId)
    if (target && target.latitude && target.longitude) {
      map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 13), {
        duration: 0.7
      })
    }
  }, [selectedBienId, biensWithCoords])

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: '#e2e8f0' }}>
      {/* Conteneur Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Bouton Plein Écran */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="btn btn-secondary btn-sm"
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            zIndex: 10,
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            padding: '6px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600
          }}
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        >
          <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={13} />
          <span>{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>
      )}

      {/* Contrôles de zoom flottants personnalisés */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}>
        <button
          onClick={handleZoomIn}
          style={{
            width: 32,
            height: 32,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            color: '#334155'
          }}
          title="Zoomer"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            width: 32,
            height: 32,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            color: '#334155'
          }}
          title="Dézoomer"
        >
          -
        </button>
      </div>

      {/* Légende rapide en bas */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.92)',
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
          <span>Actif</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
          <span>Projet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b' }} />
          <span>Inactif / Vacant</span>
        </div>
      </div>
    </div>
  )
}
