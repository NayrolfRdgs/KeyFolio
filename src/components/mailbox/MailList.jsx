import React from 'react'

export default function MailList({ emails, selectedMail, onSelectMail, loading, error, onSync }) {
  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
         Synchronisation des e-mails en cours...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 15 }}>
        <div className="alert alert-danger" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onSync}>
           Réessayer la synchronisation
        </button>
      </div>
    )
  }

  if (!emails || emails.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
         Aucun e-mail trouvé.
      </div>
    )
  }

  return (
    <div className="mail-list">
      {emails.map((mail) => {
        const isSelected = selectedMail?.uid === mail.uid
        return (
          <div
            key={mail.uid}
            className={`mail-item ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectMail(mail)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
              background: isSelected ? 'var(--bg-hover)' : 'transparent',
              transition: 'background 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="fw-600" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {mail.from}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {mail.date}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
              {mail.subject || '(Sans sujet)'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mail.body_text?.slice(0, 80)}...
            </div>
            {mail.attachments?.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-primary)' }}>
                 {mail.attachments.length} pièce{mail.attachments.length > 1 ? 's' : ''} jointe{mail.attachments.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
