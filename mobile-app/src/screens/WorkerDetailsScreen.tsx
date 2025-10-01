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
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { User, Job } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  WorkerManagement: undefined;
  WorkerDetails: { workerId: string };
  WorkerEdit: { workerId: string };
};

type WorkerDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WorkerDetailsScreenRouteProp = RouteProp<RootStackParamList, 'WorkerDetails'>;

interface WorkerPerformance {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  cancelledJobs: number;
  averageRating: number;
  totalEarnings: number;
  thisMonthJobs: number;
  onTimeCompletionRate: number;
}

const WorkerDetailsScreen: React.FC = () => {
  const navigation = useNavigation<WorkerDetailsScreenNavigationProp>();
  const route = useRoute<WorkerDetailsScreenRouteProp>();
  const { workerId } = route.params;

  const [worker, setWorker] = useState<User | null>(null);
  const [performance, setPerformance] = useState<WorkerPerformance>({
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    cancelledJobs: 0,
    averageRating: 0,
    totalEarnings: 0,
    thisMonthJobs: 0,
    onTimeCompletionRate: 0
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkerDetails();
  }, [workerId]);

  const loadWorkerDetails = async () => {
    try {
      // Load worker basic info
      const workerDoc = await getDoc(doc(db, 'users', workerId));
      if (!workerDoc.exists()) {
        Alert.alert('오류', '직원 정보를 찾을 수 없습니다.');
        navigation.goBack();
        return;
      }

      const workerData = { id: workerDoc.id, ...workerDoc.data() } as User;
      setWorker(workerData);

      // Load worker's jobs for performance calculation
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('assignedWorkerId', '==', workerId)
      );
      
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

      // Calculate performance metrics
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const pendingJobs = jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress').length;
      const cancelledJobs = jobs.filter(job => job.status === 'cancelled').length;

      // Calculate this month's jobs
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthJobs = jobs.filter(job => {
        const jobDate = job.createdAt?.toDate();
        return jobDate && jobDate >= thisMonthStart;
      }).length;

      // Calculate average rating (mock data for now)
      const averageRating = completedJobs > 0 ? 4.2 + (Math.random() * 0.6) : 0;

      // Calculate total earnings (mock calculation)
      const totalEarnings = completedJobs * 50000; // 50,000원 per job

      // Calculate on-time completion rate (mock calculation)
      const onTimeCompletionRate = completedJobs > 0 ? 85 + (Math.random() * 10) : 0;

      setPerformance({
        totalJobs,
        completedJobs,
        pendingJobs,
        cancelledJobs,
        averageRating,
        totalEarnings,
        thisMonthJobs,
        onTimeCompletionRate
      });

      // Load recent jobs (without orderBy to avoid index requirement)
      const recentJobsQuery = query(
        collection(db, 'jobs'),
        where('assignedWorkerId', '==', workerId),
        limit(10)
      );
      
      const recentJobsSnapshot = await getDocs(recentJobsQuery);
      const recentJobsData = recentJobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      
      // Sort client-side by createdAt and take first 5
      const sortedJobs = recentJobsData
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(0);
          const dateB = b.createdAt?.toDate() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      
      setRecentJobs(sortedJobs);

    } catch (error) {
      console.error('직원 상세 정보 로드 실패:', error);
      Alert.alert('오류', '직원 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkerDetails();
    setRefreshing(false);
  };

  const toggleWorkerStatus = async () => {
    if (!worker) return;

    try {
      const newStatus = !worker.isActive;
      await updateDoc(doc(db, 'users', workerId), {
        isActive: newStatus,
        updatedAt: new Date()
      });
      
      setWorker({ ...worker, isActive: newStatus });
      Alert.alert('완료', `직원이 ${newStatus ? '활성화' : '비활성화'}되었습니다.`);
    } catch (error) {
      console.error('직원 상태 변경 실패:', error);
      Alert.alert('오류', '직원 상태 변경에 실패했습니다.');
    }
  };

  const deleteWorker = async () => {
    if (!worker) return;

    Alert.alert(
      '직원 삭제',
      `${worker.name} 직원을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', workerId));
              Alert.alert('완료', '직원이 삭제되었습니다.');
              navigation.goBack();
            } catch (error) {
              console.error('직원 삭제 실패:', error);
              Alert.alert('오류', '직원 삭제에 실패했습니다.');
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
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'scheduled': return '예정';
      case 'cancelled': return '취소';
      default: return '대기';
    }
  };

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>{title}</Text>
      {children}
    </View>
  );

  const MetricCard = ({ title, value, unit, color, icon }: { 
    title: string; 
    value: number | string; 
    unit?: string; 
    color: string; 
    icon: string;
  }) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {typeof value === 'number' && unit === '%' ? `${value.toFixed(1)}${unit}` :
         typeof value === 'number' && unit === '원' ? `${value.toLocaleString()}${unit}` :
         typeof value === 'number' && unit === '점' ? `${value.toFixed(1)}${unit}` :
         `${value}${unit || ''}`}
      </Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>직원 정보를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!worker) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>직원 정보를 찾을 수 없습니다.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>돌아가기</Text>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>직원 상세정보</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('WorkerEdit', { workerId })}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Worker Basic Info */}
          <InfoCard title="기본 정보">
            <View style={styles.basicInfoContainer}>
              <View style={styles.basicInfoHeader}>
                <View style={styles.workerNameContainer}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: worker.isActive ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Text style={styles.statusText}>
                      {worker.isActive ? '활성' : '비활성'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>이메일:</Text>
                <Text style={styles.infoValue}>{worker.email || '미등록'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>전화번호:</Text>
                <Text style={styles.infoValue}>{worker.phoneNumber || '미등록'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>주소:</Text>
                <Text style={styles.infoValue}>{worker.address || '미등록'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>가입일:</Text>
                <Text style={styles.infoValue}>
                  {worker.createdAt?.toDate().toLocaleDateString() || '미상'}
                </Text>
              </View>
            </View>
          </InfoCard>

          {/* Performance Metrics */}
          <InfoCard title="성과 지표">
            <View style={styles.metricsGrid}>
              <MetricCard
                title="총 작업"
                value={performance.totalJobs}
                unit="건"
                color="#2196F3"
                icon="📊"
              />
              <MetricCard
                title="완료 작업"
                value={performance.completedJobs}
                unit="건"
                color="#4CAF50"
                icon="✅"
              />
              <MetricCard
                title="이번 달"
                value={performance.thisMonthJobs}
                unit="건"
                color="#FF9800"
                icon="📅"
              />
              <MetricCard
                title="평균 평점"
                value={performance.averageRating}
                unit="점"
                color="#9C27B0"
                icon="⭐"
              />
              <MetricCard
                title="총 수익"
                value={performance.totalEarnings}
                unit="원"
                color="#009688"
                icon="💰"
              />
              <MetricCard
                title="정시완료율"
                value={performance.onTimeCompletionRate}
                unit="%"
                color="#795548"
                icon="⏰"
              />
            </View>
          </InfoCard>

          {/* Recent Jobs */}
          <InfoCard title="최근 작업 내역">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobType}>{job.type}</Text>
                    <View style={[styles.jobStatusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                      <Text style={styles.jobStatusText}>{getStatusText(job.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description || '설명 없음'}
                  </Text>
                  <Text style={styles.jobDate}>
                    {job.scheduledDate?.toDate().toLocaleDateString() || '날짜 미정'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>작업 내역이 없습니다</Text>
              </View>
            )}
          </InfoCard>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, worker.isActive ? styles.deactivateButton : styles.activateButton]}
              onPress={toggleWorkerStatus}
            >
              <Text style={styles.actionButtonText}>
                {worker.isActive ? '비활성화' : '활성화'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={deleteWorker}
            >
              <Text style={styles.actionButtonText}>직원 삭제</Text>
            </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2a5298',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 18,
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
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  basicInfoContainer: {
    marginTop: 5,
  },
  basicInfoHeader: {
    marginBottom: 15,
  },
  workerNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 70) / 3,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  jobDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2a5298',
    fontWeight: '600',
  },
});

export default WorkerDetailsScreen;