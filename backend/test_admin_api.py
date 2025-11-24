#!/usr/bin/env python3
"""
Admin API 테스트 스크립트
"""
import requests
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 설정
BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "gndr_admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "gndr1234!!")

def get_token():
    """관리자 토큰 받기"""
    print(f"\n1. 로그인 시도 중...")
    print(f"   사용자명: {ADMIN_USERNAME}")
    print(f"   비밀번호: {'*' * len(ADMIN_PASSWORD)}")

    response = requests.post(
        f"{BASE_URL}/token",
        data={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    if response.status_code == 200:
        token_data = response.json()
        print(f"   ✅ 로그인 성공!")
        return token_data["access_token"]
    else:
        print(f"   ❌ 로그인 실패: {response.status_code}")
        print(f"   응답: {response.text}")
        return None

def get_stats(token):
    """시스템 통계 조회"""
    print(f"\n2. 시스템 통계 조회 중...")

    response = requests.get(
        f"{BASE_URL}/admin/stats",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        stats = response.json()
        print(f"   ✅ 통계 조회 성공:")
        print(f"      - 입금 내역: {stats['stats']['payments']}개")
        print(f"      - 파일 내역: {stats['stats']['files']}개")
        print(f"      - 발주 내역: {stats['stats']['orders']}개")
        print(f"      - 임시 저장: {stats['stats']['drafts']}개")
        return stats['stats']
    else:
        print(f"   ❌ 통계 조회 실패: {response.status_code}")
        print(f"   응답: {response.text}")
        return None

def clear_payments(token):
    """입금 관리 내역 전체 삭제"""
    print(f"\n3. 입금 관리 내역 삭제 중...")

    response = requests.delete(
        f"{BASE_URL}/admin/payments/clear-all",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ {result['message']}")
        return result
    else:
        print(f"   ❌ 삭제 실패: {response.status_code}")
        print(f"   응답: {response.text}")
        return None

def clear_files(token):
    """파일 관리 내역 전체 삭제"""
    print(f"\n4. 파일 관리 내역 삭제 중...")

    response = requests.delete(
        f"{BASE_URL}/admin/files/clear-all",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ {result['message']}")
        return result
    else:
        print(f"   ❌ 삭제 실패: {response.status_code}")
        print(f"   응답: {response.text}")
        return None

def clear_orders(token):
    """발주 관리 내역 전체 삭제"""
    print(f"\n5. 발주 관리 내역 삭제 중...")

    response = requests.delete(
        f"{BASE_URL}/admin/orders/clear-all",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ {result['message']}")
        return result
    else:
        print(f"   ❌ 삭제 실패: {response.status_code}")
        print(f"   응답: {response.text}")
        return None

def main():
    """메인 함수"""
    print("=" * 60)
    print("GNDR 관리자 API 테스트")
    print("=" * 60)

    # 1. 토큰 받기
    token = get_token()
    if not token:
        print("\n❌ 로그인에 실패했습니다. 스크립트를 종료합니다.")
        return

    # 2. 현재 통계 확인
    stats = get_stats(token)
    if not stats:
        print("\n❌ 통계 조회에 실패했습니다. 스크립트를 종료합니다.")
        return

    # 3. 삭제 작업 (사용자 확인)
    print("\n" + "=" * 60)
    print("⚠️  주의: 다음 작업은 데이터를 영구적으로 삭제합니다!")
    print("=" * 60)

    if stats['payments'] > 0:
        confirm = input(f"\n입금 내역 {stats['payments']}개를 삭제하시겠습니까? (y/N): ")
        if confirm.lower() == 'y':
            clear_payments(token)

    if stats['files'] > 0:
        confirm = input(f"\n파일 내역 {stats['files']}개를 삭제하시겠습니까? (y/N): ")
        if confirm.lower() == 'y':
            clear_files(token)

    if stats['orders'] > 0:
        confirm = input(f"\n발주 내역 {stats['orders']}개를 삭제하시겠습니까? (y/N): ")
        if confirm.lower() == 'y':
            clear_orders(token)

    # 4. 최종 통계 확인
    print("\n" + "=" * 60)
    print("최종 통계 확인")
    print("=" * 60)
    get_stats(token)

    print("\n✅ 작업 완료!")

if __name__ == "__main__":
    main()
