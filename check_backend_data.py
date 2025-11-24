import requests
import json

# Login first
login_data = {
    "username": "gndr_admin",
    "password": "gndr12345!"
}

response = requests.post("http://localhost:8000/login", data=login_data)
token = response.json()["access_token"]

# Get excel data
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://localhost:8000/excel/load", headers=headers)
data = response.json()

# Check row 3 data
if data["success"] and data["sheets"]:
    sheet = data["sheets"][0]
    sheet_data = sheet["data"]

    print("=== Row 3 (index 2) data from backend ===")
    if len(sheet_data) > 2:
        row3 = sheet_data[2]
        print(f"Total columns: {len(row3)}")

        # Check columns I, J, K (indices 8, 9, 10)
        print(f"\nColumn I (index 8): '{row3[8]}' - Type in JSON: {type(row3[8])}")
        print(f"Column J (index 9): '{row3[9]}' - Type in JSON: {type(row3[9])}")
        print(f"Column K (index 10): '{row3[10]}' - Type in JSON: {type(row3[10])}")

        # Check what frontend might be seeing
        print("\n=== What frontend sees ===")
        # If the value has comma, it might be parsed differently
        i_val = row3[8]
        j_val = row3[9]
        k_val = row3[10]

        print(f"I value: {i_val}")
        print(f"J value: {j_val}")
        print(f"K value: {k_val}")

        # Check if they're strings with commas
        if isinstance(i_val, str) and ',' in i_val:
            print(f"I has comma! Value: {i_val}")
        if isinstance(j_val, str) and ',' in j_val:
            print(f"J has comma! Value: {j_val}")
        if isinstance(k_val, str) and ',' in k_val:
            print(f"K has comma! Value: {k_val}")