import React from 'react'
import Icon from '../../common/Icon'
import { SUBFOLDERS } from '../../../lib/utils'

export default function Step4Documents({
  uploadSubfolder,
  setUploadSubfolder,
  docType,
  setDocType,
  initialDocs,
  onPickDoc,
  onRemoveDoc
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="folder" size={15} color="#4f46e5" /> Classement initial des documents
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px 0' }}>
          Vous pouvez ajouter des diagnostics, actes notariés, plans ou contrats de bail dès maintenant.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Dossier de destination</label>
            <select
              className="form-control"
              value={uploadSubfolder}
              onChange={e => setUploadSubfolder(e.target.value)}
            >
              {SUBFOLDERS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Type de document</label>
            <select
              className="form-control"
              value={docType}
              onChange={e => setDocType(e.target.value)}
            >
              <option value="diagnostic">Diagnostic immobilier / DPE</option>
              <option value="acte_achat">Titre de propriété / Acte</option>
              <option value="plan">Plan / Devis / Travaux</option>
              <option value="assurance">Attestation d'assurance</option>
              <option value="bail">Contrat de bail existant</option>
              <option value="autre">Autre document</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPickDoc}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="upload" size={14} /> Sélectionner...
          </button>
        </div>
      </div>

      {/* Liste des documents prêts à être copiés */}
      <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
          Documents à copier dans le dossier ({initialDocs.length})
        </div>

        {initialDocs.length === 0 ? (
          <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
            Aucun document sélectionné pour le moment. Vous pourrez en déposer à tout moment dans l'explorateur du bien.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {initialDocs.map((doc, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: 6,
                  fontSize: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="fileText" size={14} color="#4f46e5" />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{doc.source_path.split(/[/\\]/).pop()}</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>→ {doc.subfolder}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveDoc(idx)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
