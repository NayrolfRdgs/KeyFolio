import React from 'react'

export default function MailDetail({
  mail,
  onSaveAttachment,
  onCreateTicket,
  dispatchMsg,
  savingAttachmentMsg
}) {
  if (!mail) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
         Sélectionnez un e-mail à gauche pour consulter son contenu.
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ borderBottom: '1px solid var(--border-color)', pb: 15, marginBottom: 15 }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: 18 }}>{mail.subject || '(Sans sujet)'}</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>De : <strong>{mail.from}</strong></span>
          <span>{mail.date}</span>
        </div>
      </div>

      {dispatchMsg && <div className="alert alert-success">{dispatchMsg}</div>}
      {savingAttachmentMsg && <div className="alert alert-info">{savingAttachmentMsg}</div>}

      <div
        className="mail-body-content"
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          marginBottom: 20,
          background: 'var(--bg-card)',
          padding: 15,
          borderRadius: 8,
          border: '1px solid var(--border-color)'
        }}
      >
        {mail.body_text || mail.body_html || '(Contenu vide)'}
      </div>

      {/* Actions rapides */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onCreateTicket(mail)}
        >
           Transformer en ticket de maintenance
        </button>
      </div>

      {/* Pièces jointes */}
      {mail.attachments && mail.attachments.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', pt: 15 }}>
          <h4 style={{ fontSize: 14, margin: '0 0 10px 0' }}> Pièces jointes ({mail.attachments.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mail.attachments.map((att, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: 13 }}>
                   <strong>{att.filename}</strong> <span className="text-muted">({Math.round(att.size_bytes / 1024)} ko)</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onSaveAttachment(att)}
                >
                   Classer dans le bien
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
