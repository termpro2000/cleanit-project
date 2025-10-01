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

async function createTestBuildings() {
  try {
    const buildings = [
      {
        name: '삼성빌딩',
        address: '서울특별시 강남구 테헤란로 123',
        floors: 20,
        area: 5000,
        managerName: '김관리',
        managerPhone: '010-1111-2222',
        buildingType: 'office',
        cleaningSchedule: 'daily',
        isActive: true,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
      },
      {
        name: 'LG타워',
        address: '서울특별시 서초구 서초대로 456',
        floors: 15,
        area: 4200,
        managerName: '이담당',
        managerPhone: '010-3333-4444',
        buildingType: 'office',
        cleaningSchedule: 'weekly',
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        name: '현대쇼핑센터',
        address: '서울특별시 중구 명동길 789',
        floors: 8,
        area: 6800,
        managerName: '박매니저',
        managerPhone: '010-5555-6666',
        buildingType: 'commercial',
        cleaningSchedule: 'daily',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '구 한화빌딩',
        address: '서울특별시 영등포구 여의도동 101',
        floors: 12,
        area: 3200,
        managerName: '정관리자',
        managerPhone: '010-7777-8888',
        buildingType: 'office',
        cleaningSchedule: 'monthly',
        isActive: false,
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2024-01-05')
      }
    ];

    for (const building of buildings) {
      await addDoc(collection(db, 'buildings'), building);
    }
    
    console.log('✅ 테스트 건물 데이터 생성 완료');
    console.log(`🏢 총 ${buildings.length}개 건물 생성:`);
    buildings.forEach((building, index) => {
      console.log(`   ${index + 1}. ${building.name} (${building.floors}층, ${building.area}m²)`);
    });
    console.log('🎉 모든 테스트 건물 데이터 생성 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 건물 데이터 생성 실패:', error);
  }
}

createTestBuildings();