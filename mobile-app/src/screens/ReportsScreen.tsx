import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import app from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  ManagerDashboard: undefined;
};

type ReportsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ReportData {
  totalJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  pendingJobs: number;
  totalUsers: number;
  activeUsers: number;
  totalBuildings: number;
  totalRequests: number;
  monthlyRevenue: number;
  completionRate: number;
  averageJobTime: number;
  customerSatisfaction: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
  }[];
}

interface TopPerformer {
  id: string;
  name: string;
  completedJobs: number;
  rating: number;
}

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    totalJobs: 0,
    completedJobs: 0,
    inProgressJobs: 0,
    pendingJobs: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalBuildings: 0,
    totalRequests: 0,
    monthlyRevenue: 0,
    completionRate: 0,
    averageJobTime: 0,
    customerSatisfaction: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [jobsChartData, setJobsChartData] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });
  const [revenueChartData, setRevenueChartData] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // 병렬로 데이터 로드
      const [jobs, users, buildings, requests] = await Promise.all([
        loadJobsData(),
        loadUsersData(),
        loadBuildingsData(),
        loadRequestsData()
      ]);

      // 리포트 데이터 계산
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const inProgressJobs = jobs.filter(job => job.status === 'in_progress').length;
      const pendingJobs = jobs.filter(job => job.status === 'pending' || job.status === 'scheduled').length;
      const activeUsers = users.filter(user => user.isActive !== false).length;
      const completionRate = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0;

      // 월별 매출 계산 (임시 데이터)
      const monthlyRevenue = completedJobs * 50000; // 평균 작업당 5만원 가정

      // 평균 작업 시간 계산 (시간 단위)
      const completedJobsWithTime = jobs.filter(job => 
        job.status === 'completed' && job.startedAt && job.completedAt
      );
      
      let averageJobTime = 0;
      if (completedJobsWithTime.length > 0) {
        const totalTime = completedJobsWithTime.reduce((sum, job) => {
          const startTime = job.startedAt.toDate();
          const endTime = job.completedAt.toDate();
          return sum + (endTime.getTime() - startTime.getTime());
        }, 0);
        averageJobTime = totalTime / completedJobsWithTime.length / (1000 * 60 * 60); // 시간 단위로 변환
      }

      // 고객 만족도 (임시 데이터)
      const customerSatisfaction = 4.2;

      setReportData({
        totalJobs: jobs.length,
        completedJobs,
        inProgressJobs,
        pendingJobs,
        totalUsers: users.length,
        activeUsers,
        totalBuildings: buildings.length,
        totalRequests: requests.length,
        monthlyRevenue,
        completionRate,
        averageJobTime,
        customerSatisfaction
      });

      // 차트 데이터 생성
      generateChartData(jobs);
      
      // 상위 성과자 데이터 생성
      generateTopPerformers(jobs, users);

    } catch (error) {
      console.error('리포트 데이터 로드 실패:', error);
      Alert.alert('오류', '리포트 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadJobsData = async () => {
    const startDate = getStartDateForPeriod(selectedPeriod);
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(jobsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const loadUsersData = async () => {
    const usersQuery = collection(db, 'users');
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const loadBuildingsData = async () => {
    const buildingsQuery = collection(db, 'buildings');
    const snapshot = await getDocs(buildingsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const loadRequestsData = async () => {
    const startDate = getStartDateForPeriod(selectedPeriod);
    const requestsQuery = query(
      collection(db, 'requests'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(requestsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const getStartDateForPeriod = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'week':
        return Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      case 'month':
        return Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return Timestamp.fromDate(new Date(now.getFullYear(), quarterStart, 1));
      case 'year':
        return Timestamp.fromDate(new Date(now.getFullYear(), 0, 1));
      default:
        return Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  };

  const generateChartData = (jobs: any[]) => {
    // 지난 7일간의 작업 완료 데이터
    const last7Days = [];
    const jobsData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      last7Days.push(dateStr);
      
      const dayJobs = jobs.filter(job => {
        if (!job.completedAt) return false;
        const jobDate = job.completedAt.toDate();
        return jobDate.toDateString() === date.toDateString();
      }).length;
      
      jobsData.push(dayJobs);
    }

    setJobsChartData({
      labels: last7Days,
      datasets: [{ data: jobsData }]
    });

    // 매출 데이터 (임시)
    const revenueData = jobsData.map(jobs => jobs * 50000);
    setRevenueChartData({
      labels: last7Days,
      datasets: [{ data: revenueData }]
    });
  };

  const generateTopPerformers = (jobs: any[], users: any[]) => {
    const workerStats = new Map();
    
    jobs.filter(job => job.status === 'completed' && job.assignedTo?.workerId).forEach(job => {
      const workerId = job.assignedTo.workerId;
      if (!workerStats.has(workerId)) {
        workerStats.set(workerId, { completedJobs: 0, totalRating: 0, ratingCount: 0 });
      }
      const stats = workerStats.get(workerId);
      stats.completedJobs++;
      
      // 임시 평점 데이터
      const rating = 4 + Math.random();
      stats.totalRating += rating;
      stats.ratingCount++;
    });

    const performers: TopPerformer[] = [];
    workerStats.forEach((stats, workerId) => {
      const user = users.find(u => u.id === workerId);
      if (user && stats.completedJobs > 0) {
        performers.push({
          id: workerId,
          name: user.name || '이름 없음',
          completedJobs: stats.completedJobs,
          rating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
        });
      }
    });

    performers.sort((a, b) => b.completedJobs - a.completedJobs);
    setTopPerformers(performers.slice(0, 5));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, subtitle, icon, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const SimpleChart = ({ data, title, color = '#2196f3' }: {
    data: ChartData;
    title: string;
    color?: string;
  }) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContent}>
        <View style={styles.chartBars}>
          {data.datasets[0].data.map((value, index) => {
            const maxValue = Math.max(...data.datasets[0].data);
            const height = maxValue > 0 ? (value / maxValue) * 120 : 0;
            
            return (
              <View key={index} style={styles.chartBarContainer}>
                <View style={[styles.chartBar, { height, backgroundColor: color }]} />
                <Text style={styles.chartLabel}>{data.labels[index]}</Text>
                <Text style={styles.chartValue}>{value}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (loading && reportData.totalJobs === 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>리포트를 생성하는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>리포트</Text>
            <TouchableOpacity style={styles.exportButton}>
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'week', label: '이번 주' },
              { key: 'month', label: '이번 달' },
              { key: 'quarter', label: '분기' },
              { key: 'year', label: '연간' }
            ].map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.key as typeof selectedPeriod)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2a5298']}
              tintColor="#2a5298"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Overview Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>전체 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="전체 작업"
                value={reportData.totalJobs}
                icon="📋"
                color="#2196f3"
              />
              <StatCard
                title="완료 작업"
                value={reportData.completedJobs}
                icon="✅"
                color="#4caf50"
              />
              <StatCard
                title="진행 중"
                value={reportData.inProgressJobs}
                icon="🔄"
                color="#ff9800"
              />
              <StatCard
                title="대기 중"
                value={reportData.pendingJobs}
                icon="⏳"
                color="#9c27b0"
              />
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>성과 지표</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="완료율"
                value={`${reportData.completionRate.toFixed(1)}%`}
                icon="🎯"
                color="#4caf50"
              />
              <StatCard
                title="평균 작업시간"
                value={`${reportData.averageJobTime.toFixed(1)}h`}
                icon="⏱️"
                color="#2196f3"
              />
              <StatCard
                title="고객 만족도"
                value={`${reportData.customerSatisfaction.toFixed(1)}/5`}
                icon="⭐"
                color="#ff9800"
              />
              <StatCard
                title="월 매출"
                value={`${(reportData.monthlyRevenue / 10000).toFixed(0)}만원`}
                icon="💰"
                color="#4caf50"
              />
            </View>
          </View>

          {/* Charts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>작업 추이</Text>
            <SimpleChart
              data={jobsChartData}
              title="일별 완료 작업 수"
              color="#4caf50"
            />
          </View>

          <View style={styles.section}>
            <SimpleChart
              data={revenueChartData}
              title="일별 매출 (만원)"
              color="#2196f3"
            />
          </View>

          {/* Top Performers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>우수 직원</Text>
            {topPerformers.length > 0 ? (
              topPerformers.map((performer, index) => (
                <View key={performer.id} style={styles.performerCard}>
                  <View style={styles.performerRank}>
                    <Text style={styles.performerRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.performerInfo}>
                    <Text style={styles.performerName}>{performer.name}</Text>
                    <Text style={styles.performerStats}>
                      완료: {performer.completedJobs}건 | 평점: ⭐ {performer.rating.toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.performerBadge}>
                    <Ionicons name="trophy" size={20} color="#ff9800" />
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>데이터가 없습니다</Text>
              </View>
            )}
          </View>

          {/* System Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>시스템 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="총 사용자"
                value={reportData.totalUsers}
                subtitle={`활성: ${reportData.activeUsers}명`}
                icon="👥"
                color="#9c27b0"
              />
              <StatCard
                title="등록 건물"
                value={reportData.totalBuildings}
                icon="🏢"
                color="#607d8b"
              />
              <StatCard
                title="총 요청"
                value={reportData.totalRequests}
                icon="📝"
                color="#ff5722"
              />
              <StatCard
                title="시스템 상태"
                value="정상"
                icon="✅"
                color="#4caf50"
              />
            </View>
          </View>
        </ScrollView>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2a5298',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  periodButtonActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIconText: {
    fontSize: 20,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartContent: {
    height: 160,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#2196f3',
    borderRadius: 2,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  chartValue: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  performerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a5298',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  performerStats: {
    fontSize: 12,
    color: '#666',
  },
  performerBadge: {
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default ReportsScreen;