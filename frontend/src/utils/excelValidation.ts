import { normalizeString, compareNumbers } from './dataProcessing'

export interface ValidationResult {
  success: boolean
  message?: string
  mergedData?: any[][]
  matchedCount?: number
  exchangeRows?: { [key: number]: string }
}

/**
 * 주문서와 주문입고 데이터를 검증하고 병합
 */
export const validateAndMergeData = (originalData: any[][], receiptData: any[][]): ValidationResult => {
  const mergedData = originalData.map(row => [...row])
  let matchedCount = 0
  const unmatchedRows: string[] = []
  const exchangeRows: { [key: number]: string } = {}

  // 5행부터 검증 및 병합 (index 4부터)
  for (let i = 4; i < originalData.length; i++) {
    // 원본 데이터
    const originalStore = originalData[i]?.[0] // A열: 거래처명
    const originalProduct = originalData[i]?.[4] // E열: 공급처상품명
    const originalQty = originalData[i]?.[8] // I열: 발주수량

    // 원본에 데이터가 없으면 스킵
    if (!originalStore && !originalProduct && !originalQty) {
      continue
    }

    // 입고 파일에서 매칭되는 행 찾기
    let matched = false
    for (let j = 4; j < receiptData.length; j++) {
      const receiptStore = receiptData[j]?.[0] // A열: 거래처명
      const receiptProduct = receiptData[j]?.[4] // E열: 공급처상품명
      const receiptQty = receiptData[j]?.[8] // I열: 발주수량

      // 매칭 로직:
      // 1. 입고 파일의 I열이 있으면: A, E, I 모두 일치
      // 2. 입고 파일의 I열이 없으면: A, E만 일치
      const isMatched = normalizeString(originalStore) === normalizeString(receiptStore) &&
        normalizeString(originalProduct) === normalizeString(receiptProduct) &&
        (receiptQty === null || receiptQty === undefined || receiptQty === '' ||
          isNaN(parseFloat(String(receiptQty).replace(/,/g, ''))) ||
          compareNumbers(originalQty, receiptQty))

      if (isMatched) {
        matched = true
        matchedCount++

        // 입고 파일에서 데이터 병합
        mergedData[i][9] = receiptData[j][9]   // J열: 미송
        mergedData[i][10] = receiptData[j][10] // K열: 교환
        mergedData[i][11] = receiptData[j][11] // L열: 장끼
        mergedData[i][12] = receiptData[j][12] // M열
        mergedData[i][13] = receiptData[j][13] // N열
        mergedData[i][16] = receiptData[j][16] // Q열: 삼촌 코멘트

        // K열(교환) 값이 있으면 빨간색 표시
        const kValue = parseFloat(mergedData[i][10]) || 0
        if (kValue > 0) {
          exchangeRows[i] = '#ff0000' // 빨간색
        }

        break
      }
    }

    if (!matched) {
      unmatchedRows.push(`행 ${i + 1}: ${originalStore} - ${originalProduct}`)
    }
  }

  return {
    success: true,
    mergedData,
    matchedCount,
    exchangeRows,
    message: unmatchedRows.length > 0
      ? `${matchedCount}개 행 매칭됨. 매칭 실패: ${unmatchedRows.length}개`
      : `${matchedCount}개 행 매칭됨`
  }
}

/**
 * 입고전표와 주문입고 데이터를 검증하고 병합
 */
export const validateAndMergeReceiptSlip = (currentData: any[][], receiptSlipData: any[][]): ValidationResult => {
  const mergedData = currentData.map(row => [...row])
  let matchedCount = 0
  const unmatchedRows: string[] = []

  // 5행부터 검증 및 병합 (index 4부터)
  for (let i = 4; i < currentData.length; i++) {
    const originalProduct = currentData[i]?.[4] // E열: 공급처상품명 (상품코드)

    // 원본에 상품코드가 없으면 스킵
    if (!originalProduct) {
      continue
    }

    // 입고전표 파일에서 매칭되는 행 찾기
    let matched = false
    for (let j = 4; j < receiptSlipData.length; j++) {
      const slipProduct = receiptSlipData[j]?.[8] // I열: 상품코드

      // 매칭 로직: 상품코드(E열 vs I열) 일치
      const isMatched = normalizeString(originalProduct) === normalizeString(slipProduct)

      if (isMatched) {
        matched = true
        matchedCount++

        // 입고전표 파일의 O열(14) 값을 주문서의 O열(14)에 복사
        // "입고전표의 O열이 수량이야. O열의 숫자들을 가져와야해."
        const slipQty = receiptSlipData[j][14] // O열: 입고수량
        mergedData[i][14] = slipQty

        break
      }
    }

    if (!matched) {
      unmatchedRows.push(`행 ${i + 1}: ${originalProduct}`)
    }
  }

  return {
    success: true,
    mergedData,
    matchedCount,
    message: unmatchedRows.length > 0
      ? `${matchedCount}개 행 매칭됨. 매칭 실패: ${unmatchedRows.length}개`
      : `${matchedCount}개 행 매칭됨`
  }
}

/**
 * 주문서와 주문입고 데이터를 행 순서대로 병합 (L, M, N, Q 열만)
 * 사용자 요청: "데이터의 맞고 틀림을 루프처럼 맞추지 않고 1차례만 전체 맞춤을 진행"
 * "셀의 순서는 그 네 열을 제외하고는 다르거든" -> 행 인덱스 기준 병합
 */
export const mergeOrderReceiptByRow = (originalData: any[][], receiptData: any[][]): ValidationResult => {
  const mergedData = originalData.map(row => [...row])
  let matchedCount = 0
  const exchangeRows: { [key: number]: string } = {}

  // 5행부터 병합 (index 4부터)
  // 원본 데이터와 입고 데이터 중 더 짧은 길이만큼 반복
  const limit = Math.min(originalData.length, receiptData.length)

  for (let i = 4; i < limit; i++) {
    // 입고 파일에서 데이터 병합
    // J열(9), K열(10), L열(11), M열(12), N열(13), Q열(16)
    if (receiptData[i]) {
      mergedData[i][9] = receiptData[i][9]   // J열: 미송
      mergedData[i][10] = receiptData[i][10] // K열: 교환
      mergedData[i][11] = receiptData[i][11] // L열: 장끼
      mergedData[i][12] = receiptData[i][12] // M열
      mergedData[i][13] = receiptData[i][13] // N열
      mergedData[i][16] = receiptData[i][16] // Q열: 삼촌 코멘트

      // K열(교환) 값이 있으면 빨간색 표시
      const kValue = parseFloat(String(mergedData[i][10]).replace(/,/g, '')) || 0
      if (kValue > 0) {
        exchangeRows[i] = '#ff0000' // 빨간색
      }

      matchedCount++
    }
  }

  return {
    success: true,
    mergedData,
    matchedCount,
    exchangeRows,
    message: `${matchedCount}개 행 데이터 병합됨 (행 순서 기준)`
  }
}
