import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';
import app from '../firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export const createDefaultManagerAccount = async () => {
  const defaultEmail = 'admin@cleanit.com';
  const defaultPassword = 'admin123';

  console.log('🚀 Starting default account creation process...');
  console.log('Email:', defaultEmail);

  try {
    // Firebase Auth에서 기본 계정이 있는지 확인하는 것은 어려우므로
    // 바로 계정 생성을 시도하고 이미 존재하는 경우 에러로 처리

    // Firebase Auth에 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      defaultEmail,
      defaultPassword
    );

    const user = userCredential.user;

    // 프로필 업데이트
    await updateProfile(user, {
      displayName: 'CleanIT Admin',
    });

    // Firestore에 사용자 정보 저장
    const userData = {
      id: user.uid,
      role: 'manager' as const,
      email: defaultEmail,
      phone: '010-0000-0000',
      isActive: true,
      isVerified: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      managerInfo: {
        name: 'CleanIT Admin',
        companyId: 'cleanit-company',
        companyAddress: '서울시 강남구 테헤란로 123',
      },
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    // 회사 정보도 생성
    const companyData = {
      id: 'cleanit-company',
      name: 'CleanIT 관리 회사',
      managerId: user.uid,
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      workerCount: 0,
      buildingCount: 0,
      monthlyRevenue: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'companies', 'cleanit-company'), companyData);

    console.log('Default manager account created successfully');
    console.log('Email: admin@cleanit.com');
    console.log('Password: admin123');

    // 생성 후 로그아웃 (현재 세션 유지하지 않음)
    await auth.signOut();
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Default manager account already exists in Firebase Auth');
    } else {
      console.error('❌ Error creating default manager account:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  }
};

// 앱 시작시 기본 계정 생성 함수 호출
export const initializeDefaultAccounts = async () => {
  try {
    await createDefaultManagerAccount();
  } catch (error) {
    console.error('Error initializing default accounts:', error);
  }
};
