import pandas as pd
import json

# 엑셀 파일 읽기
file_path = "/Users/pablokim/gndr-orma/0825가나다란 주문서.xlsx"

# dtype=str로 읽기 (현재 백엔드 방식)
df_str = pd.read_excel(file_path, sheet_name=0, header=None, dtype=str)

# dtype 없이 읽기 (숫자는 숫자로)
df_num = pd.read_excel(file_path, sheet_name=0, header=None)

print("=== Row 3 (index 2) with dtype=str ===")
print("Columns I, J, K (indices 8, 9, 10):")
if len(df_str) > 2:
    print(f"I3 (col 8): {df_str.iloc[2, 8]}, type: {type(df_str.iloc[2, 8])}")
    print(f"J3 (col 9): {df_str.iloc[2, 9]}, type: {type(df_str.iloc[2, 9])}")
    print(f"K3 (col 10): {df_str.iloc[2, 10]}, type: {type(df_str.iloc[2, 10])}")

print("\n=== Row 3 (index 2) without dtype ===")
print("Columns I, J, K (indices 8, 9, 10):")
if len(df_num) > 2:
    print(f"I3 (col 8): {df_num.iloc[2, 8]}, type: {type(df_num.iloc[2, 8])}")
    print(f"J3 (col 9): {df_num.iloc[2, 9]}, type: {type(df_num.iloc[2, 9])}")
    print(f"K3 (col 10): {df_num.iloc[2, 10]}, type: {type(df_num.iloc[2, 10])}")

print("\n=== Check what's in row 2 (visible as row 3 in Excel) ===")
print("With dtype=str:")
for i in range(8, 11):
    val = df_str.iloc[2, i] if len(df_str) > 2 and len(df_str.columns) > i else None
    print(f"  Column {chr(65+i)} (index {i}): '{val}'")

print("\nWithout dtype:")
for i in range(8, 11):
    val = df_num.iloc[2, i] if len(df_num) > 2 and len(df_num.columns) > i else None
    print(f"  Column {chr(65+i)} (index {i}): {val}")

# 다른 행들도 확인
print("\n=== Check if there's data shifted ===")
print("Row 2 (index 1) - with dtype=str:")
for i in range(8, 11):
    val = df_str.iloc[1, i] if len(df_str) > 1 and len(df_str.columns) > i else None
    print(f"  Column {chr(65+i)} (index {i}): '{val}'")

print("\nRow 4 (index 3) - with dtype=str:")
for i in range(8, 11):
    val = df_str.iloc[3, i] if len(df_str) > 3 and len(df_str.columns) > i else None
    print(f"  Column {chr(65+i)} (index {i}): '{val}'")