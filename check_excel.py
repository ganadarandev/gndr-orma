import pandas as pd
import json

# Excel 파일 읽기
file_path = '/Users/pablokim/gndr-orma/0825가나다란 주문서.xlsx'

try:
    # 모든 시트 이름 가져오기
    xl_file = pd.ExcelFile(file_path)
    sheet_names = xl_file.sheet_names

    print("Sheet Names:", sheet_names)
    print("\n" + "="*50 + "\n")

    # 각 시트의 데이터 구조 확인
    for sheet_name in sheet_names[:3]:  # 처음 3개 시트만 확인
        print(f"Sheet: {sheet_name}")
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        print(f"Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        print(f"First 5 rows:")
        print(df.head())
        print("\n" + "-"*50 + "\n")

except Exception as e:
    print(f"Error reading Excel file: {e}")