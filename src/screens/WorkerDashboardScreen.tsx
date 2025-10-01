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
  RefreshControl
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Job } from '../../../shared/types';
import { useAuth } from '../contexts/AuthContext';
// import { LinearGradient } from 'expo-linear-gradient';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  ChangePassword: undefined;
  Profile: undefined;
  WorkerJobList: undefined;
  WorkerRequestList: undefined;
  JobDetails: { jobId: string };
};

type WorkerDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashboardStats {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  todayJobs: number;
}

const WorkerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<WorkerDashboardScreenNavigationProp>();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    todayJobs: 0
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Worker');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!user) return;

      // Get user name
      setUserName(user.profile?.name || user.name || 'Worker');

      // Load job statistics with fallback for permission errors
      try {
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('assignedWorkerId', '==', user.uid)
        );
        
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newStats = {
          totalJobs: jobs.length,
          completedJobs: jobs.filter(job => job.status === 'completed').length,
          pendingJobs: jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress').length,
          todayJobs: jobs.filter(job => {
            const jobDate = job.scheduledDate?.toDate();
            return jobDate && jobDate >= today;
          }).length
        };

        setStats(newStats);

        // Load recent jobs
        const recentJobsQuery = query(
          collection(db, 'jobs'),
          where('assignedWorkerId', '==', user.uid),
          orderBy('scheduledDate', 'desc'),
          limit(3)
        );
        
        const recentJobsSnapshot = await getDocs(recentJobsQuery);
        const recentJobsData = recentJobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        setRecentJobs(recentJobsData);

      } catch (jobError: any) {
        console.warn('작업 데이터 로드 실패, 기본값 사용:', jobError.message);
        // 권한 오류 시 기본값 설정
        setStats({
          totalJobs: 0,
          completedJobs: 0,
          pendingJobs: 0,
          todayJobs: 0
        });
        setRecentJobs([]);
      }

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      // 전체적인 오류 시에도 기본값 설정
      setStats({
        totalJobs: 0,
        completedJobs: 0,
        pendingJobs: 0,
        todayJobs: 0
      });
      setRecentJobs([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
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

  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>안녕하세요,</Text>
              <Text style={styles.userNameText}>{userName}님</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
          <Text style={styles.sectionTitle}>작업 현황</Text>
          <View style={styles.statsGrid}>
            <StatCard title="총 작업" value={stats.totalJobs} color="#2196F3" icon="📊" />
            <StatCard title="완료" value={stats.completedJobs} color="#4CAF50" icon="✅" />
            <StatCard title="대기중" value={stats.pendingJobs} color="#FF9800" icon="⏳" />
            <StatCard title="오늘 작업" value={stats.todayJobs} color="#9C27B0" icon="📅" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              title="내 작업"
              onPress={() => navigation.navigate('WorkerJobList')}
              color="#2196F3"
              icon="🧹"
            />
            <QuickActionButton
              title="요청 관리"
              onPress={() => navigation.navigate('WorkerRequestList')}
              color="#4CAF50"
              icon="📋"
            />
            <QuickActionButton
              title="내 프로필"
              onPress={() => navigation.navigate('Profile')}
              color="#FF9800"
              icon="👤"
            />
            <QuickActionButton
              title="비밀번호"
              onPress={() => navigation.navigate('ChangePassword')}
              color="#9C27B0"
              icon="🔒"
            />
          </View>
        </View>

        {/* Recent Jobs */}
        <View style={styles.recentJobsContainer}>
          <Text style={styles.sectionTitle}>최근 작업</Text>
          {recentJobs.length > 0 ? (
            recentJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
              >
                <View style={styles.jobCardContent}>
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobType}>{job.type}</Text>
                    <Text style={styles.jobDate}>
                      {job.scheduledDate?.toDate().toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
                  </View>
                </View>
                {job.description && (
                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>아직 배정된 작업이 없습니다</Text>
            </View>
          )}
        </View>
        </ScrollView>
        
        {/* Bottom Safe Area */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
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
    fontSize: 28,
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
  },
  actionButton: {
    width: (width - 50) / 2,
    borderRadius: 12,
    padding: 20,
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
  recentJobsContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  jobCard: {
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
  jobCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobInfo: {
    flex: 1,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
});

export default WorkerDashboardScreen;