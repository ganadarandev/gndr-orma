#!/usr/bin/env python3
"""
관리자 API - 전체 데이터 삭제 스크립트
경고: 이 스크립트는 모든 입금/파일/발주 내역을 삭제합니다!
"""
import requests
import os
import sys
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 설정
BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "gndr_admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "gndr1234!!")

def main():
    """메인 함수"""
    print("=" * 60)
    print("GNDR 관리자 API - 전체 데이터 삭제")
    print("=" * 60)

    # 1. 토큰 받기
    print(f"\n1. 로그인 중...")
    response = requests.post(
        f"{BASE_URL}/token",
        data={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    if response.status_code != 200:
        print(f"   ❌ 로그인 실패: {response.text}")
        sys.exit(1)

    token = response.json()["access_token"]
    print(f"   ✅ 로그인 성공!")

    # 2. 현재 통계 확인
    print(f"\n2. 현재 통계 조회 중...")
    response = requests.get(
        f"{BASE_URL}/admin/stats",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code != 200:
        print(f"   ❌ 통계 조회 실패: {response.text}")
        sys.exit(1)

    stats = response.json()['stats']
    print(f"   📊 현재 데이터:")
    print(f"      - 입금 내역: {stats['payments']}개")
    print(f"      - 파일 내역: {stats['files']}개")
    print(f"      - 발주 내역: {stats['orders']}개")
    print(f"      - 임시 저장: {stats['drafts']}개")

    # 3. 입금 내역 삭제
    if stats['payments'] > 0:
        print(f"\n3. 입금 내역 {stats['payments']}개 삭제 중...")
        response = requests.delete(
            f"{BASE_URL}/admin/payments/clear-all",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ {result['message']}")
        else:
            print(f"   ❌ 삭제 실패: {response.text}")
    else:
        print(f"\n3. 입금 내역이 없습니다. 건너뜀...")

    # 4. 파일 내역 삭제
    if stats['files'] > 0:
        print(f"\n4. 파일 내역 {stats['files']}개 삭제 중...")
        response = requests.delete(
            f"{BASE_URL}/admin/files/clear-all",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ {result['message']}")
        else:
            print(f"   ❌ 삭제 실패: {response.text}")
    else:
        print(f"\n4. 파일 내역이 없습니다. 건너뜀...")

    # 5. 발주 내역 삭제
    if stats['orders'] > 0:
        print(f"\n5. 발주 내역 {stats['orders']}개 삭제 중...")
        response = requests.delete(
            f"{BASE_URL}/admin/orders/clear-all",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ {result['message']}")
        else:
            print(f"   ❌ 삭제 실패: {response.text}")
    else:
        print(f"\n5. 발주 내역이 없습니다. 건너뜀...")

    # 6. 최종 통계 확인
    print(f"\n6. 최종 통계 확인 중...")
    response = requests.get(
        f"{BASE_URL}/admin/stats",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        final_stats = response.json()['stats']
        print(f"   📊 최종 데이터:")
        print(f"      - 입금 내역: {final_stats['payments']}개")
        print(f"      - 파일 내역: {final_stats['files']}개")
        print(f"      - 발주 내역: {final_stats['orders']}개")
        print(f"      - 임시 저장: {final_stats['drafts']}개")

    print("\n✅ 작업 완료!")

if __name__ == "__main__":
    main()
