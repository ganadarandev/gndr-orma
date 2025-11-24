import { useState } from 'react'
import toast from 'react-hot-toast'
import { ordersAPI } from '../services/api'
import { parseAddress, detectDuplicateProducts } from '../utils/dataProcessing'
import { useAuthStore } from '../store/authStore'

interface UseOrderOperationsParams {
  getCurrentSheetData: () => any[][]
  checkedRows: { [key: number]: boolean }
  updateCurrentSheetData: (data: any[][]) => void
  setCheckedRows: (rows: { [key: number]: boolean }) => void
  setRowColors: (colors: { [key: number]: string }) => void
  setRowTextColors: (colors: { [key: number]: string }) => void
  setDuplicateProducts: (duplicates: { [key: number]: string }) => void
  setBackupBeforeDelete: (backup: any) => void
  rowColors: { [key: number]: string }
  rowTextColors: { [key: number]: string }
}

/**
 * useOrderOperations Hook
 *
 * 발주 관리 로직 (체크된 항목을 발주 관리로 이동)
 */
export const useOrderOperations = ({
  getCurrentSheetData,
  checkedRows,
  updateCurrentSheetData,
  setCheckedRows,
  setRowColors,
  setRowTextColors,
  setDuplicateProducts,
  setBackupBeforeDelete,
  rowColors,
  rowTextColors
}: UseOrderOperationsParams) => {
  const { username } = useAuthStore()
  
  // 발주일자 모달 상태
  const [showOrderDateModal, setShowOrderDateModal] = useState(false)
  const [selectedOrderDate, setSelectedOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [orderType, setOrderType] = useState<string>('일반')

  /**
   * 발주 관리로 보내기 시작 (모달 표시)
   */
  const moveCheckedToOrder = (): boolean => {
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

    setShowOrderDateModal(true)
    return true
  }

  /**
   * 발주일자 확인 후 실제로 발주 관리로 이동
   */
  const confirmOrderDate = async () => {
    const data = getCurrentSheetData()
    if (!data) return

    const orderItems: any[][] = []

    // 헤더 행들(0-3)은 그대로 포함
    for (let i = 0; i < 4 && i < data.length; i++) {
      orderItems.push([...data[i]])
    }

    // 체크된 데이터 행들을 수집하면서 발주 규칙 적용
    const orderRowsData: any[][] = []
    for (let i = 4; i < data.length; i++) {
      if (checkedRows[i]) {
        const row = [...data[i]]

        // 규칙 1: I열에 숫자가 있고 L열과 O열이 비어있는 경우 (미송)
        const iValue = parseFloat(row[8]) || 0  // I열: 신규 주문
        const lValue = parseFloat(row[11]) || 0 // L열: 장끼 미송
        const oValue = parseFloat(row[14]) || 0 // O열: 입고
        const qValue = row[16] || ''             // Q열: 삼촌 코멘트

        if (iValue > 0 && lValue === 0 && oValue === 0) {
          // I열 값을 J열로 이동 (미송)
          row[9] = iValue
          row[8] = '' // I열 비우기
          // Q열 값을 R열로 이동
          if (qValue) {
            row[17] = qValue
            row[16] = '' // Q열 비우기
          }
          orderRowsData.push(row)
          continue
        }

        // 규칙 2: K열에 교환 개수가 있고 N, O 열이 비어있는 경우
        const kValue = parseFloat(row[10]) || 0 // K열: 교환
        const nValue = parseFloat(row[13]) || 0 // N열: 장끼 교환

        if (kValue > 0 && nValue === 0 && oValue === 0) {
          // 행을 그대로 발주 관리로 이동
          orderRowsData.push(row)
          continue
        }
      }
    }

    // 수집된 행들을 orderItems에 추가
    orderItems.push(...orderRowsData)

    if (orderItems.length <= 4) {
      toast.error('발주 조건에 맞는 항목이 없습니다')
      setShowOrderDateModal(false)
      return
    }

    // DB에 저장
    const loadingToast = toast.loading('발주 내역 저장 중...')
    try {
      // ordersAPI를 통해 백엔드에 저장
      const response = await ordersAPI.saveOrders({
        order_date: selectedOrderDate,
        company_name: '통합', // 여러 거래처가 섞여있을 수 있음
        order_type: orderType,
        items: orderItems.slice(4) // 헤더 4행 제외
      })

      if (response.success) {
        toast.success(`${orderItems.length - 4}개 항목이 발주 관리에 저장되었습니다`, { id: loadingToast })
      } else {
        throw new Error(response.message || '발주 저장에 실패했습니다')
      }

      // 백업 생성 (되돌리기를 위해)
      setBackupBeforeDelete({
        data: [...data.map(row => [...row])],
        checkedRows: {...checkedRows},
        rowColors: {...rowColors},
        rowTextColors: {...rowTextColors}
      })

      // 체크된 행들을 스프레드시트에서 삭제하고 재정렬
      const newData: any[][] = []
      const newRowColors: {[key: number]: string} = {}
      const newRowTextColors: {[key: number]: string} = {}

      // 헤더 행들(0-3)은 유지
      for (let i = 0; i < 4 && i < data.length; i++) {
        newData.push(data[i])
        if (rowColors[i]) newRowColors[i] = rowColors[i]
        if (rowTextColors[i]) newRowTextColors[i] = rowTextColors[i]
      }

      // 체크되지 않은 데이터 행들만 수집 (빈 행 제외)
      const remainingRows: any[][] = []
      const remainingRowTextColors: {[key: number]: string} = {}
      const remainingRowColors: {[key: number]: string} = {}

      for (let i = 4; i < data.length; i++) {
        if (!checkedRows[i]) {
          const row = data[i]
          const hasData = (row[0] && row[0] !== '') || (row[1] && row[1] !== '') || (row[4] && row[4] !== '')
          if (hasData) {
            const rowIdx = remainingRows.length
            remainingRows.push(row)
            if (rowTextColors[i]) {
              remainingRowTextColors[rowIdx] = rowTextColors[i]
            }
            if (rowColors[i]) {
              remainingRowColors[rowIdx] = rowColors[i]
            }
          }
        }
      }

      // 정렬 (새로운 기준: 건물 → 층 → 호실 → 거래처명)
      remainingRows.sort((a, b) => {
        const addrA = parseAddress(a[1] || '')
        const addrB = parseAddress(b[1] || '')

        // 1. 건물명으로 정렬
        if (!addrA.building && addrB.building) return 1
        if (addrA.building && !addrB.building) return -1
        const buildingCompare = addrA.building.localeCompare(addrB.building, 'ko-KR')
        if (buildingCompare !== 0) return buildingCompare

        // 2. 층으로 정렬 (지하는 음수로 처리되어 있음)
        if (addrA.floor !== addrB.floor) return addrA.floor - addrB.floor

        // 3. 호실로 정렬
        if (addrA.room !== addrB.room) return addrA.room - addrB.room

        // 4. 거래처명으로 정렬
        const companyA = (a[0] || '').toString().trim()
        const companyB = (b[0] || '').toString().trim()
        if (!companyA && companyB) return 1
        if (companyA && !companyB) return -1
        return companyA.localeCompare(companyB, 'ko-KR')
      })

      // 정렬된 데이터를 추가하면서 건물/거래처별 구분선 삽입
      let prevCompany = ''
      let prevBuilding = ''
      let currentRowIndex = 4

      for (let i = 0; i < remainingRows.length; i++) {
        const row = remainingRows[i]
        const currentCompany = (row[0] || '').toString().trim()
        const address = (row[1] || '').toString()
        const currentBuilding = parseAddress(address).building

        // 1. 건물이 바뀌면 회색 빈 행 삽입
        if (i > 0 && prevBuilding !== currentBuilding && prevBuilding !== '') {
          const emptyRow = new Array(row.length).fill('')
          newData.push(emptyRow)
          newRowColors[currentRowIndex] = '#d1d5db' // 회색 배경
          currentRowIndex++
        }
        // 2. 같은 건물 내에서 거래처명이 바뀌면 흰색 빈 행 삽입
        else if (i > 0 && prevBuilding === currentBuilding && prevCompany !== currentCompany && prevCompany !== '') {
          const emptyRow = new Array(row.length).fill('')
          newData.push(emptyRow)
          // 흰색 배경은 기본이므로 별도 설정 불필요
          currentRowIndex++
        }

        newData.push(row)
        // 기존 색상 복원
        if (remainingRowTextColors[i]) {
          newRowTextColors[currentRowIndex] = remainingRowTextColors[i]
        }
        if (remainingRowColors[i]) {
          newRowColors[currentRowIndex] = remainingRowColors[i]
        }
        currentRowIndex++
        prevCompany = currentCompany
        prevBuilding = currentBuilding
      }

      // 정렬 후 중복 상품 다시 감지
      const duplicates = detectDuplicateProducts(newData)

      // 상태 업데이트
      updateCurrentSheetData(newData)
      setRowColors(newRowColors)
      setRowTextColors(newRowTextColors)
      setDuplicateProducts(duplicates)
      setCheckedRows({})

      // 모달 닫기
      setShowOrderDateModal(false)

    } catch (error: any) {
      console.error('Order save error:', error)
      toast.error(`발주 저장 실패: ${error.message}`, { id: loadingToast })
    }
  }

  return {
    // 모달 상태
    showOrderDateModal,
    setShowOrderDateModal,
    selectedOrderDate,
    setSelectedOrderDate,
    orderType,
    setOrderType,

    // 발주 관리 핸들러
    moveCheckedToOrder,
    confirmOrderDate
  }
}
