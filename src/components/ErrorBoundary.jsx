import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary Catch]', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          fontFamily: 'system-ui, sans-serif',
          background: '#0F172A',
          color: '#F8FAFC',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyInhalt: 'center'
        }}>
          <div style={{
            maxWidth: 600,
            background: '#1E293B',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid #334155'
          }}>
            <h2 style={{ color: '#EF4444', marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              ⚠️ Une erreur est survenue dans l'affichage
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 14 }}>
              L'application a rencontré une interruption inattendue. Vous pouvez recharger ou tenter de réinitialiser la vue.
            </p>
            {this.state.error && (
              <pre style={{
                background: '#0F172A',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                color: '#FCA5A5',
                overflowX: 'auto',
                border: '1px solid #991B1B'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#6366F1',
                  color: '#FFF',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 Recharger l'application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
