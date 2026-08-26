import Icon from '../common/Icon'
import React from 'react'
import SpreadsheetViewer from './SpreadsheetViewer'
import { formatBytes } from '../../lib/utils'

export function extractUrlFromContent(text) {
  if (!text) return ''
  const match = text.match(/URL=(https?:\/\/[^\s\r\n]+)/i)
  return match ? match[1] : ''
}

export default function DocumentPreviewer({
  selectedFile,
  previewData,
  excelPreview,
  loadingPreview,
  onOpenFile,
  onOpenExternalUrl,
  onToast
}) {
  if (!selectedFile) {
    return (
      <div className="preview-body">
        <div className="empty-state">
          <div className="empty-state-icon">  </div>
          <h3>Sélectionnez un dossier, fichier ou lien web</h3>
          <p>Glissez-déposez des images, ajoutez des liens web ou naviguez dans les dossiers.</p>
        </div>
      </div>
    )
  }

  if (loadingPreview) {
    return (
      <div className="preview-body">
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
          Chargement de l'aperçu...
        </div>
      </div>
    )
  }

  // Cas Lien Web (.url)
  if (selectedFile.name.toLowerCase().endsWith('.url')) {
    const urlFound = extractUrlFromContent(previewData?.text_content)
    return (
      <div className="preview-body">
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            margin: '24px auto',
            maxWidth: 600,
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }}></div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            {selectedFile.name.replace(/\.url$/i, '')}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Raccourci de lien Web enregistré
          </p>

          {urlFound ? (
            <>
              <div
                style={{
                  background: 'var(--color-surface)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  wordBreak: 'break-all',
                  marginBottom: 24,
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'left'
                }}
              >
                {urlFound}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onOpenExternalUrl(urlFound)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                   Ouvrir dans le navigateur
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(urlFound)
                    onToast('Adresse Web (URL) copiée !', 'info')
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Copier l'URL
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => onOpenFile(selectedFile.relative_path)}>
               Ouvrir le lien Web
            </button>
          )}
        </div>
      </div>
    )
  }

  // Cas Prévisualisation binaire ou texte
  if (previewData) {
    return (
      <div className="preview-body">
        {previewData.mime_type === 'application/pdf' && (
          <object
            data={`data:application/pdf;base64,${previewData.base64_data}#toolbar=1&navpanes=0`}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none', borderRadius: '8px', flex: 1, minHeight: '560px', width: '100%', height: '100%' }}
          >
            <iframe
              src={`data:application/pdf;base64,${previewData.base64_data}`}
              title={selectedFile.name}
              width="100%"
              height="100%"
              style={{ border: 'none', borderRadius: '8px', flex: 1, minHeight: '560px' }}
            />
          </object>
        )}

        {previewData.mime_type.startsWith('image/') && (
          <div style={{ overflow: 'auto', textAlign: 'center', maxHeight: '100%' }}>
            <img
              src={`data:${previewData.mime_type};base64,${previewData.base64_data}`}
              alt={selectedFile.name}
              style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow)' }}
            />
          </div>
        )}

        {previewData.mime_type.startsWith('text/') && (
          <pre
            style={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              background: 'var(--color-surface-2)',
              padding: 16,
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'var(--text-primary)'
            }}
          >
            {previewData.text_content || 'Fichier texte vide'}
          </pre>
        )}

        {!previewData.mime_type.startsWith('image/') &&
          !previewData.mime_type.startsWith('text/') &&
          previewData.mime_type !== 'application/pdf' && (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <h3>Aperçu non disponible pour ce type</h3>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onOpenFile(selectedFile.relative_path)}>
                 Ouvrir avec le programme par défaut
              </button>
            </div>
          )}
      </div>
    )
  }

  // Cas Prévisualisation Excel
  if (excelPreview) {
    return (
      <div className="preview-body">
        <SpreadsheetViewer
          filePath={selectedFile.relative_path}
          fileName={selectedFile.name}
          onOpenExternal={() => onOpenFile(selectedFile.relative_path)}
          onToast={onToast}
        />
      </div>
    )
  }

  return (
    <div className="preview-body">
      <div className="empty-state">
        <div className="empty-state-icon"><Icon name="alert" size={40} color="#f59e0b" /></div>
        <h3>Impossible de charger l'aperçu</h3>
        <button className="btn btn-secondary" onClick={() => onOpenFile(selectedFile.relative_path)}>
          Ouvrir avec le système
        </button>
      </div>
    </div>
  )
}
