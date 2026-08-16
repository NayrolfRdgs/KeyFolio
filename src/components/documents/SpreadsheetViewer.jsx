import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { readExcelSheet, saveExcelFile, openFilePath } from '../../lib/db'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert column index to letter (0 → A, 25 → Z, 26 → AA, etc.)
const colToLetter = (col) => {
  let result = ''
  let c = col
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result
    c = Math.floor(c / 26) - 1
  }
  return result
}

// ─── SpreadsheetViewer Component ──────────────────────────────────────────────
export default function SpreadsheetViewer({ filePath, fileName, onOpenExternal, onToast }) {
  const [sheetsData, setSheetsData] = useState({})     // { sheetName: rows[][] }
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Cell selection & editing
  const [selectedCell, setSelectedCell] = useState(null) // { row, col }
  const [editingCell, setEditingCell] = useState(null)   // { row, col }
  const [editValue, setEditValue] = useState('')
  const [modifications, setModifications] = useState({}) // { "sheetName:row:col": newValue }

  // Resizable columns
  const [colWidths, setColWidths] = useState({})
  const resizingRef = useRef(null)

  const editInputRef = useRef(null)
  const gridRef = useRef(null)

  // Load sheet data
  const loadSheet = useCallback(async (sheetName) => {
    if (sheetsData[sheetName]) {
      setActiveSheet(sheetName)
      return
    }
    try {
      const result = await readExcelSheet(filePath, sheetName)
      setSheetsData(prev => ({ ...prev, [result.sheet_name]: result.rows }))
      setSheetNames(result.sheet_names)
      setActiveSheet(result.sheet_name)
    } catch (err) {
      setError(err?.toString())
    }
  }, [filePath, sheetsData])

  // Initial load
  useEffect(() => {
    setLoading(true)
    setError(null)
    setSheetsData({})
    setModifications({})
    setSelectedCell(null)
    setEditingCell(null)
    setColWidths({})

    const load = async () => {
      try {
        const result = await readExcelSheet(filePath, '')
        setSheetsData({ [result.sheet_name]: result.rows })
        setSheetNames(result.sheet_names)
        setActiveSheet(result.sheet_name)
      } catch (err) {
        setError(err?.toString())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filePath])

  // Get current rows with modifications applied
  const currentRows = useMemo(() => {
    const original = sheetsData[activeSheet] || []
    return original.map((row, rIdx) =>
      row.map((cell, cIdx) => {
        const key = `${activeSheet}:${rIdx}:${cIdx}`
        return modifications[key] !== undefined ? modifications[key] : cell
      })
    )
  }, [sheetsData, activeSheet, modifications])

  const modCount = Object.keys(modifications).length

  // Max columns across all rows
  const maxCols = useMemo(() => {
    return currentRows.reduce((max, row) => Math.max(max, row.length), 0)
  }, [currentRows])

  // ─── Cell Actions ─────────────────────────────────────────────

  const handleCellClick = useCallback((row, col) => {
    // If currently editing a different cell, commit the edit first
    if (editingCell && (editingCell.row !== row || editingCell.col !== col)) {
      commitEdit()
    }
    setSelectedCell({ row, col })
    setEditingCell(null)
  }, [editingCell])

  const handleCellDoubleClick = useCallback((row, col) => {
    const value = currentRows[row]?.[col] || ''
    setEditingCell({ row, col })
    setEditValue(value)
    setSelectedCell({ row, col })
    // Focus the input after render
    setTimeout(() => editInputRef.current?.focus(), 0)
  }, [currentRows])

  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const { row, col } = editingCell
    const originalValue = (sheetsData[activeSheet] || [])[row]?.[col] || ''
    const key = `${activeSheet}:${row}:${col}`

    if (editValue !== originalValue) {
      setModifications(prev => ({ ...prev, [key]: editValue }))
    } else {
      // Remove modification if reverted to original
      setModifications(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    setEditingCell(null)
  }, [editingCell, editValue, activeSheet, sheetsData])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  // ─── Keyboard Navigation ──────────────────────────────────────

  const handleKeyDown = useCallback((e) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitEdit()
        // Move down
        if (selectedCell && selectedCell.row < currentRows.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        commitEdit()
        // Move right
        if (selectedCell && selectedCell.col < maxCols - 1) {
          setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 })
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
      }
      return
    }

    if (!selectedCell) return

    const { row, col } = selectedCell
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (row > 0) setSelectedCell({ row: row - 1, col })
        break
      case 'ArrowDown':
        e.preventDefault()
        if (row < currentRows.length - 1) setSelectedCell({ row: row + 1, col })
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (col > 0) setSelectedCell({ row, col: col - 1 })
        break
      case 'ArrowRight':
        e.preventDefault()
        if (col < maxCols - 1) setSelectedCell({ row, col: col + 1 })
        break
      case 'Enter':
      case 'F2':
        e.preventDefault()
        handleCellDoubleClick(row, col)
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        {
          const key = `${activeSheet}:${row}:${col}`
          const originalValue = (sheetsData[activeSheet] || [])[row]?.[col] || ''
          if (originalValue !== '') {
            setModifications(prev => ({ ...prev, [key]: '' }))
          }
        }
        break
      default:
        // Start typing directly into a cell
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          setEditingCell({ row, col })
          setEditValue(e.key)
          setTimeout(() => editInputRef.current?.focus(), 0)
        }
    }
  }, [selectedCell, editingCell, currentRows, maxCols, activeSheet, sheetsData, commitEdit, cancelEdit, handleCellDoubleClick])

  // ─── Column Resizing ──────────────────────────────────────────

  const handleResizeStart = useCallback((e, colIdx) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colIdx] || 100

    const handleMouseMove = (moveE) => {
      const diff = moveE.clientX - startX
      const newWidth = Math.max(40, startWidth + diff)
      setColWidths(prev => ({ ...prev, [colIdx]: newWidth }))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      resizingRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    resizingRef.current = colIdx
  }, [colWidths])

  // ─── Save ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (modCount === 0) return
    setSaving(true)
    try {
      // Build complete sheets data with modifications applied
      const allSheetsData = []
      for (const sheetName of sheetNames) {
        const originalRows = sheetsData[sheetName] || []
        const modifiedRows = originalRows.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const key = `${sheetName}:${rIdx}:${cIdx}`
            return modifications[key] !== undefined ? modifications[key] : cell
          })
        )
        allSheetsData.push({ sheet_name: sheetName, rows: modifiedRows })
      }

      await saveExcelFile(filePath, allSheetsData)
      setModifications({})

      // Reload sheet data
      const result = await readExcelSheet(filePath, activeSheet)
      setSheetsData(prev => ({ ...prev, [result.sheet_name]: result.rows }))

      if (onToast) onToast(`✅ ${modCount} modification(s) sauvegardée(s)`, 'success')
    } catch (err) {
      if (onToast) onToast(`❌ Erreur sauvegarde: ${err}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [modifications, modCount, sheetsData, sheetNames, filePath, activeSheet, onToast])

  // ─── Formula bar display ──────────────────────────────────────

  const cellRef = selectedCell ? `${colToLetter(selectedCell.col)}${selectedCell.row + 1}` : ''
  const cellContent = selectedCell ? (currentRows[selectedCell.row]?.[selectedCell.col] || '') : ''

  // ─── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="spreadsheet-container">
        <div className="spreadsheet-loading">
          <div style={{ fontSize: 36 }}>📊</div>
          <div>Chargement du tableur...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="spreadsheet-container">
        <div className="spreadsheet-error">
          <div style={{ fontSize: 36 }}>⚠️</div>
          <div>Erreur: {error}</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onOpenExternal?.()}>
            ↗️ Ouvrir avec le programme par défaut
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="spreadsheet-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ── Toolbar ── */}
      <div className="spreadsheet-toolbar">
        <div className="spreadsheet-toolbar-left">
          <span className="spreadsheet-file-icon">📊</span>
          <span className="spreadsheet-file-name">{fileName}</span>
          {modCount > 0 && (
            <span className="spreadsheet-mod-badge">
              {modCount} modification{modCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="spreadsheet-toolbar-right">
          {modCount > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
              title="Sauvegarder les modifications (⚠️ les formules et mise en forme avancée seront perdues)"
            >
              {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenExternal?.()}
            title="Ouvrir dans LibreOffice / Excel"
          >
            ↗️ Ouvrir externe
          </button>
        </div>
      </div>

      {/* ── Save Warning ── */}
      {modCount > 0 && (
        <div className="spreadsheet-save-warning">
          ⚠️ La sauvegarde réécrira le fichier. Les formules, graphiques et mise en forme avancée seront perdus.
          Pour conserver le formatage, utilisez « Ouvrir externe ».
        </div>
      )}

      {/* ── Formula Bar ── */}
      <div className="spreadsheet-formula-bar">
        <div className="spreadsheet-cell-ref">{cellRef || '—'}</div>
        <div className="spreadsheet-cell-value-display">
          {editingCell ? (
            <input
              ref={editInputRef}
              className="spreadsheet-formula-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { commitEdit(); e.preventDefault() }
                if (e.key === 'Escape') { cancelEdit(); e.preventDefault() }
              }}
              onBlur={commitEdit}
            />
          ) : (
            <span className="spreadsheet-formula-text">{cellContent}</span>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="spreadsheet-grid-wrapper" ref={gridRef}>
        <table className="spreadsheet-grid">
          <thead>
            <tr>
              {/* Row number header */}
              <th className="spreadsheet-corner-cell"></th>
              {/* Column headers */}
              {Array.from({ length: maxCols }, (_, colIdx) => (
                <th
                  key={colIdx}
                  className={`spreadsheet-col-header ${selectedCell?.col === colIdx ? 'highlighted' : ''}`}
                  style={{ width: colWidths[colIdx] || 100, minWidth: 40 }}
                >
                  <span>{colToLetter(colIdx)}</span>
                  <div
                    className="spreadsheet-col-resizer"
                    onMouseDown={(e) => handleResizeStart(e, colIdx)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {/* Row number */}
                <td className={`spreadsheet-row-header ${selectedCell?.row === rowIdx ? 'highlighted' : ''}`}>
                  {rowIdx + 1}
                </td>
                {/* Cells */}
                {Array.from({ length: maxCols }, (_, colIdx) => {
                  const value = row[colIdx] || ''
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx
                  const modKey = `${activeSheet}:${rowIdx}:${colIdx}`
                  const isModified = modifications[modKey] !== undefined
                  const isHeader = rowIdx === 0

                  return (
                    <td
                      key={colIdx}
                      className={[
                        'spreadsheet-cell',
                        isSelected ? 'selected' : '',
                        isEditing ? 'editing' : '',
                        isModified ? 'modified' : '',
                        isHeader ? 'header-row' : '',
                      ].filter(Boolean).join(' ')}
                      style={{ width: colWidths[colIdx] || 100 }}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                    >
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          className="spreadsheet-cell-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); if (rowIdx < currentRows.length - 1) setSelectedCell({ row: rowIdx + 1, col: colIdx }) }
                            if (e.key === 'Tab') { e.preventDefault(); commitEdit(); if (colIdx < maxCols - 1) setSelectedCell({ row: rowIdx, col: colIdx + 1 }) }
                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                          }}
                          onBlur={commitEdit}
                          autoFocus
                        />
                      ) : (
                        <span className="spreadsheet-cell-text">{value}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Sheet Tabs ── */}
      <div className="spreadsheet-sheet-tabs">
        {sheetNames.map(name => (
          <button
            key={name}
            className={`spreadsheet-sheet-tab ${name === activeSheet ? 'active' : ''}`}
            onClick={() => loadSheet(name)}
          >
            {name}
          </button>
        ))}
        <div className="spreadsheet-status-bar">
          {currentRows.length} ligne{currentRows.length !== 1 ? 's' : ''} × {maxCols} colonne{maxCols !== 1 ? 's' : ''}
          {modCount > 0 && <span> • {modCount} cellule{modCount > 1 ? 's' : ''} modifiée{modCount > 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  )
}
