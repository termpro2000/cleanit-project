import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  cleanup,
} from '@firebase/rules-unit-testing';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// TEST-002: 인증 시스템 테스트
describe('Authentication System Tests', () => {
  let testEnv: RulesTestEnvironment;
  const projectId = 'cleanit-auth-test';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /users/{userId} {
                allow read, write: if request.auth != null && request.auth.uid == userId;
              }
              match /{document=**} {
                allow read, write: if request.auth != null;
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

  test('should handle user registration flow', async () => {
    const unauthedContext = testEnv.unauthenticatedContext();
    const authedContext = testEnv.authenticatedContext('test-user');

    // 사용자 등록 시뮬레이션
    const userData = {
      uid: 'test-user',
      email: 'test@example.com',
      role: 'worker',
      phone: '010-1234-5678',
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      workerInfo: {
        bankName: '국민은행',
        accountNumber: '123-456-789',
      },
    };

    // 인증된 사용자만 자신의 데이터를 쓸 수 있는지 테스트
    const userDoc = doc(authedContext.firestore(), 'users', 'test-user');
    await setDoc(userDoc, userData);

    const userSnapshot = await getDoc(userDoc);
    expect(userSnapshot.exists()).toBe(true);
    expect(userSnapshot.data()?.email).toBe('test@example.com');
    expect(userSnapshot.data()?.role).toBe('worker');
  });

  test('should enforce user data access rules', async () => {
    const user1Context = testEnv.authenticatedContext('user1');
    const user2Context = testEnv.authenticatedContext('user2');

    // User1이 자신의 데이터 생성
    const user1Doc = doc(user1Context.firestore(), 'users', 'user1');
    await setDoc(user1Doc, {
      uid: 'user1',
      email: 'user1@test.com',
      role: 'client',
      phone: '010-1111-1111',
    });

    // User1이 자신의 데이터를 읽을 수 있는지 확인
    const user1Snapshot = await getDoc(user1Doc);
    expect(user1Snapshot.exists()).toBe(true);

    // User2가 User1의 데이터를 읽으려고 시도 (실패해야 함)
    const user2ReadAttempt = doc(user2Context.firestore(), 'users', 'user1');

    await expect(getDoc(user2ReadAttempt)).rejects.toThrow();
  });

  test('should handle role-based user creation', async () => {
    const testCases = [
      {
        uid: 'worker-test',
        role: 'worker',
        additionalInfo: {
          workerInfo: {
            bankName: '신한은행',
            accountNumber: '987-654-321',
            companyId: 'company-1',
          },
        },
      },
      {
        uid: 'client-test',
        role: 'client',
        additionalInfo: {
          clientInfo: {
            address: '서울시 강남구 테헤란로 123',
          },
        },
      },
      {
        uid: 'manager-test',
        role: 'manager',
        additionalInfo: {
          managerInfo: {
            name: '김관리',
            companyId: 'company-1',
            companyAddress: '서울시 서초구',
          },
        },
      },
    ];

    for (const testCase of testCases) {
      const userContext = testEnv.authenticatedContext(testCase.uid);
      const userDoc = doc(userContext.firestore(), 'users', testCase.uid);

      const userData = {
        uid: testCase.uid,
        email: `${testCase.uid}@test.com`,
        role: testCase.role,
        phone: '010-0000-0000',
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...testCase.additionalInfo,
      };

      await setDoc(userDoc, userData);

      const userSnapshot = await getDoc(userDoc);
      expect(userSnapshot.exists()).toBe(true);
      expect(userSnapshot.data()?.role).toBe(testCase.role);

      // 역할별 추가 정보 확인
      if (testCase.role === 'worker') {
        expect(userSnapshot.data()?.workerInfo?.bankName).toBe('신한은행');
      } else if (testCase.role === 'client') {
        expect(userSnapshot.data()?.clientInfo?.address).toContain('강남구');
      } else if (testCase.role === 'manager') {
        expect(userSnapshot.data()?.managerInfo?.name).toBe('김관리');
      }
    }
  });

  test('should handle user profile updates', async () => {
    const userContext = testEnv.authenticatedContext('update-test');
    const userDoc = doc(userContext.firestore(), 'users', 'update-test');

    // 초기 사용자 데이터
    const initialData = {
      uid: 'update-test',
      email: 'update@test.com',
      role: 'worker',
      phone: '010-1234-5678',
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(userDoc, initialData);

    // 프로필 업데이트
    const updatedData = {
      ...initialData,
      phone: '010-9876-5432',
      isVerified: true,
      updatedAt: new Date(),
      workerInfo: {
        bankName: '하나은행',
        accountNumber: '111-222-333',
      },
    };

    await setDoc(userDoc, updatedData);

    const updatedSnapshot = await getDoc(userDoc);
    expect(updatedSnapshot.data()?.phone).toBe('010-9876-5432');
    expect(updatedSnapshot.data()?.isVerified).toBe(true);
    expect(updatedSnapshot.data()?.workerInfo?.bankName).toBe('하나은행');
  });

  test('should handle user session management', async () => {
    // 세션 관리 시뮬레이션
    const userContext = testEnv.authenticatedContext('session-test');
    const db = userContext.firestore();

    // 로그인 세션 정보 저장
    const sessionDoc = doc(db, 'userSessions', 'session-test');
    const sessionData = {
      userId: 'session-test',
      loginAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      deviceInfo: 'Web Browser',
    };

    await setDoc(sessionDoc, sessionData);

    const sessionSnapshot = await getDoc(sessionDoc);
    expect(sessionSnapshot.exists()).toBe(true);
    expect(sessionSnapshot.data()?.isActive).toBe(true);

    // 세션 종료 시뮬레이션
    await setDoc(sessionDoc, {
      ...sessionData,
      isActive: false,
      logoutAt: new Date(),
    });

    const loggedOutSnapshot = await getDoc(sessionDoc);
    expect(loggedOutSnapshot.data()?.isActive).toBe(false);
    expect(loggedOutSnapshot.data()?.logoutAt).toBeDefined();
  });

  test('should validate email format and phone number', () => {
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validEmails = [
      'test@example.com',
      'user.name@domain.co.kr',
      'worker123@cleanit.com',
    ];

    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user@domain',
    ];

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });

    // 전화번호 형식 검증 (한국 전화번호)
    const phoneRegex = /^010-\d{4}-\d{4}$/;

    const validPhones = ['010-1234-5678', '010-9876-5432', '010-0000-0000'];

    const invalidPhones = [
      '010-12345-678',
      '011-1234-5678',
      '010.1234.5678',
      '01012345678',
    ];

    validPhones.forEach((phone) => {
      expect(phoneRegex.test(phone)).toBe(true);
    });

    invalidPhones.forEach((phone) => {
      expect(phoneRegex.test(phone)).toBe(false);
    });
  });

  test('should handle authentication state persistence', async () => {
    const userContext = testEnv.authenticatedContext('persistence-test');
    const userDoc = doc(userContext.firestore(), 'users', 'persistence-test');

    // 사용자 로그인 상태 정보
    const authStateData = {
      uid: 'persistence-test',
      email: 'persistence@test.com',
      role: 'manager',
      lastLogin: new Date(),
      rememberMe: true,
      sessionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
    };

    await setDoc(userDoc, authStateData);

    const authSnapshot = await getDoc(userDoc);
    expect(authSnapshot.exists()).toBe(true);
    expect(authSnapshot.data()?.rememberMe).toBe(true);
    expect(authSnapshot.data()?.sessionExpiry).toBeDefined();
  });

  test('should handle password security requirements', () => {
    // 비밀번호 강도 검증 함수
    const validatePassword = (password: string): boolean => {
      // 최소 8자, 대소문자, 숫자, 특수문자 포함
      const hasLength = password.length >= 8;
      const hasLowerCase = /[a-z]/.test(password);
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      return (
        hasLength &&
        hasLowerCase &&
        hasUpperCase &&
        hasNumbers &&
        hasSpecialChar
      );
    };

    const strongPasswords = [
      'StrongPass123!',
      'MySecure@Pass456',
      'CleanIT#2024$',
    ];

    const weakPasswords = [
      'password',
      '12345678',
      'Password',
      'password123',
      'PASSWORD123!',
    ];

    strongPasswords.forEach((password) => {
      expect(validatePassword(password)).toBe(true);
    });

    weakPasswords.forEach((password) => {
      expect(validatePassword(password)).toBe(false);
    });
  });
});
