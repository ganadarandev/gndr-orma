import { useState } from 'react'
import toast from 'react-hot-toast'
import { paymentAPI, savedFilesAPI } from '../services/api'
import { extractBuilding, extractFloor, parseAddress } from '../utils/dataProcessing'
import { SheetData } from './useSheetManagement'
import { useAuthStore } from '../store/authStore'

interface UsePaymentOperationsParams {
  getCurrentSheetData: () => any[][]
  checkedRows: { [key: number]: boolean }
  updateCurrentSheetData: (data: any[][]) => void
  setCheckedRows: (rows: { [key: number]: boolean }) => void
  sheets: SheetData[]
  selectedSheet: number
  rowColors: { [key: number]: string }
  rowTextColors: { [key: number]: string }
  setRowColors: (colors: { [key: number]: string }) => void
  setRowTextColors: (colors: { [key: number]: string }) => void
  setBackupBeforeDelete: (backup: any) => void
}

/**
 * usePaymentOperations Hook
 *
 * 입금 관리 로직 (체크된 항목을 입금 관리로 이동)
 */
export const usePaymentOperations = ({
  getCurrentSheetData,
  checkedRows,
  updateCurrentSheetData,
  setCheckedRows,
  sheets,
  selectedSheet,
  rowColors,
  rowTextColors,
  setRowColors,
  setRowTextColors,
  setBackupBeforeDelete
}: UsePaymentOperationsParams) => {
  const { username } = useAuthStore()

  // 입금일자 모달 상태
  const [showPaymentDateModal, setShowPaymentDateModal] = useState(false)
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  /**
   * 입금 관리로 보내기 시작 (모달 표시)
   */
  const moveCheckedToPayment = (): boolean => {
    const data = getCurrentSheetData()
    if (!data) return false

    let hasChecked = false
    for (let i = 4; i < data.length; i++) {
      if (checkedRows[i]) {
        hasChecked = true
        break
      }
    }

    if (!hasChecked) {
      toast.error('체크된 항목이 없습니다')
      return false
    }

    setShowPaymentDateModal(true)
    return true
  }

  /**
   * 입금일자 확인 후 실제로 입금 관리로 이동
   */
  const confirmPaymentDate = async () => {
    const data = getCurrentSheetData()
    if (!data) return

    const columns = sheets[selectedSheet]?.columns || []

    const checkedItems: any[][] = []

    // 헤더 행들(0-3)은 그대로 포함
    for (let i = 0; i < 4 && i < data.length; i++) {
      checkedItems.push([...data[i]])
    }

    // 체크된 데이터 행들 수집
    const checkedRowsData: any[][] = []
    for (let i = 4; i < data.length; i++) {
      if (checkedRows[i]) {
        const row = [...data[i]]
        // T열(인덱스 19)에 입금액 계산: H(인덱스 7) * O(인덱스 14)
        const hValue = parseFloat(row[7]) || 0
        const oValue = parseFloat(row[14]) || 0
        row[19] = hValue * oValue
        checkedRowsData.push(row)
      }
    }

    // 공급처주소(B열) 기준으로 정렬: 건물명 → 층수 → 거래처명
    checkedRowsData.sort((a, b) => {
      const addressA = (a[1] || '').toString() // B열: 공급처주소
      const addressB = (b[1] || '').toString()

      const buildingA = extractBuilding(addressA)
      const buildingB = extractBuilding(addressB)

      // 1. 건물명으로 먼저 정렬
      if (buildingA !== buildingB) {
        return buildingA.localeCompare(buildingB, 'ko-KR')
      }

      // 2. 같은 건물이면 층수로 정렬
      const floorA = extractFloor(addressA)
      const floorB = extractFloor(addressB)
      if (floorA !== floorB) {
        return floorA - floorB
      }

      // 3. 같은 층이면 거래처명으로 정렬
      const nameA = (a[0] || '').toString()
      const nameB = (b[0] || '').toString()
      return nameA.localeCompare(nameB, 'ko-KR')
    })

    // 정렬된 데이터를 추가하면서 구분선 삽입
    const paymentRowColors: { [key: number]: string } = {}
    let prevBuilding = ''
    let prevCompanyName = ''
    let currentRowIndex = 4 // 헤더 4행 이후부터 시작

    for (let i = 0; i < checkedRowsData.length; i++) {
      const row = checkedRowsData[i]
      const address = (row[1] || '').toString()
      const currentBuilding = extractBuilding(address)
      const currentCompanyName = (row[0] || '').toString()

      // 1. 건물이 바뀌면 회색 빈 행 추가
      if (i > 0 && prevBuilding !== currentBuilding && prevBuilding !== '') {
        const emptyRow = new Array(row.length).fill('')
        checkedItems.push(emptyRow)
        paymentRowColors[currentRowIndex] = '#d1d5db' // 회색 배경
        currentRowIndex++
      }
      // 2. 같은 건물 내에서 거래처가 바뀌면 흰색 빈 행 추가
      else if (i > 0 && prevBuilding === currentBuilding && prevCompanyName !== currentCompanyName && prevCompanyName !== '') {
        const emptyRow = new Array(row.length).fill('')
        checkedItems.push(emptyRow)
        // 흰색 배경은 기본이므로 별도 설정 불필요
        currentRowIndex++
      }

      checkedItems.push(row)
      currentRowIndex++
      prevBuilding = currentBuilding
      prevCompanyName = currentCompanyName
    }

    if (checkedItems.length <= 4) {
      toast.error('체크된 항목이 없습니다')
      setShowPaymentDateModal(false)
      return
    }

    // DB에 저장
    const loadingToast = toast.loading('입금 내역 저장 중...')
    try {
      await paymentAPI.savePaymentData({
        payment_date: selectedPaymentDate,
        data: checkedItems,
        created_by: username || 'unknown'
      })

      // 저장 완료 후 성공 토스트
      toast.success(`${checkedItems.length - 4}개 항목이 ${selectedPaymentDate} 입금 내역으로 저장되었습니다`, { id: loadingToast })

      // 날짜를 MMDD 형식으로 변환
      const dateObj = new Date(selectedPaymentDate)
      const mmdd = `${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`

      // 백업 생성 (되돌리기를 위해) - 삭제 전 상태 저장
      setBackupBeforeDelete({
        data: [...data.map(row => [...row])], // Deep copy
        checkedRows: { ...checkedRows },
        rowColors: { ...rowColors },
        rowTextColors: { ...rowTextColors }
      })

      // 체크된 행들을 스프레드시트에서 삭제하고 재정렬
      const newData: any[][] = []
      const newRowColors: { [key: number]: string } = {}
      const newRowTextColors: { [key: number]: string } = {}

      // 헤더 행들(0-3)은 유지
      for (let i = 0; i < 4 && i < data.length; i++) {
        newData.push(data[i])
        if (rowColors[i]) newRowColors[i] = rowColors[i]
        if (rowTextColors[i]) newRowTextColors[i] = rowTextColors[i]
      }

      // 체크되지 않은 데이터 행들만 수집 (빈 행 제외)
      const remainingRows: any[][] = []
      const remainingRowTextColors: { [key: number]: string } = {}

      for (let i = 4; i < data.length; i++) {
        if (!checkedRows[i]) {
          const row = data[i]
          // 빈 행 체크: A열(거래처명), B열(공급처주소), E열(상품명) 중 하나라도 있으면 데이터 행으로 간주
          const hasData = (row[0] && row[0] !== '') || // A열: 거래처명
            (row[1] && row[1] !== '') || // B열: 공급처주소
            (row[4] && row[4] !== '')    // E열: 공급처상품명
          if (hasData) {
            const rowIdx = remainingRows.length
            remainingRows.push(row)
            // rowTextColors 보존 (교환 항목 등)
            if (rowTextColors[i]) {
              remainingRowTextColors[rowIdx] = rowTextColors[i]
            }
          }
        }
      }

      // 1. 빈 행 제거 (데이터가 있는 행만 필터링)
      // A열(거래처명), B열(주소), E열(상품코드) 중 하나라도 실질적인 데이터가 있어야 함
      const cleanRemainingRows = remainingRows.filter((row, index) => {
        const company = (row[0] || '').toString().trim()
        const address = (row[1] || '').toString().trim()
        const productCode = (row[4] || '').toString().trim()

        // 데이터가 하나라도 있으면 유지
        return company !== '' || address !== '' || productCode !== ''
      })

      // 2. 정렬 준비 (색상 정보 보존)
      // 주의: cleanRemainingRows는 original remainingRows의 부분집합이므로,
      // 색상 매핑을 위해 원래 인덱스를 추적해야 함
      const rowsToSort = []
      for (let i = 0; i < remainingRows.length; i++) {
        const row = remainingRows[i]
        const hasData = (row[0] && row[0] !== '') || (row[1] && row[1] !== '') || (row[4] && row[4] !== '')
        if (hasData) {
          rowsToSort.push({
            data: row,
            textColor: remainingRowTextColors[i] || null
          })
        }
      }

      // 3. 정렬 로직: 공급처주소(건물/층/호) → 거래처명 → 상품코드 (SORTING_RULES.md)
      rowsToSort.sort((a, b) => {
        const rowA = a.data
        const rowB = b.data

        // 1차: 공급처주소 비교 (B열, index 1)
        const addrA = parseAddress(rowA[1] || '')
        const addrB = parseAddress(rowB[1] || '')

        // 건물명 비교
        if (!addrA.building && addrB.building) return 1
        if (addrA.building && !addrB.building) return -1
        const buildingCompare = addrA.building.localeCompare(addrB.building, 'ko-KR')
        if (buildingCompare !== 0) return buildingCompare

        // 층수 비교
        if (addrA.floor !== addrB.floor) return addrA.floor - addrB.floor

        // 호실 비교
        if (addrA.room !== addrB.room) return addrA.room - addrB.room

        // 2차: 거래처명 비교 (A열, index 0)
        const companyA = (rowA[0] || '').toString().trim()
        const companyB = (rowB[0] || '').toString().trim()

        if (!companyA && companyB) return 1
        if (companyA && !companyB) return -1

        const companyCompare = companyA.localeCompare(companyB, 'ko-KR')
        if (companyCompare !== 0) return companyCompare

        // 3차: 상품코드 비교 (E열, index 4)
        const productA = (rowA[4] || '').toString().trim()
        const productB = (rowB[4] || '').toString().trim()

        if (!productA && productB) return 1
        if (productA && !productB) return -1

        return productA.localeCompare(productB, 'ko-KR')
      })

      // 4. 구분선 삽입 및 데이터 구성
      let prevBuilding = ''
      let prevCompany = ''
      let currentRowIndex = 4 // 헤더 4행 이후부터 시작

      for (let i = 0; i < rowsToSort.length; i++) {
        const item = rowsToSort[i]
        const row = item.data
        const address = (row[1] || '').toString()
        const currentBuilding = parseAddress(address).building
        const currentCompany = (row[0] || '').toString().trim()

        // 1. 건물이 바뀌면 회색 빈 행 추가 (첫 번째 행 제외)
        if (i > 0 && prevBuilding !== currentBuilding && prevBuilding !== '') {
          const emptyRow = new Array(row.length).fill('')
          newData.push(emptyRow)
          newRowColors[currentRowIndex] = '#d1d5db' // 회색 배경
          currentRowIndex++
        }
        // 2. 같은 건물 내에서 거래처명이 바뀌면 흰색 빈 행 추가
        else if (i > 0 && prevBuilding === currentBuilding && prevCompany !== currentCompany && prevCompany !== '') {
          const emptyRow = new Array(row.length).fill('')
          newData.push(emptyRow)
          // 흰색 배경은 기본
          currentRowIndex++
        }

        newData.push(row)
        // 색상 정보 복원
        if (item.textColor) {
          newRowTextColors[currentRowIndex] = item.textColor
        }
        currentRowIndex++

        prevBuilding = currentBuilding
        prevCompany = currentCompany
      }

      // 3개 파일 저장 (매칭, 정상, 오류)
      try {
        await savedFilesAPI.saveThreeFiles({
          date: mmdd,
          matched_data: {
            data: data,
            columns: columns,
            row_colors: rowColors,
            row_text_colors: rowTextColors
          },
          normal_data: {
            data: checkedItems,
            columns: columns,
            row_colors: paymentRowColors,
            row_text_colors: {}
          },
          error_data: {
            data: newData,
            columns: columns,
            row_colors: newRowColors,
            row_text_colors: newRowTextColors
          },
          created_by: username || 'unknown'
        })

        console.log(`3개 파일이 ${mmdd} 날짜로 저장되었습니다`)
      } catch (fileError: any) {
        console.error('File save error:', fileError)
        // 파일 저장 실패해도 입금 관리는 성공했으므로 에러 토스트만 표시
        toast.error(`파일 저장 실패: ${fileError.message}`)
      }

      // 상태 업데이트
      updateCurrentSheetData(newData)
      setRowColors(newRowColors)
      setRowTextColors(newRowTextColors)
      setCheckedRows({})

      // 모달 닫기
      setShowPaymentDateModal(false)

    } catch (error: any) {
      console.error('Payment save error:', error)
      toast.error(`저장 실패: ${error.message}`, { id: loadingToast })
    }
  }

  return {
    // 모달 상태
    showPaymentDateModal,
    setShowPaymentDateModal,
    selectedPaymentDate,
    setSelectedPaymentDate,

    // 입금 관리 핸들러
    moveCheckedToPayment,
    confirmPaymentDate
  }
}
