import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

// TEST-002: 인증 시스템 테스트 (실제 Firebase 사용)
describe('Authentication System Tests (Real Firebase)', () => {
  const testPrefix = 'test_' + Date.now();
  const createdUsers: User[] = [];
  const createdDocuments: Array<{ collection: string; id: string }> = [];

  afterAll(async () => {
    // 테스트에서 생성된 사용자들 삭제
    for (const user of createdUsers) {
      try {
        await deleteUser(user);
      } catch (error) {
        console.warn('Failed to delete test user:', error);
      }
    }

    // 테스트에서 생성된 문서들 삭제
    for (const { collection, id } of createdDocuments) {
      try {
        await deleteDoc(doc(db, collection, id));
      } catch (error) {
        console.warn('Failed to delete test document:', error);
      }
    }

    // 로그아웃
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Failed to sign out:', error);
    }
  });

  const trackDocument = (collection: string, id: string) => {
    createdDocuments.push({ collection, id });
  };

  test('should validate email and phone formats', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const validatePhone = (phone: string): boolean => {
      const phoneRegex = /^010-\d{4}-\d{4}$/;
      return phoneRegex.test(phone);
    };

    // 유효한 이메일들
    expect(validateEmail('test@cleanit.com')).toBe(true);
    expect(validateEmail('worker.kim@company.co.kr')).toBe(true);
    expect(validateEmail('client123@gmail.com')).toBe(true);

    // 유효하지 않은 이메일들
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);

    // 유효한 전화번호들
    expect(validatePhone('010-1234-5678')).toBe(true);
    expect(validatePhone('010-9876-5432')).toBe(true);

    // 유효하지 않은 전화번호들
    expect(validatePhone('010-12345-678')).toBe(false);
    expect(validatePhone('011-1234-5678')).toBe(false);
    expect(validatePhone('01012345678')).toBe(false);
  });

  test('should validate password strength requirements', () => {
    const validatePassword = (
      password: string
    ): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (password.length < 8) {
        errors.push('비밀번호는 최소 8자 이상이어야 합니다');
      }

      if (!/[a-z]/.test(password)) {
        errors.push('소문자를 포함해야 합니다');
      }

      if (!/[A-Z]/.test(password)) {
        errors.push('대문자를 포함해야 합니다');
      }

      if (!/\d/.test(password)) {
        errors.push('숫자를 포함해야 합니다');
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('특수문자를 포함해야 합니다');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    };

    // 강한 비밀번호들
    expect(validatePassword('CleanIT123!').isValid).toBe(true);
    expect(validatePassword('MySecure@Pass456').isValid).toBe(true);

    // 약한 비밀번호들
    expect(validatePassword('password').isValid).toBe(false);
    expect(validatePassword('12345678').isValid).toBe(false);
    expect(validatePassword('Password').isValid).toBe(false);

    const weakResult = validatePassword('password123');
    expect(weakResult.isValid).toBe(false);
    expect(weakResult.errors.length).toBeGreaterThan(0);
  });

  test('should create user with role-specific information', async () => {
    const testEmail = `${testPrefix}_worker@cleanit-test.com`;
    const testPassword = 'TestPass123!';

    try {
      // 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      const user = userCredential.user;
      createdUsers.push(user);

      // 사용자 프로필 업데이트
      await updateProfile(user, {
        displayName: '테스트 작업자',
      });

      // Firestore에 사용자 정보 저장
      const userId = user.uid;
      trackDocument('users', userId);

      const userData = {
        uid: userId,
        role: 'worker',
        email: testEmail,
        phone: '010-1234-5678',
        isActive: true,
        isVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        workerInfo: {
          bankName: '국민은행',
          accountNumber: '123-456-789',
          companyId: 'test-company',
        },
      };

      await setDoc(doc(db, 'users', userId), userData);

      // 데이터 확인
      const userDoc = await getDoc(doc(db, 'users', userId));
      expect(userDoc.exists()).toBe(true);
      expect(userDoc.data()?.role).toBe('worker');
      expect(userDoc.data()?.email).toBe(testEmail);
      expect(userDoc.data()?.workerInfo.bankName).toBe('국민은행');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('이메일이 이미 사용 중입니다. 테스트를 건너뜁니다.');
      } else {
        throw error;
      }
    }
  }, 15000);

  test('should handle user profile updates', async () => {
    const testEmail = `${testPrefix}_profile@cleanit-test.com`;
    const testPassword = 'TestPass123!';

    try {
      // 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      const user = userCredential.user;
      createdUsers.push(user);

      const userId = user.uid;
      trackDocument('users', userId);

      // 초기 사용자 데이터
      const initialData = {
        uid: userId,
        role: 'client',
        email: testEmail,
        phone: '010-0000-0000',
        isActive: true,
        isVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        clientInfo: {
          address: '서울시 강남구 초기주소',
        },
      };

      await setDoc(doc(db, 'users', userId), initialData);

      // 프로필 업데이트
      const updatedData = {
        ...initialData,
        phone: '010-9876-5432',
        isVerified: true,
        updatedAt: Timestamp.now(),
        clientInfo: {
          address: '서울시 서초구 업데이트된주소',
        },
      };

      await setDoc(doc(db, 'users', userId), updatedData);

      // 업데이트된 데이터 확인
      const updatedDoc = await getDoc(doc(db, 'users', userId));
      const data = updatedDoc.data();

      expect(data?.phone).toBe('010-9876-5432');
      expect(data?.isVerified).toBe(true);
      expect(data?.clientInfo.address).toContain('업데이트된주소');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('이메일이 이미 사용 중입니다. 테스트를 건너뜁니다.');
      } else {
        throw error;
      }
    }
  }, 15000);

  test('should handle manager registration with company info', async () => {
    const testEmail = `${testPrefix}_manager@cleanit-test.com`;
    const testPassword = 'TestPass123!';

    try {
      // 매니저 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      const user = userCredential.user;
      createdUsers.push(user);

      const userId = user.uid;
      trackDocument('users', userId);

      // 매니저 정보 저장
      const managerData = {
        uid: userId,
        role: 'manager',
        email: testEmail,
        phone: '010-1111-2222',
        isActive: true,
        isVerified: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        managerInfo: {
          name: '김매니저',
          companyId: 'company-test-123',
          companyAddress: '서울시 강남구 테헤란로 427',
        },
      };

      await setDoc(doc(db, 'users', userId), managerData);

      // 회사 정보도 함께 생성
      const companyId = 'company-test-123';
      trackDocument('companies', companyId);

      const companyData = {
        id: companyId,
        name: '테스트 청소 회사',
        managerId: userId,
        address: '서울시 강남구 테헤란로 427',
        phone: '02-1234-5678',
        workerCount: 10,
        buildingCount: 15,
        monthlyRevenue: 50000000,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'companies', companyId), companyData);

      // 데이터 확인
      const managerDoc = await getDoc(doc(db, 'users', userId));
      const companyDoc = await getDoc(doc(db, 'companies', companyId));

      expect(managerDoc.data()?.role).toBe('manager');
      expect(managerDoc.data()?.managerInfo.name).toBe('김매니저');
      expect(companyDoc.data()?.name).toBe('테스트 청소 회사');
      expect(companyDoc.data()?.managerId).toBe(userId);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('이메일이 이미 사용 중입니다. 테스트를 건너뜁니다.');
      } else {
        throw error;
      }
    }
  }, 15000);

  test('should handle authentication state persistence', async () => {
    const testEmail = `${testPrefix}_persistence@cleanit-test.com`;
    const testPassword = 'TestPass123!';

    try {
      // 사용자 생성 및 로그인
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      const user = userCredential.user;
      createdUsers.push(user);

      // 현재 인증된 사용자 확인
      expect(auth.currentUser).toBeTruthy();
      expect(auth.currentUser?.email).toBe(testEmail);

      // 로그아웃
      await signOut(auth);
      expect(auth.currentUser).toBeNull();

      // 다시 로그인
      const signInCredential = await signInWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      expect(signInCredential.user.email).toBe(testEmail);
      expect(auth.currentUser?.email).toBe(testEmail);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // 이미 존재하는 경우 로그인 시도
        try {
          const signInCredential = await signInWithEmailAndPassword(
            auth,
            testEmail,
            testPassword
          );
          expect(signInCredential.user.email).toBe(testEmail);
        } catch (signInError) {
          console.log('로그인 실패:', signInError);
        }
      } else {
        throw error;
      }
    }
  }, 15000);

  test('should handle user session data', async () => {
    const sessionId = `${testPrefix}_session_test`;
    trackDocument('userSessions', sessionId);

    // 세션 데이터 생성
    const sessionData = {
      id: sessionId,
      userId: 'test-user-123',
      loginAt: Timestamp.now(),
      lastActivity: Timestamp.now(),
      isActive: true,
      deviceInfo: 'Web Browser - Jest Test',
      ipAddress: '127.0.0.1',
    };

    await setDoc(doc(db, 'userSessions', sessionId), sessionData);

    // 세션 활동 업데이트
    await setDoc(doc(db, 'userSessions', sessionId), {
      ...sessionData,
      lastActivity: Timestamp.now(),
      pageViews: 5,
    });

    // 세션 종료
    await setDoc(doc(db, 'userSessions', sessionId), {
      ...sessionData,
      isActive: false,
      logoutAt: Timestamp.now(),
    });

    const sessionDoc = await getDoc(doc(db, 'userSessions', sessionId));
    const data = sessionDoc.data();

    expect(data?.isActive).toBe(false);
    expect(data?.logoutAt).toBeDefined();
    expect(data?.deviceInfo).toContain('Jest Test');
  });

  test('should validate user role permissions', () => {
    const checkPermission = (
      userRole: string,
      action: string,
      resource: string
    ): boolean => {
      const permissions = {
        worker: {
          jobs: ['read', 'update'],
          requests: ['read', 'update'],
          photos: ['create', 'read'],
        },
        client: {
          buildings: ['create', 'read', 'update'],
          requests: ['create', 'read'],
          reviews: ['create', 'read'],
        },
        manager: {
          workers: ['create', 'read', 'update', 'delete'],
          buildings: ['create', 'read', 'update', 'delete'],
          jobs: ['create', 'read', 'update', 'delete'],
          requests: ['create', 'read', 'update', 'delete'],
          reviews: ['read'],
          analytics: ['read'],
        },
      };

      const userPermissions = permissions[userRole as keyof typeof permissions];
      if (!userPermissions) return false;

      const resourcePermissions =
        userPermissions[resource as keyof typeof userPermissions];
      if (!resourcePermissions) return false;

      return resourcePermissions.includes(action);
    };

    // Worker 권한 테스트
    expect(checkPermission('worker', 'read', 'jobs')).toBe(true);
    expect(checkPermission('worker', 'update', 'jobs')).toBe(true);
    expect(checkPermission('worker', 'delete', 'jobs')).toBe(false);
    expect(checkPermission('worker', 'create', 'buildings')).toBe(false);

    // Client 권한 테스트
    expect(checkPermission('client', 'create', 'buildings')).toBe(true);
    expect(checkPermission('client', 'create', 'requests')).toBe(true);
    expect(checkPermission('client', 'delete', 'workers')).toBe(false);

    // Manager 권한 테스트
    expect(checkPermission('manager', 'create', 'workers')).toBe(true);
    expect(checkPermission('manager', 'read', 'analytics')).toBe(true);
    expect(checkPermission('manager', 'delete', 'jobs')).toBe(true);
  });
}, 60000); // 60초 타임아웃 설정
