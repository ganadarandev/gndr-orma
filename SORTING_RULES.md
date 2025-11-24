# 스프레드시트 정렬 기준 (Sorting Rules)

## 개요
스프레드시트 탭의 데이터는 항상 일관된 정렬 기준을 유지해야 합니다.
사용자가 입금 관리로 데이터를 보낸 후 다시 스프레드시트로 돌아올 때도 동일한 정렬이 유지되어야 합니다.

**핵심 원칙**: 공급처 주소(건물명 + 층수 + 호실) 기준으로 정렬하여 같은 건물의 내역들을 함께 묶습니다.

## 정렬 우선순위

### 1차 정렬: 공급처주소 - 건물명 (B열, index 1)
- **정렬 방식**: 가나다순 (오름차순)
- **예시**: 디오트 → 청평화 → ...
- **한글 정렬**: ㄱ, ㄴ, ㄷ, ... ㅎ 순서
- **영문 정렬**: A-Z (대소문자 구분 없음)
- **빈 값**: 정렬 대상에서 제외 (맨 뒤로 이동)

### 2차 정렬: 공급처주소 - 층수 (B열에서 추출)
- **정렬 방식**: 지하는 역순, 지상은 정순
- **정렬 순서**: 지하3층 → 지하2층 → 지하1층 → 1층 → 2층 → 3층 → 4층 → 5층 ...
- **층수 추출 규칙**:
  - "지하 X층", "B X층", "지하X층" → 음수로 변환 (지하3층 = -3)
  - "X층", "F X층" → 양수로 변환 (2층 = 2)
  - 층수 없음 → 0으로 처리
- **빈 값**: 해당 건물 내에서 0층으로 처리

### 3차 정렬: 공급처주소 - 호실 (B열에서 추출)
- **정렬 방식**: 오름차순 (숫자 정렬)
- **호실 추출 규칙**:
  - "XXX호", "호실 XXX" → 숫자로 변환
  - 호실 없음 → 0으로 처리
- **예시**: 101호 → 102호 → 103호 ...
- **빈 값**: 해당 층 내에서 0호로 처리

### 4차 정렬: 거래처명 (A열, index 0)
- **정렬 방식**: 가나다순 (오름차순)
- **용도**: 같은 위치(건물/층/호실)에 여러 거래처가 있는 경우
- **빈 값**: 해당 위치 내에서 맨 뒤로 이동

## 정렬 적용 시점

### 필수 적용 시점
1. **엑셀 파일 업로드 직후**
   - 주문서, 주문입고, 입고전표 업로드 시
   - 데이터 로드 완료 후 즉시 정렬

2. **입금 관리로 보내기 후** ✅ 구현 완료
   - 체크된 항목을 입금 관리로 보낸 후
   - 남은 데이터를 정렬하여 표시
   - **구현 위치**: `Dashboard.tsx` lines 311-402
   - **적용 로직**: parseAddress() 함수로 건물명, 층수, 호실 추출 후 4단계 정렬

3. **임시 저장 불러오기 후**
   - Work Draft를 불러온 후
   - 정렬 상태 복원

4. **데이터 수정 후**
   - 사용자가 셀 값을 수정한 경우
   - 저장 시 정렬 적용

## 정렬 제외 대상

### 헤더 행 (고정)
- **행 1-4**: 헤더 및 메타데이터 행
- 항상 최상단에 고정
- 정렬 대상에서 제외

### 빈 행 (구분선)
- 거래처명(A열)이 비어있는 행
- 정렬 후 맨 뒤로 이동하거나 필터링
- **건물 구분선**: 건물명이 바뀔 때마다 자동으로 빈 행 삽입
  - 예: 디오트 마지막 행 → 빈 행 → 청평화 첫 행
  - 구현 위치: `Dashboard.tsx` lines 379-402

## 정렬 구현 방식

```javascript
// 주소에서 건물명, 층수, 호실 추출 함수
function parseAddress(address) {
  if (!address) return { building: '', floor: 0, room: 0 }

  const addr = address.toString().trim()

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

// 정렬 함수
function sortSpreadsheetData(data) {
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
    // floor가 음수면 지하, 양수면 지상
    if (addrA.floor !== addrB.floor) {
      return addrA.floor - addrB.floor // -3, -2, -1, 0, 1, 2, 3 순서
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

    return companyA.localeCompare(companyB, 'ko-KR')
  })

  // 헤더 + 정렬된 데이터 결합
  return [...headers, ...sortedRows]
}
```

## 정렬 상태 유지

### 임시 저장 시
- 정렬된 상태 그대로 저장
- `data` 배열의 순서가 정렬 순서

### 불러오기 시
- 저장된 순서대로 복원
- 추가 정렬 불필요 (이미 정렬된 상태)

### 탭 전환 시
- 정렬 상태 유지
- 재정렬 불필요

## 예외 처리

### NULL/undefined 값
- 빈 문자열('')로 변환
- 정렬 시 맨 뒤로 이동

### 숫자형 문자열
- 문자열로 취급
- 사전순 정렬 적용
- 예: "1", "10", "2" → "1", "10", "2" (문자열 순서)

### 혼합 데이터 타입
- 모두 문자열로 변환하여 비교
- `toString().trim()` 적용

## 성능 고려사항

### 대용량 데이터
- 1000행 이상: 정렬 시간 모니터링
- 필요 시 웹 워커 사용 고려

### 정렬 빈도 최소화
- 필요한 시점에만 정렬 실행
- 불필요한 재정렬 방지

## 사용자 경험

### 정렬 피드백
- 정렬 진행 중 로딩 표시 (1000행 이상)
- 정렬 완료 후 토스트 메시지 (선택적)

### 정렬 일관성
- 모든 탭에서 동일한 정렬 기준 적용
- 사용자가 데이터 위치를 예측 가능하게 유지
