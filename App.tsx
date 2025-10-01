import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import * as Updates from 'expo-updates';

import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import ClientSignupScreen from './src/screens/ClientSignupScreen';
import WorkerSignupScreen from './src/screens/WorkerSignupScreen';
import ManagerSignupScreen from './src/screens/ManagerSignupScreen';
import LoginScreen from './src/screens/LoginScreen';
import ClientDashboardScreen from './src/screens/ClientDashboardScreen';
import WorkerDashboardScreen from './src/screens/WorkerDashboardScreen';
import ManagerDashboardScreen from './src/screens/ManagerDashboardScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BuildingRegistrationScreen from './src/screens/BuildingRegistrationScreen';
import BuildingListScreen from './src/screens/BuildingListScreen';
import BuildingDetailsScreen from './src/screens/BuildingDetailsScreen';
import BuildingEditScreen from './src/screens/BuildingEditScreen';
import WorkerJobListScreen from './src/screens/WorkerJobListScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import WorkerRequestListScreen from './src/screens/WorkerRequestListScreen';
import RequestDetailsScreen from './src/screens/RequestDetailsScreen';
import RequestRegistrationScreen from './src/screens/RequestRegistrationScreen';
import ClientRequestTrackingScreen from './src/screens/ClientRequestTrackingScreen';
import CleaningReviewScreen from './src/screens/CleaningReviewScreen';
import WorkerManagementScreen from './src/screens/WorkerManagementScreen';
import WorkerDetailsScreen from './src/screens/WorkerDetailsScreen';
import BuildingManagementScreen from './src/screens/BuildingManagementScreen';
import JobManagementScreen from './src/screens/JobManagementScreen';
import WorkerRegistrationScreen from './src/screens/WorkerRegistrationScreen';
import WorkerAssignmentScreen from './src/screens/WorkerAssignmentScreen';
import AdminRequestManagementScreen from './src/screens/AdminRequestManagementScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SystemSettingsScreen from './src/screens/SystemSettingsScreen';
import BackupRestoreScreen from './src/screens/BackupRestoreScreen';
import CompanySettingsScreen from './src/screens/CompanySettingsScreen';
import AppInfoScreen from './src/screens/AppInfoScreen';

const Stack = createNativeStackNavigator();

// 메인 앱 컴포넌트
const AppContent: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();

  // EAS Updates 체크
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        if (!__DEV__) { // Production 환경에서만 실행
          const update = await Updates.checkForUpdateAsync();
          
          if (update.isAvailable) {
            Alert.alert(
              '업데이트 사용 가능',
              '새로운 버전이 있습니다. 지금 업데이트하시겠습니까?',
              [
                {
                  text: '나중에',
                  style: 'cancel',
                },
                {
                  text: '업데이트',
                  onPress: async () => {
                    try {
                      await Updates.fetchUpdateAsync();
                      await Updates.reloadAsync();
                    } catch (error) {
                      console.error('업데이트 실패:', error);
                      Alert.alert('업데이트 실패', '업데이트 중 오류가 발생했습니다.');
                    }
                  },
                },
              ]
            );
          }
        }
      } catch (error) {
        console.error('업데이트 확인 실패:', error);
      }
    };

    checkForUpdates();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>앱 로딩 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // 인증되지 않은 사용자용 화면들
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="ClientSignup" component={ClientSignupScreen} />
            <Stack.Screen name="WorkerSignup" component={WorkerSignupScreen} />
            <Stack.Screen name="ManagerSignup" component={ManagerSignupScreen} />
          </>
        ) : (
          // 인증된 사용자용 화면들
          <>
            {/* 대시보드 화면 - 역할에 따른 초기 화면 */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Stack.Screen 
                name="ManagerDashboard" 
                component={ManagerDashboardScreen}
                options={{ headerShown: false }}
              />
            )}
            {user?.role === 'client' && (
              <Stack.Screen 
                name="ClientDashboard" 
                component={ClientDashboardScreen}
                options={{ headerShown: false }}
              />
            )}
            {user?.role === 'worker' && (
              <Stack.Screen 
                name="WorkerDashboard" 
                component={WorkerDashboardScreen}
                options={{ headerShown: false }}
              />
            )}
        
            {/* 공통 화면 */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        
            {/* 건물 관리 화면 */}
            <Stack.Screen name="BuildingRegistration" component={BuildingRegistrationScreen} />
            <Stack.Screen name="BuildingList" component={BuildingListScreen} />
            <Stack.Screen name="BuildingDetails" component={BuildingDetailsScreen} />
            <Stack.Screen name="BuildingEdit" component={BuildingEditScreen} />
            <Stack.Screen name="BuildingManagement" component={BuildingManagementScreen} />
            
            {/* 작업 관리 화면 */}
            <Stack.Screen name="WorkerJobList" component={WorkerJobListScreen} />
            <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
            <Stack.Screen name="JobManagement" component={JobManagementScreen} />
            
            {/* 요청 관리 화면 */}
            <Stack.Screen name="RequestRegistration" component={RequestRegistrationScreen} />
            <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
            <Stack.Screen name="ClientRequestTracking" component={ClientRequestTrackingScreen} />
            <Stack.Screen name="WorkerRequestList" component={WorkerRequestListScreen} />
            <Stack.Screen name="AdminRequestManagement" component={AdminRequestManagementScreen} />
            
            {/* 작업자 관리 화면 */}
            <Stack.Screen name="WorkerManagement" component={WorkerManagementScreen} />
            <Stack.Screen name="WorkerDetails" component={WorkerDetailsScreen} />
            <Stack.Screen name="WorkerRegistration" component={WorkerRegistrationScreen} />
            <Stack.Screen name="WorkerAssignment" component={WorkerAssignmentScreen} />
            
            {/* Admin 전용 화면 */}
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="SystemSettings" component={SystemSettingsScreen} />
            <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
            <Stack.Screen name="CompanySettings" component={CompanySettingsScreen} />
            <Stack.Screen name="AppInfo" component={AppInfoScreen} />
            
            {/* 기타 화면 */}
            <Stack.Screen name="CleaningReview" component={CleaningReviewScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// 메인 App 컴포넌트 (AuthProvider로 감싸기)
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}