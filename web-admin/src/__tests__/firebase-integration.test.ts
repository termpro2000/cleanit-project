import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// TEST-001: Firebase 연동 테스트 (실제 Firebase 사용)
describe('Firebase Integration Tests (Real Firebase)', () => {
  const testCollectionPrefix = 'test_' + Date.now();

  // 테스트 후 정리를 위한 생성된 문서 ID 추적
  const createdDocuments: Array<{ collection: string; id: string }> = [];

  afterAll(async () => {
    // 테스트에서 생성된 모든 문서 삭제
    const deletePromises = createdDocuments.map(({ collection, id }) =>
      deleteDoc(doc(db, collection, id)).catch(console.error)
    );
    await Promise.all(deletePromises);
  });

  const trackDocument = (collection: string, id: string) => {
    createdDocuments.push({ collection, id });
  };

  test('should connect to Firebase Firestore successfully', async () => {
    const testDocId = `${testCollectionPrefix}_connection_test`;
    const testDoc = doc(db, 'test_connection', testDocId);

    trackDocument('test_connection', testDocId);

    await setDoc(testDoc, {
      connected: true,
      timestamp: Timestamp.now(),
      testId: testDocId,
    });

    const snapshot = await getDoc(testDoc);
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()?.connected).toBe(true);
  });

  test('should create and read user document', async () => {
    const testUserId = `${testCollectionPrefix}_user_test`;
    const userRef = doc(db, 'test_users', testUserId);

    trackDocument('test_users', testUserId);

    const userData = {
      id: testUserId,
      role: 'worker',
      email: 'test@cleanit.com',
      phone: '010-1234-5678',
      isActive: true,
      isVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      workerInfo: {
        bankName: '국민은행',
        accountNumber: '123-456-789',
      },
    };

    await setDoc(userRef, userData);

    const userSnapshot = await getDoc(userRef);
    expect(userSnapshot.exists()).toBe(true);
    expect(userSnapshot.data()?.email).toBe('test@cleanit.com');
    expect(userSnapshot.data()?.role).toBe('worker');
    expect(userSnapshot.data()?.workerInfo.bankName).toBe('국민은행');
  });

  test('should update user document', async () => {
    const testUserId = `${testCollectionPrefix}_user_update_test`;
    const userRef = doc(db, 'test_users', testUserId);

    trackDocument('test_users', testUserId);

    // 초기 문서 생성
    await setDoc(userRef, {
      id: testUserId,
      role: 'worker',
      email: 'update@cleanit.com',
      phone: '010-0000-0000',
      isActive: true,
      isVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 문서 업데이트
    await updateDoc(userRef, {
      phone: '010-1111-1111',
      isVerified: true,
      updatedAt: Timestamp.now(),
    });

    const updatedSnapshot = await getDoc(userRef);
    const data = updatedSnapshot.data();

    expect(data?.phone).toBe('010-1111-1111');
    expect(data?.isVerified).toBe(true);
  });

  test('should create and query building documents', async () => {
    const testBuildingPrefix = `${testCollectionPrefix}_building`;

    // 여러 건물 문서 생성
    const buildings = [
      {
        id: `${testBuildingPrefix}_1`,
        ownerId: 'owner1',
        name: '테스트 빌딩 1',
      },
      {
        id: `${testBuildingPrefix}_2`,
        ownerId: 'owner1',
        name: '테스트 빌딩 2',
      },
      {
        id: `${testBuildingPrefix}_3`,
        ownerId: 'owner2',
        name: '테스트 빌딩 3',
      },
    ];

    for (const building of buildings) {
      trackDocument('test_buildings', building.id);

      await setDoc(doc(db, 'test_buildings', building.id), {
        ...building,
        address: '서울시 강남구 테스트로 123',
        contact: {
          name: '테스트 담당자',
          phone: '02-1234-5678',
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
        cleaningAreas: ['로비', '화장실', '사무실'],
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    // owner1의 건물들 조회
    const q = query(
      collection(db, 'test_buildings'),
      where('ownerId', '==', 'owner1')
    );

    const querySnapshot = await getDocs(q);
    const ownerBuildings = querySnapshot.docs.map((doc) => doc.data());

    expect(ownerBuildings.length).toBeGreaterThanOrEqual(2);
    expect(ownerBuildings.every((b) => b.ownerId === 'owner1')).toBe(true);
  });

  test('should handle job lifecycle operations', async () => {
    const testJobId = `${testCollectionPrefix}_job_lifecycle`;
    const jobRef = doc(db, 'test_jobs', testJobId);

    trackDocument('test_jobs', testJobId);

    // 작업 생성
    const jobData = {
      id: testJobId,
      buildingId: 'test-building',
      workerId: 'test-worker',
      companyId: 'test-company',
      scheduledAt: Timestamp.now(),
      status: 'scheduled',
      areas: ['로비', '화장실'],
      beforePhotos: [],
      afterPhotos: [],
      completionRate: 0,
      isVisible: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(jobRef, jobData);

    // 작업 시작
    await updateDoc(jobRef, {
      status: 'in_progress',
      startedAt: Timestamp.now(),
      beforePhotos: ['before1.jpg', 'before2.jpg'],
      updatedAt: Timestamp.now(),
    });

    // 작업 완료
    await updateDoc(jobRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      afterPhotos: ['after1.jpg', 'after2.jpg'],
      completionRate: 100,
      workerNotes: '청소 완료됨',
      updatedAt: Timestamp.now(),
    });

    const finalSnapshot = await getDoc(jobRef);
    const data = finalSnapshot.data();

    expect(data?.status).toBe('completed');
    expect(data?.completionRate).toBe(100);
    expect(data?.beforePhotos).toHaveLength(2);
    expect(data?.afterPhotos).toHaveLength(2);
  });

  test('should handle request workflow', async () => {
    const testRequestId = `${testCollectionPrefix}_request_workflow`;
    const requestRef = doc(db, 'test_requests', testRequestId);

    trackDocument('test_requests', testRequestId);

    // 요청 생성
    await setDoc(requestRef, {
      id: testRequestId,
      buildingId: 'test-building',
      requesterId: 'test-client',
      type: 'urgent',
      priority: 'high',
      title: '긴급 청소 요청',
      content: '화장실 청소가 필요합니다.',
      photos: ['issue1.jpg'],
      assignedTo: {},
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 요청 배정
    await updateDoc(requestRef, {
      'assignedTo.workerId': 'test-worker',
      'assignedTo.companyId': 'test-company',
      status: 'assigned',
      updatedAt: Timestamp.now(),
    });

    // 요청 완료
    await updateDoc(requestRef, {
      status: 'completed',
      response: {
        status: 'completed',
        notes: '청소 완료했습니다.',
        photos: ['completed1.jpg'],
        completedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    const finalSnapshot = await getDoc(requestRef);
    const data = finalSnapshot.data();

    expect(data?.status).toBe('completed');
    expect(data?.assignedTo.workerId).toBe('test-worker');
    expect(data?.response.status).toBe('completed');
  });

  test('should handle reviews and ratings', async () => {
    const testReviewId = `${testCollectionPrefix}_review`;
    const reviewRef = doc(db, 'test_reviews', testReviewId);

    trackDocument('test_reviews', testReviewId);

    const reviewData = {
      id: testReviewId,
      jobId: 'test-job',
      buildingId: 'test-building',
      reviewerId: 'test-client',
      workerId: 'test-worker',
      companyId: 'test-company',
      rating: 4.5,
      comment: '청소가 깔끔하게 잘 되었습니다.',
      categories: {
        cleanliness: 5,
        punctuality: 4,
        communication: 4,
        overall: 4.5,
      },
      improvements: ['더 세심한 청소'],
      isVisible: true,
      createdAt: Timestamp.now(),
    };

    await setDoc(reviewRef, reviewData);

    const reviewSnapshot = await getDoc(reviewRef);
    const data = reviewSnapshot.data();

    expect(data?.rating).toBe(4.5);
    expect(data?.categories.cleanliness).toBe(5);
    expect(data?.comment).toContain('깔끔하게');
  });

  test('should handle complex queries with ordering and limits', async () => {
    const testJobPrefix = `${testCollectionPrefix}_query_job`;

    // 여러 작업 생성 (시간순으로)
    const jobs = [];
    for (let i = 1; i <= 5; i++) {
      const jobId = `${testJobPrefix}_${i}`;
      jobs.push(jobId);
      trackDocument('test_jobs', jobId);

      await setDoc(doc(db, 'test_jobs', jobId), {
        id: jobId,
        buildingId: 'test-building',
        workerId: 'test-worker',
        companyId: 'test-company',
        status: i <= 2 ? 'scheduled' : 'completed',
        scheduledAt: Timestamp.fromMillis(Date.now() + i * 1000),
        areas: ['테스트 영역'],
        beforePhotos: [],
        afterPhotos: [],
        completionRate: i <= 2 ? 0 : 100,
        isVisible: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 문서 생성 간격을 두어 고유한 타임스탬프 보장
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 예정된 작업들만 조회
    const scheduledQuery = query(
      collection(db, 'test_jobs'),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc'),
      limit(3)
    );

    const scheduledSnapshot = await getDocs(scheduledQuery);
    expect(scheduledSnapshot.size).toBeGreaterThanOrEqual(2);

    // 완료된 작업들 조회
    const completedQuery = query(
      collection(db, 'test_jobs'),
      where('status', '==', 'completed')
    );

    const completedSnapshot = await getDocs(completedQuery);
    expect(completedSnapshot.size).toBeGreaterThanOrEqual(3);
  });

  test('should handle notification system', async () => {
    const testNotificationId = `${testCollectionPrefix}_notification`;
    const notificationRef = doc(db, 'test_notifications', testNotificationId);

    trackDocument('test_notifications', testNotificationId);

    const notificationData = {
      id: testNotificationId,
      userId: 'test-user',
      type: 'job_assigned',
      priority: 'normal',
      title: '새로운 작업이 배정되었습니다',
      message: '테스트 빌딩에서 청소 작업이 배정되었습니다.',
      data: {
        jobId: 'test-job-123',
        buildingId: 'test-building-456',
      },
      isRead: false,
      actionUrl: '/jobs/test-job-123',
      createdAt: Timestamp.now(),
    };

    await setDoc(notificationRef, notificationData);

    // 알림 읽음 처리
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: Timestamp.now(),
    });

    const notificationSnapshot = await getDoc(notificationRef);
    const data = notificationSnapshot.data();

    expect(data?.isRead).toBe(true);
    expect(data?.type).toBe('job_assigned');
    expect(data?.data.jobId).toBe('test-job-123');
  });

  test('should handle batch operations', async () => {
    const batchTestPrefix = `${testCollectionPrefix}_batch`;
    const createdDocs = [];

    // 배치로 여러 문서 생성
    for (let i = 1; i <= 3; i++) {
      const docId = `${batchTestPrefix}_${i}`;
      createdDocs.push(docId);
      trackDocument('test_batch', docId);

      await setDoc(doc(db, 'test_batch', docId), {
        id: docId,
        number: i,
        status: 'active',
        createdAt: Timestamp.now(),
      });
    }

    // 생성된 문서들 조회
    const batchQuery = query(
      collection(db, 'test_batch'),
      where('status', '==', 'active')
    );

    const batchSnapshot = await getDocs(batchQuery);
    const batchDocs = batchSnapshot.docs.map((doc) => doc.data());

    expect(batchDocs.length).toBeGreaterThanOrEqual(3);
    expect(batchDocs.some((doc) => doc.number === 1)).toBe(true);
    expect(batchDocs.some((doc) => doc.number === 3)).toBe(true);
  });
}, 30000); // 30초 타임아웃 설정
