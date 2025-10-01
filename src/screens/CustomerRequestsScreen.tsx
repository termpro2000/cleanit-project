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
import { getFirestore, collection, query, getDocs, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Request, User, Building } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  Dashboard: undefined;
  RequestDetails: { requestId: string };
};

type CustomerRequestsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RequestStats {
  totalRequests: number;
  pendingRequests: number;
  assignedRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  urgentRequests: number;
  todayRequests: number;
}

const CustomerRequestsScreen: React.FC = () => {
  const navigation = useNavigation<CustomerRequestsScreenNavigationProp>();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [buildings, setBuildings] = useState<{ [key: string]: Building }>({});
  const [workers, setWorkers] = useState<{ [key: string]: User }>({});
  const [stats, setStats] = useState<RequestStats>({
    totalRequests: 0,
    pendingRequests: 0,
    assignedRequests: 0,
    inProgressRequests: 0,
    completedRequests: 0,
    cancelledRequests: 0,
    urgentRequests: 0,
    todayRequests: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'normal' | 'high' | 'urgent'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchText, selectedFilter, selectedPriority]);

  const loadRequests = async () => {
    try {
      // Load requests
      const requestsQuery = query(
        collection(db, 'requests'), 
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Request));

      setRequests(requestsData);

      // Load users (requesters)
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersMap: { [key: string]: User } = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setUsers(usersMap);

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
      const totalRequests = requestsData.length;
      const pendingRequests = requestsData.filter(req => req.status === 'pending').length;
      const assignedRequests = requestsData.filter(req => req.status === 'assigned').length;
      const inProgressRequests = requestsData.filter(req => req.status === 'in_progress').length;
      const completedRequests = requestsData.filter(req => req.status === 'completed').length;
      const cancelledRequests = requestsData.filter(req => req.status === 'cancelled').length;
      const urgentRequests = requestsData.filter(req => req.priority === 'urgent').length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRequests = requestsData.filter(req => {
        const reqDate = req.createdAt?.toDate();
        return reqDate && reqDate >= today && reqDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length;

      setStats({
        totalRequests,
        pendingRequests,
        assignedRequests,
        inProgressRequests,
        completedRequests,
        cancelledRequests,
        urgentRequests,
        todayRequests
      });

    } catch (error) {
      console.error('요청 데이터 로드 실패:', error);
      Alert.alert('오류', '요청 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(req => req.status === selectedFilter);
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(req => req.priority === selectedPriority);
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(req => 
        req.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.content?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.type?.toLowerCase().includes(searchText.toLowerCase()) ||
        users[req.requesterId]?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        buildings[req.buildingId]?.name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const requestRef = doc(db, 'requests', requestId);
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

      await updateDoc(requestRef, updateData);
      
      Alert.alert('완료', `요청 상태가 "${getStatusText(newStatus)}"로 변경되었습니다.`);
      await loadRequests();
    } catch (error) {
      console.error('요청 상태 변경 실패:', error);
      Alert.alert('오류', '요청 상태 변경에 실패했습니다.');
    }
  };

  const assignWorkerToRequest = async (requestId: string) => {
    // For now, we'll show an alert. In a real app, you'd show a worker selection modal
    Alert.alert(
      '직원 배정',
      '직원 배정 기능은 추후 구현될 예정입니다.\n직원 선택 모달을 통해 배정할 수 있습니다.',
      [{ text: '확인' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'assigned': return '#2196F3';
      case 'in_progress': return '#9C27B0';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'assigned': return '배정됨';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      default: return '알 수 없음';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#F44336';
      case 'high': return '#FF9800';
      case 'normal': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return '긴급';
      case 'high': return '높음';
      case 'normal': return '보통';
      default: return '알 수 없음';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'general': return '일반';
      case 'additional': return '추가';
      case 'urgent': return '긴급';
      case 'special': return '특별';
      default: return '기타';
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

  const RequestCard = ({ request }: { request: Request }) => {
    const requester = users[request.requesterId];
    const building = buildings[request.buildingId];
    const assignedWorker = request.assignedTo?.workerId ? workers[request.assignedTo.workerId] : null;
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.requestTitle}>{request.title || '제목 없음'}</Text>
              <View style={[
                styles.priorityBadge, 
                { backgroundColor: getPriorityColor(request.priority) }
              ]}>
                <Text style={styles.priorityText}>
                  {getPriorityText(request.priority)}
                </Text>
              </View>
            </View>
            <Text style={styles.requestType}>{getTypeText(request.type)}</Text>
            <Text style={styles.requestBuilding}>건물: {building?.name || '정보 없음'}</Text>
            <Text style={styles.requestRequester}>요청자: {requester?.name || '정보 없음'}</Text>
            <Text style={styles.requestDate}>
              요청일: {request.createdAt?.toDate().toLocaleDateString() || '정보 없음'}
            </Text>
            {assignedWorker && (
              <Text style={styles.assignedWorker}>담당자: {assignedWorker.name}</Text>
            )}
            {request.content && (
              <Text style={styles.requestContent} numberOfLines={2}>
                {request.content}
              </Text>
            )}
          </View>
          <View style={styles.requestStatus}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(request.status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(request.status)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.detailButton]}
            onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
          >
            <Text style={styles.actionButtonText}>상세</Text>
          </TouchableOpacity>
          
          {request.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.assignButton]}
                onPress={() => assignWorkerToRequest(request.id)}
              >
                <Text style={styles.actionButtonText}>배정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => updateRequestStatus(request.id, 'assigned')}
              >
                <Text style={styles.actionButtonText}>승인</Text>
              </TouchableOpacity>
            </>
          )}
          
          {request.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.progressButton]}
              onPress={() => updateRequestStatus(request.id, 'in_progress')}
            >
              <Text style={styles.actionButtonText}>시작</Text>
            </TouchableOpacity>
          )}
          
          {request.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => updateRequestStatus(request.id, 'completed')}
            >
              <Text style={styles.actionButtonText}>완료</Text>
            </TouchableOpacity>
          )}
          
          {(request.status === 'pending' || request.status === 'assigned') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => updateRequestStatus(request.id, 'cancelled')}
            >
              <Text style={styles.actionButtonText}>취소</Text>
            </TouchableOpacity>
          )}
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
            <Text style={styles.loadingText}>고객 요청 데이터를 불러오는 중...</Text>
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
            <Text style={styles.headerTitle}>고객 요청 관리</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Statistics */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>요청 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard title="총 요청" value={stats.totalRequests} color="#2196F3" icon="📋" />
              <StatCard title="대기중" value={stats.pendingRequests} color="#FF9800" icon="⏳" />
              <StatCard title="배정됨" value={stats.assignedRequests} color="#2196F3" icon="👤" />
              <StatCard title="진행중" value={stats.inProgressRequests} color="#9C27B0" icon="🚧" />
            </View>
            <View style={styles.statsGrid}>
              <StatCard title="완료" value={stats.completedRequests} color="#4CAF50" icon="✅" />
              <StatCard title="취소" value={stats.cancelledRequests} color="#F44336" icon="❌" />
              <StatCard title="긴급" value={stats.urgentRequests} color="#F44336" icon="🚨" />
              <StatCard title="오늘 요청" value={stats.todayRequests} color="#9C27B0" icon="📅" />
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <Text style={styles.sectionTitle}>요청 검색</Text>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="제목, 내용, 유형, 요청자명, 건물명으로 검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            
            <Text style={styles.filterTitle}>상태별 필터</Text>
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <FilterButton
                  title="전체"
                  isSelected={selectedFilter === 'all'}
                  onPress={() => setSelectedFilter('all')}
                />
                <FilterButton
                  title="대기중"
                  isSelected={selectedFilter === 'pending'}
                  onPress={() => setSelectedFilter('pending')}
                />
                <FilterButton
                  title="배정됨"
                  isSelected={selectedFilter === 'assigned'}
                  onPress={() => setSelectedFilter('assigned')}
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

            <Text style={styles.filterTitle}>우선순위 필터</Text>
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <FilterButton
                  title="전체"
                  isSelected={selectedPriority === 'all'}
                  onPress={() => setSelectedPriority('all')}
                />
                <FilterButton
                  title="보통"
                  isSelected={selectedPriority === 'normal'}
                  onPress={() => setSelectedPriority('normal')}
                />
                <FilterButton
                  title="높음"
                  isSelected={selectedPriority === 'high'}
                  onPress={() => setSelectedPriority('high')}
                />
                <FilterButton
                  title="긴급"
                  isSelected={selectedPriority === 'urgent'}
                  onPress={() => setSelectedPriority('urgent')}
                />
              </ScrollView>
            </View>
          </View>

          {/* Requests List */}
          <View style={styles.requestsContainer}>
            <Text style={styles.sectionTitle}>
              요청 목록 ({filteredRequests.length}개)
            </Text>
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
                  {searchText || selectedFilter !== 'all' || selectedPriority !== 'all'
                    ? '조건에 맞는 요청이 없습니다' 
                    : '등록된 요청이 없습니다'
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
  headerSpacer: {
    width: 24,
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
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 10,
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
  requestsContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  requestInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  requestType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  requestBuilding: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  requestRequester: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  assignedWorker: {
    fontSize: 14,
    color: '#2a5298',
    marginBottom: 4,
    fontWeight: '500',
  },
  requestContent: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  requestStatus: {
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
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  requestActions: {
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
  assignButton: {
    backgroundColor: '#9C27B0',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  progressButton: {
    backgroundColor: '#9C27B0',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
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

export default CustomerRequestsScreen;