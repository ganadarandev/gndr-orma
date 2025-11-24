# GNDR Order Management System - Sitemap

## 프로젝트 구조

### Frontend Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.tsx                    # 로그인 페이지
│   │   ├── Dashboard.tsx                # 메인 대시보드 (리팩토링 필요 - 2312 lines)
│   │   └── [계획] 분리된 페이지들:
│   │       ├── SpreadsheetTab.tsx       # 스프레드시트 탭
│   │       ├── PaymentManagement.tsx    # 입금 관리 탭
│   │       ├── OrderManagement.tsx      # 발주 관리 탭
│   │       └── FileManagement.tsx       # 파일 관리 탭 (이미 컴포넌트로 분리됨)
│   ├── components/
│   │   ├── SpreadsheetView.tsx          # 스프레드시트 뷰어 컴포넌트
│   │   ├── SpreadsheetView.css          # 스프레드시트 스타일
│   │   ├── FileManagement.tsx           # 파일 관리 컴포넌트
│   │   ├── UnsavedChangesModal.tsx      # 저장되지 않은 변경사항 모달
│   │   └── [계획] 추가 컴포넌트:
│   │       ├── DatePickerModal.tsx      # 날짜 선택 모달
│   │       ├── PaymentSummary.tsx       # 입금 요약 컴포넌트
│   │       └── OrderTypeSelector.tsx    # 발주 유형 선택기
│   ├── hooks/
│   │   └── [계획] 커스텀 훅:
│   │       ├── usePaymentData.ts        # 입금 데이터 관리 훅
│   │       ├── useOrderData.ts          # 발주 데이터 관리 훅
│   │       ├── useSpreadsheet.ts        # 스프레드시트 상태 관리 훅
│   │       └── useExcelUpload.ts        # 엑셀 업로드 로직 훅
│   ├── services/
│   │   └── api.ts                       # API 서비스 레이어
│   └── store/
│       ├── authStore.ts                 # 인증 상태 관리
│       └── sheetStore.ts                # 시트 상태 관리
```

### Backend Structure (Modular Architecture)

```
backend/
├── main.py                              # FastAPI 메인 애플리케이션 (106 lines) ✅ REFACTORED
│   └── Router Integration               # 라우터 통합 및 CORS 설정
├── routers/                             # 모듈화된 라우터
│   ├── auth.py                          # 인증 API (33 lines)
│   │   ├── POST /token                  # 로그인
│   │   └── GET /users/me                # 현재 사용자 정보
│   ├── excel.py                         # 엑셀 처리 API (1734 lines)
│   │   ├── POST /excel/upload           # 주문서 업로드
│   │   ├── POST /excel/upload-order-receipt
│   │   ├── POST /excel/upload-receipt-slip
│   │   ├── GET /excel/load              # 로드된 파일 조회
│   │   ├── GET /excel/check             # 파일 상태 확인
│   │   └── POST /excel/export           # 엑셀 내보내기
│   ├── payments.py                      # 입금 관리 API (353 lines)
│   │   ├── POST /payments/save          # 입금 내역 저장
│   │   ├── GET /payments/date/{date}    # 날짜별 입금 조회
│   │   ├── GET /payments/range          # 기간별 입금 조회
│   │   ├── DELETE /payments/delete      # 입금 내역 삭제
│   │   └── DELETE /payments/delete-all  # 전체 입금 내역 삭제
│   ├── orders.py                        # 발주 관리 API (197 lines)
│   │   ├── POST /orders/save            # 발주 내역 저장
│   │   ├── GET /orders/list             # 전체 발주 목록
│   │   └── GET /orders/date/{date}      # 날짜별 발주 조회
│   ├── files.py                         # 파일 관리 API (217 lines)
│   │   ├── POST /files/save-three-files # 3개 파일 자동 저장
│   │   ├── GET /files/list              # 파일 목록
│   │   ├── GET /files/view/{file_id}    # 파일 보기
│   │   └── GET /files/download/{file_id}# 파일 다운로드
│   ├── drafts.py                        # 임시 저장 API (610 lines)
│   │   ├── POST /work-drafts/save       # 작업 임시 저장
│   │   └── GET /work-drafts/load        # 임시 저장 불러오기
│   └── admin.py                         # 관리자 API (134 lines)
│       ├── GET /admin/stats             # 통계 조회
│       ├── DELETE /admin/payments/clear-all
│       ├── DELETE /admin/orders/clear-all
│       ├── DELETE /admin/files/clear-all
│       └── POST /admin/restart          # 서버 재시작
├── dependencies.py                      # 공통 의존성 (인증, DB)
├── models.py                            # Pydantic 모델 및 유틸리티
├── database.py                          # 데이터베이스 모델
│   ├── User                             # 사용자
│   ├── DailyOrder                       # 일일 주문
│   ├── Product                          # 제품
│   ├── WorkDraft                        # 작업 임시 저장
│   ├── PaymentRecord                    # 입금 내역
│   ├── OrderRecord                      # 발주 내역
│   ├── SavedFile                        # 저장된 파일
│   └── Client                           # 거래처 (NEW)
├── sheet_manager.py                     # 시트 관리 유틸리티
├── main_backup.py                       # 원본 백업 (2480 lines)
└── gndr_database.db                     # SQLite 데이터베이스
```

## 페이지 기능 분류

### 1. Dashboard (메인 컨테이너)
- **역할**: 탭 네비게이션 및 전역 상태 관리
- **포함 탭**:
  - 스프레드시트
  - 입금 관리
  - 발주 관리 (NEW)
  - 파일 관리

### 2. 스프레드시트 탭
- **파일**: `SpreadsheetTab.tsx` (분리 예정)
- **기능**:
  - 엑셀 파일 업로드 (주문서, 주문입고, 입고전표)
  - 시트 뷰어 및 편집
  - 행 체크박스 및 색상 표시
  - 중복 제품 감지
  - "입금 관리로 보내기" 버튼
  - "발주 관리로 보내기" 버튼 (NEW)

### 3. 입금 관리 탭
- **파일**: `PaymentManagement.tsx` (분리 예정)
- **기능**:
  - 일자별 입금 내역 조회
  - 거래처별 합계 표시
  - 스프레드시트 형태로 데이터 표시
  - 추가 입금 내역 전송 가능 (기존 내역과 합산)

### 4. 발주 관리 탭 (NEW)
- **파일**: `OrderManagement.tsx` (신규 생성 예정)
- **기능**:
  - MMDD 날짜별 발주 시트 관리
  - 발주 유형별 분류 (교환/미송/기타)
  - 스프레드시트 형태로 데이터 표시
  - 발주 내역 수정 가능
  - 추가 발주 내역 전송 가능

### 5. 파일 관리 탭
- **파일**: `FileManagement.tsx` (이미 분리됨)
- **기능**:
  - 저장된 파일 목록 (매칭/정상/오류)
  - 파일 미리보기
  - 파일 다운로드

## API 엔드포인트

### 인증
- `POST /token` - 로그인

### 엑셀 파일
- `POST /excel/upload` - 주문서 업로드
- `POST /excel/upload-order-receipt` - 주문입고 업로드
- `POST /excel/upload-receipt-slip` - 입고전표 업로드
- `GET /excel/load` - 현재 로드된 파일 조회
- `GET /excel/check` - 파일 로드 상태 확인
- `POST /excel/export` - 엑셀 파일 내보내기

### 입금 관리
- `POST /payments/save` - 입금 내역 저장 (누적 저장)
- `GET /payments/date/{date}` - 특정 날짜 입금 내역 조회
- `GET /payments/list` - 전체 입금 내역 목록

### 발주 관리 (NEW)
- `POST /orders/save` - 발주 내역 저장
- `GET /orders/list` - 전체 발주 내역 목록
- `GET /orders/date/{date}` - 특정 날짜 발주 내역 조회

### 파일 관리
- `POST /files/save-three-files` - 3개 파일 자동 저장 (매칭/정상/오류)
- `GET /files/list` - 저장된 파일 목록
- `GET /files/view/{file_id}` - 파일 상세 보기
- `GET /files/download/{file_id}` - 파일 다운로드

### 작업 임시 저장
- `POST /work-drafts/save` - 작업 임시 저장
- `GET /work-drafts/load` - 임시 저장 불러오기

## 리팩토링 계획

### Phase 1: 컴포넌트 분리
1. **SpreadsheetTab.tsx** 생성
   - 엑셀 업로드 로직
   - 스프레드시트 뷰어
   - 체크박스 관리
   - 입금/발주 전송 버튼

2. **PaymentManagement.tsx** 분리
   - 입금 데이터 표시
   - 날짜별 필터링
   - 거래처별 합계

3. **OrderManagement.tsx** 생성 (NEW)
   - 발주 데이터 표시
   - 발주 유형별 필터링
   - MMDD 시트 관리

### Phase 2: 커스텀 훅 생성
1. **usePaymentData.ts**
   - `fetchPaymentsByDate()`
   - `savePaymentData()`

2. **useOrderData.ts**
   - `fetchOrdersByDate()`
   - `saveOrderData()`

3. **useSpreadsheet.ts**
   - `handleCheckRow()`
   - `handleRowColorChange()`
   - 엑셀 파일 상태 관리

### Phase 3: 공통 컴포넌트 추출
1. **DatePickerModal.tsx**
   - 입금 날짜 선택
   - 발주 날짜 선택

2. **OrderTypeSelector.tsx**
   - 발주 유형 선택 (교환/미송/기타)

## 데이터 흐름

```
User Upload Excel → Backend Processing → Sheet Manager
                                             ↓
                                    Store in Database
                                             ↓
              ┌──────────────────────────────┴──────────────────────────────┐
              ↓                              ↓                               ↓
    Spreadsheet Tab              Payment Management Tab         Order Management Tab
    - View/Edit Data             - View Payment Records         - View Order Records
    - Check Items                - Add More Payments            - Add More Orders
    - Send to Payment            - View by Date                 - View by Type
    - Send to Order              - Company Totals               - MMDD Sheets
              ↓                              ↓                               ↓
    Save to Payment DB           Update Payment DB              Update Order DB
              ↓                              ↓                               ↓
    Auto-save 3 Files            Accumulate Records             Accumulate Records
    (Matched/Normal/Error)
```

## 주요 개선 사항

### 완료됨
- ✅ 3개 파일 자동 저장 (매칭/정상/오류)
- ✅ 파일명에 MMDD 날짜 포함
- ✅ 입금 관리 누적 저장
- ✅ 404 오류 수정 (API 경로)
- ✅ 발주 관리 테이블 생성

### 진행 중
- 🔄 Dashboard 리팩토링
- 🔄 발주 관리 탭 UI 생성
- 🔄 발주 관리로 보내기 기능

### 계획됨
- 📋 커스텀 훅 분리
- 📋 공통 컴포넌트 추출
- 📋 성능 최적화

## 파일 크기 현황

| 파일 | 라인 수 | 상태 |
|------|---------|------|
| Dashboard.tsx | 2312 | 🔴 리팩토링 필요 |
| **main.py** | **106** | **✅ 리팩토링 완료 (95.7% 감소!)** |
| ├─ routers/excel.py | 1734 | 🟡 대형 모듈 (엑셀 처리 로직) |
| ├─ routers/drafts.py | 610 | 🟢 양호 |
| ├─ routers/payments.py | 353 | 🟢 양호 |
| ├─ routers/files.py | 217 | 🟢 양호 |
| ├─ routers/orders.py | 197 | 🟢 양호 |
| ├─ routers/admin.py | 134 | 🟢 양호 |
| └─ routers/auth.py | 33 | 🟢 양호 |
| SpreadsheetView.tsx | ~400 | 🟢 양호 |
| FileManagement.tsx | ~450 | 🟢 양호 |

---

*Last Updated: 2025-11-10*
