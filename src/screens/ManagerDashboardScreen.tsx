import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import app from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Job, User, Company } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  ChangePassword: undefined;
  Profile: undefined;
  WorkerManagement: undefined;
  BuildingManagement: undefined;
  JobManagement: undefined;
  CustomerRequests: undefined;
  WorkerAssignment: undefined;
  CompanySettings: undefined;
  Reports: undefined;
  UserManagement: undefined;
  SystemSettings: undefined;
  BackupRestore: undefined;
  AppInfo: undefined;
};

type ManagerDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ManagerStats {
  totalWorkers: number;
  activeWorkers: number;
  totalBuildings: number;
  activeJobs: number;
  pendingRequests: number;
  todayJobs: number;
  monthlyRevenue: number;
  completedJobs: number;
}

interface RecentActivity {
  id: string;
  type: 'job' | 'request' | 'worker';
  title: string;
  description: string;
  timestamp: Date;
  status: string;
}

const ManagerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<ManagerDashboardScreenNavigationProp>();
  const { user: authUser, logout } = useAuth();
  const [stats, setStats] = useState<ManagerStats>({
    totalWorkers: 0,
    activeWorkers: 0,
    totalBuildings: 0,
    activeJobs: 0,
    pendingRequests: 0,
    todayJobs: 0,
    monthlyRevenue: 0,
    completedJobs: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Manager');
  const [showSlideMenu, setShowSlideMenu] = useState(false);
  const slideAnimation = useState(new Animated.Value(300))[0];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!authUser) return;

      // Get user name
      setUserName(authUser.profile?.name || authUser.name || 'Manager');

      // Load manager statistics with fallback for permission errors
      try {
        // Get workers count
        const workersQuery = query(collection(db, 'users'), where('role', '==', 'worker'));
        const workersSnapshot = await getDocs(workersQuery);
        const workers = workersSnapshot.docs.map(doc => doc.data() as User);
        
        // Get buildings count
        const buildingsQuery = query(collection(db, 'buildings'));
        const buildingsSnapshot = await getDocs(buildingsQuery);
        
        // Get jobs
        const jobsQuery = query(collection(db, 'jobs'));
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

        // Calculate today's jobs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const newStats = {
          totalWorkers: workers.length,
          activeWorkers: workers.filter(w => w.isActive).length,
          totalBuildings: buildingsSnapshot.docs.length,
          activeJobs: jobs.filter(job => job.status === 'in_progress' || job.status === 'scheduled').length,
          pendingRequests: 0, // Will be implemented later
          todayJobs: jobs.filter(job => {
            const jobDate = job.scheduledDate?.toDate();
            return jobDate && jobDate >= today;
          }).length,
          monthlyRevenue: 0, // Will be calculated later
          completedJobs: jobs.filter(job => job.status === 'completed').length
        };

        setStats(newStats);

        // Load recent activities (recent jobs and requests)
        const recentJobsQuery = query(
          collection(db, 'jobs'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const recentJobsSnapshot = await getDocs(recentJobsQuery);
        const activities: RecentActivity[] = recentJobsSnapshot.docs.map(doc => {
          const job = { id: doc.id, ...doc.data() } as Job;
          return {
            id: job.id,
            type: 'job' as const,
            title: `작업: ${job.type}`,
            description: job.description || '설명 없음',
            timestamp: job.createdAt?.toDate() || new Date(),
            status: job.status
          };
        });

        setRecentActivities(activities);

      } catch (dataError: any) {
        console.warn('대시보드 데이터 로드 실패, 기본값 사용:', dataError.message);
        // 권한 오류 시 기본값 설정
        setStats({
          totalWorkers: 0,
          activeWorkers: 0,
          totalBuildings: 0,
          activeJobs: 0,
          pendingRequests: 0,
          todayJobs: 0,
          monthlyRevenue: 0,
          completedJobs: 0
        });
        setRecentActivities([]);
      }

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      setStats({
        totalWorkers: 0,
        activeWorkers: 0,
        totalBuildings: 0,
        activeJobs: 0,
        pendingRequests: 0,
        todayJobs: 0,
        monthlyRevenue: 0,
        completedJobs: 0
      });
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const toggleSlideMenu = () => {
    if (showSlideMenu) {
      // Close menu
      Animated.timing(slideAnimation, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowSlideMenu(false);
      });
    } else {
      // Open menu
      setShowSlideMenu(true);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleAppInfo = () => {
    toggleSlideMenu();
    navigation.navigate('AppInfo');
  };

  const handleUserInfo = () => {
    toggleSlideMenu();
    navigation.navigate('Profile');
  };

  const handleLogout = async () => {
    toggleSlideMenu();
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error: any) {
              Alert.alert('로그아웃 실패', error.message);
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <Text style={styles.statIcon}>{icon}</Text>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );

  const QuickActionButton = ({ title, onPress, color, icon }: { title: string; onPress: () => void; color: string; icon: string }) => (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job': return '🧹';
      case 'request': return '📋';
      case 'worker': return '👷';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'scheduled': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'scheduled': return '예정';
      default: return '대기';
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>대시보드 데이터를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>관리자</Text>
              <Text style={styles.userNameText}>{userName}님</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={toggleSlideMenu}>
              <Text style={styles.logoutIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>전체 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard title="총 직원" value={stats.totalWorkers} color="#2196F3" icon="👥" />
              <StatCard title="활성 직원" value={stats.activeWorkers} color="#4CAF50" icon="✅" />
              <StatCard title="총 건물" value={stats.totalBuildings} color="#FF9800" icon="🏢" />
              <StatCard title="진행 작업" value={stats.activeJobs} color="#9C27B0" icon="🚧" />
            </View>
            <View style={styles.statsGrid}>
              <StatCard title="오늘 작업" value={stats.todayJobs} color="#795548" icon="📅" />
              <StatCard title="완료 작업" value={stats.completedJobs} color="#4CAF50" icon="✔️" />
              <StatCard title="대기 요청" value={stats.pendingRequests} color="#F44336" icon="⏳" />
              <StatCard title="월 매출" value={stats.monthlyRevenue} color="#009688" icon="💰" />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>빠른 메뉴</Text>
            <View style={styles.actionsGrid}>
              <QuickActionButton
                title="직원 관리"
                onPress={() => navigation.navigate('WorkerManagement')}
                color="#2196F3"
                icon="👥"
              />
              <QuickActionButton
                title="건물 관리"
                onPress={() => navigation.navigate('BuildingManagement')}
                color="#2196F3"
                icon="🏢"
              />
              <QuickActionButton
                title="작업 관리"
                onPress={() => navigation.navigate('JobManagement')}
                color="#2196F3"
                icon="🧹"
              />
              <QuickActionButton
                title="고객 요청"
                onPress={() => navigation.navigate('CustomerRequests')}
                color="#2196F3"
                icon="📋"
              />
              <QuickActionButton
                title="작업 할당"
                onPress={() => navigation.navigate('WorkerAssignment')}
                color="#2196F3"
                icon="🎯"
              />
              <QuickActionButton
                title="사용자 관리"
                onPress={() => navigation.navigate('UserManagement')}
                color="#2196F3"
                icon="👤"
              />
              <QuickActionButton
                title="리포트"
                onPress={() => navigation.navigate('Reports')}
                color="#795548"
                icon="📊"
              />
              
              {/* Admin 전용 기능들 - 임시로 항상 표시 */}
              {console.log('Admin check:', { role: authUser?.role, username: authUser?.username, isAdmin: authUser?.role === 'admin' || authUser?.username === 'admin' }) || true && (
                <>
                  <QuickActionButton
                    title="회사 설정"
                    onPress={() => navigation.navigate('CompanySettings')}
                    color="#795548"
                    icon="⚙️"
                  />
                  <QuickActionButton
                    title="시스템 설정"
                    onPress={() => navigation.navigate('SystemSettings')}
                    color="#795548"
                    icon="🔧"
                  />
                  <QuickActionButton
                    title="백업/복원"
                    onPress={() => navigation.navigate('BackupRestore')}
                    color="#795548"
                    icon="💾"
                  />
                </>
              )}
            </View>
          </View>

          {/* Recent Activities */}
          <View style={styles.recentActivitiesContainer}>
            <Text style={styles.sectionTitle}>최근 활동</Text>
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
                      <View style={styles.activityTextContainer}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activityDescription} numberOfLines={2}>
                          {activity.description}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activityMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activity.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(activity.status)}</Text>
                      </View>
                      <Text style={styles.activityTime}>
                        {activity.timestamp.toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>최근 활동이 없습니다</Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Bottom Safe Area */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />

        {/* Slide Menu Modal */}
        <Modal
          visible={showSlideMenu}
          animationType="none"
          transparent={true}
          onRequestClose={toggleSlideMenu}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={toggleSlideMenu}
          >
            <Animated.View 
              style={[
                styles.slideMenu,
                {
                  transform: [{ translateX: slideAnimation }]
                }
              ]}
            >
              <View style={styles.slideMenuHeader}>
                <Text style={styles.slideMenuTitle}>메뉴</Text>
                <TouchableOpacity onPress={toggleSlideMenu}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.slideMenuContent}>
                <TouchableOpacity style={styles.menuItem} onPress={handleAppInfo}>
                  <Text style={styles.menuIcon}>ℹ️</Text>
                  <Text style={styles.menuText}>앱 정보</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleUserInfo}>
                  <Text style={styles.menuIcon}>👤</Text>
                  <Text style={styles.menuText}>사용자 정보</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Text style={styles.menuIcon}>🚪</Text>
                  <Text style={styles.menuText}>로그아웃</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#2a5298',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomSafeArea: {
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 20,
  },
  statsContainer: {
    marginTop: -20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    width: (width - 70) / 3,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  recentActivitiesContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  activityMeta: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  slideMenu: {
    width: 300,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  slideMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2196F3',
  },
  slideMenuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  slideMenuContent: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
    marginHorizontal: 20,
  },
});

export default ManagerDashboardScreen;
