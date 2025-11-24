# 프로젝트 구조 (Project Structure)

## 📁 전체 구조 (리팩토링 진행 중)

```
gndr-orma/
├── frontend/                      # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx                  [2809 → ~500 lines] 🔄 리팩토링 중
│   │   │   ├── PaymentManagement.tsx          [325 lines] ✅ 안정
│   │   │   ├── OrderManagement.tsx            [~300 lines] ✅ 안정
│   │   │   └── ClientManagement.tsx           [~250 lines] ✅ 안정
│   │   │
│   │   ├── hooks/                             📁 NEW - 완료 ✅
│   │   │   ├── useSheetManagement.ts          ✅ 완료 (202 lines)
│   │   │   ├── useExcelOperations.ts          ✅ 완료 (294 lines)
│   │   │   ├── usePaymentOperations.ts        ✅ 완료 (351 lines)
│   │   │   ├── useOrderOperations.ts          ✅ 완료 (296 lines)
│   │   │   ├── useDraftManagement.ts          ✅ 완료 (188 lines)
│   │   │   └── useSpreadsheet.ts              ✅ 기존 (체크박스 로직)
│   │   │
│   │   ├── utils/                             📁 NEW - 완료
│   │   │   ├── dataProcessing.ts              ✅ 완료
│   │   │   │   ├── parseAddress()                 # 주소 파싱
│   │   │   │   ├── extractBuilding()              # 건물명 추출
│   │   │   │   ├── extractFloor()                 # 층수 추출
│   │   │   │   ├── sortSheetData()                # 4단계 정렬
│   │   │   │   ├── detectDuplicateProducts()      # 중복 감지
│   │   │   │   ├── normalizeString()              # 문자열 정규화
│   │   │   │   └── compareNumbers()               # 숫자 비교
│   │   │   │
│   │   │   └── excelValidation.ts            ✅ 완료
│   │   │       ├── validateAndMergeData()         # 주문서+주문입고 병합
│   │   │       └── validateAndMergeReceiptSlip()  # 주문입고+입고전표 병합
│   │   │
│   │   ├── components/
│   │   │   ├── SpreadsheetView.tsx            [1264 lines] ✅ 안정
│   │   │   ├── FileManagement.tsx             ✅ 안정
│   │   │   ├── UnsavedChangesModal.tsx        ✅ 안정
│   │   │   └── modals/                        📁 NEW - 모달 분리 ✅ 완료
│   │   │       ├── PaymentDateModal.tsx           ✅ 완료 (~60 lines)
│   │   │       └── OrderDateModal.tsx             ✅ 완료 (~85 lines)
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                         ✅ 안정 (API 클라이언트)
│   │   │       ├── authAPI                        # 인증 API
│   │   │       ├── excelAPI                       # 엑셀 업로드/다운로드
│   │   │       ├── workDraftAPI                   # 임시 저장
│   │   │       ├── paymentAPI                     # 입금 관리
│   │   │       ├── savedFilesAPI                  # 파일 저장/조회
│   │   │       ├── ordersAPI                      # 발주 관리
│   │   │       └── clientsAPI                     # 거래처 관리
│   │   │
│   │   └── store/
│   │       └── authStore.ts                   ✅ 안정 (Zustand 상태 관리)
│   │
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── functions/                     # Firebase Cloud Functions (Gen2)
│   ├── src/
│   │   └── index.ts                           [1937 lines] ✅ 안정
│   │       ├── /token (POST)                      # 로그인
│   │       ├── /users/me (GET)                    # 사용자 정보
│   │       ├── /excel/upload (POST)               # 엑셀 업로드
│   │       ├── /excel/load (GET)                  # 엑셀 로드
│   │       ├── /excel/upload-order-receipt (POST) # 주문입고 업로드
│   │       ├── /excel/upload-receipt-slip (POST)  # 입고전표 업로드
│   │       ├── /excel/export (POST)               # 엑셀 내보내기
│   │       ├── /work-drafts/* (POST/GET/DELETE)   # 임시 저장 CRUD
│   │       ├── /payments/* (POST/GET/DELETE)      # 입금 관리 CRUD
│   │       ├── /files/* (POST/GET)                # 파일 저장/조회
│   │       ├── /orders/* (POST/GET)               # 발주 관리 CRUD
│   │       └── /clients/* (POST/GET/PUT/DELETE)   # 거래처 관리 CRUD
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                       # Python FastAPI (로컬 개발용, 사용 안 함)
│   └── main.py
│
├── docs/                          # 📚 문서
│   ├── REFACTORING_LOG.md                     ✅ 리팩토링 진행 기록
│   ├── PROJECT_STRUCTURE.md                   ✅ 이 파일
│   └── SORTING_RULES.md                       ✅ 정렬 규칙 명세 (루트에도 존재)
│
├── .backup/                       # 백업 디렉토리
│   └── Dashboard.tsx.backup-*                 ✅ 백업 완료
│
├── firebase.json                  # Firebase 설정
├── .firebaserc                    # Firebase 프로젝트 설정
├── package.json                   # 루트 package.json
└── SORTING_RULES.md               ✅ 정렬 규칙 명세

```

## 🎯 리팩토링 목표

### Before (현재)
```
Dashboard.tsx: 2809 lines
├── State (46 lines)
├── Event Handlers (113 lines)
├── Payment Operations (372 lines)
├── Order Operations (282 lines)
├── Data Processing (77 lines)
├── Excel Operations (199 lines)
├── Draft Management (115 lines)
├── Utility Functions (103 lines)
├── UI Render Logic (1502 lines)
└── Modals (inline)
```

### After (목표)
```
Dashboard.tsx: ~500 lines
├── Hook Imports (10 lines)
├── UI State (20 lines)
├── UI Render Logic (470 lines)
└── ✅ 깔끔한 메인 컴포넌트

hooks/
├── useSheetManagement.ts (~200 lines)
├── useExcelOperations.ts (~250 lines)
├── usePaymentOperations.ts (~400 lines)
├── useOrderOperations.ts (~300 lines)
└── useDraftManagement.ts (~150 lines)

utils/
├── dataProcessing.ts (~200 lines) ✅ 완료
└── excelValidation.ts (~150 lines) ✅ 완료

components/modals/
├── PaymentDateModal.tsx (~80 lines)
├── OrderDateModal.tsx (~80 lines)
├── ClientInfoModal.tsx (~100 lines)
└── SaveFileModal.tsx (~100 lines)
```

## 📊 파일 크기 감소 효과

| 파일 | Before | After | 감소율 |
|-----|--------|-------|--------|
| Dashboard.tsx | 2809 lines | ~500 lines | **-82%** |
| 총 라인 수 | 2809 lines | ~2300 lines | 변화 없음 (재구성) |
| 파일 개수 | 1개 | 11개 | 관심사 분리 |
| 유지보수성 | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |

## 🔍 핵심 파일 상세

### Dashboard.tsx (리팩토링 대상)
**위치**: `/frontend/src/pages/Dashboard.tsx`
**현재 크기**: 2809 lines
**목표 크기**: ~500 lines
**역할**: 스프레드시트 메인 UI + 로직 통합

**주요 기능**:
- 엑셀 업로드/다운로드
- 주문입고/입고전표 병합
- 입금 관리로 보내기
- 발주 관리로 보내기
- 임시 저장/불러오기
- 체크박스 관리
- 정렬 및 구분선 처리

### SpreadsheetView.tsx (변경 없음)
**위치**: `/frontend/src/components/SpreadsheetView.tsx`
**크기**: 1264 lines
**역할**: 스프레드시트 UI 렌더링 컴포넌트
**상태**: ✅ 안정 (변경 불필요)

### index.ts (Cloud Functions)
**위치**: `/functions/src/index.ts`
**크기**: 1937 lines
**역할**: Firebase Cloud Functions Gen2 백엔드
**상태**: ✅ 안정

## 🚀 배포 프로세스

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Cloud Functions)
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 전체 배포
```bash
firebase deploy
```

## 📝 주요 의존성

### Frontend
- React 18
- TypeScript 5
- Vite 5
- React Router DOM
- Zustand (상태 관리)
- Axios (HTTP 클라이언트)
- React Hot Toast (알림)
- Lucide React (아이콘)

### Backend (Cloud Functions)
- Express.js
- ExcelJS (엑셀 처리)
- Firebase Admin SDK
- Multer (파일 업로드)
- JWT (인증)

## 🔐 인증 흐름

```
1. Login (/token) → JWT 토큰 발급
2. 토큰 저장 (localStorage: 'auth-token')
3. API 요청 시 헤더에 포함 (Authorization: Bearer {token})
4. verifyToken 미들웨어로 검증
5. 401 에러 시 자동 로그아웃
```

## 📌 중요 파일 경로

| 파일 | 경로 |
|------|------|
| Dashboard (리팩토링 대상) | `/frontend/src/pages/Dashboard.tsx` |
| 백업 파일 | `/.backup/Dashboard.tsx.backup-*` |
| 정렬 규칙 명세 | `/SORTING_RULES.md` |
| 리팩토링 로그 | `/docs/REFACTORING_LOG.md` |
| 프로젝트 구조 | `/docs/PROJECT_STRUCTURE.md` |
| API 서비스 | `/frontend/src/services/api.ts` |
| Cloud Functions | `/functions/src/index.ts` |
| Utils (NEW) | `/frontend/src/utils/*.ts` |
| Hooks (NEW) | `/frontend/src/hooks/*.ts` |
