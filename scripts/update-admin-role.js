const admin = require('firebase-admin');
const serviceAccount = require('../firebase/serviceAccountKey.json'); // 서비스 계정 키 파일이 필요합니다

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateAdminUser() {
  try {
    // 'admin' 이메일을 가진 사용자 찾기
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'admin@cleanit.com')
      .get();

    if (usersSnapshot.empty) {
      console.log('admin@cleanit.com 사용자를 찾을 수 없습니다.');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('현재 사용자 데이터:', userData);

    // admin 역할로 업데이트
    const updateData = {
      role: 'admin',
      adminInfo: {
        name: 'System Administrator',
        permissions: [
          'manage_users',
          'manage_buildings', 
          'manage_requests',
          'manage_workers',
          'manage_companies',
          'view_analytics',
          'system_settings'
        ],
        department: 'System Administration'
      },
      updatedAt: admin.firestore.Timestamp.now()
    };

    // managerInfo 제거 (admin으로 전환)
    if (userData.managerInfo) {
      updateData.managerInfo = admin.firestore.FieldValue.delete();
    }

    await db.collection('users').doc(userId).update(updateData);

    console.log(`사용자 ${userId}의 역할이 'admin'으로 업데이트되었습니다.`);
    console.log('업데이트된 데이터:', updateData);

    // 업데이트 확인
    const updatedUser = await db.collection('users').doc(userId).get();
    console.log('업데이트 후 사용자 데이터:', updatedUser.data());

  } catch (error) {
    console.error('사용자 업데이트 중 오류:', error);
  }
}

// 스크립트 실행
updateAdminUser().then(() => {
  console.log('작업 완료');
  process.exit(0);
}).catch((error) => {
  console.error('스크립트 실행 오류:', error);
  process.exit(1);
});