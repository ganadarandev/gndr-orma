import requests
import json

# Get token
login_response = requests.post(
    "http://127.0.0.1:8000/token",
    data={"username": "gndr_admin", "password": "gndr1234!!"}
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"✓ Login successful")

    # Test Excel load
    headers = {"Authorization": f"Bearer {token}"}
    excel_response = requests.get("http://127.0.0.1:8000/excel/load", headers=headers)

    if excel_response.status_code == 200:
        data = excel_response.json()
        print(f"✓ Excel load successful")
        print(f"  - Success: {data['success']}")
        print(f"  - Total sheets: {data.get('total_sheets', 0)}")
        if 'sheets' in data and len(data['sheets']) > 0:
            print(f"  - First sheet: {data['sheets'][0]['sheet_name']}")
            print(f"  - Sheet type: {data['sheets'][0].get('sheet_type', 'N/A')}")
            print(f"  - Rows x Cols: {data['sheets'][0]['rows']} x {data['sheets'][0]['cols']}")
    else:
        print(f"✗ Excel load failed: {excel_response.status_code}")
        print(excel_response.text)
else:
    print(f"✗ Login failed: {login_response.status_code}")