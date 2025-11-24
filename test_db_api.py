import requests
import json

# Get token
login_response = requests.post(
    "http://127.0.0.1:8000/token",
    data={"username": "gndr_admin", "password": "gndr1234!!"}
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("✓ Login successful")

    # Test orders summary
    summary_response = requests.get("http://127.0.0.1:8000/api/orders/summary", headers=headers)

    if summary_response.status_code == 200:
        data = summary_response.json()
        print("✓ Orders summary successful")
        print(f"  - Total suppliers: {data['summary']['total_suppliers']}")
        print(f"  - Total products: {data['summary']['total_products']}")
        print(f"  - Total orders: {data['summary']['total_orders']}")
        print(f"  - Total order items: {data['summary']['total_order_items']}")
        print(f"  - Undelivered items: {data['summary']['undelivered_items']}")
    else:
        print(f"✗ Orders summary failed: {summary_response.status_code}")
        print(summary_response.text)
else:
    print(f"✗ Login failed: {login_response.status_code}")