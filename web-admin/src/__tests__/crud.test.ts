import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  cleanup,
} from '@firebase/rules-unit-testing';
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
  serverTimestamp,
} from 'firebase/firestore';

// TEST-003: 데이터 CRUD 테스트
describe('Data CRUD Operations Tests', () => {
  let testEnv: RulesTestEnvironment;
  const projectId = 'cleanit-crud-test';

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

  describe('User CRUD Operations', () => {
    test('should create user with all required fields', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const userRef = doc(db, 'users', 'create-test');

      const userData = {
        id: 'create-test',
        role: 'worker',
        email: 'worker@test.com',
        phone: '010-1234-5678',
        emergencyPhone: '010-9876-5432',
        isActive: true,
        isVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        workerInfo: {
          bankName: '국민은행',
          accountNumber: '123-456-789',
          companyId: 'company-1',
        },
      };

      await setDoc(userRef, userData);

      const userSnapshot = await getDoc(userRef);
      expect(userSnapshot.exists()).toBe(true);
      expect(userSnapshot.data()?.role).toBe('worker');
      expect(userSnapshot.data()?.workerInfo.bankName).toBe('국민은행');
    });

    test('should read user data correctly', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const userRef = doc(db, 'users', 'read-test');

      const userData = {
        id: 'read-test',
        role: 'client',
        email: 'client@test.com',
        phone: '010-1111-2222',
        isActive: true,
        isVerified: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        clientInfo: {
          address: '서울시 강남구 테헤란로 123',
        },
      };

      await setDoc(userRef, userData);

      const userSnapshot = await getDoc(userRef);
      const data = userSnapshot.data();

      expect(data?.email).toBe('client@test.com');
      expect(data?.role).toBe('client');
      expect(data?.clientInfo.address).toContain('강남구');
    });

    test('should update user data fields', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const userRef = doc(db, 'users', 'update-test');

      // 초기 데이터 생성
      await setDoc(userRef, {
        id: 'update-test',
        role: 'worker',
        email: 'worker@test.com',
        phone: '010-0000-0000',
        isActive: true,
        isVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 데이터 업데이트
      await updateDoc(userRef, {
        phone: '010-1111-1111',
        isVerified: true,
        updatedAt: Timestamp.now(),
        emergencyPhone: '010-2222-2222',
      });

      const updatedSnapshot = await getDoc(userRef);
      const data = updatedSnapshot.data();

      expect(data?.phone).toBe('010-1111-1111');
      expect(data?.isVerified).toBe(true);
      expect(data?.emergencyPhone).toBe('010-2222-2222');
    });

    test('should delete user data', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const userRef = doc(db, 'users', 'delete-test');

      // 데이터 생성
      await setDoc(userRef, {
        id: 'delete-test',
        role: 'manager',
        email: 'manager@test.com',
        phone: '010-3333-3333',
        isActive: true,
      });

      // 존재 확인
      let snapshot = await getDoc(userRef);
      expect(snapshot.exists()).toBe(true);

      // 삭제
      await deleteDoc(userRef);

      // 삭제 확인
      snapshot = await getDoc(userRef);
      expect(snapshot.exists()).toBe(false);
    });
  });

  describe('Building CRUD Operations', () => {
    test('should create building with complete information', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const buildingRef = doc(db, 'buildings', 'building-create-test');

      const buildingData = {
        id: 'building-create-test',
        name: '삼성 빌딩',
        address: '서울시 강남구 테헤란로 427',
        contact: {
          name: '김관리',
          phone: '02-1234-5678',
          address: '서울시 강남구 테헤란로 427',
        },
        floors: {
          basement: 3,
          ground: 1,
          total: 20,
          hasElevator: true,
        },
        parking: {
          available: true,
          spaces: 100,
        },
        ownerId: 'owner-123',
        companyId: 'company-456',
        cleaningAreas: ['로비', '화장실', '사무실', '회의실', '복도'],
        specialNotes: '매일 오전 9시 이전 청소 완료 요망',
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(buildingRef, buildingData);

      const buildingSnapshot = await getDoc(buildingRef);
      const data = buildingSnapshot.data();

      expect(data?.name).toBe('삼성 빌딩');
      expect(data?.floors.total).toBe(20);
      expect(data?.cleaningAreas).toHaveLength(5);
      expect(data?.parking.spaces).toBe(100);
    });

    test('should query buildings by owner', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // 여러 건물 생성
      const buildings = [
        { id: 'b1', ownerId: 'owner1', name: '빌딩1' },
        { id: 'b2', ownerId: 'owner1', name: '빌딩2' },
        { id: 'b3', ownerId: 'owner2', name: '빌딩3' },
      ];

      for (const building of buildings) {
        await setDoc(doc(db, 'buildings', building.id), {
          ...building,
          address: '서울시 강남구',
          isActive: true,
          createdAt: Timestamp.now(),
        });
      }

      // owner1의 건물들 조회
      const q = query(
        collection(db, 'buildings'),
        where('ownerId', '==', 'owner1')
      );

      const querySnapshot = await getDocs(q);
      expect(querySnapshot.size).toBe(2);

      const ownerBuildings = querySnapshot.docs.map((doc) => doc.data());
      expect(ownerBuildings.every((b) => b.ownerId === 'owner1')).toBe(true);
    });
  });

  describe('Job CRUD Operations', () => {
    test('should create and manage job lifecycle', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // 작업 생성
      const jobRef = doc(db, 'jobs', 'job-lifecycle-test');
      const jobData = {
        id: 'job-lifecycle-test',
        buildingId: 'building-123',
        workerId: 'worker-456',
        companyId: 'company-789',
        scheduledAt: Timestamp.now(),
        status: 'scheduled',
        areas: ['로비', '화장실', '사무실'],
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
        updatedAt: Timestamp.now(),
      });

      // 사진 업로드 시뮬레이션
      await updateDoc(jobRef, {
        beforePhotos: ['photo1.jpg', 'photo2.jpg'],
        updatedAt: Timestamp.now(),
      });

      // 작업 완료
      await updateDoc(jobRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
        afterPhotos: ['after1.jpg', 'after2.jpg', 'after3.jpg'],
        completionRate: 100,
        workerNotes: '청소 완료. 특별한 문제 없음.',
        updatedAt: Timestamp.now(),
      });

      const finalSnapshot = await getDoc(jobRef);
      const data = finalSnapshot.data();

      expect(data?.status).toBe('completed');
      expect(data?.completionRate).toBe(100);
      expect(data?.beforePhotos).toHaveLength(2);
      expect(data?.afterPhotos).toHaveLength(3);
      expect(data?.workerNotes).toContain('완료');
    });

    test('should query jobs by status and date', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      const now = Timestamp.now();
      const yesterday = Timestamp.fromMillis(
        now.toMillis() - 24 * 60 * 60 * 1000
      );

      // 여러 작업 생성
      const jobs = [
        { id: 'j1', status: 'scheduled', scheduledAt: now },
        { id: 'j2', status: 'in_progress', scheduledAt: yesterday },
        { id: 'j3', status: 'completed', scheduledAt: yesterday },
        { id: 'j4', status: 'scheduled', scheduledAt: now },
      ];

      for (const job of jobs) {
        await setDoc(doc(db, 'jobs', job.id), {
          ...job,
          buildingId: 'test-building',
          workerId: 'test-worker',
          companyId: 'test-company',
          areas: ['test-area'],
          beforePhotos: [],
          afterPhotos: [],
          completionRate: job.status === 'completed' ? 100 : 0,
          isVisible: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // 예정된 작업들 조회
      const scheduledQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'scheduled'),
        orderBy('scheduledAt', 'asc')
      );

      const scheduledSnapshot = await getDocs(scheduledQuery);
      expect(scheduledSnapshot.size).toBe(2);

      // 완료된 작업들 조회
      const completedQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'completed')
      );

      const completedSnapshot = await getDocs(completedQuery);
      expect(completedSnapshot.size).toBe(1);
    });
  });

  describe('Request CRUD Operations', () => {
    test('should handle request workflow', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // 요청 생성
      const requestRef = doc(db, 'requests', 'request-workflow-test');
      const requestData = {
        id: 'request-workflow-test',
        buildingId: 'building-123',
        requesterId: 'client-456',
        type: 'urgent',
        priority: 'high',
        title: '화장실 청소 요청',
        content: '화장실에 이상한 냄새가 납니다. 긴급 청소가 필요합니다.',
        location: '3층 남자화장실',
        photos: ['issue1.jpg', 'issue2.jpg'],
        assignedTo: {},
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(requestRef, requestData);

      // 작업자 배정
      await updateDoc(requestRef, {
        'assignedTo.workerId': 'worker-789',
        'assignedTo.companyId': 'company-123',
        status: 'assigned',
        updatedAt: Timestamp.now(),
      });

      // 작업 진행
      await updateDoc(requestRef, {
        status: 'in_progress',
        updatedAt: Timestamp.now(),
      });

      // 작업 완료
      await updateDoc(requestRef, {
        status: 'completed',
        response: {
          status: 'completed',
          notes: '화장실 청소 및 소독 완료. 배수관 청소도 실시했습니다.',
          photos: ['completed1.jpg', 'completed2.jpg'],
          completedAt: Timestamp.now(),
        },
        updatedAt: Timestamp.now(),
      });

      const finalSnapshot = await getDoc(requestRef);
      const data = finalSnapshot.data();

      expect(data?.status).toBe('completed');
      expect(data?.assignedTo.workerId).toBe('worker-789');
      expect(data?.response.status).toBe('completed');
      expect(data?.response.photos).toHaveLength(2);
    });

    test('should query requests by priority and building', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      const requests = [
        { id: 'r1', buildingId: 'b1', priority: 'urgent', status: 'pending' },
        { id: 'r2', buildingId: 'b1', priority: 'high', status: 'assigned' },
        { id: 'r3', buildingId: 'b2', priority: 'urgent', status: 'pending' },
        { id: 'r4', buildingId: 'b1', priority: 'normal', status: 'completed' },
      ];

      for (const request of requests) {
        await setDoc(doc(db, 'requests', request.id), {
          ...request,
          requesterId: 'test-client',
          type: 'general',
          title: 'Test Request',
          content: 'Test content',
          photos: [],
          assignedTo: {},
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // 건물 b1의 긴급 요청들 조회
      const urgentB1Query = query(
        collection(db, 'requests'),
        where('buildingId', '==', 'b1'),
        where('priority', '==', 'urgent')
      );

      const urgentB1Snapshot = await getDocs(urgentB1Query);
      expect(urgentB1Snapshot.size).toBe(1);

      // 모든 긴급 요청들 조회
      const allUrgentQuery = query(
        collection(db, 'requests'),
        where('priority', '==', 'urgent')
      );

      const allUrgentSnapshot = await getDocs(allUrgentQuery);
      expect(allUrgentSnapshot.size).toBe(2);
    });
  });

  describe('Review CRUD Operations', () => {
    test('should create and manage reviews', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      const reviewRef = doc(db, 'reviews', 'review-test');
      const reviewData = {
        id: 'review-test',
        jobId: 'job-123',
        buildingId: 'building-456',
        reviewerId: 'client-789',
        workerId: 'worker-101',
        companyId: 'company-202',
        rating: 4.5,
        comment: '청소가 깔끔하게 잘 되었습니다. 시간도 정확했고 친절했어요.',
        categories: {
          cleanliness: 5,
          punctuality: 4,
          communication: 4,
          overall: 4.5,
        },
        improvements: ['더 세심한 모서리 청소'],
        isVisible: true,
        createdAt: Timestamp.now(),
      };

      await setDoc(reviewRef, reviewData);

      const reviewSnapshot = await getDoc(reviewRef);
      const data = reviewSnapshot.data();

      expect(data?.rating).toBe(4.5);
      expect(data?.categories.cleanliness).toBe(5);
      expect(data?.improvements).toContain('더 세심한 모서리 청소');
    });

    test('should calculate average ratings', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      const workerId = 'worker-rating-test';
      const reviews = [
        { id: 'rev1', rating: 4.0, categories: { overall: 4.0 } },
        { id: 'rev2', rating: 4.5, categories: { overall: 4.5 } },
        { id: 'rev3', rating: 5.0, categories: { overall: 5.0 } },
        { id: 'rev4', rating: 3.5, categories: { overall: 3.5 } },
      ];

      for (const review of reviews) {
        await setDoc(doc(db, 'reviews', review.id), {
          ...review,
          jobId: `job-${review.id}`,
          buildingId: 'test-building',
          reviewerId: 'test-client',
          workerId,
          companyId: 'test-company',
          comment: 'Test review',
          categories: {
            cleanliness: review.categories.overall,
            punctuality: review.categories.overall,
            communication: review.categories.overall,
            overall: review.categories.overall,
          },
          isVisible: true,
          createdAt: Timestamp.now(),
        });
      }

      // 특정 작업자의 모든 리뷰 조회
      const workerReviewsQuery = query(
        collection(db, 'reviews'),
        where('workerId', '==', workerId),
        where('isVisible', '==', true)
      );

      const workerReviewsSnapshot = await getDocs(workerReviewsQuery);
      const workerReviews = workerReviewsSnapshot.docs.map((doc) => doc.data());

      expect(workerReviews).toHaveLength(4);

      // 평균 평점 계산
      const avgRating =
        workerReviews.reduce((sum, review) => sum + review.rating, 0) /
        workerReviews.length;
      expect(avgRating).toBe(4.25);
    });
  });

  describe('Complex Query Operations', () => {
    test('should handle compound queries with multiple conditions', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // 테스트 데이터 생성
      const today = Timestamp.now();
      const jobs = [
        { id: 'j1', status: 'scheduled', workerId: 'w1', scheduledAt: today },
        { id: 'j2', status: 'in_progress', workerId: 'w1', scheduledAt: today },
        { id: 'j3', status: 'completed', workerId: 'w1', scheduledAt: today },
        { id: 'j4', status: 'scheduled', workerId: 'w2', scheduledAt: today },
      ];

      for (const job of jobs) {
        await setDoc(doc(db, 'jobs', job.id), {
          ...job,
          buildingId: 'test-building',
          companyId: 'test-company',
          areas: ['test-area'],
          beforePhotos: [],
          afterPhotos: [],
          completionRate: job.status === 'completed' ? 100 : 0,
          isVisible: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // 특정 작업자의 미완료 작업들 조회
      const incompleteJobsQuery = query(
        collection(db, 'jobs'),
        where('workerId', '==', 'w1'),
        where('status', 'in', ['scheduled', 'in_progress'])
      );

      const incompleteJobsSnapshot = await getDocs(incompleteJobsQuery);
      expect(incompleteJobsSnapshot.size).toBe(2);
    });

    test('should handle pagination with limit and ordering', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // 10개의 작업 생성 (시간 순서대로)
      for (let i = 1; i <= 10; i++) {
        const jobRef = doc(db, 'jobs', `job-${i.toString().padStart(2, '0')}`);
        await setDoc(jobRef, {
          id: `job-${i.toString().padStart(2, '0')}`,
          buildingId: 'test-building',
          workerId: 'test-worker',
          companyId: 'test-company',
          status: 'completed',
          scheduledAt: Timestamp.fromMillis(Date.now() + i * 1000),
          areas: ['test-area'],
          beforePhotos: [],
          afterPhotos: [],
          completionRate: 100,
          isVisible: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // 첫 번째 페이지 (5개 제한)
      const firstPageQuery = query(
        collection(db, 'jobs'),
        orderBy('scheduledAt', 'desc'),
        limit(5)
      );

      const firstPageSnapshot = await getDocs(firstPageQuery);
      expect(firstPageSnapshot.size).toBe(5);

      const firstPageJobs = firstPageSnapshot.docs.map((doc) => doc.data());
      expect(firstPageJobs[0].id).toBe('job-10'); // 가장 늦은 시간이 첫 번째
    });
  });
});
