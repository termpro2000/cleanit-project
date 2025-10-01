const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./cleanit-9c968-firebase-adminsdk-fbsvc-1729112044serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  try {
    // Create authentication user
    const userRecord = await auth.createUser({
      email: 'admin@cleanit.com',
      password: 'admin123',
      displayName: 'Admin User',
      emailVerified: true
    });

    console.log('Successfully created auth user:', userRecord.uid);

    // Create user document in Firestore
    const userDoc = {
      role: 'manager',
      email: 'admin@cleanit.com',
      phone: '010-1234-5678',
      isActive: true,
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      managerInfo: {
        name: 'Admin User',
        companyId: 'f1NTxK92QnUgzTvf0Egk', // Using the company ID from seed
        companyAddress: '123 Clean St, Suite 100, San Francisco, CA 94105',
      },
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc);
    console.log('Successfully created user document');

    console.log('\n=== 관리자 계정 생성 완료 ===');
    console.log('이메일: admin@cleanit.com');
    console.log('비밀번호: admin123');
    console.log('접속 URL: http://localhost:3000');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();