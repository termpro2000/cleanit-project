import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import app from '../firebase';
import { Job, Building } from '../../../shared/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);

const { width } = Dimensions.get('window');

type RootStackParamList = {
  JobDetails: { jobId: string };
  Dashboard: undefined;
};

type WorkerJobListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface JobWithBuilding extends Job {
  id: string;
  building?: Building;
}

interface JobStats {
  totalJobs: number;
  scheduledJobs: number;
  inProgressJobs: number;
  completedJobs: number;
}

const WorkerJobListScreen: React.FC = () => {
  const navigation = useNavigation<WorkerJobListScreenNavigationProp>();
  const [jobs, setJobs] = useState<JobWithBuilding[]>([]);
  const [stats, setStats] = useState<JobStats>({
    totalJobs: 0,
    scheduledJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadJobs();
  }, []);

  // 화면이 포커스될 때마다 새로고침
  useFocusEffect(
    React.useCallback(() => {
      console.log('WorkerJobListScreen이 포커스되었습니다. 데이터를 새로고침합니다.');
      loadJobs();
    }, [])
  );

  const loadJobs = async () => {
    try {
      const currentUser = user;
      if (!currentUser) {
        Alert.alert('오류', '로그인된 사용자가 없습니다.');
        return;
      }

      // 현재 사용자의 모든 작업 가져오기
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('workerId', '==', user.uid)
      );
      
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsData: JobWithBuilding[] = [];

      // 각 작업에 대해 건물 정보도 가져오기
      for (const jobDoc of jobsSnapshot.docs) {
        const jobData = { id: jobDoc.id, ...jobDoc.data() } as JobWithBuilding;
        
        try {
          const buildingDoc = await getDoc(doc(db, 'buildings', jobData.buildingId));
          if (buildingDoc.exists()) {
            jobData.building = buildingDoc.data() as Building;
          }
        } catch (error) {
          console.error('건물 정보 로드 실패:', error);
        }
        
        jobsData.push(jobData);
      }

      // 날짜순으로 정렬 (최신순)
      jobsData.sort((a, b) => {
        const aTime = a.scheduledAt?.toDate?.() || new Date();
        const bTime = b.scheduledAt?.toDate?.() || new Date();
        return bTime.getTime() - aTime.getTime();
      });

      setJobs(jobsData);

      // 통계 계산
      const totalJobs = jobsData.length;
      const scheduledJobs = jobsData.filter(job => job.status === 'scheduled').length;
      const inProgressJobs = jobsData.filter(job => job.status === 'in_progress').length;
      const completedJobs = jobsData.filter(job => job.status === 'completed').length;

      setStats({
        totalJobs,
        scheduledJobs,
        inProgressJobs,
        completedJobs
      });

    } catch (error) {
      console.error('작업 목록 로드 실패:', error);
      Alert.alert('오류', '작업 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정됨';
      case 'in_progress': return '진행중';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      default: return '알 수 없음';
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleDateString('ko-KR');
      }
      return '날짜 없음';
    } catch (error) {
      return '날짜 오류';
    }
  };

  const getFilteredJobs = () => {
    if (selectedFilter === 'all') return jobs;
    return jobs.filter(job => job.status === selectedFilter);
  };

  const StatCard = ({ title, value, color, icon }: { 
    title: string; 
    value: number; 
    color: string; 
    icon: string;
  }) => (
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

  const FilterButton = ({ title, filter, isSelected, onPress }: { 
    title: string; 
    filter: string;
    isSelected: boolean; 
    onPress: () => void 
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const JobCard = ({ job }: { job: JobWithBuilding }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobBuildingName}>
            {job.building?.name || `건물 ID: ${job.buildingId}`}
          </Text>
          <Text style={styles.jobAddress}>
            {job.building?.address || '주소 정보 없음'}
          </Text>
          <Text style={styles.jobDate}>
            📅 예정일: {formatDate(job.scheduledAt)}
          </Text>
          {job.areas && job.areas.length > 0 && (
            <Text style={styles.jobAreas}>
              🧹 청소 영역: {job.areas.join(', ')}
            </Text>
          )}
        </View>
        <View style={styles.jobStatus}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(job.status) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(job.status)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.jobFooter}>
        <Text style={styles.jobId}>작업 ID: {job.id}</Text>
        <TouchableOpacity style={styles.detailButton}>
          <Text style={styles.detailButtonText}>상세보기 →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeAreaTop} edges={['top']} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backButton}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>내 작업 목록</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>작업 목록을 불러오는 중...</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  const filteredJobs = getFilteredJobs();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>내 작업 목록</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Statistics */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>📊 작업 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard title="전체 작업" value={stats.totalJobs} color="#2196F3" icon="📋" />
              <StatCard title="예정된 작업" value={stats.scheduledJobs} color="#FF9800" icon="⏰" />
              <StatCard title="진행중 작업" value={stats.inProgressJobs} color="#2196F3" icon="🔄" />
              <StatCard title="완료된 작업" value={stats.completedJobs} color="#4CAF50" icon="✅" />
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <Text style={styles.sectionTitle}>🔍 작업 필터</Text>
            <View style={styles.filterButtons}>
              <FilterButton
                title="전체"
                filter="all"
                isSelected={selectedFilter === 'all'}
                onPress={() => setSelectedFilter('all')}
              />
              <FilterButton
                title="예정됨"
                filter="scheduled"
                isSelected={selectedFilter === 'scheduled'}
                onPress={() => setSelectedFilter('scheduled')}
              />
              <FilterButton
                title="진행중"
                filter="in_progress"
                isSelected={selectedFilter === 'in_progress'}
                onPress={() => setSelectedFilter('in_progress')}
              />
              <FilterButton
                title="완료됨"
                filter="completed"
                isSelected={selectedFilter === 'completed'}
                onPress={() => setSelectedFilter('completed')}
              />
            </View>
          </View>

          {/* Jobs List */}
          <View style={styles.jobsContainer}>
            <Text style={styles.sectionTitle}>
              📝 작업 목록 ({filteredJobs.length}개)
            </Text>
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🤷‍♂️</Text>
                <Text style={styles.emptyText}>
                  {selectedFilter === 'all' 
                    ? '배정된 작업이 없습니다' 
                    : `${getStatusText(selectedFilter)} 작업이 없습니다`
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Safe Area */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeAreaTop: {
    backgroundColor: '#2a5298',
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
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bottomSafeArea: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 20,
  },
  statsContainer: {
    marginTop: -10,
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
  filtersContainer: {
    marginTop: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextSelected: {
    color: '#ffffff',
  },
  jobsContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
    marginRight: 10,
  },
  jobBuildingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  jobDate: {
    fontSize: 14,
    color: '#2a5298',
    marginBottom: 4,
    fontWeight: '500',
  },
  jobAreas: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  jobStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  jobId: {
    fontSize: 12,
    color: '#999',
  },
  detailButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
  },
  detailButtonText: {
    fontSize: 12,
    color: '#2a5298',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default WorkerJobListScreen;
