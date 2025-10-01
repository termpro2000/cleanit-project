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
  FlatList,
  Image,
  RefreshControl,
  Dimensions
} from 'react-native';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Job, Building, User } from '../../../shared/types';
import { useAuth, canCreateRequests, canManageRequests } from '../contexts/AuthContext';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

interface JobWithBuilding extends Job {
  id: string;
  building?: Building;
}

const ClientDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<JobWithBuilding[]>([]);
  const [buildings, setBuildings] = useState<(Building & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    scheduledJobs: 0,
    inProgressJobs: 0,
    totalBuildings: 0,
    pendingRequests: 0
  });

  const fetchClientData = async () => {
    try {
      if (!user) return;

      // 사용자 프로필은 AuthContext에서 가져옴
      // setUserProfile은 제거하고 user.profile 사용

      // 클라이언트 소유 건물들 가져오기
      const buildingsQuery = query(
        collection(db, 'buildings'),
        where('ownerId', '==', user.uid)
      );
      const buildingsSnapshot = await getDocs(buildingsQuery);
      const buildingsData = buildingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Building & { id: string })[];
      
      setBuildings(buildingsData);

      // 클라이언트 요청들 가져오기
      const requestsQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', user.uid)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const pendingRequests = requestsSnapshot.docs.filter(doc => 
        doc.data().status === 'pending'
      ).length;

      // 클라이언트 건물들에 대한 작업들 가져오기
      const buildingIds = buildingsData.map(b => b.id);
      let jobsData: JobWithBuilding[] = [];
      
      if (buildingIds.length > 0) {
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('buildingId', 'in', buildingIds)
        );
        const jobsSnapshot = await getDocs(jobsQuery);

        for (const jobDoc of jobsSnapshot.docs) {
          const jobData = { id: jobDoc.id, ...jobDoc.data() } as JobWithBuilding;
          const building = buildingsData.find(b => b.id === jobData.buildingId);
          jobData.building = building;
          jobsData.push(jobData);
        }

        // 날짜순 정렬 (최신순)
        jobsData.sort((a, b) => {
          const aTime = a.scheduledAt?.toDate?.() || new Date();
          const bTime = b.scheduledAt?.toDate?.() || new Date();
          return bTime.getTime() - aTime.getTime();
        });
      }

      setJobs(jobsData);

      // 통계 계산
      const totalJobs = jobsData.length;
      const completedJobs = jobsData.filter(job => job.status === 'completed').length;
      const scheduledJobs = jobsData.filter(job => job.status === 'scheduled').length;
      const inProgressJobs = jobsData.filter(job => job.status === 'in_progress').length;

      setStats({
        totalJobs,
        completedJobs,
        scheduledJobs,
        inProgressJobs,
        totalBuildings: buildingsData.length,
        pendingRequests
      });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchClientData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClientData();
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
          onPress: async () => {
            try {
              await logout();
            } catch (error: any) {
              Alert.alert('로그아웃 실패', error.message);
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleViewProfile = () => {
    Alert.alert(
      '프로필 메뉴',
      '원하는 작업을 선택하세요',
      [
        { text: '프로필 보기', onPress: () => navigation.navigate('Profile') },
        { text: '비밀번호 변경', onPress: () => navigation.navigate('ChangePassword') },
        { text: '로그아웃', onPress: handleLogout, style: 'destructive' },
        { text: '취소', style: 'cancel' }
      ]
    );
  };

  const handleRegisterBuilding = () => {
    navigation.navigate('BuildingRegistration');
  };

  const handleViewBuildings = () => {
    navigation.navigate('BuildingList');
  };

  const handleRegisterRequest = () => {
    navigation.navigate('RequestRegistration');
  };

  const handleTrackRequests = () => {
    navigation.navigate('ClientRequestTracking');
  };

  const handleJobPress = (job: JobWithBuilding) => {
    navigation.navigate('JobDetails', { jobId: job.id });
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return '정보 없음';
    const date = timestamp.toDate();
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정됨';
      case 'in_progress': return '진행 중';
      case 'completed': return '완료됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#ff9500';
      case 'in_progress': return '#007aff';
      case 'completed': return '#34c759';
      default: return '#666';
    }
  };

  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const QuickActionCard = ({ title, icon, onPress, color }: { title: string; icon: string; onPress: () => void; color: string }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const JobCard = ({ job }: { job: JobWithBuilding }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => handleJobPress(job)} activeOpacity={0.7}>
      <View style={styles.jobHeader}>
        <View style={styles.jobIconContainer}>
          <Ionicons name="business" size={24} color="#2a5298" />
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobBuilding} numberOfLines={1}>
            {job.building?.name || '건물 정보 없음'}
          </Text>
          <Text style={styles.jobAddress} numberOfLines={1}>
            {job.building?.address || '주소 정보 없음'}
          </Text>
        </View>
        <View style={[styles.jobStatusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.jobStatusText}>{getStatusText(job.status)}</Text>
        </View>
      </View>
      
      <View style={styles.jobDetailsContainer}>
        <View style={styles.jobDetailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.jobDetailLabel}>예정</Text>
          <Text style={styles.jobDetailValue}>{formatDateTime(job.scheduledAt)}</Text>
        </View>
        
        {job.startedAt && (
          <View style={styles.jobDetailRow}>
            <Ionicons name="play-circle-outline" size={16} color="#666" />
            <Text style={styles.jobDetailLabel}>시작</Text>
            <Text style={styles.jobDetailValue}>{formatDateTime(job.startedAt)}</Text>
          </View>
        )}
        
        {job.completedAt && (
          <View style={styles.jobDetailRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.jobDetailLabel}>완료</Text>
            <Text style={styles.jobDetailValue}>{formatDateTime(job.completedAt)}</Text>
          </View>
        )}
      </View>
      
      {((job.beforePhotos && job.beforePhotos.length > 0) || (job.afterPhotos && job.afterPhotos.length > 0)) && (
        <View style={styles.photosContainer}>
          <View style={styles.photosRow}>
            <Ionicons name="camera-outline" size={16} color="#666" />
            <Text style={styles.photosLabel}>
              사진 {(job.beforePhotos?.length || 0) + (job.afterPhotos?.length || 0)}장
            </Text>
          </View>
        </View>
      )}

      <View style={styles.jobFooter}>
        <Text style={styles.viewDetailsText}>자세히 보기</Text>
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>안녕하세요!</Text>
              <Text style={styles.headerTitle}>
                {user?.profile?.name || user?.name || '클라이언트'}님
              </Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
              <Ionicons name="person-circle-outline" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.content}
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
          {/* 통계 카드 */}
          <View style={styles.statsContainer}>
            <StatCard title="건물" value={stats.totalBuildings} color="#2a5298" icon="business" />
            <StatCard title="전체 작업" value={stats.totalJobs} color="#34c759" icon="checkmark-circle" />
            <StatCard title="진행중" value={stats.inProgressJobs} color="#007aff" icon="time" />
            <StatCard title="대기 요청" value={stats.pendingRequests} color="#ff9500" icon="hourglass" />
          </View>

          {/* 빠른 액션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>빠른 액션</Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionCard 
                title="건물 등록" 
                icon="add-circle" 
                onPress={handleRegisterBuilding}
                color="#2a5298"
              />
              {canCreateRequests(user) && (
                <QuickActionCard 
                  title="요청 등록" 
                  icon="document-text" 
                  onPress={handleRegisterRequest}
                  color="#34c759"
                />
              )}
              <QuickActionCard 
                title="건물 목록" 
                icon="business" 
                onPress={handleViewBuildings}
                color="#007aff"
              />
              {(canCreateRequests(user) || canManageRequests(user)) && (
                <QuickActionCard 
                  title="요청 추적" 
                  icon="eye" 
                  onPress={handleTrackRequests}
                  color="#ff9500"
                />
              )}
            </View>
          </View>

          {/* 최근 청소 현황 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>최근 청소 현황</Text>
              {jobs.length > 3 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>전체 보기</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {jobs.length > 0 ? (
              jobs.slice(0, 3).map((job, index) => (
                <JobCard key={job.id} job={job} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>청소 작업이 없습니다</Text>
                <Text style={styles.emptySubtitle}>
                  건물을 등록하고 청소 요청을 해보세요
                </Text>
              </View>
            )}
          </View>

          {/* 계정 관리 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계정 관리</Text>
            <View style={styles.accountMenuContainer}>
              <TouchableOpacity style={styles.accountMenuItem} onPress={handleChangePassword}>
                <View style={styles.accountMenuLeft}>
                  <Ionicons name="key-outline" size={20} color="#666" />
                  <Text style={styles.accountMenuText}>비밀번호 변경</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.accountMenuItem} onPress={handleLogout}>
                <View style={styles.accountMenuLeft}>
                  <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
                  <Text style={[styles.accountMenuText, { color: '#ff3b30' }]}>로그아웃</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
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
    backgroundColor: '#f8f9fa',
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
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#e8f4fd',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTextContainer: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (width - 64) / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobBuilding: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: '#666',
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  jobStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobDetailsContainer: {
    marginBottom: 12,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    minWidth: 40,
  },
  jobDetailValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  photosContainer: {
    marginBottom: 12,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photosLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  accountMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  accountMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountMenuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default ClientDashboardScreen;
