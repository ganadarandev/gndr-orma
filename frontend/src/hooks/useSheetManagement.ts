import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

/**
 * 시트 데이터 인터페이스
 */
export interface SheetData {
  sheet_name: string
  sheet_type?: string
  data: any[][]
  columns: string[]
  rows: number
  cols: number
  file_path?: string
  loaded_at?: string
  // 시트별 독립적인 상태 저장
  rowColors?: { [key: number]: string }
  rowTextColors?: { [key: number]: string }
  duplicateProducts?: { [key: number]: string }
  checkedRows?: { [key: number]: boolean }
}

/**
 * useSheetManagement Hook
 *
 * 시트 관리 로직 (추가, 삭제, 선택, 이름 편집, 상태 동기화)
 */
export const useSheetManagement = () => {
  // 시트 배열 및 선택된 시트 인덱스
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [selectedSheet, setSelectedSheet] = useState<number>(0)

  // 시트 이름 편집 관련 상태
  const [editingSheet, setEditingSheet] = useState<number | null>(null)
  const [editingName, setEditingName] = useState<string>('')

  // Derived state from current sheet
  const currentSheet = sheets[selectedSheet]
  const rowColors = currentSheet?.rowColors || {}
  const rowTextColors = currentSheet?.rowTextColors || {}
  const duplicateProducts = currentSheet?.duplicateProducts || {}
  const checkedRows = currentSheet?.checkedRows || {}

  // Setters using functional updates to avoid race conditions
  const setRowColors = (newColors: { [key: number]: string } | ((prev: { [key: number]: string }) => { [key: number]: string })) => {
    setSheets(prevSheets => {
      if (prevSheets.length === 0 || !prevSheets[selectedSheet]) return prevSheets
      const updatedSheets = [...prevSheets]
      const current = updatedSheets[selectedSheet]
      const nextColors = typeof newColors === 'function' ? newColors(current.rowColors || {}) : newColors

      updatedSheets[selectedSheet] = {
        ...current,
        rowColors: nextColors
      }
      return updatedSheets
    })
  }

  const setRowTextColors = (newColors: { [key: number]: string } | ((prev: { [key: number]: string }) => { [key: number]: string })) => {
    console.log('setRowTextColors called')
    setSheets(prevSheets => {
      if (prevSheets.length === 0 || !prevSheets[selectedSheet]) return prevSheets
      const updatedSheets = [...prevSheets]
      const current = updatedSheets[selectedSheet]
      const nextColors = typeof newColors === 'function' ? newColors(current.rowTextColors || {}) : newColors

      // Deep comparison to prevent unnecessary updates
      if (JSON.stringify(current.rowTextColors) === JSON.stringify(nextColors)) {
        console.log('setRowTextColors: No changes detected, skipping update')
        return prevSheets
      }

      console.log('setRowTextColors: Updating colors')
      updatedSheets[selectedSheet] = {
        ...current,
        rowTextColors: nextColors
      }
      return updatedSheets
    })
  }

  const setDuplicateProducts = (newProducts: { [key: number]: string } | ((prev: { [key: number]: string }) => { [key: number]: string })) => {
    setSheets(prevSheets => {
      if (prevSheets.length === 0 || !prevSheets[selectedSheet]) return prevSheets
      const updatedSheets = [...prevSheets]
      const current = updatedSheets[selectedSheet]
      const nextProducts = typeof newProducts === 'function' ? newProducts(current.duplicateProducts || {}) : newProducts

      updatedSheets[selectedSheet] = {
        ...current,
        duplicateProducts: nextProducts
      }
      return updatedSheets
    })
  }

  const setCheckedRows = (newChecked: { [key: number]: boolean } | ((prev: { [key: number]: boolean }) => { [key: number]: boolean })) => {
    setSheets(prevSheets => {
      if (prevSheets.length === 0 || !prevSheets[selectedSheet]) return prevSheets
      const updatedSheets = [...prevSheets]
      const current = updatedSheets[selectedSheet]
      const nextChecked = typeof newChecked === 'function' ? newChecked(current.checkedRows || {}) : newChecked

      updatedSheets[selectedSheet] = {
        ...current,
        checkedRows: nextChecked
      }
      return updatedSheets
    })
  }

  /**
   * 시트 이름 편집 시작
   */
  const handleStartEditingSheetName = (index: number) => {
    setEditingSheet(index)
    setEditingName(sheets[index].sheet_name)
  }

  /**
   * 시트 이름 저장
   */
  const handleSaveSheetName = (index: number) => {
    if (editingName.trim()) {
      setSheets(prevSheets => {
        const updatedSheets = [...prevSheets]
        updatedSheets[index] = {
          ...updatedSheets[index],
          sheet_name: editingName.trim()
        }
        return updatedSheets
      })
      setEditingSheet(null)
      setEditingName('')
      toast.success('시트 이름이 변경되었습니다')
    } else {
      toast.error('시트 이름을 입력해주세요')
    }
  }

  /**
   * 시트 이름 편집 취소
   */
  const handleCancelEditingSheetName = () => {
    setEditingSheet(null)
    setEditingName('')
  }

  /**
   * 현재 시트의 데이터 업데이트
   */
  const updateCurrentSheetData = (newData: any[][]) => {
    setSheets(prevSheets => {
      if (prevSheets.length === 0 || !prevSheets[selectedSheet]) return prevSheets
      const updatedSheets = [...prevSheets]
      updatedSheets[selectedSheet] = {
        ...updatedSheets[selectedSheet],
        data: newData,
        rows: newData.length,
        cols: newData[0]?.length || 0
      }
      return updatedSheets
    })
  }

  /**
   * 시트 추가
   */
  const addSheet = (newSheet: SheetData) => {
    setSheets(prev => {
      const newSheets = [...prev, newSheet]
      // Select the newly added sheet after render
      setTimeout(() => setSelectedSheet(newSheets.length - 1), 0)
      return newSheets
    })
  }

  /**
   * 시트 삭제
   */
  const removeSheet = (index: number) => {
    if (sheets.length === 1) {
      toast.error('마지막 시트는 삭제할 수 없습니다')
      return
    }

    setSheets(prevSheets => prevSheets.filter((_, i) => i !== index))

    // 선택된 시트 조정
    if (selectedSheet >= index && selectedSheet > 0) {
      setSelectedSheet(prev => prev - 1)
    }

    toast.success('시트가 삭제되었습니다')
  }

  /**
   * 현재 시트 데이터 가져오기
   */
  const getCurrentSheetData = (): any[][] => {
    return sheets[selectedSheet]?.data || []
  }

  /**
   * 체크박스 토글
   */
  const handleCheckRow = (rowIndex: number, checked: boolean) => {
    setCheckedRows(prev => ({
      ...prev,
      [rowIndex]: checked
    }))
  }

  return {
    // 시트 상태
    sheets,
    setSheets,
    selectedSheet,
    setSelectedSheet,

    // 시트별 독립 상태 (Derived)
    rowColors,
    setRowColors,
    rowTextColors,
    setRowTextColors,
    duplicateProducts,
    setDuplicateProducts,
    checkedRows,
    setCheckedRows,

    // 시트 이름 편집 상태
    editingSheet,
    setEditingSheet,
    editingName,
    setEditingName,

    // 시트 관리 핸들러
    handleStartEditingSheetName,
    handleSaveSheetName,
    handleCancelEditingSheetName,
    updateCurrentSheetData,
    addSheet,
    removeSheet,
    getCurrentSheetData,
    handleCheckRow
  }
}
