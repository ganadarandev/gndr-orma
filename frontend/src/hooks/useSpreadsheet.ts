import { useState, useCallback } from 'react'

export const useSpreadsheet = () => {
  const [checkedRows, setCheckedRows] = useState<{[key: number]: boolean}>({})
  const [rowColors, setRowColors] = useState<{[key: number]: string}>({})
  const [rowTextColors, setRowTextColors] = useState<{[key: number]: string}>({})
  const [duplicateProducts, setDuplicateProducts] = useState<{[key: number]: string}>({})

  // 체크박스 핸들러
  const handleCheckRow = useCallback((rowIndex: number, checked: boolean) => {
    setCheckedRows(prev => ({
      ...prev,
      [rowIndex]: checked
    }))
  }, [])

  // 모든 체크박스 토글
  const toggleAllChecks = useCallback((data: any[][], checked: boolean) => {
    const newChecked: {[key: number]: boolean} = {}
    for (let i = 4; i < data.length; i++) {
      // 거래처명이 있는 행만 체크
      if (data[i][0]) {
        newChecked[i] = checked
      }
    }
    setCheckedRows(newChecked)
  }, [])

  // 체크된 항목 개수
  const getCheckedCount = useCallback(() => {
    return Object.values(checkedRows).filter(Boolean).length
  }, [checkedRows])

  // 체크된 항목 가져오기
  const getCheckedItems = useCallback((data: any[][]) => {
    const items: any[][] = []
    for (let i = 4; i < data.length; i++) {
      if (checkedRows[i]) {
        items.push([...data[i]])
      }
    }
    return items
  }, [checkedRows])

  // 체크 상태 초기화
  const clearChecks = useCallback(() => {
    setCheckedRows({})
  }, [])

  // 행 색상 설정
  const setRowColor = useCallback((rowIndex: number, color: string) => {
    setRowColors(prev => ({
      ...prev,
      [rowIndex]: color
    }))
  }, [])

  // 행 텍스트 색상 설정
  const setRowTextColor = useCallback((rowIndex: number, color: string) => {
    setRowTextColors(prev => ({
      ...prev,
      [rowIndex]: color
    }))
  }, [])

  // 중복 제품 마킹
  const markDuplicateProduct = useCallback((rowIndex: number, message: string) => {
    setDuplicateProducts(prev => ({
      ...prev,
      [rowIndex]: message
    }))
  }, [])

  // 상태 초기화
  const resetSpreadsheetState = useCallback(() => {
    setCheckedRows({})
    setRowColors({})
    setRowTextColors({})
    setDuplicateProducts({})
  }, [])

  // 상태 로드
  const loadSpreadsheetState = useCallback((state: {
    checkedRows?: {[key: number]: boolean}
    rowColors?: {[key: number]: string}
    rowTextColors?: {[key: number]: string}
    duplicateProducts?: {[key: number]: string}
  }) => {
    if (state.checkedRows) setCheckedRows(state.checkedRows)
    if (state.rowColors) setRowColors(state.rowColors)
    if (state.rowTextColors) setRowTextColors(state.rowTextColors)
    if (state.duplicateProducts) setDuplicateProducts(state.duplicateProducts)
  }, [])

  return {
    checkedRows,
    rowColors,
    rowTextColors,
    duplicateProducts,
    handleCheckRow,
    toggleAllChecks,
    getCheckedCount,
    getCheckedItems,
    clearChecks,
    setRowColor,
    setRowTextColor,
    markDuplicateProduct,
    resetSpreadsheetState,
    loadSpreadsheetState
  }
}
