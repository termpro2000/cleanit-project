import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  cleanup,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

// TEST-001: Firebase 연동 테스트
describe('Firebase Integration Tests', () => {
  let testEnv: RulesTestEnvironment;
  const projectId = 'cleanit-test';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /{document=**} {
                allow read, write: if true;
              }
            }
          }
        `,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
    await cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test('should connect to Firestore successfully', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 연결 테스트를 위한 간단한 문서 생성
    const testDoc = doc(db, 'test', 'connection');
    await setDoc(testDoc, { connected: true });

    const snapshot = await getDoc(testDoc);
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()?.connected).toBe(true);
  });

  test('should handle user collection operations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 사용자 컬렉션 테스트
    const userRef = doc(db, 'users', 'test-user');
    const userData = {
      id: 'test-user',
      role: 'worker',
      email: 'test@example.com',
      phone: '010-1234-5678',
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(userRef, userData);

    const userSnapshot = await getDoc(userRef);
    expect(userSnapshot.exists()).toBe(true);
    expect(userSnapshot.data()?.email).toBe('test@example.com');
    expect(userSnapshot.data()?.role).toBe('worker');
  });

  test('should handle building collection operations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 건물 컬렉션 테스트
    const buildingRef = doc(db, 'buildings', 'test-building');
    const buildingData = {
      id: 'test-building',
      name: '테스트 빌딩',
      address: '서울시 강남구',
      contact: {
        name: '홍길동',
        phone: '010-1234-5678',
        address: '서울시 강남구',
      },
      floors: {
        basement: 1,
        ground: 1,
        total: 10,
        hasElevator: true,
      },
      parking: {
        available: true,
        spaces: 50,
      },
      ownerId: 'test-owner',
      cleaningAreas: ['로비', '화장실', '사무실'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(buildingRef, buildingData);

    const buildingSnapshot = await getDoc(buildingRef);
    expect(buildingSnapshot.exists()).toBe(true);
    expect(buildingSnapshot.data()?.name).toBe('테스트 빌딩');
    expect(buildingSnapshot.data()?.floors.total).toBe(10);
  });

  test('should handle job collection operations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 작업 컬렉션 테스트
    const jobRef = doc(db, 'jobs', 'test-job');
    const jobData = {
      id: 'test-job',
      buildingId: 'test-building',
      workerId: 'test-worker',
      companyId: 'test-company',
      scheduledAt: new Date(),
      status: 'scheduled',
      areas: ['로비', '화장실'],
      beforePhotos: [],
      afterPhotos: [],
      completionRate: 0,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(jobRef, jobData);

    const jobSnapshot = await getDoc(jobRef);
    expect(jobSnapshot.exists()).toBe(true);
    expect(jobSnapshot.data()?.status).toBe('scheduled');
    expect(jobSnapshot.data()?.areas).toEqual(['로비', '화장실']);
  });

  test('should handle collection queries', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 여러 문서 생성
    const usersCollection = collection(db, 'users');

    const users = [
      { id: 'user1', role: 'worker', email: 'worker1@test.com' },
      { id: 'user2', role: 'client', email: 'client1@test.com' },
      { id: 'user3', role: 'manager', email: 'manager1@test.com' },
    ];

    for (const user of users) {
      await setDoc(doc(usersCollection, user.id), user);
    }

    // 컬렉션 쿼리 테스트
    const querySnapshot = await getDocs(usersCollection);
    expect(querySnapshot.size).toBe(3);

    const fetchedUsers = querySnapshot.docs.map((doc) => doc.data());
    expect(fetchedUsers.some((user) => user.role === 'worker')).toBe(true);
    expect(fetchedUsers.some((user) => user.role === 'client')).toBe(true);
    expect(fetchedUsers.some((user) => user.role === 'manager')).toBe(true);
  });

  test('should handle real-time listeners', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const testDoc = doc(db, 'realtime-test', 'listener-test');

    // 실시간 리스너 테스트
    return new Promise<void>((resolve) => {
      let updateCount = 0;

      const unsubscribe = testDoc.onSnapshot((snapshot) => {
        updateCount++;

        if (updateCount === 1) {
          // 첫 번째 호출 (초기 데이터 없음)
          expect(snapshot.exists()).toBe(false);

          // 데이터 추가
          setDoc(testDoc, { message: 'Hello World', timestamp: new Date() });
        } else if (updateCount === 2) {
          // 두 번째 호출 (데이터 추가됨)
          expect(snapshot.exists()).toBe(true);
          expect(snapshot.data()?.message).toBe('Hello World');

          unsubscribe();
          resolve();
        }
      });
    });
  });

  test('should handle error cases gracefully', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 존재하지 않는 문서 읽기
    const nonExistentDoc = doc(db, 'non-existent', 'document');
    const snapshot = await getDoc(nonExistentDoc);

    expect(snapshot.exists()).toBe(false);
    expect(snapshot.data()).toBeUndefined();
  });

  test('should handle batch operations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    // 배치 작업 테스트 (여러 문서 동시 생성)
    const batch = db.batch();

    for (let i = 1; i <= 5; i++) {
      const docRef = doc(db, 'batch-test', `doc-${i}`);
      batch.set(docRef, {
        id: `doc-${i}`,
        number: i,
        createdAt: new Date(),
      });
    }

    await batch.commit();

    // 배치로 생성된 문서들 확인
    const batchCollection = collection(db, 'batch-test');
    const snapshot = await getDocs(batchCollection);

    expect(snapshot.size).toBe(5);

    const docs = snapshot.docs.map((doc) => doc.data());
    expect(docs.some((doc) => doc.number === 1)).toBe(true);
    expect(docs.some((doc) => doc.number === 5)).toBe(true);
  });
});
