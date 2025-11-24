/**
 * Setup script to create initial admin user in Firestore
 * Run this script once to initialize the admin account
 *
 * Usage: npx ts-node src/setup-admin.ts
 */

import * as admin from 'firebase-admin';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function setupAdmin() {
  console.log('=== Firebase Admin User Setup ===\n');

  try {
    const username = await question('Enter admin username: ');
    const password = await question('Enter admin password: ');

    if (!username || !password) {
      console.error('Username and password are required!');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await db.collection('users').doc(username).get();
    if (existingUser.exists) {
      const overwrite = await question(`User "${username}" already exists. Overwrite? (yes/no): `);
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user document
    await db.collection('users').doc(username).set({
      hashed_password: hashedPassword,
      is_active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`\n✅ Admin user "${username}" created successfully!`);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('Error setting up admin user:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

setupAdmin();
