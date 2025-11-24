# Dashboard.tsx 리팩토링 진행 기록

## 📅 작업 일시
- 시작: 2025-01-19
- 목적: Dashboard.tsx (2809 lines) 모듈화 및 유지보수성 개선

## 🎯 리팩토링 목표

1. **기능 100% 보존**: 모든 기존 로직 그대로 유지
2. **구조 개선**: 2809 lines → ~500 lines (Dashboard.tsx)
3. **유지보수성 향상**: 로직별 모듈 분리
4. **깜빡거림 방지**: 정렬 로직 변경 금지 (현재 안정 버전 유지)

## ✅ 완료된 작업

### Phase 1: Utils 함수 분리 (완료)

#### 1.1 데이터 처리 유틸리티 생성
**파일**: `/frontend/src/utils/dataProcessing.ts`

**함수 목록**:
- `parseAddress(address: any): ParsedAddress`
  - 주소에서 건물명, 층수, 호실 추출
  - SORTING_RULES.md 기준 준수
  - 반환: `{ building: string, floor: number, room: number }`

- `extractBuilding(address: string): string`
  - 건물명만 추출 (입금 관리용)
  - 패턴: APM, 누죤, 스튜디오W, 테크노, 디오트, 신평화, 청평화 등

- `extractFloor(address: string): number`
  - 층수만 추출
  - 지하: 음수 반환 (지하3층 = -3)
  - 지상: 양수 반환 (3층 = 3)

- `sortSheetData(data: any[][]): any[][]`
  - 4단계 정렬: 건물명 → 층수 → 호실 → 거래처명
  - SORTING_RULES.md 완전 준수
  - ⚠️ **중요**: 이 로직은 절대 수정 금지 (깜빡거림 방지)

- `detectDuplicateProducts(data: any[][]): {[key: number]: string}`
  - 상품 코드(E열) 기준 중복 감지
  - 반환: 중복 행 인덱스와 상품 코드 매핑

- `normalizeString(str: any): string`
  - 문자열 정규화 (매칭 비교용)
  - 공백 제거, 소문자 변환

- `compareNumbers(a: any, b: any): boolean`
  - 숫자 비교 (오차 0.01 허용)

#### 1.2 엑셀 검증 유틸리티 생성
**파일**: `/frontend/src/utils/excelValidation.ts`

**함수 목록**:
- `validateAndMergeData(originalData, receiptData): ValidationResult`
  - 주문서 + 주문입고 데이터 병합
  - A, E, I열 매칭 로직
  - J, K, L, M, N, Q열 병합
  - K열(교환) 값 있으면 빨간색 표시

- `validateAndMergeReceiptSlip(currentData, receiptSlipData): ValidationResult`
  - 주문입고 + 입고전표 데이터 병합
  - O, P열 병합

**반환 타입**: `ValidationResult`
```typescript
{
  success: boolean
  message?: string
  mergedData?: any[][]
  matchedCount?: number
  exchangeRows?: {[key: number]: string}
}
```

## 🔄 진행 중인 작업

### Phase 2: Custom Hooks 분리 (진행 중)

#### 2.1 useSheetManagement ✅ 완료
**파일**: `/frontend/src/hooks/useSheetManagement.ts`

**기능**:
- 시트 배열 및 선택된 시트 인덱스 관리
- 시트 이름 편집 (handleStartEditingSheetName, handleSaveSheetName, handleCancelEditingSheetName)
- 시트 추가/삭제 (addSheet, removeSheet)
- 시트별 독립적인 상태 관리 (rowColors, rowTextColors, duplicateProducts, checkedRows)
- 시트 전환 시 상태 동기화 (useEffect)
- 현재 시트 데이터 업데이트 (updateCurrentSheetData)
- 체크박스 관리 (handleCheckRow)

**반환값**:
```typescript
{
  // 시트 상태
  sheets, setSheets,
  selectedSheet, setSelectedSheet,

  // 시트별 독립 상태
  rowColors, setRowColors,
  rowTextColors, setRowTextColors,
  duplicateProducts, setDuplicateProducts,
  checkedRows, setCheckedRows,

  // 시트 이름 편집 상태
  editingSheet, setEditingSheet,
  editingName, setEditingName,

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
```

#### 2.2 useExcelOperations ✅ 완료
**파일**: `/frontend/src/hooks/useExcelOperations.ts`

**기능**:
- 주문서 엑셀 업로드 (handleFileUpload)
- 주문입고 업로드 및 병합 (handleOrderReceiptUpload)
- 입고전표 업로드 및 O열 병합 (handleReceiptSlipUpload)
- 웹 저장 (handleSaveToWeb)
- 엑셀 다운로드 (handleDownloadExcel)
- 체크된 행 필터링 (getFilteredData)
- 업로드 상태 관리 (isOrderReceiptUploaded, isReceiptSlipUploaded)

**의존성**:
- `validateAndMergeData`, `validateAndMergeReceiptSlip` from `utils/excelValidation`
- `sortSheetData`, `detectDuplicateProducts` from `utils/dataProcessing`
- `excelAPI` from `services/api`

**참고**:
- handleReceiptSlipUpload의 일부 로직(`calculateRowColorsAndDifferences`, `sortByProductCode`, `autoCheckCompletedRows`)은
  아직 Dashboard.tsx에 남아 있으므로, 추후 별도 Hook/Utils로 분리 필요

#### 2.3 usePaymentOperations ✅ 완료
**파일**: `/frontend/src/hooks/usePaymentOperations.ts`

**기능**:
- 입금일자 모달 상태 관리 (showPaymentDateModal, selectedPaymentDate)
- 체크된 항목 입금 관리로 이동 (moveCheckedToPayment, confirmPaymentDate)
- 건물명/층수 기준 정렬 (extractBuilding, extractFloor 사용)
- 구분선 자동 삽입 (건물별 회색, 거래처별 흰색)
- 입금액 자동 계산 (T열 = H열 * O열)
- 3개 파일 동시 저장 (매칭, 정상, 오류)

**반환값**:
```typescript
{
  // 모달 상태
  showPaymentDateModal, setShowPaymentDateModal,
  selectedPaymentDate, setSelectedPaymentDate,

  // 입금 관리 핸들러
  moveCheckedToPayment,
  confirmPaymentDate
}
```

**의존성**:
- `extractBuilding`, `extractFloor`, `parseAddress` from `utils/dataProcessing`
- `paymentAPI`, `savedFilesAPI` from `services/api`

#### 2.4 useOrderOperations ✅ 완료
**파일**: `/frontend/src/hooks/useOrderOperations.ts`

**기능**:
- 발주일자 모달 상태 관리 (showOrderDateModal, selectedOrderDate, orderType)
- 체크된 항목 발주 관리로 이동 (moveCheckedToOrder, confirmOrderDate)
- 발주 규칙 적용:
  - Rule 1 (미송): I>0 and L=0 and O=0 → I→J, Q→R 이동
  - Rule 2 (교환): K>0 and N=0 and O=0 → 행 그대로 이동
- 건물/층수/호실/거래처 정렬 (4단계)
- 구분선 자동 삽입 (건물별 회색, 거래처별 흰색)
- ordersAPI.saveOrders() 통합
- 정렬 후 중복 상품 감지 (detectDuplicateProducts)
- 백업 생성 (되돌리기용)

**반환값**:
```typescript
{
  // 모달 상태
  showOrderDateModal, setShowOrderDateModal,
  selectedOrderDate, setSelectedOrderDate,
  orderType, setOrderType,

  // 발주 관리 핸들러
  moveCheckedToOrder,
  confirmOrderDate
}
```

**의존성**:
- `parseAddress`, `detectDuplicateProducts` from `utils/dataProcessing`
- `ordersAPI` from `services/api`

#### 2.5 useDraftManagement ✅ 완료
**파일**: `/frontend/src/hooks/useDraftManagement.ts`

**기능**:
- 작업 이탈 방지 상태 관리 (hasUnsavedChanges, showUnsavedModal)
- 중간 저장 (saveDraft)
- 임시 저장 불러오기 (loadDraft)
- 초기 로드 시 임시 저장 확인 (checkForDraft)
- 모달 핸들러 (handleSaveDraftAndNavigate, handleContinueEditing, handleDiscardChanges)
- 로그아웃 핸들러 (handleLogout)
- 브라우저 이탈 방지 (beforeunload) 관련 refs

**반환값**:
```typescript
{
  // 작업 이탈 방지 상태
  hasUnsavedChanges, setHasUnsavedChanges,
  showUnsavedModal, setShowUnsavedModal,
  pendingNavigation, setPendingNavigation,
  isNavigatingRef, initialLoadRef,

  // 임시 저장 핸들러
  saveDraft, loadDraft, checkForDraft,

  // 모달 핸들러
  handleSaveDraftAndNavigate,
  handleContinueEditing,
  handleDiscardChanges,
  handleLogout
}
```

**의존성**:
- `workDraftAPI` from `services/api`
- `useNavigate` from `react-router-dom`

## 📁 프로젝트 구조 (리팩토링 후)

```
frontend/src/
├── pages/
│   └── Dashboard.tsx                    (~500 lines, 메인 UI 로직만)
│
├── hooks/
│   ├── useSheetManagement.ts           (시트 관리)
│   ├── useExcelOperations.ts           (엑셀 업로드/다운로드)
│   ├── usePaymentOperations.ts         (입금 관리)
│   ├── useOrderOperations.ts           (발주 관리)
│   └── useDraftManagement.ts           (임시 저장)
│
├── utils/
│   ├── dataProcessing.ts               ✅ 완료 (정렬, 파싱, 중복 감지)
│   └── excelValidation.ts              ✅ 완료 (데이터 병합 검증)
│
├── components/
│   ├── SpreadsheetView.tsx             (기존)
│   ├── FileManagement.tsx              (기존)
│   ├── UnsavedChangesModal.tsx         (기존)
│   └── modals/                         (TODO: 모달 분리)
│       ├── PaymentDateModal.tsx
│       ├── OrderDateModal.tsx
│       ├── ClientInfoModal.tsx
│       └── SaveFileModal.tsx
│
└── services/
    └── api.ts                           (기존)
```

## ⚠️ 주의사항

### 절대 수정 금지 영역
1. **정렬 로직**: `sortSheetData()` 함수
   - 위치: `/utils/dataProcessing.ts`
   - 이유: 깜빡거림 방지 (현재 안정 버전)

2. **데이터 병합 로직**: `validateAndMergeData()` 함수
   - 위치: `/utils/excelValidation.ts`
   - 이유: 검증된 매칭 알고리즘

3. **주소 파싱 로직**: `parseAddress()` 함수
   - 위치: `/utils/dataProcessing.ts`
   - 이유: SORTING_RULES.md 기준 완전 준수

### 리팩토링 원칙
- ✅ **코드 이동만**: 로직 변경 금지
- ✅ **함수 추출**: 긴 함수를 작은 함수로 분리
- ✅ **타입 안정성**: TypeScript 타입 명확히 정의
- ❌ **로직 수정**: 기존 동작 방식 변경 금지
- ❌ **알고리즘 변경**: 정렬/병합/파싱 알고리즘 수정 금지

## 📊 진행률

- [x] Phase 1: Utils 함수 분리 (100%)
  - [x] dataProcessing.ts 생성
  - [x] excelValidation.ts 생성
- [x] Phase 2: Custom Hooks 분리 (100%) ✅ 완료
  - [x] useSheetManagement.ts ✅ 완료
  - [x] useExcelOperations.ts ✅ 완료
  - [x] usePaymentOperations.ts ✅ 완료
  - [x] useOrderOperations.ts ✅ 완료
  - [x] useDraftManagement.ts ✅ 완료
- [x] Phase 3: 모달 컴포넌트 분리 (100%) ✅ 완료
  - [x] PaymentDateModal.tsx ✅ 완료 (~60 lines)
  - [x] OrderDateModal.tsx ✅ 완료 (~85 lines)
- [~] Phase 4: Dashboard.tsx 리팩토링 (80%) 🔄 진행 중
  - [x] 백업 생성 (.backup/Dashboard.tsx.backup-phase4-20251119-174016)
  - [x] Dashboard.tsx 리팩토링 완료 (2809 → 754 lines, 73% 감소)
  - [x] Custom Hooks import 및 통합
  - [x] Modal 컴포넌트 통합
  - [ ] TypeScript 에러 수정 (Hook 인터페이스 불일치 20개)
- [ ] Phase 5: 테스트 및 배포 (0%)

## 🔍 다음 단계

1. ~~Phase 1: Utils 함수 분리~~ ✅ 완료
2. ~~Phase 2: Custom Hooks 분리~~ ✅ 완료
3. ~~Phase 3: 모달 컴포넌트 분리~~ ✅ 완료
4. **Phase 4: Dashboard.tsx 리팩토링** 🔄 다음 작업
   - Hook 통합
   - 모달 컴포넌트 통합
   - 기존 로직 교체
   - 파일 크기 2809 → ~500 lines 목표
5. Phase 5: 테스트 및 배포
   - 빌드 및 타입 체크
   - 로컬 테스트
   - Firebase 배포

## 📝 참고 문서

- [SORTING_RULES.md](/Users/pablokim/gndr-orma/SORTING_RULES.md) - 정렬 규칙 명세
- [PaymentManagement.tsx](/Users/pablokim/gndr-orma/frontend/src/pages/PaymentManagement.tsx) - 입금 관리 참고
- [api.ts](/Users/pablokim/gndr-orma/frontend/src/services/api.ts) - API 인터페이스
