import pandas as pd

# 입고 파일 확인
file_path = "/Users/pablokim/gndr-orma/docs/references/0829가나다란 주문입고.xlsx"
df = pd.read_excel(file_path, sheet_name=0, header=None)

print("=== 0829가나다란 주문입고.xlsx 파일 확인 ===")
print(f"전체 행 수: {len(df)}")
print(f"전체 열 수: {len(df.columns)}")

# N110 (row 109, col 13), N155 (row 154, col 13), N156 (row 155, col 13)
# M208 (row 207, col 12), M209 (row 208, col 12)

print("\n=== 특정 셀 값 확인 ===")

# N110
if len(df) > 109 and len(df.columns) > 13:
    print(f"N110 (row 110, index 109, col N=13): {df.iloc[109, 13]}")
    # 같은 행의 A, E, I 값도 확인
    print(f"  - A110 (거래처명): {df.iloc[109, 0]}")
    print(f"  - E110 (공급처상품명): {df.iloc[109, 4]}")
    print(f"  - I110 (발주수량): {df.iloc[109, 8]}")

# N155
if len(df) > 154 and len(df.columns) > 13:
    print(f"\nN155 (row 155, index 154, col N=13): {df.iloc[154, 13]}")
    print(f"  - A155 (거래처명): {df.iloc[154, 0]}")
    print(f"  - E155 (공급처상품명): {df.iloc[154, 4]}")
    print(f"  - I155 (발주수량): {df.iloc[154, 8]}")

# N156
if len(df) > 155 and len(df.columns) > 13:
    print(f"\nN156 (row 156, index 155, col N=13): {df.iloc[155, 13]}")
    print(f"  - A156 (거래처명): {df.iloc[155, 0]}")
    print(f"  - E156 (공급처상품명): {df.iloc[155, 4]}")
    print(f"  - I156 (발주수량): {df.iloc[155, 8]}")

# M208
if len(df) > 207 and len(df.columns) > 12:
    print(f"\nM208 (row 208, index 207, col M=12): {df.iloc[207, 12]}")
    print(f"  - A208 (거래처명): {df.iloc[207, 0]}")
    print(f"  - E208 (공급처상품명): {df.iloc[207, 4]}")
    print(f"  - I208 (발주수량): {df.iloc[207, 8]}")

# M209
if len(df) > 208 and len(df.columns) > 12:
    print(f"\nM209 (row 209, index 208, col M=12): {df.iloc[208, 12]}")
    print(f"  - A209 (거래처명): {df.iloc[208, 0]}")
    print(f"  - E209 (공급처상품명): {df.iloc[208, 4]}")
    print(f"  - I209 (발주수량): {df.iloc[208, 8]}")

print("\n=== 실제로 L, M, N 열에 값이 있는 행들 확인 (5행부터) ===")
for i in range(4, min(len(df), 250)):  # 250행까지만 확인
    l_val = df.iloc[i, 11] if len(df.columns) > 11 else None
    m_val = df.iloc[i, 12] if len(df.columns) > 12 else None
    n_val = df.iloc[i, 13] if len(df.columns) > 13 else None

    # L, M, N 중 하나라도 값이 있으면 출력
    if pd.notna(l_val) or pd.notna(m_val) or pd.notna(n_val):
        if pd.notna(l_val) and l_val != 0:
            print(f"Row {i+1}, L열: {l_val}")
        if pd.notna(m_val) and m_val != 0:
            print(f"Row {i+1}, M열: {m_val}")
        if pd.notna(n_val) and n_val != 0:
            print(f"Row {i+1}, N열: {n_val}")