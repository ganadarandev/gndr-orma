#!/usr/bin/env python3
"""
Migrate clients data from SQLite to Firestore
"""
import sqlite3
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
firebase_admin.initialize_app(credentials.ApplicationDefault(), {
    'projectId': 'gndr-orma'
})

db = firestore.client()

# Connect to SQLite
conn = sqlite3.connect('backend/gndr_database.db')
cursor = conn.cursor()

# Get all clients
cursor.execute('SELECT * FROM clients')
columns = [description[0] for description in cursor.description]
rows = cursor.fetchall()

print(f"Found {len(rows)} clients in SQLite database")

# Migrate each client
migrated_count = 0
for row in rows:
    client_data = dict(zip(columns, row))

    # Convert client_data to Firestore format
    code = client_data.get('code')
    if not code:
        print(f"Skipping client without code: {client_data}")
        continue

    firestore_data = {
        'company_name': client_data.get('company_name', ''),
        'address': client_data.get('address', ''),
        'phone': client_data.get('phone', ''),
        'representative': client_data.get('representative', ''),
        'email': client_data.get('email', ''),
        'note': client_data.get('note', ''),
        'is_active': client_data.get('is_active', True),
        'created_at': firestore.SERVER_TIMESTAMP
    }

    # Write to Firestore
    try:
        db.collection('clients').document(code).set(firestore_data)
        migrated_count += 1
        print(f"✓ Migrated client: {code} - {firestore_data.get('company_name')}")
    except Exception as e:
        print(f"✗ Failed to migrate client {code}: {e}")

conn.close()

print(f"\n✅ Migration complete! Migrated {migrated_count}/{len(rows)} clients")
