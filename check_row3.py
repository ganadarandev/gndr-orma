import pandas as pd

# 엑셀 파일 읽기
file_path = "/Users/pablokim/gndr-orma/0825가나다란 주문서.xlsx"
df = pd.read_excel(file_path, sheet_name=0, header=None)

print("=== Row 3 (Excel의 3행) 전체 데이터 ===")
if len(df) > 2:
    row3 = df.iloc[2]
    for i, val in enumerate(row3):
        if pd.notna(val):  # NaN이 아닌 값만 출력
            print(f"Column {chr(65+i) if i < 26 else 'A'+chr(65+i-26)} (index {i}): {val}")

print("\n=== Row 3의 I, J, K 열 (합계가 있어야 할 곳) ===")
print(f"I3 (발주): {df.iloc[2, 8]} (예상: 991)")
print(f"J3 (미송): {df.iloc[2, 9]} (예상: 322)")
print(f"K3 (교환): {df.iloc[2, 10]} (예상: 50)")

# 실제로 5행부터 데이터를 합계내서 확인
print("\n=== 5행부터 실제 합계 계산 ===")
# I열 (발주) 합계
i_sum = 0
j_sum = 0
k_sum = 0

print("\n각 행의 값:")
for row_idx in range(4, len(df)):  # 5행부터 (index 4부터)
    i_val = df.iloc[row_idx, 8]
    j_val = df.iloc[row_idx, 9]
    k_val = df.iloc[row_idx, 10]

    # 숫자인 경우만 합산
    if pd.notna(i_val) and isinstance(i_val, (int, float)):
        i_sum += i_val
        if i_val != 0:
            print(f"Row {row_idx+1}, I열: {i_val}")

    if pd.notna(j_val) and isinstance(j_val, (int, float)):
        j_sum += j_val
        if j_val != 0:
            print(f"Row {row_idx+1}, J열: {j_val}")

    if pd.notna(k_val) and isinstance(k_val, (int, float)):
        k_sum += k_val
        if k_val != 0:
            print(f"Row {row_idx+1}, K열: {k_val}")

print(f"\nI열 (발주) 계산된 합계: {i_sum}")
print(f"J열 (미송) 계산된 합계: {j_sum}")
print(f"K열 (교환) 계산된 합계: {k_sum}")

print("\n=== 결론 ===")
print("파일의 3행에는 이미 잘못된 값(1489, 592, 44)이 저장되어 있습니다.")
print("실제 합계(991, 322, 50)와 다릅니다.")
print("프론트엔드에서 3행을 무시하고 5행부터 계산해야 합니다.")