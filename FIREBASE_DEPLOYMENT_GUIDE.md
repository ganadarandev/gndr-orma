# Firebase 배포 가이드

## 현재 상태

Firebase로의 마이그레이션이 거의 완료되었습니다. 이제 실제 배포를 위한 설정만 남았습니다.

### 완료된 작업

1. ✅ Firebase 프로젝트 설정 파일 생성
   - `firebase.json` - Firebase 서비스 설정
   - `.firebaserc` - 프로젝트 선택 (gndr-orma)
   - `firestore.rules` - Firestore 보안 규칙
   - `storage.rules` - Storage 보안 규칙
   - `firestore.indexes.json` - 쿼리 인덱스

2. ✅ Firebase Functions 백엔드 API 구현
   - `/functions/src/index.ts` - 모든 API 엔드포인트 구현 완료
   - 인증 (로그인, 사용자 정보)
   - 거래처 관리 (업로드, 조회, 수정, 삭제)
   - 엑셀 파일 처리 (주문서/입고전표 업로드, 정렬 로직)
   - 입금 관리
   - 작업 임시 저장
   - 파일 저장 (3종)
   - 발주 내역 관리

3. ✅ TypeScript 설정 및 빌드
   - `tsconfig.json` - TypeScript 컴파일 설정
   - 빌드 성공 확인 (`npm run build`)

4. ✅ 프론트엔드 Firebase SDK 설치 및 설정
   - Firebase SDK 패키지 설치 완료
   - `/frontend/src/config/firebase.ts` - Firebase 초기화 설정 파일 생성
   - `.env.example` - 환경 변수 템플릿 생성

## 배포 단계

### 1단계: Firebase 프로젝트 설정 확인

```bash
# Firebase 프로젝트 확인
firebase projects:list

# 현재 프로젝트: gndr-orma
```

### 2단계: Service Account Key 생성

Firebase Functions가 Admin SDK를 사용하려면 Service Account Key가 필요합니다.

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `gndr-orma`
3. 프로젝트 설정 > 서비스 계정
4. "새 비공개 키 생성" 클릭
5. JSON 파일 다운로드
6. 파일 이름을 `service-account-key.json`으로 변경
7. `/functions/service-account-key.json`에 저장

**⚠️ 중요: 이 파일은 절대 Git에 커밋하지 마세요!**

### 3단계: 관리자 계정 생성

```bash
# Functions 디렉토리로 이동
cd /Users/pablokim/gndr-orma/functions

# 관리자 계정 생성 스크립트 실행
npm run setup-admin

# 프롬프트에서 사용자 이름과 비밀번호 입력
# 예: admin / 안전한비밀번호
```

### 4단계: 프론트엔드 환경 변수 설정

1. Firebase Console > 프로젝트 설정 > 일반 > 내 앱
2. 웹 앱 추가 (아직 없다면)
3. Firebase SDK 구성 정보 복사

```bash
# 프론트엔드 디렉토리에서
cd /Users/pablokim/gndr-orma/frontend

# .env 파일 생성
cp .env.example .env

# .env 파일 편집하여 Firebase 설정 값 입력
```

`.env` 파일 예시:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=gndr-orma.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gndr-orma
VITE_FIREBASE_STORAGE_BUCKET=gndr-orma.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# 로컬 테스트용
VITE_API_BASE_URL=http://localhost:5001/gndr-orma/us-central1/api
```

### 5단계: 로컬에서 테스트

```bash
# 프로젝트 루트로 이동
cd /Users/pablokim/gndr-orma

# Firebase Emulator 시작 (Functions, Firestore, Storage)
firebase emulators:start

# 새 터미널에서 프론트엔드 실행
cd frontend
npm run dev
```

브라우저에서 http://localhost:5173 접속하여 테스트

### 6단계: Firestore 인덱스 배포

```bash
cd /Users/pablokim/gndr-orma

# Firestore 인덱스만 먼저 배포
firebase deploy --only firestore:indexes
```

### 7단계: Firebase에 배포

```bash
# 프로젝트 루트에서

# 1. 프론트엔드 빌드
cd frontend
npm run build

# 2. Functions 빌드 (이미 완료되었음)
cd ../functions
npm run build

# 3. 전체 배포
cd ..
firebase deploy

# 또는 개별 배포:
# firebase deploy --only functions     # Functions만
# firebase deploy --only firestore     # Firestore 규칙만
# firebase deploy --only storage       # Storage 규칙만
# firebase deploy --only hosting       # Hosting만
```

### 8단계: 배포 후 설정

배포 완료 후:

1. **Hosting URL 확인**
   ```
   Hosting URL: https://gndr-orma.web.app
   ```

2. **Functions URL 확인**
   ```
   Functions URL: https://us-central1-gndr-orma.cloudfunctions.net/api
   ```

3. **프론트엔드 환경 변수 업데이트**
   ```bash
   # frontend/.env 수정
   VITE_API_BASE_URL=https://us-central1-gndr-orma.cloudfunctions.net/api
   ```

4. **프론트엔드 재빌드 및 재배포**
   ```bash
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

## API 마이그레이션 맵핑

기존 FastAPI 백엔드 → Firebase Functions 변환 완료:

### 인증
- `POST /token` → Cloud Functions `/api/token`
- `GET /users/me` → Cloud Functions `/api/users/me`

### 거래처 관리
- `POST /clients/upload` → `/api/clients/upload`
- `GET /clients` → `/api/clients`
- `GET /clients/:code` → `/api/clients/:code`
- `PUT /clients/:code` → `/api/clients/:code`
- `DELETE /clients/:code` → `/api/clients/:code`

### 엑셀 처리
- `POST /excel/upload-order-receipt` → `/api/excel/upload-order-receipt`
- `POST /excel/upload-receipt-slip` → `/api/excel/upload-receipt-slip`
- `GET /excel/check-daily-order` → `/api/excel/check-daily-order`
- `GET /excel/load-daily-order` → `/api/excel/load-daily-order`
- `POST /excel/update-data` → `/api/excel/update-data`

### 입금 관리
- `POST /payments/save` → `/api/payments/save`
- `GET /payments/by-date` → `/api/payments/by-date`
- `GET /payments/by-range` → `/api/payments/by-range`
- `DELETE /payments/:id` → `/api/payments/:id`

### 작업 임시 저장
- `POST /work-drafts/save` → `/api/work-drafts/save`
- `GET /work-drafts/load` → `/api/work-drafts/load`
- `DELETE /work-drafts/:id` → `/api/work-drafts/:id`

### 파일 저장
- `POST /files/save-three-files` → `/api/files/save-three-files`
- `GET /files/list` → `/api/files/list`
- `GET /files/:date` → `/api/files/:date`

### 발주 내역
- `POST /orders/save` → `/api/orders/save`
- `GET /orders/list` → `/api/orders/list`
- `GET /orders/by-date/:date` → `/api/orders/by-date/:date`

### 일별 주문서
- `POST /daily-orders/save` → `/api/daily-orders/save`

## 보안 규칙

### Firestore 보안 규칙 (firestore.rules)

모든 컬렉션에 대해 인증된 사용자만 접근 가능:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    match /payments/{paymentId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    match /savedFiles/{fileId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    match /workDrafts/{draftId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      allow delete: if isAuthenticated();
    }

    match /dailyOrders/{orderId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

### Storage 보안 규칙 (storage.rules)

엑셀 파일 업로드 제한:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() {
      return request.auth != null;
    }

    match /excel/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() &&
        request.resource.size < 50 * 1024 * 1024 && // 50MB 제한
        (request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
         request.resource.contentType.matches('application/vnd.ms-excel'));
    }

    match /uploads/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() &&
        request.resource.size < 50 * 1024 * 1024;
    }
  }
}
```

## 데이터 마이그레이션

기존 SQLite 데이터를 Firestore로 마이그레이션하려면:

1. SQLite에서 데이터 추출
2. Firestore 형식으로 변환
3. Batch Write로 Firestore에 업로드

마이그레이션 스크립트는 필요시 별도로 작성 가능합니다.

## 모니터링

배포 후 모니터링:

1. **Firebase Console**
   - Functions 로그: https://console.firebase.google.com/project/gndr-orma/functions
   - Firestore 데이터: https://console.firebase.google.com/project/gndr-orma/firestore
   - Storage 파일: https://console.firebase.google.com/project/gndr-orma/storage

2. **로그 확인**
   ```bash
   # 실시간 로그 스트리밍
   firebase functions:log --follow

   # 특정 함수 로그
   firebase functions:log --only api
   ```

3. **성능 모니터링**
   - Firebase Console > Performance
   - 함수 실행 시간, 오류율 확인

## 문제 해결

### 함수 배포 실패

```bash
# 함수 로그 확인
firebase functions:log

# 함수 삭제 후 재배포
firebase functions:delete api
firebase deploy --only functions
```

### Firestore 쿼리 오류

- `firestore.indexes.json`에 필요한 인덱스가 정의되어 있는지 확인
- Firebase Console에서 누락된 인덱스 자동 생성 링크 확인

### Storage 업로드 오류

- Storage 규칙 확인
- 파일 크기 제한 (50MB) 확인
- 파일 형식 제한 확인

## 비용 관리

Firebase 무료 등급 (Spark Plan) 제한:

- **Functions**: 일일 125K 호출, 40K GB-초, 40K CPU-초
- **Firestore**: 일일 50K 읽기, 20K 쓰기, 20K 삭제, 1GB 저장
- **Storage**: 5GB 저장, 1GB/일 다운로드
- **Hosting**: 10GB/월 전송

사용량이 많아지면 Blaze Plan (종량제)로 업그레이드 필요.

## 다음 단계

1. 로컬 테스트 완료
2. Firebase에 배포
3. 프로덕션 URL로 프론트엔드 업데이트
4. 기존 SQLite 데이터 마이그레이션 (필요시)
5. 모니터링 및 최적화

## 지원

문제가 발생하면:
1. Firebase Console에서 로그 확인
2. `firebase functions:log` 명령어로 상세 로그 확인
3. Firebase 문서 참조: https://firebase.google.com/docs
