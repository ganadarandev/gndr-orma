# GNDR 발주 및 매입 관리 시스템

이커머스 발주 및 매입 관리를 위한 웹 기반 스프레드시트 시스템

## 기능

- 엑셀 파일 기반 발주서 관리
- 웹 기반 스프레드시트 뷰어
- 줌 인/아웃 기능
- 관리자 인증 시스템

## 기술 스택

- **Backend**: Python FastAPI
- **Frontend**: TypeScript, React, Handsontable
- **Database**: SQLite (개발용)
- **Authentication**: JWT

## 설치 및 실행

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 기본 계정

- ID: gndr_admin
- Password: gndr1234!!