import React, { useState, useEffect } from 'react'
import { Save, Maximize2, Minimize2, GitMerge, FileSpreadsheet } from 'lucide-react'
import './SpreadsheetView.css'

interface SpreadsheetViewProps {
  data: any[][]
  columns: string[]
  zoom: number
  sheetName: string
  showFileManagement?: () => void
  onSaveToFile?: () => void
  rowColors?: { [key: number]: string }
  rowTextColors?: { [key: number]: string }
  duplicateProducts?: { [key: number]: string }
  checkedRows?: { [key: number]: boolean }
  onDataChange?: (rowIndex: number, colIndex: number, value: any) => void
  onSave?: (data: any[][]) => void
  onCheckRow?: (rowIndex: number, checked: boolean) => void
  onToggleAll?: (data: any[][], checked: boolean) => void
  enableCheckboxes?: boolean
  onSendToPayment?: () => void
  onSendToOrder?: () => void
  onUndoDelete?: () => void
  hasBackup?: boolean
  isEditSheet?: boolean
  onClientNameClick?: (companyName: string) => void
}

interface MergedCell {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  value: any
}

// Fixed format for A1-W4 area
const FIXED_FORMAT = {
  // Row 1 merged cells
  mergedCells: [
    { startRow: 0, startCol: 0, endRow: 0, endCol: 7, value: '' }, // A1-H1
    { startRow: 0, startCol: 8, endRow: 0, endCol: 10, value: '발주' }, // I1-K1
    { startRow: 0, startCol: 11, endRow: 0, endCol: 13, value: '장끼' }, // L1-N1
    { startRow: 0, startCol: 14, endRow: 0, endCol: 15, value: '입고/차이' }, // O1-P1
    { startRow: 0, startCol: 16, endRow: 0, endCol: 22, value: '삼촌 코멘트' }, // Q1-W1
  ],
  // Row 2 is header row with actual column names (preserved from data)
  // Row 3 (index 2) is SUM row
  sumRow: 2,
  // Row 4 (index 3) is separator row
  separatorRow: 3,
  // Column colors
  janggiColumns: [11, 12, 13], // L, M, N
  ipgoColumns: [14, 15], // O, P
}

function SpreadsheetView({ data, columns, zoom, sheetName, showFileManagement, onSaveToFile, rowColors, rowTextColors, duplicateProducts, checkedRows, onDataChange, onSave, onCheckRow, onSendToPayment, onSendToOrder, onUndoDelete, hasBackup, isEditSheet, onClientNameClick }: SpreadsheetViewProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [localData, setLocalData] = useState<any[][]>(data)
  const [hasChanges, setHasChanges] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [mergedCells, setMergedCells] = useState<MergedCell[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null)
  const [currentCell, setCurrentCell] = useState<{ row: number; col: number } | null>(null)
  const [columnWidths, setColumnWidths] = useState<{ [key: number]: number }>({})

  // 노란색 3행(index 2)의 합계를 자동으로 계산하는 함수
  // 입금관리 페이지에서는 백엔드에서 계산된 합계를 사용
  const calculateSumRow = (dataToProcess: any[][]) => {
    // 입금관리 시트인 경우 백엔드 데이터 그대로 사용
    if (sheetName && sheetName.includes('입금관리')) {
      // 백엔드에서 이미 계산된 합계가 있으므로 그대로 반환
      return dataToProcess
    }

    // 다른 시트의 경우 프론트엔드에서 계산
    if (dataToProcess.length <= 4) return dataToProcess

    const sumColumns = [8, 9, 10, 11, 12, 13, 14, 18, 19, 20]  // I,J,K,L,M,N,O,S,T,U
    const sumRowIndex = 2  // Yellow row 3 (0-indexed)

    // 각 합계 컬럼에 대해 계산
    sumColumns.forEach(colIdx => {
      let total = 0
      // 5행(index 4)부터 끝까지 합계 계산
      for (let rowIdx = 4; rowIdx < dataToProcess.length; rowIdx++) {
        const cellValue = dataToProcess[rowIdx][colIdx]
        if (cellValue != null && cellValue !== '') {
          try {
            const numValue = typeof cellValue === 'string'
              ? parseFloat(cellValue.replace(/,/g, ''))
              : parseFloat(cellValue)
            if (!isNaN(numValue)) {
              total += numValue
            }
          } catch (e) {
            // Skip non-numeric values
          }
        }
      }
      // 합계를 노란색 3행에 설정
      dataToProcess[sumRowIndex][colIdx] = total
    })

    return dataToProcess
  }

  // Debug logging
  useEffect(() => {
    console.log('SpreadsheetView Rendered. Sheet:', sheetName)
    console.log('Data prop length:', data.length)
    console.log('RowColors prop length:', Object.keys(rowColors || {}).length)
  })

  useEffect(() => {
    console.log('SpreadsheetView: data prop changed')
    // Create a deep copy of the data
    let newData = data.map(row => [...row])

    // 노란색 3행의 합계를 자동으로 계산
    newData = calculateSumRow(newData)
    console.log('Row 3 sum calculated from rows 5 onwards')

    setLocalData(newData)
    setHasChanges(false)

    // Always use fixed format for merged cells
    setMergedCells([...FIXED_FORMAT.mergedCells])
  }, [data])

  // Global mouse event handlers for smooth drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false)
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSelecting) {
        // Prevent text selection during drag
        e.preventDefault()
      }
    }

    // Add global event listeners
    document.addEventListener('mouseup', handleGlobalMouseUp as EventListener)
    document.addEventListener('mousemove', handleGlobalMouseMove as EventListener)
    document.addEventListener('selectstart', handleGlobalMouseMove as EventListener)

    // Cleanup
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp as EventListener)
      document.removeEventListener('mousemove', handleGlobalMouseMove as EventListener)
      document.removeEventListener('selectstart', handleGlobalMouseMove as EventListener)
    }
  }, [isSelecting])

  // Handle paste event for Excel data
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only handle paste if we're not in editing mode
      if (editingCell) return

      e.preventDefault()

      // Get clipboard data
      const clipboardData = e.clipboardData
      if (!clipboardData) return

      // Try to get HTML data first (better for Excel)
      let text = clipboardData.getData('text/html')

      // If no HTML, fall back to plain text
      if (!text) {
        text = clipboardData.getData('text/plain')
      }

      // Parse the data
      let rows: string[][] = []

      if (text.includes('<table')) {
        // Parse HTML table data (from Excel)
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'text/html')
        const tableRows = doc.querySelectorAll('tr')

        tableRows.forEach(tr => {
          const cells: string[] = []
          const tds = tr.querySelectorAll('td, th')
          tds.forEach(td => {
            cells.push(td.textContent?.trim() || '')
          })
          if (cells.length > 0) {
            rows.push(cells)
          }
        })
      } else {
        // Parse plain text (TSV format)
        const lines = text.split(/\r?\n/)
        rows = lines.map(line => line.split('\t'))
      }

      // Remove empty last row if exists
      if (rows.length > 0 && rows[rows.length - 1].every(cell => !cell)) {
        rows.pop()
      }

      if (rows.length === 0) return

      // Determine paste start position
      let startRow = currentCell?.row ?? 0
      let startCol = currentCell?.col ?? 0

      // If we have a selection, use the top-left corner of the selection
      if (selectedCells.size > 0) {
        const selectedPositions = Array.from(selectedCells).map(key => {
          const [row, col] = key.split('-').map(Number)
          return { row, col }
        })
        startRow = Math.min(...selectedPositions.map(p => p.row))
        startCol = Math.min(...selectedPositions.map(p => p.col))
      }

      // Create a copy of local data
      const newData = localData.map(row => [...row])
      const colCount = Math.max(
        columns.length || 0,
        newData[0]?.length || 0,
        rows[0]?.length || 0,
        startCol + (rows[0]?.length || 0),
        23
      )

      // Ensure all existing rows have the same column length
      for (let i = 0; i < newData.length; i++) {
        if (newData[i].length < colCount) {
          const filled = new Array(colCount).fill('')
          newData[i].forEach((cell, idx) => {
            filled[idx] = cell
          })
          newData[i] = filled
        }
      }

      // Ensure we have enough rows
      while (newData.length < startRow + rows.length) {
        newData.push(new Array(colCount).fill(''))
      }

      // Paste the data
      rows.forEach((row, rowOffset) => {
        const targetRow = startRow + rowOffset
        if (targetRow < newData.length) {
          if (newData[targetRow].length < colCount) {
            const filled = new Array(colCount).fill('')
            newData[targetRow].forEach((cell, idx) => {
              filled[idx] = cell
            })
            newData[targetRow] = filled
          }
          row.forEach((cell, colOffset) => {
            const targetCol = startCol + colOffset
            if (targetCol < colCount) {
              newData[targetRow][targetCol] = cell
            }
          })
        }
      })

      // Update the data
      setLocalData(newData)
      setHasChanges(true)

      // Notify parent of changes if callback exists
      if (onSave) {
        onSave(newData)
      }

      console.log(`Pasted ${rows.length} rows × ${rows[0]?.length || 0} columns starting at row ${startRow + 1}, col ${startCol + 1}`)
    }

    // Add event listener
    document.addEventListener('paste', handlePaste)

    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [editingCell, currentCell, selectedCells, localData, columns.length, onSave])

  // Check if data exists
  if (!localData || localData.length === 0) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">데이터가 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">시트: {sheetName}</p>
        </div>
      </div>
    )
  }

  // Generate Excel-style column headers (A, B, C, ..., W)
  const headers = Array.from({ length: 23 }, (_, i) => String.fromCharCode(65 + i))

  // Format numbers with thousand separators (preserve text for specific columns)
  const formatNumber = (value: any, colIndex?: number): string => {
    if (value === null || value === undefined || value === '') return ''

    // C (2), D (3), F (5) columns: phone numbers and product names - keep as text
    // Q (16) and R (17) columns: comments - keep as text
    // V (21) column: date (MM/DD format) - keep as text
    if (colIndex === 2 || colIndex === 3 || colIndex === 5 || colIndex === 16 || colIndex === 17 || colIndex === 21) {
      return String(value)
    }

    // Check if it's a number or numeric string
    const num = typeof value === 'number' ? value : parseFloat(value)
    if (!isNaN(num)) {
      // Add thousand separators
      return num.toLocaleString('ko-KR')
    }
    return String(value)
  }

  // Calculate column sum for numeric columns
  const calculateColumnSum = (colIndex: number): number => {
    let sum = 0
    let validValues = []
    let allRowValues = [] // Debug: track all values including empty ones

    // Start from row 5 (index 4) to skip headers and sum row itself
    for (let i = 4; i < localData.length; i++) {
      const value = localData[i]?.[colIndex]
      allRowValues.push({ row: i + 1, value: value }) // Debug: track all rows

      // Treat empty, null, or undefined as 0 (don't skip, just use 0)
      if (value === null || value === undefined || value === '') {
        // Empty cells are 0, not skipped
        continue
      }

      let numValue = 0
      // If it's already a number, use it directly
      if (typeof value === 'number') {
        numValue = value
      } else {
        // Convert to string and remove commas and any spaces before parsing
        const strValue = String(value).replace(/,/g, '').trim()
        // Check if it's a valid number
        if (strValue !== '') {
          const num = parseFloat(strValue)
          if (!isNaN(num)) {
            numValue = num
          }
        }
      }

      if (numValue !== 0) {
        validValues.push({ row: i + 1, value: numValue })
        sum += numValue
      }
    }

    // Enhanced debug logging for columns I, J, K
    if (colIndex === 8 || colIndex === 9 || colIndex === 10) {
      const columnName = String.fromCharCode(65 + colIndex) // Convert to letter
      console.log(`Column ${columnName} (index ${colIndex}) calculation:`)
      console.log('All row values:', allRowValues)
      console.log('Valid numeric values:', validValues)
      console.log('Calculated sum:', sum)
      console.log('---')
    }

    return sum
  }

  // Count non-empty text cells for Q and R columns
  const countTextCells = (colIndex: number): number => {
    let count = 0
    // Start from row 5 (index 4) to skip headers and count row itself
    for (let i = 4; i < localData.length; i++) {
      const value = localData[i]?.[colIndex]
      // Count if cell has any non-empty text
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        count++
      }
    }
    return count
  }

  // Calculate statistics for selected cells
  const calculateSelectionStats = () => {
    let sum = 0
    let count = 0
    let numericCount = 0
    let average = 0

    selectedCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number)
      if (row < localData.length && col < localData[row].length) {
        count++
        const value = localData[row][col]

        // Skip empty, null, or undefined values
        if (value === null || value === undefined || value === '') {
          // Don't count empty cells as numeric
        } else if (typeof value === 'number') {
          sum += value
          numericCount++
        } else {
          // Convert to string and remove commas before parsing
          const strValue = String(value).replace(/,/g, '')
          const num = parseFloat(strValue)
          if (!isNaN(num)) {
            sum += num
            numericCount++
          }
        }
      }
    })

    if (numericCount > 0) {
      average = sum / numericCount
    }

    return { sum, count, numericCount, average }
  }

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setEditingCell({ row: rowIndex, col: colIndex })
    setEditValue(localData[rowIndex][colIndex]?.toString() || '')
    setSelectedCells(new Set()) // Clear selection when editing
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter' && editingCell?.row === rowIndex && editingCell?.col === colIndex) {
      handleCellBlur(rowIndex, colIndex)
    }
    if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleCellBlur = (rowIndex: number, colIndex: number) => {
    // Update local data
    let newData = [...localData.map(row => [...row])]

    // Convert to appropriate type
    let newValue: any = editValue
    // Check if column is numeric (columns 7-22 are typically numeric)
    if (colIndex >= 7 && colIndex <= 22 && editValue !== '') {
      const sanitized = editValue.replace(/,/g, '')
      const numValue = parseFloat(sanitized)
      if (!isNaN(numValue)) {
        newValue = numValue
      }
    }

    newData[rowIndex][colIndex] = newValue || null

    // 합계 컬럼(I,J,K,L,M,N,O,S,T,U)이 변경되었다면 노란색 3행의 합계를 재계산
    const sumColumns = [8, 9, 10, 11, 12, 13, 14, 18, 19, 20]
    if (rowIndex >= 4 && sumColumns.includes(colIndex)) {
      newData = calculateSumRow(newData)
      console.log(`Cell changed at row ${rowIndex + 1}, col ${colIndex} - sum recalculated`)
    }

    setLocalData(newData)
    setHasChanges(true)

    // Call parent callback if provided
    if (onDataChange) {
      onDataChange(rowIndex, colIndex, newValue)
    }

    setEditingCell(null)
    setEditValue('')
  }

  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(localData)
      setHasChanges(false)
    }
  }

  // Handle column header double click to auto-resize
  const handleColumnHeaderDoubleClick = (colIndex: number) => {
    // Calculate the maximum content width for this column
    let maxWidth = 80 // minimum width

    localData.forEach((row, rowIndex) => {
      const cellValue = String(row[colIndex] || '')
      // Estimate width: ~8px per character
      const estimatedWidth = cellValue.length * 8 + 16 // +16 for padding
      if (estimatedWidth > maxWidth) {
        maxWidth = estimatedWidth
      }
    })

    // Cap at reasonable maximum
    maxWidth = Math.min(maxWidth, 400)

    setColumnWidths(prev => ({
      ...prev,
      [colIndex]: maxWidth
    }))
  }

  // Cell selection for merging
  const handleCellMouseDown = (row: number, col: number) => {
    // Set current cell for keyboard navigation
    setCurrentCell({ row, col })

    // Start selection
    setIsSelecting(true)
    setSelectionStart({ row, col })
    setSelectedCells(new Set([`${row}-${col}`]))
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectionStart) {
      const newSelection = new Set<string>()
      const minRow = Math.min(selectionStart.row, row)
      const maxRow = Math.max(selectionStart.row, row)
      const minCol = Math.min(selectionStart.col, col)
      const maxCol = Math.max(selectionStart.col, col)

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(`${r}-${c}`)
        }
      }
      setSelectedCells(newSelection)
    }
  }

  const handleCellMouseUp = () => {
    setIsSelecting(false)
  }

  // Merge selected cells (protect A1-W4)
  const handleMergeCells = () => {
    if (selectedCells.size < 2) return

    const cells = Array.from(selectedCells).map(cell => {
      const [row, col] = cell.split('-').map(Number)
      return { row, col }
    })

    const minRow = Math.min(...cells.map(c => c.row))
    const maxRow = Math.max(...cells.map(c => c.row))
    const minCol = Math.min(...cells.map(c => c.col))
    const maxCol = Math.max(...cells.map(c => c.col))

    // Protect A1-W4 area (rows 0-3, columns 0-22)
    if (minRow <= 3 && minCol <= 22) {
      alert('A1~W4 영역은 보호되어 있습니다.')
      setSelectedCells(new Set())
      return
    }

    // Get value from top-left cell
    const value = localData[minRow][minCol]

    const newMergedCell: MergedCell = {
      startRow: minRow,
      startCol: minCol,
      endRow: maxRow,
      endCol: maxCol,
      value
    }

    setMergedCells([...mergedCells, newMergedCell])
    setSelectedCells(new Set())
    setHasChanges(true)
  }

  // Unmerge cells (protect A1-W4)
  const handleUnmergeCells = () => {
    const cellsToUnmerge = Array.from(selectedCells)

    // Check if any selected cells are in protected area
    const hasProtectedCells = cellsToUnmerge.some(cell => {
      const [row, col] = cell.split('-').map(Number)
      return row <= 3 && col <= 22
    })

    if (hasProtectedCells) {
      alert('A1~W4 영역은 보호되어 있습니다.')
      setSelectedCells(new Set())
      return
    }

    const newMergedCells = mergedCells.filter(merged => {
      // Keep fixed format merged cells
      const isFixedCell = FIXED_FORMAT.mergedCells.some(fixed =>
        fixed.startRow === merged.startRow &&
        fixed.startCol === merged.startCol &&
        fixed.endRow === merged.endRow &&
        fixed.endCol === merged.endCol
      )
      if (isFixedCell) return true

      for (const cell of cellsToUnmerge) {
        const [row, col] = cell.split('-').map(Number)
        if (row >= merged.startRow && row <= merged.endRow &&
          col >= merged.startCol && col <= merged.endCol) {
          return false
        }
      }
      return true
    })
    setMergedCells(newMergedCells)
    setSelectedCells(new Set())
    setHasChanges(true)
  }

  // Check if cell is merged
  const isCellMerged = (row: number, col: number) => {
    for (const merged of mergedCells) {
      if (row >= merged.startRow && row <= merged.endRow &&
        col >= merged.startCol && col <= merged.endCol) {
        return merged
      }
    }
    return null
  }

  // Check if cell should be hidden (part of merged cell but not top-left)
  const shouldHideCell = (row: number, col: number) => {
    const merged = isCellMerged(row, col)
    return merged && !(row === merged.startRow && col === merged.startCol)
  }

  // Handle keyboard navigation and selection
  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return // Don't handle navigation when editing

    const isShift = e.shiftKey
    const key = e.key

    if (!currentCell) return

    let newRow = currentCell.row
    let newCol = currentCell.col

    switch (key) {
      case 'ArrowUp':
        e.preventDefault()
        newRow = Math.max(0, newRow - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        newRow = Math.min(localData.length - 1, newRow + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        newCol = Math.max(0, newCol - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        newCol = Math.min((localData[0]?.length || 0) - 1, newCol + 1)
        break
      default:
        return
    }

    if (isShift) {
      // Shift selection - expand selection
      if (!selectionStart) {
        setSelectionStart(currentCell)
      }
      const startRow = Math.min(selectionStart?.row || currentCell.row, newRow)
      const endRow = Math.max(selectionStart?.row || currentCell.row, newRow)
      const startCol = Math.min(selectionStart?.col || currentCell.col, newCol)
      const endCol = Math.max(selectionStart?.col || currentCell.col, newCol)

      const newSelection = new Set<string>()
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelection.add(`${r}-${c}`)
        }
      }
      setSelectedCells(newSelection)
    } else {
      // Regular navigation - single cell
      setSelectedCells(new Set([`${newRow}-${newCol}`]))
      setSelectionStart(null)
    }

    setCurrentCell({ row: newRow, col: newCol })
  }

  return (
    <div
      className="p-4 h-full overflow-auto"
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top left',
        width: `${10000 / zoom}%`
      }}
      onKeyDown={handleTableKeyDown}
      tabIndex={0}
    >
      <div className="bg-white rounded-lg shadow p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">시트: {sheetName}</h2>
            <p className="text-sm text-gray-500">
              {localData.length}행 × {localData[0]?.length || 0}열
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Selection Statistics */}
            {selectedCells.size > 0 && (() => {
              const stats = calculateSelectionStats()
              return (
                <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1 text-sm">
                  <span className="text-gray-700">선택: </span>
                  <span className="font-semibold">{stats.count}개 셀</span>
                  {stats.numericCount > 0 && (
                    <>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-gray-700">합계: </span>
                      <span className="font-bold text-blue-700">{formatNumber(stats.sum)}</span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-gray-700">평균: </span>
                      <span className="font-semibold">{formatNumber(stats.average.toFixed(2))}</span>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
          <div className="flex items-center gap-2">
            {/* Fit to screen toggle */}
            <button
              onClick={() => setFitToScreen(!fitToScreen)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title={fitToScreen ? "원래 크기로" : "화면에 맞추기"}
            >
              {fitToScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Merge cells button */}
            {selectedCells.size > 1 && (
              <button
                onClick={handleMergeCells}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <GitMerge className="h-4 w-4 mr-1" />
                셀 병합
              </button>
            )}

            {/* Undo delete button */}
            {onUndoDelete && hasBackup && (
              <button
                onClick={onUndoDelete}
                className="inline-flex items-center px-3 py-1.5 border border-amber-600 rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                되돌리기
              </button>
            )}

            {/* Send to payment management button */}
            {onSendToPayment && checkedRows && Object.keys(checkedRows).length > 0 && (
              <button
                onClick={onSendToPayment}
                className="inline-flex items-center px-3 py-1.5 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                입금 관리로 보내기
              </button>
            )}

            {/* Send to order management button */}
            {onSendToOrder && checkedRows && Object.keys(checkedRows).length > 0 && (
              <button
                onClick={onSendToOrder}
                className="inline-flex items-center px-3 py-1.5 border border-green-600 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                발주 관리로 보내기
              </button>
            )}

            {/* Save button - Save to backend */}
            {hasChanges && (
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Save className="h-4 w-4 mr-2" />
                수정사항 저장
              </button>
            )}

            {/* Save to File button */}
            <button
              onClick={onSaveToFile || showFileManagement}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Save className="h-4 w-4 mr-2" />
              저장하기
            </button>

            <div className="text-sm text-gray-500 ml-2">
              {selectedCells.size > 0
                ? `${selectedCells.size}개 셀 선택됨`
                : "💡 드래그로 셀 선택, 더블클릭으로 편집"
              }
            </div>
          </div>
        </div>

        {/* Editable HTML Table - Excel Style */}
        <div
          style={{
            overflowX: fitToScreen ? 'hidden' : 'auto',
            overflowY: 'auto',
            maxHeight: '600px',
            border: '2px solid #b0b7c3',
            backgroundColor: '#ffffff'
          }}
          onMouseUp={handleCellMouseUp}
          onMouseLeave={handleCellMouseUp}
        >
          <table style={{
            borderCollapse: 'collapse',
            width: fitToScreen ? '100%' : 'auto',
            tableLayout: fitToScreen ? 'fixed' : 'auto',
            fontSize: fitToScreen ? '10px' : '11px',
            fontFamily: 'Malgun Gothic, -apple-system, BlinkMacSystemFont, sans-serif',
            userSelect: isSelecting ? 'none' : 'auto',
            WebkitUserSelect: isSelecting ? 'none' : 'auto',
            MozUserSelect: isSelecting ? 'none' : 'auto'
          }}>
            <tbody>
              {/* 헤더 행 - sticky */}
              <tr style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#e8eaed' }}>
                {/* Checkbox column header with toggle all functionality */}
                <th style={{
                  border: '1px solid #b0b7c3',
                  backgroundColor: '#e8eaed',
                  padding: fitToScreen ? '2px 3px' : '3px 6px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: fitToScreen ? '10px' : '11px',
                  minWidth: fitToScreen ? '20px' : '30px',
                  maxWidth: fitToScreen ? '25px' : '30px',
                  width: fitToScreen ? '2%' : 'auto',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                  onClick={() => {
                    if (!onCheckRow) return

                    // 데이터 행만 확인 (index >= 4)
                    const dataRows = localData.slice(4)
                    const allChecked = dataRows.every((_, idx) => checkedRows && checkedRows[idx + 4])

                    // 전체 체크/해제
                    dataRows.forEach((_, idx) => {
                      onCheckRow(idx + 4, !allChecked)
                    })
                  }}
                  title={(() => {
                    const dataRows = localData.slice(4)
                    const allChecked = dataRows.every((_, idx) => checkedRows && checkedRows[idx + 4])
                    return allChecked ? '전체 체크 해제' : '전체 체크'
                  })()}
                >
                  {(() => {
                    const dataRows = localData.slice(4)
                    const allChecked = dataRows.every((_, idx) => checkedRows && checkedRows[idx + 4])
                    return allChecked ? '☑' : '☐'
                  })()}
                </th>
                {/* Row number column header */}
                <th style={{
                  border: '1px solid #b0b7c3',
                  backgroundColor: '#e8eaed',
                  padding: fitToScreen ? '2px 3px' : '3px 6px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: fitToScreen ? '10px' : '11px',
                  minWidth: fitToScreen ? '20px' : '35px',
                  maxWidth: fitToScreen ? '25px' : '35px',
                  width: fitToScreen ? '2%' : 'auto'
                }}>
                  #
                </th>
                {headers.map((header, index) => {
                  // Only show columns up to W (index 22) when fitToScreen
                  if (fitToScreen && index > 22) return null

                  // Get custom width for this column if set
                  const customWidth = columnWidths[index]

                  return (
                    <th
                      key={index}
                      onDoubleClick={() => handleColumnHeaderDoubleClick(index)}
                      style={{
                        border: '1px solid #b0b7c3',
                        backgroundColor: '#e8eaed',
                        padding: fitToScreen ? '2px 3px' : '3px 6px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: fitToScreen ? '10px' : '11px',
                        minWidth: customWidth ? `${customWidth}px` : (fitToScreen ? 'auto' : (index === 0 ? '80px' : index === 1 || index === 5 ? '120px' : index <= 6 ? '90px' : '65px')),
                        maxWidth: customWidth ? `${customWidth}px` : (fitToScreen ? 'none' : (index === 0 ? '100px' : index === 1 || index === 5 ? '150px' : index <= 6 ? '110px' : '80px')),
                        width: customWidth ? `${customWidth}px` : (fitToScreen ? `${100 / 23}%` : 'auto'),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'col-resize',
                        userSelect: 'none'
                      }}
                      title="더블클릭하여 너비 자동 조정"
                    >
                      {header}
                    </th>
                  )
                })}
              </tr>
              {/* 헤더 행 1-4 (인덱스 0-3)를 sticky로 고정 */}
              {localData.slice(0, 4).map((row, headerRowIndex) => {
                const rowBgColor = rowColors && rowColors[headerRowIndex] ? rowColors[headerRowIndex] : 'transparent'
                const rowTextColor = rowTextColors && rowTextColors[headerRowIndex] ? rowTextColors[headerRowIndex] : 'inherit'

                // 1-2행(인덱스 0-1)은 노란색 배경
                const isYellowRow = headerRowIndex >= 0 && headerRowIndex <= 2

                // Sticky positioning - 각 행은 실제 셀 높이만큼만 떨어져서 배치
                // padding(3px*2=6px) + fontSize(11px) + border(2px) = 약 19px
                const actualRowHeight = fitToScreen ? 16 : 19
                const headerHeight = fitToScreen ? 24 : 27  // 컬럼 헤더 행 높이
                const stickyTop = headerHeight + (headerRowIndex * actualRowHeight)

                return (
                  <tr key={`header-row-${headerRowIndex}`} style={{
                    position: 'sticky',
                    top: `${stickyTop}px`,
                    zIndex: 9 - headerRowIndex, // 위쪽 행이 더 높은 z-index
                    backgroundColor: rowBgColor !== 'transparent' ? rowBgColor : (isYellowRow ? '#fff5b4' : '#ffffff'),
                    color: rowTextColor
                  }}>
                    {/* Checkbox cell - empty for header rows */}
                    <td style={{
                      border: '1px solid #b0b7c3',
                      backgroundColor: '#e8eaed',
                      padding: fitToScreen ? '2px 3px' : '2px 4px',
                      textAlign: 'center',
                      fontSize: fitToScreen ? '10px' : '11px',
                      minWidth: fitToScreen ? '20px' : '30px',
                      maxWidth: fitToScreen ? '25px' : '30px'
                    }}></td>
                    {/* Row number cell */}
                    <td style={{
                      border: '1px solid #b0b7c3',
                      backgroundColor: '#e8eaed',
                      padding: fitToScreen ? '2px 3px' : '2px 4px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: fitToScreen ? '10px' : '11px',
                      minWidth: fitToScreen ? '20px' : '35px',
                      maxWidth: fitToScreen ? '25px' : '35px'
                    }}>
                      {headerRowIndex + 1}
                    </td>
                    {row.map((cell, cellIndex) => {
                      if (fitToScreen && cellIndex > 22) return null

                      const cellValue = cell !== null && cell !== undefined ? String(cell) : ''
                      const merged = isCellMerged(headerRowIndex, cellIndex)
                      const isHidden = shouldHideCell(headerRowIndex, cellIndex)

                      if (isHidden) return null

                      const isSeparatorRow = headerRowIndex === FIXED_FORMAT.separatorRow
                      const isSumRow = headerRowIndex === FIXED_FORMAT.sumRow
                      const isJanggiSection = FIXED_FORMAT.janggiColumns.includes(cellIndex) && headerRowIndex > 1 && !isSeparatorRow
                      const isIpgoSection = FIXED_FORMAT.ipgoColumns.includes(cellIndex) && headerRowIndex > 1 && !isSeparatorRow

                      let backgroundColor = '#ffffff'

                      // Explicitly force yellow background for specific header areas (Q1-W1, V3-W3)
                      // Q1-W1: Row 0, Cols 16-22
                      // V3-W3: Row 2, Cols 21-22
                      const isQ1W1 = headerRowIndex === 0 && cellIndex >= 16 && cellIndex <= 22
                      const isV3W3 = headerRowIndex === 2 && cellIndex >= 21 && cellIndex <= 22

                      if (isSeparatorRow) {
                        backgroundColor = '#2c2c2c'
                      } else if (isQ1W1 || isV3W3) {
                        backgroundColor = '#fff5b4'
                      } else if (rowBgColor !== 'transparent') {
                        backgroundColor = rowBgColor
                      } else if (isJanggiSection) {
                        backgroundColor = '#fffacd'
                      } else if (isIpgoSection) {
                        backgroundColor = '#ffeb99'
                      } else if (isYellowRow) {
                        backgroundColor = '#fff5b4'
                      } else if (isSumRow) {
                        backgroundColor = '#f5f5f5'
                      }

                      return (
                        <td
                          key={cellIndex}
                          colSpan={merged ? merged.endCol - merged.startCol + 1 : 1}
                          rowSpan={merged ? merged.endRow - merged.startRow + 1 : 1}
                          style={{
                            border: '1px solid #b0b7c3',
                            backgroundColor,
                            color: isSeparatorRow ? '#ffffff' : rowTextColor,
                            padding: fitToScreen ? '2px 3px' : '3px 6px',
                            textAlign: 'center',
                            fontSize: fitToScreen ? '10px' : '11px',
                            fontWeight: headerRowIndex === 0 || headerRowIndex === 1 ? 'bold' : 'normal',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cellValue}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* 데이터 행들 (4행부터) */}
              {localData.slice(4).map((row, dataRowIndex) => {
                const rowIndex = dataRowIndex + 4  // 실제 행 번호는 4부터 시작

                // 행 배경색 및 글자색 적용
                const rowBgColor = rowColors && rowColors[rowIndex] ? rowColors[rowIndex] : 'transparent'
                const rowTextColor = rowTextColors && rowTextColors[rowIndex] ? rowTextColors[rowIndex] : 'inherit'

                return (
                  <tr key={rowIndex} style={{ backgroundColor: rowBgColor, color: rowTextColor }}>
                    {/* Checkbox cell (only for rows starting from index 4) */}
                    <td style={{
                      border: '1px solid #b0b7c3',
                      backgroundColor: '#e8eaed',
                      padding: fitToScreen ? '2px 3px' : '2px 4px',
                      textAlign: 'center',
                      fontSize: fitToScreen ? '10px' : '11px',
                      minWidth: fitToScreen ? '20px' : '30px',
                      maxWidth: fitToScreen ? '25px' : '30px',
                      width: fitToScreen ? '2%' : 'auto'
                    }}>
                      {rowIndex >= 4 && onCheckRow && (() => {
                        const isChecked = checkedRows && checkedRows[rowIndex]
                        return (
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={(e) => onCheckRow(rowIndex, e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                        )
                      })()}
                    </td>
                    {/* Row number cell */}
                    <td style={{
                      border: '1px solid #b0b7c3',
                      backgroundColor: '#e8eaed',
                      padding: fitToScreen ? '2px 3px' : '2px 4px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: fitToScreen ? '10px' : '11px',
                      minWidth: fitToScreen ? '20px' : '35px',
                      maxWidth: fitToScreen ? '25px' : '35px',
                      width: fitToScreen ? '2%' : 'auto'
                    }}>
                      {rowIndex < 4 ? rowIndex + 1 : rowIndex - 3}
                    </td>
                    {row.map((cell, cellIndex) => {
                      // Only show columns up to W (index 22) when fitToScreen
                      if (fitToScreen && cellIndex > 22) return null

                      const isEditing = editingCell?.row === rowIndex && editingCell?.col === cellIndex
                      const cellValue = cell !== null && cell !== undefined ? String(cell) : ''
                      const isSelected = selectedCells.has(`${rowIndex}-${cellIndex}`)
                      const merged = isCellMerged(rowIndex, cellIndex)
                      const isHidden = shouldHideCell(rowIndex, cellIndex)

                      // Use fixed format for special rows
                      const isSumRow = rowIndex === FIXED_FORMAT.sumRow
                      // Calculate sum for columns I-P and S-U (indices 8-15, 18-20)
                      // I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18, T=19, U=20, V=21
                      // V3 should be empty (V열은 텍스트 날짜라 합계 불가)
                      const isSumColumn = (cellIndex >= 8 && cellIndex <= 15) || (cellIndex >= 18 && cellIndex <= 20)
                      // For Q3 and R3, show count instead of sum
                      const isCountColumn = cellIndex === 16 || cellIndex === 17

                      // Row 4 - Black separator line
                      const isSeparatorRow = rowIndex === FIXED_FORMAT.separatorRow

                      // Skip hidden cells (part of merged cell but not top-left)
                      if (isHidden) return null

                      // Use fixed format for column colors
                      const isJanggiSection = FIXED_FORMAT.janggiColumns.includes(cellIndex) && rowIndex > 1 && !isSeparatorRow
                      const isIpgoSection = FIXED_FORMAT.ipgoColumns.includes(cellIndex) && rowIndex > 1 && !isSeparatorRow

                      // Check if F column (cellIndex === 5) contains "샘플"
                      const isSampleCell = cellIndex === 5 && cellValue && String(cellValue).includes('샘플')

                      // Check if R column (cellIndex === 17) contains "오더"
                      const isOrderCell = cellIndex === 17 && cellValue && String(cellValue).includes('오더')

                      let backgroundColor = '#ffffff'
                      if (isSeparatorRow) {
                        // Black separator row
                        backgroundColor = '#2c2c2c'
                      } else if (isSelected) {
                        backgroundColor = '#cce5ff'
                      } else if (isSampleCell) {
                        // Bright yellow for cells containing "샘플" in F column
                        backgroundColor = '#FFFF00'
                      } else if (isOrderCell) {
                        // Bright yellow for cells containing "오더" in R column
                        backgroundColor = '#FFFF00'
                      } else if (rowBgColor !== 'transparent') {
                        // 행 배경색 적용 (입고전표 업로드 후)
                        backgroundColor = rowBgColor
                      } else if (isJanggiSection) {
                        // Light yellow for 장끼, 미송, 교환 columns
                        backgroundColor = '#fffacd'
                      } else if (isIpgoSection) {
                        // Darker yellow for 입고, 차이 columns
                        backgroundColor = '#ffeb99'
                      } else if (isSumRow) {
                        // Light gray for sum row
                        backgroundColor = '#f5f5f5'
                      }

                      // Check if cell contains text that should be red or is in column H with numeric value
                      const hasRedText = (cellValue && (
                        cellValue.includes('프로모션') ||
                        cellValue.includes('행사') ||
                        cellValue.includes('디퍼런싱') ||
                        cellValue.includes('대화주문')
                      )) || (cellIndex === 7 && !isNaN(parseFloat(cellValue)) && parseFloat(cellValue) > 0)

                      // 행 글자색 적용 (K열에 값이 있는 행)
                      const textColor = rowTextColor !== 'inherit' ? rowTextColor : (isSeparatorRow ? '#2c2c2c' : (hasRedText ? '#ff0000' : '#000000'))

                      // Calculate colspan and rowspan for merged cells
                      const colSpan = merged ? (merged.endCol - merged.startCol + 1) : 1
                      const rowSpan = merged ? (merged.endRow - merged.startRow + 1) : 1

                      // Determine text alignment for merged cells in row 1
                      let textAlign = 'left'
                      if (merged && rowIndex === 0) {
                        // Center align for A1-H1, I1-K1, L1-N1
                        if ((cellIndex >= 0 && cellIndex <= 7) ||
                          (cellIndex >= 8 && cellIndex <= 10) ||
                          (cellIndex >= 11 && cellIndex <= 13)) {
                          textAlign = 'center'
                        }
                      } else if (typeof cell === 'number' || (cellIndex >= 7 && cellIndex <= 17)) {
                        textAlign = 'center'
                      }

                      // Get custom width for this column if set
                      const customWidth = columnWidths[cellIndex]

                      return (
                        <td
                          key={cellIndex}
                          colSpan={colSpan}
                          rowSpan={rowSpan}
                          onDoubleClick={() => handleCellDoubleClick(rowIndex, cellIndex)}
                          onClick={() => {
                            // A열(거래처명)을 클릭하면 거래처 정보 모달 표시
                            if (cellIndex === 0 && cellValue && cellValue.trim() !== '' && onClientNameClick) {
                              onClientNameClick(cellValue.trim())
                            }
                          }}
                          onMouseDown={() => handleCellMouseDown(rowIndex, cellIndex)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, cellIndex)}
                          title={cellValue}
                          style={{
                            border: '1px solid #b0b7c3',
                            padding: isSeparatorRow ? '0' : (fitToScreen ? '2px 3px' : '2px 4px'),
                            fontSize: fitToScreen ? '10px' : '11px',
                            cursor: isSeparatorRow ? 'default' : (cellIndex === 0 && cellValue && onClientNameClick ? 'pointer' : 'text'),
                            minWidth: customWidth ? `${customWidth}px` : (fitToScreen ? 'auto' : (cellIndex === 0 ? '80px' : cellIndex === 1 || cellIndex === 5 ? '120px' : cellIndex <= 6 ? '90px' : '65px')),
                            maxWidth: customWidth ? `${customWidth}px` : (fitToScreen ? 'none' : (cellIndex === 0 ? '100px' : cellIndex === 1 || cellIndex === 5 ? '150px' : cellIndex <= 6 ? '110px' : '80px')),
                            width: customWidth ? `${customWidth}px` : (fitToScreen ? `${100 / 23}%` : 'auto'),
                            textAlign: textAlign as any,
                            backgroundColor: isEditing ? '#e0f2fe' : backgroundColor,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: textColor,
                            fontWeight: hasRedText || rowIndex === 0 || isSumRow ? 'bold' : 'normal',
                            position: 'relative',
                            userSelect: 'none',
                            height: isSeparatorRow ? '3px' : 'auto'
                          }}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellBlur(rowIndex, cellIndex)}
                              onKeyDown={(e) => handleCellKeyDown(e, rowIndex, cellIndex)}
                              style={{
                                width: '100%',
                                border: 'none',
                                outline: '2px solid #0969da',
                                backgroundColor: '#ffffff',
                                padding: '1px 2px',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                textAlign: 'inherit'
                              }}
                              autoFocus
                            />
                          ) : (
                            <div
                              title={
                                // For E column (cellIndex === 4) with duplicates, show tooltip
                                cellIndex === 4 && duplicateProducts && duplicateProducts[rowIndex]
                                  ? duplicateProducts[rowIndex]
                                  : (merged ? String(merged.value) : cellValue)
                              }
                              style={{
                                minHeight: isSeparatorRow ? '3px' : '18px',
                                lineHeight: isSeparatorRow ? '3px' : 'normal'
                              }}
                            >
                              {(() => {
                                if (isSeparatorRow) return ''

                                // For row 3 (sum row) in payment management, use backend data
                                if (isSumRow) {
                                  // 입금관리 시트인 경우 백엔드 데이터 사용
                                  if (sheetName && sheetName.includes('입금관리')) {
                                    // 백엔드에서 계산된 값을 그대로 표시
                                    return formatNumber(cell, cellIndex)
                                  }

                                  // 다른 시트의 경우 프론트엔드에서 계산
                                  if (isSumColumn) {
                                    // Always calculate fresh sum for other sheets
                                    const sum = calculateColumnSum(cellIndex)
                                    return formatNumber(sum, cellIndex)
                                  } else if (isCountColumn) {
                                    // Always calculate fresh count
                                    return countTextCells(cellIndex)
                                  }
                                  // For other columns in row 3, show empty
                                  return ''
                                }

                                // Special handling for O2 and P2 (row 1, columns 14, 15)
                                if (rowIndex === 1) {
                                  if (cellIndex === 14) return '입고'  // O2
                                  if (cellIndex === 15) return '차이'  // P2
                                }

                                // For E column (cellIndex === 4), add warning icon if duplicate
                                if (cellIndex === 4 && duplicateProducts && duplicateProducts[rowIndex]) {
                                  const baseValue = merged ? formatNumber(merged.value, cellIndex) : formatNumber(cell, cellIndex)
                                  return `${baseValue} ⚠️`
                                }

                                // For other rows, show the actual cell value
                                return merged ? formatNumber(merged.value, cellIndex) : formatNumber(cell, cellIndex)
                              })()}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <span>편집 모드: </span>
          <span className="font-semibold text-gray-700">더블클릭</span>으로 편집 시작,
          <span className="font-semibold text-gray-700"> Enter</span>로 저장,
          <span className="font-semibold text-gray-700"> ESC</span>로 취소
        </div>
      </div>
    </div>
  )
}

export default SpreadsheetView
