# 관리자 API 가이드

백엔드 `http://localhost:8000`에서 사용 가능한 관리자 전용 API 엔드포인트입니다.

## 인증

모든 관리자 API는 JWT 토큰 인증이 필요합니다.

### 1. 로그인하여 토큰 받기

```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=gndr_admin&password=gndr1234!!"
```

응답:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

## 관리자 엔드포인트

### 1. 시스템 통계 조회

현재 시스템에 저장된 데이터 개수를 확인합니다.

```bash
curl -X GET http://localhost:8000/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

응답:
```json
{
  "success": true,
  "stats": {
    "payments": 0,
    "files": 0,
    "orders": 0,
    "drafts": 2
  }
}
```

### 2. 입금 관리 내역 전체 삭제

**⚠️ 주의: 모든 입금 관리 데이터가 삭제됩니다!**

```bash
curl -X DELETE http://localhost:8000/admin/payments/clear-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

응답:
```json
{
  "success": true,
  "message": "총 5210개의 입금 내역이 삭제되었습니다",
  "deleted_count": 5210
}
```

### 3. 파일 관리 내역 전체 삭제

**⚠️ 주의: 모든 파일 관리 데이터와 물리적 파일이 삭제됩니다!**

```bash
curl -X DELETE http://localhost:8000/admin/files/clear-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

응답:
```json
{
  "success": true,
  "message": "총 9개의 파일 내역이 삭제되었습니다 (물리적 파일 9개 삭제)",
  "deleted_db_records": 9,
  "deleted_files": 9
}
```

### 4. 발주 관리 내역 전체 삭제

**⚠️ 주의: 모든 발주 관리 데이터가 삭제됩니다!**

```bash
curl -X DELETE http://localhost:8000/admin/orders/clear-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

응답:
```json
{
  "success": true,
  "message": "총 150개의 발주 내역이 삭제되었습니다",
  "deleted_count": 150
}
```

## 브라우저에서 직접 실행하기

### 1. 개발자 도구 콘솔에서 실행

브라우저 개발자 도구(F12)를 열고 Console 탭에서 다음 스크립트를 실행하세요:

#### 통계 조회
```javascript
// 1. 로그인
const loginResponse = await fetch('http://localhost:8000/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=gndr_admin&password=gndr1234!!'
});
const { access_token } = await loginResponse.json();

// 2. 통계 조회
const statsResponse = await fetch('http://localhost:8000/admin/stats', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const stats = await statsResponse.json();
console.log('시스템 통계:', stats);
```

#### 입금 관리 내역 삭제
```javascript
// 1. 로그인
const loginResponse = await fetch('http://localhost:8000/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=gndr_admin&password=gndr1234!!'
});
const { access_token } = await loginResponse.json();

// 2. 입금 내역 삭제
const deleteResponse = await fetch('http://localhost:8000/admin/payments/clear-all', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const result = await deleteResponse.json();
console.log('삭제 결과:', result);
```

#### 파일 관리 내역 삭제
```javascript
// 1. 로그인
const loginResponse = await fetch('http://localhost:8000/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=gndr_admin&password=gndr1234!!'
});
const { access_token } = await loginResponse.json();

// 2. 파일 내역 삭제
const deleteResponse = await fetch('http://localhost:8000/admin/files/clear-all', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const result = await deleteResponse.json();
console.log('삭제 결과:', result);
```

#### 발주 관리 내역 삭제
```javascript
// 1. 로그인
const loginResponse = await fetch('http://localhost:8000/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=gndr_admin&password=gndr1234!!'
});
const { access_token } = await loginResponse.json();

// 2. 발주 내역 삭제
const deleteResponse = await fetch('http://localhost:8000/admin/orders/clear-all', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const result = await deleteResponse.json();
console.log('삭제 결과:', result);
```

## 간편 스크립트 (모든 작업 한 번에)

```javascript
// 관리자 작업 헬퍼 함수
async function adminCleanup() {
  try {
    // 1. 로그인
    console.log('1. 로그인 중...');
    const loginResponse = await fetch('http://localhost:8000/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=admin123'
    });
    const { access_token } = await loginResponse.json();
    console.log('✅ 로그인 성공');

    // 2. 현재 통계 확인
    console.log('\n2. 현재 통계 확인 중...');
    const statsResponse = await fetch('http://localhost:8000/admin/stats', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const stats = await statsResponse.json();
    console.log('📊 현재 통계:', stats.stats);

    // 3. 입금 내역 삭제 확인
    if (confirm(`입금 내역 ${stats.stats.payments}개를 삭제하시겠습니까?`)) {
      console.log('\n3. 입금 내역 삭제 중...');
      const paymentsResponse = await fetch('http://localhost:8000/admin/payments/clear-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const paymentsResult = await paymentsResponse.json();
      console.log('✅', paymentsResult.message);
    }

    // 4. 파일 내역 삭제 확인
    if (confirm(`파일 내역 ${stats.stats.files}개를 삭제하시겠습니까?`)) {
      console.log('\n4. 파일 내역 삭제 중...');
      const filesResponse = await fetch('http://localhost:8000/admin/files/clear-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const filesResult = await filesResponse.json();
      console.log('✅', filesResult.message);
    }

    // 5. 발주 내역 삭제 확인
    if (confirm(`발주 내역 ${stats.stats.orders}개를 삭제하시겠습니까?`)) {
      console.log('\n5. 발주 내역 삭제 중...');
      const ordersResponse = await fetch('http://localhost:8000/admin/orders/clear-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const ordersResult = await ordersResponse.json();
      console.log('✅', ordersResult.message);
    }

    // 6. 최종 통계 확인
    console.log('\n6. 최종 통계 확인 중...');
    const finalStatsResponse = await fetch('http://localhost:8000/admin/stats', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const finalStats = await finalStatsResponse.json();
    console.log('📊 최종 통계:', finalStats.stats);

    console.log('\n✅ 작업 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
adminCleanup();
```

## 보안 주의사항

1. **운영 환경에서는 절대 사용하지 마세요**: 이 API는 개발/테스트 환경 전용입니다.
2. **토큰 보안**: 토큰을 코드에 하드코딩하지 마세요.
3. **백업**: 삭제 전 반드시 데이터베이스를 백업하세요.
4. **로그 확인**: 모든 관리자 작업은 백엔드 로그에 기록됩니다.

## API 문서

Swagger UI에서 전체 API 문서를 확인할 수 있습니다:
- http://localhost:8000/docs

## 로그 확인

관리자 작업은 모두 로그에 기록됩니다:

```bash
# 백엔드 터미널에서 확인
# 예: INFO:main:Admin cleared all payment records: 5210 records deleted by admin
```
