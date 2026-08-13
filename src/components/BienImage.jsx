import React, { useState, useEffect } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { getFilePreview } from '../lib/db'

export default function BienImage({ src, alt, style, className, onClick }) {
  const [imgUrl, setImgUrl] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
    if (!src) {
      setImgUrl('')
      return
    }

    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      setImgUrl(src)
      return
    }

    let isMounted = true

    // 1. Essayer avec convertFileSrc
    try {
      const assetUrl = convertFileSrc(src)
      setImgUrl(assetUrl)
    } catch (e) {
      console.warn('convertFileSrc echoue, passage au base64 Rust', e)
    }

    // 2. Charger en secours via Rust (base64) pour garantir l'affichage même si convertFileSrc est bloqué
    getFilePreview(src)
      .then(res => {
        if (isMounted && res && res.base64_data) {
          const dataUrl = `data:${res.mime_type || 'image/jpeg'};base64,${res.base64_data}`
          setImgUrl(dataUrl)
        }
      })
      .catch(err => {
        console.error('Erreur de chargement image via backend Rust:', err)
        if (isMounted && !imgUrl) setError(true)
      })

    return () => {
      isMounted = false
    }
  }, [src])

  if (!imgUrl || error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          background: 'var(--color-surface-2)',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 600,
          userSelect: 'none',
          ...style
        }}
        className={className}
        onClick={onClick}
      >
        <span style={{ fontSize: 24, opacity: 0.6 }}>📸</span>
      </div>
    )
  }

  return (
    <img
      src={imgUrl}
      alt={alt || 'Photo'}
      style={style}
      className={className}
      onClick={onClick}
      onError={() => {
        if (src && !imgUrl.startsWith('data:')) {
          getFilePreview(src)
            .then(res => {
              if (res && res.base64_data) {
                setImgUrl(`data:${res.mime_type || 'image/jpeg'};base64,${res.base64_data}`)
              } else {
                setError(true)
              }
            })
            .catch(() => setError(true))
        } else {
          setError(true)
        }
      }}
    />
  )
}
