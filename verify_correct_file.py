import pandas as pd

# 올바른 파일 읽기
file_path = "/Users/pablokim/gndr-orma/docs/references/0828가나다란 주문서.xlsx"
df = pd.read_excel(file_path, sheet_name=0, header=None)

print("=== 0828가나다란 주문서.xlsx 파일의 Row 3 (Excel의 3행) ===")
if len(df) > 2:
    row3 = df.iloc[2]
    print(f"I3 (column 8): {row3[8]}")
    print(f"J3 (column 9): {row3[9]}")
    print(f"K3 (column 10): {row3[10]}")

print("\n=== 5행부터 실제 합계 계산 ===")
i_sum = 0
j_sum = 0
k_sum = 0

for row_idx in range(4, len(df)):  # 5행부터 (index 4부터)
    i_val = df.iloc[row_idx, 8]
    j_val = df.iloc[row_idx, 9]
    k_val = df.iloc[row_idx, 10]

    if pd.notna(i_val) and isinstance(i_val, (int, float)):
        i_sum += i_val
    if pd.notna(j_val) and isinstance(j_val, (int, float)):
        j_sum += j_val
    if pd.notna(k_val) and isinstance(k_val, (int, float)):
        k_sum += k_val

print(f"I열 (발주) 합계: {i_sum}")
print(f"J열 (미송) 합계: {j_sum}")
print(f"K열 (교환) 합계: {k_sum}")