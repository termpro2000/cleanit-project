import { UserRole } from '../../../shared/types';

export interface Permission {
  role: UserRole;
  permissions: string[];
}

// 역할별 권한 정의
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'manage_users',
    'manage_buildings', 
    'manage_requests',
    'manage_workers',
    'manage_companies',
    'view_analytics',
    'system_settings',
    'approve_requests',
    'assign_workers',
    'view_all_data'
  ],
  manager: [
    'manage_buildings',
    'manage_workers',
    'view_requests',
    'assign_workers',
    'view_analytics',
    'manage_company_data'
  ],
  client: [
    'create_requests',
    'view_own_buildings',
    'view_own_requests',
    'manage_own_profile'
  ],
  worker: [
    'view_assigned_jobs',
    'update_job_status',
    'upload_photos',
    'manage_own_profile',
    'view_assigned_requests'
  ]
};

// 권한 체크 함수
export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

// 여러 권한 체크
export const hasAnyPermission = (userRole: UserRole, permissions: string[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

// 모든 권한 체크
export const hasAllPermissions = (userRole: UserRole, permissions: string[]): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

// 요청 관련 권한 체크
export const canManageRequests = (userRole: UserRole): boolean => {
  return hasPermission(userRole, 'manage_requests') || hasPermission(userRole, 'approve_requests');
};

// 요청 생성 권한 체크
export const canCreateRequests = (userRole: UserRole): boolean => {
  return hasPermission(userRole, 'create_requests');
};

// 요청 승인 권한 체크 (admin만 가능)
export const canApproveRequests = (userRole: UserRole): boolean => {
  return hasPermission(userRole, 'approve_requests');
};

// 워커 배정 권한 체크
export const canAssignWorkers = (userRole: UserRole): boolean => {
  return hasPermission(userRole, 'assign_workers');
};

// 관리자 UI 접근 권한 체크
export const canAccessAdminUI = (userRole: UserRole): boolean => {
  return userRole === 'admin' || userRole === 'manager';
};

// 역할별 메인 화면 결정
export const getMainScreen = (userRole: UserRole): string => {
  switch (userRole) {
    case 'admin':
      return 'AdminDashboard';
    case 'manager':
      return 'ManagerDashboard';
    case 'client':
      return 'ClientDashboard';
    case 'worker':
      return 'WorkerDashboard';
    default:
      return 'Login';
  }
};

// 역할 한글 표시
export const getRoleDisplayName = (userRole: UserRole): string => {
  switch (userRole) {
    case 'admin':
      return '시스템 관리자';
    case 'manager':
      return '매니저';
    case 'client':
      return '고객';
    case 'worker':
      return '작업자';
    default:
      return '알 수 없음';
  }
};