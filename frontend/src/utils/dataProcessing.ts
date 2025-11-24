// 데이터 처리 유틸리티 함수들

/**
 * 주소에서 건물명, 층수, 호실 정보를 추출
 * SORTING_RULES.md 기준
 */
export interface ParsedAddress {
  building: string
  floor: number
  room: number
}

export const parseAddress = (address: any): ParsedAddress => {
  if (!address) return { building: '', floor: 0, room: 0 }

  const addr = String(address).trim()

  // 건물명 추출 (첫 번째 단어 또는 "층" 이전까지)
  const buildingMatch = addr.match(/^([가-힣a-zA-Z\s]+?)(?=\s*(?:지하|B\s*\d|\d+층|$))/)
  const building = buildingMatch ? buildingMatch[1].trim() : addr

  // 층수 추출
  let floor = 0
  // 지하 패턴: "지하 3층", "지하3층", "B 3층", "B3"
  const basementMatch = addr.match(/(?:지하|B)\s*(\d+)/)
  if (basementMatch) {
    floor = -parseInt(basementMatch[1]) // 지하는 음수
  } else {
    // 지상 패턴: "3층", "F 3층", "3F"
    const floorMatch = addr.match(/(?:F\s*)?(\d+)(?:층|F)/)
    if (floorMatch) {
      floor = parseInt(floorMatch[1])
    }
  }

  // 호실 추출: "101호", "호실 101"
  let room = 0
  const roomMatch = addr.match(/(?:호실\s*)?(\d+)호/)
  if (roomMatch) {
    room = parseInt(roomMatch[1])
  }

  return { building, floor, room }
}

/**
 * 주소에서 건물명만 추출 (입금 관리에서 사용)
 */
export const extractBuilding = (address: string): string => {
  if (!address) return '기타'

  // 건물명 패턴: 긴 패턴을 먼저 체크
  const buildingPatterns = [
    'APM', 'apm', 'Apm',  // APM 계열
    '누죤', '누존',  // 누죤
    '스튜디오W', '스튜디오w',  // 스튜디오W
    '테크노',  // 테크노
    '디오트', '신평화', '청평화', '신발상가', '평화시장', '동평화',
    '남평화', '서평화', '북평화', '중앙상가', '제일상가'
  ]

  for (const pattern of buildingPatterns) {
    if (address.includes(pattern)) {
      // APM 계열은 대문자로 통일
      if (pattern.toLowerCase() === 'apm') return 'APM'
      return pattern
    }
  }

  return '기타'
}

/**
 * 주소에서 층수만 추출 (음수는 지하층)
 */
export const extractFloor = (address: string): number => {
  // 지하 X층 패턴
  const basementMatch = address.match(/지하\s*(\d+)층/)
  if (basementMatch) {
    return -parseInt(basementMatch[1])  // 지하는 음수로
  }

  // 일반 X층 패턴
  const floorMatch = address.match(/(\d+)층/)
  if (floorMatch) {
    return parseInt(floorMatch[1])  // 지상층은 양수
  }

  return 0  // 층수 정보 없음
}

/**
 * 시트 데이터를 SORTING_RULES.md 기준으로 정렬
 * 정렬 기준: 건물명 → 층수 → 호실 → 거래처명 → 상품코드
 */
export const sortSheetData = (data: any[][]): any[][] => {
  // 헤더 4행 분리
  const headers = data.slice(0, 4)
  const dataRows = data.slice(4)

  // 데이터 행 정렬
  const sortedRows = dataRows.sort((a, b) => {
    // 공급처주소 (B열, index 1)에서 정보 추출
    const addrA = parseAddress(a[1])
    const addrB = parseAddress(b[1])

    // 1차: 건물명 비교 (가나다순)
    if (!addrA.building && addrB.building) return 1
    if (addrA.building && !addrB.building) return -1

    const buildingCompare = addrA.building.localeCompare(addrB.building, 'ko-KR')
    if (buildingCompare !== 0) return buildingCompare

    // 2차: 층수 비교 (지하는 역순, 지상은 정순)
    if (addrA.floor !== addrB.floor) {
      return addrA.floor - addrB.floor
    }

    // 3차: 호실 비교 (오름차순)
    if (addrA.room !== addrB.room) {
      return addrA.room - addrB.room
    }

    // 4차: 거래처명 비교 (가나다순)
    const companyA = (a[0] || '').toString().trim()
    const companyB = (b[0] || '').toString().trim()

    if (!companyA && companyB) return 1
    if (companyA && !companyB) return -1

    const companyCompare = companyA.localeCompare(companyB, 'ko-KR')
    if (companyCompare !== 0) return companyCompare

    // 5차: 상품코드 비교 (E열, index 4) - 같은 업체 내 상품코드 정렬
    const productA = (a[4] || '').toString().trim()
    const productB = (b[4] || '').toString().trim()

    if (!productA && productB) return 1
    if (productA && !productB) return -1

    return productA.localeCompare(productB, 'ko-KR')
  })

  // 헤더 + 정렬된 데이터 결합
  return [...headers, ...sortedRows]
}

/**
 * 입고전표 업로드 후 데이터 정렬
 * 정렬 기준:
 * 1. 공급처주소(건물/층/호) → 거래처명 → 상품코드 (SORTING_RULES.md)
 * 2. 건물/업체 구분선 삽입
 */
export const sortReceiptData = (data: any[][]): any[][] => {
  // 헤더 4행 분리
  const headers = data.slice(0, 4)
  const dataRows = data.slice(4)

  // 데이터 행 정렬
  // 정렬 기준: 공급처주소(건물/층/호) → 거래처명 → 상품코드
  const sortedRows = dataRows.sort((a, b) => {
    // 1차: 공급처주소 비교 (B열, index 1)
    const addrA = parseAddress(a[1] || '')
    const addrB = parseAddress(b[1] || '')

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
    const companyA = (a[0] || '').toString().trim()
    const companyB = (b[0] || '').toString().trim()

    if (!companyA && companyB) return 1
    if (companyA && !companyB) return -1
    const companyCompare = companyA.localeCompare(companyB, 'ko-KR')
    if (companyCompare !== 0) return companyCompare

    // 3차: 상품코드 비교 (E열, index 4)
    const productA = (a[4] || '').toString().trim()
    const productB = (b[4] || '').toString().trim()

    if (!productA && productB) return 1
    if (productA && !productB) return -1

    return productA.localeCompare(productB, 'ko-KR')
  })

  // 구분선 삽입
  const finalRows: any[][] = []
  let prevBuilding = ''
  let prevCompany = ''

  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i]
    const company = (row[0] || '').toString().trim()
    const address = (row[1] || '').toString()
    const building = parseAddress(address).building

    // 1. 건물이 바뀌면 회색 빈 행 추가 (첫 번째 행 제외)
    if (i > 0 && prevBuilding !== building && prevBuilding !== '') {
      const emptyRow = new Array(row.length).fill('')
      emptyRow[0] = '__BUILDING_SEP__' // 마커 설정
      finalRows.push(emptyRow)
    }
    // 2. 같은 건물 내에서 거래처명이 바뀌면 흰색 빈 행 추가
    else if (i > 0 && prevBuilding === building && prevCompany !== company && prevCompany !== '') {
      const emptyRow = new Array(row.length).fill('')
      emptyRow[0] = '__COMPANY_SEP__' // 마커 설정
      finalRows.push(emptyRow)
    }

    finalRows.push(row)
    prevBuilding = building
    prevCompany = company
  }

  // 헤더 + 정렬된 데이터 결합
  return [...headers, ...finalRows]
}

/**
 * 중복 상품 감지
 * 상품 코드(E열, index 4)를 기준으로 중복 체크
 */
export const detectDuplicateProducts = (data: any[][]): { [key: number]: string } => {
  const productMap: { [key: string]: number[] } = {}

  for (let i = 4; i < data.length; i++) {
    const row = data[i]

    // 마커 확인 (구분선은 중복 체크 제외)
    if (row[0] === '__BUILDING_SEP__' || row[0] === '__COMPANY_SEP__') continue

    // 행이 완전히 비어있는지 확인 (A, B, F열 중 하나라도 값이 있어야 유효한 행)
    const hasCompanyName = row[0] && row[0] !== '' // A열 (회사명)
    const hasAddress = row[1] && row[1] !== '' // B열 (주소)
    const hasProductName = row[5] && row[5] !== '' // F열 (상품명)
    const isValidRow = hasCompanyName || hasAddress || hasProductName

    const productCode = row[4] // E열 (상품코드)

    // 유효한 행이고 상품코드가 있는 경우만 중복 체크
    if (isValidRow && productCode && productCode !== '') {
      if (!productMap[productCode]) {
        productMap[productCode] = []
      }
      productMap[productCode].push(i)
    }
  }

  const duplicates: { [key: number]: string } = {}
  Object.keys(productMap).forEach(code => {
    if (productMap[code].length > 1) {
      productMap[code].forEach(rowIdx => {
        duplicates[rowIdx] = code
      })
    }
  })

  return duplicates
}

/**
 * 문자열 정규화 함수 (매칭 비교용)
 */
export const normalizeString = (str: any): string => {
  if (!str) return ''
  return String(str).trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 숫자 비교 함수 (오차 허용)
 */
export const compareNumbers = (a: any, b: any): boolean => {
  const numA = typeof a === 'number' ? a : parseFloat(String(a).replace(/,/g, ''))
  const numB = typeof b === 'number' ? b : parseFloat(String(b).replace(/,/g, ''))
  return !isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) < 0.01
}

/**
 * 입고전표 처리 후 데이터 가공 (색상, 자동 체크 등)
 */
export const processReceiptSlipData = (data: any[][]) => {
  const colors: { [key: number]: string } = {}
  const textColors: { [key: number]: string } = {}
  const autoChecked: { [key: number]: boolean } = {}

  // 1. 중복 상품 감지
  const duplicates = detectDuplicateProducts(data)

  // 2. 행 분석
  for (let i = 4; i < data.length; i++) {
    const row = data[i]

    // 구분선 마커 처리
    if (row[0] === '__BUILDING_SEP__') {
      colors[i] = '#d1d5db' // 회색 배경
      row[0] = '' // 마커 제거
      continue
    } else if (row[0] === '__COMPANY_SEP__') {
      // 흰색 배경 (기본값)
      row[0] = '' // 마커 제거
      continue
    }

    // I열(8), L열(11), O열(14) 비교
    const valI = row[8]
    const valL = row[11]
    const valO = row[14]

    const isMatch = compareNumbers(valI, valL) && compareNumbers(valL, valO)

    // K열(10) 교환 확인
    const valK = row[10]
    const isExchange = valK && parseFloat(String(valK).replace(/,/g, '')) > 0

    // 색상 설정
    if (isExchange) {
      textColors[i] = '#ff0000' // 빨간색 텍스트
      // 배경색은 설정하지 않음 (기본값 또는 다른 로직에 따름)
    } else if (isMatch) {
      colors[i] = '#e6fffa' // 연한 초록색 배경 (Teal 50)
    }

    // 자동 체크 (일치하고 중복이 아닌 경우)
    if (isMatch && !duplicates[i]) {
      autoChecked[i] = true
    }
  }

  return {
    colors,
    textColors,
    duplicates,
    autoChecked
  }
}
