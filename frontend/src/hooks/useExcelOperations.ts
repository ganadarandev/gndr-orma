import { useState } from 'react'
import toast from 'react-hot-toast'
import { excelAPI } from '../services/api'
import { validateAndMergeData, validateAndMergeReceiptSlip, mergeOrderReceiptByRow } from '../utils/excelValidation'
import { sortSheetData, detectDuplicateProducts, processReceiptSlipData, sortReceiptData } from '../utils/dataProcessing'
import { SheetData } from './useSheetManagement'

/**
 * useExcelOperations Hook
 *
 * 엑셀 파일 업로드/다운로드 및 데이터 병합 로직
 */
interface UseExcelOperationsParams {
  sheets: SheetData[]
  setSheets: (sheets: SheetData[]) => void
  selectedSheet: number
  setRowColors: (colors: { [key: number]: string }) => void
  setRowTextColors: (colors: { [key: number]: string }) => void
  setDuplicateProducts: (products: { [key: number]: string }) => void
  updateCurrentSheetData: (data: any[][]) => void
}

export const useExcelOperations = (params: UseExcelOperationsParams) => {
  const {
    sheets, setSheets, selectedSheet,
    setRowColors, setRowTextColors, setDuplicateProducts,
    updateCurrentSheetData
  } = params

  // 업로드 플래그
  const [isOrderReceiptUploaded, setIsOrderReceiptUploaded] = useState(false)
  const [isReceiptSlipUploaded, setIsReceiptSlipUploaded] = useState(false)

  /**
   * 주문서 엑셀 업로드 및 시트 생성
   */
  const handleFileUpload = async (file: File) => {
    const loadingToast = toast.loading('파일 업로드 중...')

    try {
      const response = await excelAPI.uploadExcel(file)
      if (response.success && response.sheets) {
        // Transform backend sheets to frontend SheetData format
        const transformedSheets = response.sheets.map((sheet: any) => {
          const data = sheet.data || []
          // P열 (index 15) 헤더 수정: "주문" -> "차이"
          if (data.length > 1 && data[1][15] === '주문') {
            data[1][15] = '차이'
          }

          return {
            sheet_name: sheet.name || '시트',
            sheet_type: '편집용',
            data: data,
            columns: data.length > 1 ? data[1] : [],
            rows: data.length,
            cols: data[0] ? data[0].length : 0,
            file_path: response.filename || file.name,
            loaded_at: new Date().toISOString()
          }
        })

        // 파일명 저장
        if (response.filename) {
          localStorage.setItem('current_filename', response.filename)
        }

        setSheets(transformedSheets)

        // Reset progressive state
        setIsOrderReceiptUploaded(false)
        setIsReceiptSlipUploaded(false)
        setRowColors({})
        setRowTextColors({})
        setDuplicateProducts({})
        // Note: checkedRows is in useSheetManagement, we might need to reset it too if passed

        toast.success(`파일이 성공적으로 업로드되었습니다. (${transformedSheets.length}개 시트)`, { id: loadingToast })
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('파일 업로드에 실패했습니다.', { id: loadingToast })
    }
  }

  /**
   * 주문입고 엑셀 업로드 및 데이터 병합
   */
  const handleOrderReceiptUpload = async (file: File) => {
    const currentSheetData = sheets[selectedSheet]?.data

    // 현재 로드된 주문서 데이터가 없으면 에러
    if (!currentSheetData || currentSheetData.length === 0) {
      toast.error('먼저 주문서를 업로드해주세요.')
      return
    }

    const loadingToast = toast.loading('주문 입고 파일 처리 중...')

    try {
      const response = await excelAPI.uploadOrderReceipt(file)

      if (response.success) {
        const receiptData = response.data

        // 데이터 병합 (행 순서 기준, L, M, N, Q 열만)
        // import { mergeOrderReceiptByRow } from '../utils/excelValidation' needs to be added/updated
        const validationResult = mergeOrderReceiptByRow(currentSheetData, receiptData)

        if (validationResult.success) {
          setIsOrderReceiptUploaded(true)

          updateCurrentSheetData(validationResult.mergedData || [])

          // Apply row text colors (red for rows with Exchange/K column > 0)
          if (validationResult.exchangeRows) {
            setRowTextColors(validationResult.exchangeRows)
          }

          toast.success(validationResult.message || '데이터가 성공적으로 병합되었습니다.', { id: loadingToast })
        } else {
          toast.error(validationResult.message || '데이터 병합에 실패했습니다.', { id: loadingToast })
        }
      } else {
        const errorMessage = typeof response === 'object' && response?.message
          ? response.message
          : typeof response === 'object' && response?.detail
            ? response.detail
            : '주문 입고 파일 처리에 실패했습니다.'
        toast.error(errorMessage, { id: loadingToast })
      }
    } catch (error: any) {
      console.error('Order receipt upload error:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || '주문 입고 파일 업로드에 실패했습니다.'
      toast.error(errorMessage, { id: loadingToast })
    }
  }

  /**
   * 입고전표 업로드 및 O열 병합 + 자동 체크 + 정렬
   */
  const handleReceiptSlipUpload = async (
    file: File,
    currentSheetData: any[][],
    onSuccess: (result: {
      sortedData: any[][]
      colors: { [key: number]: string }
      textColors: { [key: number]: string }
      duplicates: { [key: number]: string }
      autoChecked: { [key: number]: boolean }
    }) => void
  ) => {
    if (!isOrderReceiptUploaded) {
      toast.error('먼저 주문 입고 파일을 업로드해주세요.')
      return
    }

    const loadingToast = toast.loading('입고전표 파일 처리 중...')

    try {
      const response = await excelAPI.uploadReceiptSlip(file)

      if (response.success) {
        const receiptSlipData = response.data

        if (!currentSheetData) {
          toast.error('주문서 데이터를 찾을 수 없습니다.', { id: loadingToast })
          return
        }

        // 입고전표 데이터 매칭 및 O열 업데이트
        const validationResult = validateAndMergeReceiptSlip(currentSheetData, receiptSlipData)

        if (validationResult.success) {
          setIsReceiptSlipUploaded(true)

          // 데이터 정렬 (상품코드 > 상태)
          const sortedData = sortReceiptData(validationResult.mergedData || [])

          // 데이터 가공 (색상, 자동 체크 등) - 정렬된 데이터 기준
          const processed = processReceiptSlipData(sortedData)

          onSuccess({
            sortedData: sortedData,
            colors: processed.colors,
            textColors: processed.textColors,
            duplicates: processed.duplicates,
            autoChecked: processed.autoChecked
          })

          toast.success(`${validationResult.matchedCount}개 행의 입고량이 업데이트되었습니다.`, { id: loadingToast })
        } else {
          toast.error(validationResult.message || '데이터 매칭에 실패했습니다.', { id: loadingToast })
        }
      } else {
        const errorMessage = typeof response === 'object' && response?.message
          ? response.message
          : typeof response === 'object' && response?.detail
            ? response.detail
            : '입고전표 처리에 실패했습니다.'
        toast.error(errorMessage, { id: loadingToast })
      }
    } catch (error: any) {
      console.error('Receipt slip upload error:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || '입고전표 업로드에 실패했습니다.'
      toast.error(errorMessage, { id: loadingToast })
    }
  }

  /**
   * 체크된 행을 제외한 데이터 반환 (정렬하지 않음)
   */
  const getFilteredData = (data: any[][], checkedRows: { [key: number]: boolean }): any[][] => {
    if (!data || data.length === 0) return []

    const headers: any[][] = []
    const uncheckedRows: any[][] = []

    // 헤더 행들(0-3)은 그대로 포함
    for (let i = 0; i < 4 && i < data.length; i++) {
      headers.push([...data[i]])
    }

    // 데이터 행들(4부터)은 체크되지 않은 것만 포함
    for (let i = 4; i < data.length; i++) {
      if (!checkedRows[i]) {
        uncheckedRows.push([...data[i]])
      }
    }

    return [...headers, ...uncheckedRows]
  }

  /**
   * 웹 저장 핸들러
   */
  const handleSaveToWeb = async (
    saveFileName: string,
    filteredData: any[][],
    columns: string[],
    checkedRowsCount: number,
    onSuccess: () => void
  ) => {
    if (!saveFileName.trim()) {
      toast.error('파일명을 입력해주세요')
      return
    }

    const loadingToast = toast.loading('웹에 저장 중...')
    try {
      const today = new Date().toISOString().split('T')[0]

      // Data Validation
      if (!filteredData || filteredData.length === 0) {
        throw new Error('저장할 데이터가 없습니다.')
      }
      if (!columns || columns.length === 0) {
        throw new Error('컬럼 정보가 없습니다.')
      }

      const payload = {
        date: today,
        order_type: 'order',
        sheet_name: saveFileName,
        data: filteredData,
        columns: columns,
        notes: `체크된 항목 제거됨 (총 ${checkedRowsCount}개 항목 제외)`
      }

      console.log('Saving to Web - Payload:', payload)

      await excelAPI.saveDailyOrder(payload)

      toast.success('웹에 저장되었습니다', { id: loadingToast })
      onSuccess()
    } catch (error: any) {
      console.error('Save to web error:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || '웹 저장에 실패했습니다'
      toast.error(errorMessage, { id: loadingToast })
    }
  }

  /**
   * 엑셀 다운로드 핸들러
   */
  const handleDownloadExcel = async (
    saveFileName: string,
    filteredData: any[][],
    sheetName: string,
    columns: string[],
    onSuccess: () => void
  ) => {
    if (!saveFileName.trim()) {
      toast.error('파일명을 입력해주세요')
      return
    }

    const loadingToast = toast.loading('엑셀 파일 생성 중...')
    try {
      const response = await excelAPI.exportExcel({
        data: filteredData,
        file_name: saveFileName,
        sheet_name: sheetName,
        columns
      })

      // Blob 생성 및 다운로드
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${saveFileName}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('엑셀 파일이 다운로드되었습니다', { id: loadingToast })

      // Firebase Storage에 업로드
      try {
        const { ref, uploadBytes } = await import('firebase/storage')
        const { storage } = await import('../firebase')

        const timestamp = new Date().getTime()
        const storageRef = ref(storage, `excel_uploads/${saveFileName}_${timestamp}.xlsx`)

        await uploadBytes(storageRef, blob)
        toast.success('파일이 서버에 백업되었습니다', { id: loadingToast })
      } catch (uploadError) {
        console.error('Storage upload error:', uploadError)
        // 다운로드는 성공했으므로 에러 토스트는 띄우지 않거나 경고만 표시
        toast.error('서버 백업에 실패했습니다', { id: loadingToast })
      }

      onSuccess()
    } catch (error: any) {
      console.error('Excel download error:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || '엑셀 다운로드에 실패했습니다'
      toast.error(errorMessage, { id: loadingToast })
    }
  }

  return {
    // 상태
    isOrderReceiptUploaded,
    setIsOrderReceiptUploaded,
    isReceiptSlipUploaded,
    setIsReceiptSlipUploaded,

    // 업로드 핸들러
    handleFileUpload,
    handleOrderReceiptUpload,
    handleReceiptSlipUpload,

    // 저장/다운로드 핸들러
    getFilteredData,
    handleSaveToWeb,
    handleDownloadExcel
  }
}
