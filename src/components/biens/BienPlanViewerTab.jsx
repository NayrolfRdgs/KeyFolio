import React, { useState, useEffect } from 'react'
import { listBienFiles, getFilePreview, copyFileToBien, openFilePath } from '../../lib/db'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../common/Icon'

export default function BienPlanViewerTab({ bien }) {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const loadPlans = async () => {
    if (!bien?.id) return
    setLoading(true)
    try {
      const allFiles = await listBienFiles(bien.id)
      // Filtrer les fichiers dans le dossier Plans ou contenant "plan" dans le nom
      const planFiles = allFiles.filter(f =>
        f.subfolder.toLowerCase().includes('plan') ||
        f.relative_path.toLowerCase().includes('plans') ||
        f.filename.toLowerCase().includes('plan')
      )
      setPlans(planFiles)
      if (planFiles.length > 0) {
        setSelectedPlan(planFiles[0])
      } else {
        setSelectedPlan(null)
      }
    } catch (err) {
      console.warn('Erreur chargement plans :', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [bien?.id])

  useEffect(() => {
    if (!selectedPlan) {
      setPreviewData(null)
      return
    }

    getFilePreview(selectedPlan.relative_path || selectedPlan.absolute_path)
      .then(data => {
        setPreviewData(data)
        setZoom(1)
        setPan({ x: 0, y: 0 })
      })
      .catch(() => setPreviewData(null))
  }, [selectedPlan])

  const handleAddPlan = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner un plan d\'architecte ou plan de masse (PDF / Image)',
        filters: [{ name: 'Plans & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'svg', 'webp'] }]
      })

      if (selected && bien?.id) {
        await copyFileToBien({
          bienId: bien.id,
          subfolder: '00_ACHAT-VENTE/Plans',
          sourcePath: selected,
          typeDoc: 'vente',
          notes: 'Plan d\'architecte'
        })
        await loadPlans()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5))
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header avec sélecteur de plans et bouton d'ajout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '75%' }}>
          {plans.map(p => {
            const isSel = selectedPlan?.relative_path === p.relative_path
            return (
              <button
                key={p.relative_path}
                className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setSelectedPlan(p)}
              >
                <Icon name="plan" size={13} color={isSel ? '#ffffff' : 'currentColor'} />
                {p.filename}
              </button>
            )
          })}
          {plans.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun plan dans 00_ACHAT-VENTE/Plans</span>
          )}
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleAddPlan} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={13} /> Ajouter un plan
        </button>
      </div>

      {/* Zone de visualisation interactive avec Pan & Zoom */}
      <div
        style={{
          flex: 1,
          minHeight: 380,
          background: '#0f172a',
          borderRadius: 8,
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {selectedPlan && previewData ? (
          previewData.mime_type === 'application/pdf' ? (
            <object
              data={`data:application/pdf;base64,${previewData.base64_data}#toolbar=1&navpanes=0`}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none', width: '100%', height: '100%' }}
            >
              <iframe
                src={`data:application/pdf;base64,${previewData.base64_data}`}
                title={selectedPlan.filename}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </object>
          ) : (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: '90%',
                maxHeight: '90%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={`data:${previewData.mime_type};base64,${previewData.base64_data}`}
                alt={selectedPlan.filename}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <Icon name="plan" size={36} color="#94a3b8" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun plan sélectionné</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Ajoutez vos plans de masse, coupes et plans d'architecte dans le dossier du bien
            </div>
          </div>
        )}

        {/* Contrôles de zoom flottants */}
        {selectedPlan && previewData && previewData.mime_type !== 'application/pdf' && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            borderRadius: 8,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 10
          }}>
            <button className="btn btn-ghost btn-sm" style={{ color: '#fff', padding: '2px 6px', fontSize: 14 }} onClick={handleZoomOut}>
              <Icon name="zoomOut" size={14} color="#ffffff" />
            </button>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn btn-ghost btn-sm" style={{ color: '#fff', padding: '2px 6px', fontSize: 14 }} onClick={handleZoomIn}>
              <Icon name="zoomIn" size={14} color="#ffffff" />
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: '#94a3b8', fontSize: 11, marginLeft: 4 }} onClick={handleResetZoom}>
              <Icon name="reset" size={13} color="#94a3b8" />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#38bdf8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => openFilePath(selectedPlan.relative_path || selectedPlan.absolute_path)}
            >
              <Icon name="externalLink" size={13} color="#38bdf8" /> Ouvrir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
