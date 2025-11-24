from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Date, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration - Using SQLite for simplicity
# Force SQLite regardless of environment variable
DATABASE_URL = "sqlite:///./gndr_database.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, index=True)  # 거래처명
    address = Column(Text)  # 공급처주소
    phone = Column(String(50))  # 공급처연락처
    mobile = Column(String(50))  # 공급처휴대전화
    account_holder = Column(String(100))  # 공급처예금주
    account_number = Column(String(100))  # 계좌번호
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    orders = relationship("Order", back_populates="supplier")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)  # 상품코드
    name = Column(String(200))  # 공급처상품명
    option = Column(String(200))  # 공급처옵션
    price = Column(Float)  # 원가
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_date = Column(Date, index=True)  # 주문일
    order_type = Column(String(50))  # 주문서, 주문입고, 입고전표, 다음주문서
    sheet_name = Column(String(100))  # 시트명
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    total_amount = Column(Float)  # 총 주문금액
    file_path = Column(String(500))  # 엑셀 파일 경로
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    supplier = relationship("Supplier", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    # 발주 수량
    new_order_qty = Column(Integer, default=0)  # 신규주문
    undelivered_qty = Column(Integer, default=0)  # 미송
    exchange_qty = Column(Integer, default=0)  # 교환

    # 장끼 수량
    janggi_qty = Column(Integer, default=0)  # 장끼
    janggi_undelivered = Column(Integer, default=0)  # 장끼 미송
    janggi_exchange = Column(Integer, default=0)  # 장끼 교환

    # 입고 정보
    received_qty = Column(Integer, default=0)  # 입고
    difference_qty = Column(Integer, default=0)  # 차이
    actual_received = Column(Integer, default=0)  # 실입고수

    # 금액 정보
    payment_today = Column(Float, default=0)  # 오늘입금할금액
    undelivered_amount = Column(Float, default=0)  # 미송/매입금액

    # 코멘트
    uncle_comment = Column(Text)  # 삼촌 코멘트
    gndr_comment = Column(Text)  # 가나다란 코멘트
    payment_date = Column(Date)  # 입금일

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class FileUploadHistory(Base):
    __tablename__ = "file_upload_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500))
    file_path = Column(String(500))
    upload_date = Column(DateTime, default=datetime.now)
    sheet_count = Column(Integer)
    row_count = Column(Integer)
    status = Column(String(50))  # success, failed, processing
    error_message = Column(Text, nullable=True)
    user = Column(String(100))

class DailyOrder(Base):
    """일별 주문서 관리 테이블"""
    __tablename__ = "daily_orders"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)  # 주문 날짜
    order_type = Column(String(50), nullable=False)  # 'order'(발주서), 'receipt'(주문입고), 'voucher'(입고전표)
    sheet_name = Column(String(200), nullable=False)  # 시트 이름
    data = Column(JSON, nullable=False)  # 전체 데이터 JSON으로 저장
    columns = Column(JSON)  # 컬럼 정보

    # 메타데이터
    total_items = Column(Integer, default=0)  # 총 아이템 수
    total_quantity = Column(Integer, default=0)  # 총 수량
    total_amount = Column(Float, default=0.0)  # 총 금액
    notes = Column(Text)  # 메모

    # 타임스탬프
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = Column(String(100))  # 생성자

    __table_args__ = (
        UniqueConstraint('date', 'order_type', 'sheet_name', name='_date_type_sheet_uc'),
    )

class WorkDraft(Base):
    """작업 중간 저장용 테이블 (임시 저장)"""
    __tablename__ = "work_drafts"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String(100), nullable=False, index=True)  # 작업자
    draft_type = Column(String(50), nullable=False)  # 'spreadsheet', 'order', 'receipt' 등

    # 작업 데이터
    sheets_data = Column(JSON)  # 시트 데이터
    selected_sheet = Column(Integer, default=0)  # 선택된 시트
    row_colors = Column(JSON)  # 행 색상 정보
    row_text_colors = Column(JSON)  # 행 텍스트 색상 정보
    duplicate_products = Column(JSON)  # 중복 상품 정보
    checked_rows = Column(JSON)  # 체크박스 상태 정보
    hide_checked = Column(Integer, default=0)  # 체크된 행 숨김 여부

    # 상태 정보
    is_order_receipt_uploaded = Column(Integer, default=0)  # Boolean as Integer
    is_receipt_slip_uploaded = Column(Integer, default=0)  # Boolean as Integer

    # 메타데이터
    description = Column(Text)  # 작업 설명
    session_id = Column(String(200))  # 세션 ID

    # 타임스탬프
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    expires_at = Column(DateTime)  # 만료 시간 (24시간 후)

class PaymentRecord(Base):
    """입금 내역 관리 테이블 - 일자별로 누적 저장"""
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    payment_date = Column(Date, nullable=False, index=True)  # 입금 일자
    company_name = Column(String(200), nullable=False, index=True)  # 거래처명 (A열)

    # 제품 정보
    product_code = Column(String(50))  # 상품코드 (E열)
    product_name = Column(String(200))  # 공급처상품명
    product_option = Column(String(200))  # 공급처옵션

    # 수량 및 금액
    unit_price = Column(Float, default=0.0)  # 원가 (H열)
    receipt_qty = Column(Integer, default=0)  # 입고량 (O열)
    payment_amount = Column(Float, default=0.0)  # 입금액 (T열 = H * O)

    # 원본 데이터 보존
    original_data = Column(JSON)  # 전체 행 데이터 JSON 저장

    # 메타데이터
    notes = Column(Text)  # 메모
    created_by = Column(String(100))  # 생성자
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class OrderRecord(Base):
    """발주 내역 관리 테이블 - 교환/미송 등 재발주 필요 내역"""
    __tablename__ = "order_records"

    id = Column(Integer, primary_key=True, index=True)
    order_date = Column(Date, nullable=False, index=True)  # 발주 일자
    company_name = Column(String(200), nullable=False, index=True)  # 거래처명 (A열)
    order_type = Column(String(50), nullable=False)  # '교환', '미송', '기타'

    # 제품 정보
    product_code = Column(String(50))  # 상품코드 (E열)
    product_name = Column(String(200))  # 공급처상품명
    product_option = Column(String(200))  # 공급처옵션

    # 수량 및 금액
    unit_price = Column(Float, default=0.0)  # 원가 (H열)
    order_qty = Column(Integer, default=0)  # 발주 수량
    order_amount = Column(Float, default=0.0)  # 발주 금액

    # 원본 데이터 보존
    original_data = Column(JSON)  # 전체 행 데이터 JSON 저장

    # 처리 상태
    status = Column(String(50), default='pending')  # 'pending', 'ordered', 'completed'

    # 메타데이터
    notes = Column(Text)  # 메모
    created_by = Column(String(100))  # 생성자
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class SavedFile(Base):
    """저장된 파일 관리 테이블 - 날짜별 3종 파일"""
    __tablename__ = "saved_files"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)  # 날짜 (MMDD 형식)
    file_type = Column(String(20), nullable=False)  # 'matched'(매칭), 'normal'(정상), 'error'(오류)
    file_name = Column(String(500), nullable=False)  # 파일명
    file_path = Column(String(500), nullable=False)  # 실제 파일 경로

    # 파일 데이터 (JSON으로 저장)
    sheet_data = Column(JSON, nullable=False)  # 시트 데이터
    columns = Column(JSON)  # 컬럼 정보
    row_colors = Column(JSON)  # 행 색상
    row_text_colors = Column(JSON)  # 텍스트 색상

    # 메타데이터
    total_rows = Column(Integer, default=0)  # 총 행 수
    created_by = Column(String(100))  # 생성자
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        UniqueConstraint('date', 'file_type', name='_date_filetype_uc'),
    )

class Client(Base):
    """거래처 관리 테이블 - Code 기준으로 거래처 정보 관리"""
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # Code (가장 중요)
    company_name = Column(String(200), nullable=False, index=True)  # 업체명

    # 기본 정보
    user_id = Column(String(200))  # 아이디
    manager_md = Column(String(100))  # 담당MD
    ceo_name = Column(String(100))  # 대표이사
    business_number = Column(String(50))  # 사업자등록번호
    business_type = Column(String(100))  # 업태
    business_category = Column(String(100))  # 업종
    additional_code1 = Column(String(50))  # 추가코드1
    additional_code2 = Column(String(50))  # 추가코드2

    # 연락처 정보 (중요)
    contact_person = Column(String(100))  # 담당자명
    postal_code = Column(String(20))  # 우편번호
    address = Column(String(500))  # 주소
    address_detail = Column(String(500))  # 상세주소
    phone = Column(String(50))  # 연락처
    mobile = Column(String(50))  # 휴대폰번호
    email = Column(String(200))  # 이메일
    notes = Column(Text)  # 비고
    group_name = Column(String(100))  # 그룹

    # 계좌 정보 (중요)
    account_number = Column(String(100))  # 계좌번호
    bank_name = Column(String(100))  # 은행
    account_holder = Column(String(100))  # 예금주

    # 기타 설정
    balance = Column(Integer, default=0)  # 잔
    use_purchase_service = Column(Integer, default=0)  # 사입서비스 사용
    auto_calculate_receipt = Column(Integer, default=0)  # 입고대기 자동계산
    is_disabled = Column(Integer, default=0)  # 사용안함

    # 통계 정보 (입금 관리에서 엑셀 저장 시 업데이트)
    total_order_count = Column(Integer, default=0)  # 총 주문 건수
    total_payment_amount = Column(Float, default=0.0)  # 총 입금 금액
    success_order_count = Column(Integer, default=0)  # 정상처리 건수
    last_order_date = Column(Date)  # 마지막 주문 일자
    last_payment_date = Column(Date)  # 마지막 입금 일자

    # 타임스탬프
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = Column(String(100))  # 생성자

# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()