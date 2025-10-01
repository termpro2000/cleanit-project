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
  TextInput
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, query, getDocs, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Job, User, Building } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  Dashboard: undefined;
  JobRegistration: undefined;
  JobDetails: { jobId: string };
  JobEdit: { jobId: string };
};

type JobManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface JobStats {
  totalJobs: number;
  scheduledJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  todayJobs: number;
}

const JobManagementScreen: React.FC = () => {
  const navigation = useNavigation<JobManagementScreenNavigationProp>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<{ [key: string]: User }>({});
  const [buildings, setBuildings] = useState<{ [key: string]: Building }>({});
  const [stats, setStats] = useState<JobStats>({
    totalJobs: 0,
    scheduledJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
    todayJobs: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchText, selectedFilter]);

  const loadJobs = async () => {
    try {
      // Load jobs
      const jobsQuery = query(collection(db, 'jobs'));
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsData = jobsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Job));

      setJobs(jobsData);

      // Load workers
      const workersQuery = query(collection(db, 'users'), where('role', '==', 'worker'));
      const workersSnapshot = await getDocs(workersQuery);
      const workersMap: { [key: string]: User } = {};
      workersSnapshot.docs.forEach(doc => {
        workersMap[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setWorkers(workersMap);

      // Load buildings
      const buildingsQuery = query(collection(db, 'buildings'));
      const buildingsSnapshot = await getDocs(buildingsQuery);
      const buildingsMap: { [key: string]: Building } = {};
      buildingsSnapshot.docs.forEach(doc => {
        buildingsMap[doc.id] = { id: doc.id, ...doc.data() } as Building;
      });
      setBuildings(buildingsMap);

      // Calculate stats
      const totalJobs = jobsData.length;
      const scheduledJobs = jobsData.filter(job => job.status === 'scheduled').length;
      const inProgressJobs = jobsData.filter(job => job.status === 'in_progress').length;
      const completedJobs = jobsData.filter(job => job.status === 'completed').length;
      const cancelledJobs = jobsData.filter(job => job.status === 'cancelled').length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayJobs = jobsData.filter(job => {
        const jobDate = job.scheduledDate?.toDate();
        return jobDate && jobDate >= today && jobDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length;

      setStats({
        totalJobs,
        scheduledJobs,
        inProgressJobs,
        completedJobs,
        cancelledJobs,
        todayJobs
      });

    } catch (error) {
      console.error('작업 데이터 로드 실패:', error);
      Alert.alert('오류', '작업 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(job => job.status === selectedFilter);
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(job => 
        job.type?.toLowerCase().includes(searchText.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        workers[job.assignedWorkerId]?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        buildings[job.buildingId]?.name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      };

      // Add timestamps for status changes
      if (newStatus === 'in_progress') {
        updateData.startedAt = new Date();
      } else if (newStatus === 'completed') {
        updateData.completedAt = new Date();
      }

      await updateDoc(jobRef, updateData);
      
      Alert.alert('완료', `작업 상태가 "${getStatusText(newStatus)}"로 변경되었습니다.`);
      await loadJobs();
    } catch (error) {
      console.error('작업 상태 변경 실패:', error);
      Alert.alert('오류', '작업 상태 변경에 실패했습니다.');
    }
  };

  const deleteJob = async (jobId: string, jobType: string) => {
    Alert.alert(
      '작업 삭제',
      `"${jobType}" 작업을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'jobs', jobId));
              Alert.alert('완료', '작업이 삭제되었습니다.');
              await loadJobs();
            } catch (error) {
              console.error('작업 삭제 실패:', error);
              Alert.alert('오류', '작업 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
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
      case 'scheduled': return '예정';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      default: return '대기';
    }
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

  const FilterButton = ({ title, isSelected, onPress }: { title: string; isSelected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const JobCard = ({ job }: { job: Job }) => {
    const worker = workers[job.assignedWorkerId];
    const building = buildings[job.buildingId];
    
    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobType}>{job.type || '작업'}</Text>
            <Text style={styles.jobBuilding}>{building?.name || '건물 정보 없음'}</Text>
            <Text style={styles.jobWorker}>담당자: {worker?.name || '미지정'}</Text>
            <Text style={styles.jobDate}>
              예정일: {job.scheduledDate?.toDate().toLocaleDateString() || '미정'}
            </Text>
            {job.description && (
              <Text style={styles.jobDescription} numberOfLines={2}>
                {job.description}
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
        
        <View style={styles.jobActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.detailButton]}
            onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
          >
            <Text style={styles.actionButtonText}>상세</Text>
          </TouchableOpacity>
          
          {job.status === 'scheduled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => updateJobStatus(job.id, 'in_progress')}
            >
              <Text style={styles.actionButtonText}>시작</Text>
            </TouchableOpacity>
          )}
          
          {job.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => updateJobStatus(job.id, 'completed')}
            >
              <Text style={styles.actionButtonText}>완료</Text>
            </TouchableOpacity>
          )}
          
          {(job.status === 'scheduled' || job.status === 'in_progress') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => updateJobStatus(job.id, 'cancelled')}
            >
              <Text style={styles.actionButtonText}>취소</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteJob(job.id, job.type || '작업')}
          >
            <Text style={styles.actionButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>작업 데이터를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
            <Text style={styles.headerTitle}>작업 관리</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('JobRegistration')}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Statistics */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>작업 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard title="총 작업" value={stats.totalJobs} color="#2196F3" icon="📋" />
              <StatCard title="예정" value={stats.scheduledJobs} color="#FF9800" icon="📅" />
              <StatCard title="진행중" value={stats.inProgressJobs} color="#2196F3" icon="🚧" />
              <StatCard title="완료" value={stats.completedJobs} color="#4CAF50" icon="✅" />
            </View>
            <View style={styles.statsGrid}>
              <StatCard title="취소" value={stats.cancelledJobs} color="#F44336" icon="❌" />
              <StatCard title="오늘 작업" value={stats.todayJobs} color="#9C27B0" icon="📆" />
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <Text style={styles.sectionTitle}>작업 검색</Text>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="작업유형, 설명, 직원명, 건물명으로 검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <FilterButton
                  title="전체"
                  isSelected={selectedFilter === 'all'}
                  onPress={() => setSelectedFilter('all')}
                />
                <FilterButton
                  title="예정"
                  isSelected={selectedFilter === 'scheduled'}
                  onPress={() => setSelectedFilter('scheduled')}
                />
                <FilterButton
                  title="진행중"
                  isSelected={selectedFilter === 'in_progress'}
                  onPress={() => setSelectedFilter('in_progress')}
                />
                <FilterButton
                  title="완료"
                  isSelected={selectedFilter === 'completed'}
                  onPress={() => setSelectedFilter('completed')}
                />
                <FilterButton
                  title="취소"
                  isSelected={selectedFilter === 'cancelled'}
                  onPress={() => setSelectedFilter('cancelled')}
                />
              </ScrollView>
            </View>
          </View>

          {/* Jobs List */}
          <View style={styles.jobsContainer}>
            <Text style={styles.sectionTitle}>
              작업 목록 ({filteredJobs.length}개)
            </Text>
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
                  {searchText || selectedFilter !== 'all' 
                    ? '조건에 맞는 작업이 없습니다' 
                    : '등록된 작업이 없습니다'
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
  mainContent: {
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
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
  searchContainer: {
    marginTop: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  filterButtonText: {
    fontSize: 14,
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
    marginBottom: 10,
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
    marginBottom: 15,
  },
  jobInfo: {
    flex: 1,
  },
  jobType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  jobBuilding: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  jobWorker: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  jobDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  jobStatus: {
    alignItems: 'flex-end',
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
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
  },
  detailButton: {
    backgroundColor: '#2196F3',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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
    textAlign: 'center',
  },
});

export default JobManagementScreen;