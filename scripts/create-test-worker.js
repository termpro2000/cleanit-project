const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, setDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBJT8MPEAfMsRTNpgiBFLHs6QNKgqU2qno",
  authDomain: "cleanit-9c968.firebaseapp.com",
  projectId: "cleanit-9c968",
  storageBucket: "cleanit-9c968.firebasestorage.app",
  messagingSenderId: "690765045650",
  appId: "1:690765045650:web:5d5eee8bc4ac9a647af2f1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestWorker() {
  try {
    // Create test worker
    const workerId = 'test-worker-001';
    const workerData = {
      id: workerId,
      role: 'worker',
      name: '김청소',
      email: 'worker1@cleanit.temp',
      phoneNumber: '010-1234-5678',
      address: '서울특별시 강남구 테헤란로 123',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', workerId), workerData);
    console.log('✅ 테스트 직원 생성 완료:', workerId);

    // Create test jobs for this worker
    const jobs = [
      {
        assignedWorkerId: workerId,
        type: '일반 청소',
        description: '사무실 전체 청소',
        status: 'completed',
        scheduledDate: new Date('2024-01-15'),
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15')
      },
      {
        assignedWorkerId: workerId,
        type: '정밀 청소',
        description: '카펫 스팀 청소',
        status: 'in_progress',
        scheduledDate: new Date('2024-01-20'),
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-19')
      },
      {
        assignedWorkerId: workerId,
        type: '유리창 청소',
        description: '빌딩 외벽 유리창 청소',
        status: 'scheduled',
        scheduledDate: new Date('2024-01-25'),
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      }
    ];

    for (const job of jobs) {
      await addDoc(collection(db, 'jobs'), job);
    }
    
    console.log('✅ 테스트 작업 데이터 생성 완료');
    console.log('🎉 모든 테스트 데이터 생성 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 데이터 생성 실패:', error);
  }
}

createTestWorker();