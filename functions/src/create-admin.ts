import * as admin from 'firebase-admin';
import * as bcrypt from 'bcrypt';

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'gndr-orma'
});

const db = admin.firestore();

async function createAdminUser() {
  const username = 'gndr_admin';
  const password = 'gndr1234!!';

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in Firestore
  const userRef = db.collection('users').doc(username);
  await userRef.set({
    username,
    hashed_password: hashedPassword,
    is_active: true,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ Admin user '${username}' created successfully!`);
  console.log(`You can now login with these credentials.`);

  process.exit(0);
}

createAdminUser().catch((error) => {
  console.error('Error creating admin user:', error);
  process.exit(1);
});
