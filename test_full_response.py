import requests
import json

# Get token
login_response = requests.post(
    "http://127.0.0.1:8000/token",
    data={"username": "gndr_admin", "password": "gndr1234!!"}
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]

    # Test Excel load
    headers = {"Authorization": f"Bearer {token}"}
    excel_response = requests.get("http://127.0.0.1:8000/excel/load", headers=headers)

    if excel_response.status_code == 200:
        data = excel_response.json()

        # Save to file for inspection
        with open('excel_response.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print("Response saved to excel_response.json")
        print(f"Total sheets: {data['total_sheets']}")

        # Check first sheet data
        if data['sheets']:
            first_sheet = data['sheets'][0]
            print(f"\nFirst sheet: {first_sheet['sheet_name']}")
            print(f"Data rows: {len(first_sheet['data'])}")
            if first_sheet['data']:
                print(f"First row has {len(first_sheet['data'][0])} columns")
                print(f"Sample data (first 3 cells): {first_sheet['data'][0][:3]}")
    else:
        print(f"Excel load failed: {excel_response.status_code}")
        print(excel_response.text)