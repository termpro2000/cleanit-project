import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import app from '../firebase';
import { User, UserRole } from '../../../shared/types';

const db = getFirestore(app);

// 인증된 사용자 정보 타입
export interface AuthUser {
  uid: string;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  profile?: User;
}

// 인증 컨텍스트 타입
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

// 기본 사용자 정보 (하드코딩된 인증 정보)
const DEFAULT_USERS = [
  {
    uid: 'admin_user_001',
    username: 'admin',
    password: 'admin123',
    email: 'admin@cleanit.com',
    role: 'admin' as UserRole,
    name: 'System Administrator'
  },
  {
    uid: 'manager_user_001', 
    username: 'manager1',
    password: 'manager123',
    email: 'manager1@cleanit.com',
    role: 'manager' as UserRole,
    name: 'Manager User'
  },
  {
    uid: 'client_user_001',
    username: 'client1',
    password: 'client123', 
    email: 'client1@cleanit.com',
    role: 'client' as UserRole,
    name: 'Client User'
  },
  {
    uid: 'worker_user_001',
    username: 'worker1',
    password: 'worker123',
    email: 'worker1@cleanit.com', 
    role: 'worker' as UserRole,
    name: 'Worker User'
  }
];

// 역할별 권한 매핑
const ROLE_PERMISSIONS = {
  admin: [
    'manage_users', 'manage_buildings', 'manage_requests', 'manage_workers',
    'manage_companies', 'view_analytics', 'system_settings', 'approve_requests',
    'assign_workers', 'view_all_data'
  ],
  manager: [
    'manage_buildings', 'manage_workers', 'view_requests', 'assign_workers',
    'view_analytics', 'manage_company_data'
  ],
  client: [
    'create_requests', 'view_own_buildings', 'view_own_requests', 'manage_own_profile'
  ],
  worker: [
    'view_assigned_jobs', 'update_job_status', 'upload_photos', 
    'manage_own_profile', 'view_assigned_requests'
  ]
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 로그인 정보 확인
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Firestore에서 최신 프로필 정보 가져오기
        const profile = await fetchUserProfile(userData.uid);
        
        setUser({
          ...userData,
          profile
        });
      }
    } catch (error) {
      console.error('저장된 인증 정보 확인 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // Firestore에서 사용자 프로필 가져오기
  const fetchUserProfile = async (uid: string): Promise<User | undefined> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      
      // Firestore에 사용자가 없는 경우, 기본 사용자 찾기
      const defaultUser = DEFAULT_USERS.find(u => u.uid === uid);
      if (defaultUser) {
        // Firestore에 기본 사용자 정보로 검색
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', defaultUser.email)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          return usersSnapshot.docs[0].data() as User;
        }
      }
    } catch (error) {
      console.error('사용자 프로필 조회 실패:', error);
    }
    return undefined;
  };

  // 로그인 함수
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      // 기본 사용자 정보에서 인증
      const foundUser = DEFAULT_USERS.find(
        u => u.username === username && u.password === password
      );

      if (!foundUser) {
        return false;
      }

      // Firestore에서 상세 프로필 정보 가져오기
      const profile = await fetchUserProfile(foundUser.uid);

      const authUser: AuthUser = {
        uid: foundUser.uid,
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role, // DEFAULT_USERS의 role을 우선 사용
        name: foundUser.name,
        profile
      };

      setUser(authUser);
      
      // AsyncStorage에 저장
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      
      console.log('로그인 성공:', authUser);
      return true;

    } catch (error) {
      console.error('로그인 실패:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      await AsyncStorage.removeItem('currentUser');
      console.log('로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 권한 체크 함수
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 사용자 정보 유틸리티 함수들
export const getUserDisplayName = (user: AuthUser | null): string => {
  if (!user) return 'Unknown User';
  return user.profile?.name || user.name || user.username;
};

export const getUserRole = (user: AuthUser | null): UserRole => {
  return user?.role || 'client';
};

export const getCurrentUserId = (user: AuthUser | null): string | null => {
  return user?.uid || null;
};

// 권한 체크 헬퍼 함수들
export const canManageRequests = (user: AuthUser | null): boolean => {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes('manage_requests') || permissions.includes('approve_requests');
};

export const canCreateRequests = (user: AuthUser | null): boolean => {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes('create_requests');
};

export const canApproveRequests = (user: AuthUser | null): boolean => {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes('approve_requests');
};

export const canAssignWorkers = (user: AuthUser | null): boolean => {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes('assign_workers');
};

export default AuthContext;