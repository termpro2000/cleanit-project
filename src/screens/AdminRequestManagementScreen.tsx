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
  RefreshControl
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import app from '../firebase';
import { Request, User } from '../../../shared/types';
import { canManageRequests } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);

interface RequestWithDetails extends Request {
  id: string;
  requesterName?: string;
  buildingName?: string;
}

const AdminRequestManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [workers, setWorkers] = useState<(User & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'approved'>('all');

  // 권한 체크
  useEffect(() => {
    if (user && !canManageRequests(user.role)) {
      Alert.alert('접근 권한 없음', '이 기능은 관리자만 사용할 수 있습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Admin에게 할당된 요청들 로드
      const requestsQuery = query(
        collection(db, 'requests'),
        where('assignedTo.adminId', '==', user?.uid || '')
      );

      const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
        const requestsData = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const requestData = { id: docSnapshot.id, ...docSnapshot.data() } as RequestWithDetails;
            
            // 요청자 정보 가져오기
            try {
              const requesterDoc = await getDocs(query(
                collection(db, 'users'),
                where('__name__', '==', requestData.requesterId)
              ));
              if (!requesterDoc.empty) {
                requestData.requesterName = requesterDoc.docs[0].data().name;
              }
            } catch (error) {
              console.log('요청자 정보 로드 실패:', error);
            }

            // 건물 정보 가져오기
            try {
              const buildingDoc = await getDocs(query(
                collection(db, 'buildings'),
                where('__name__', '==', requestData.buildingId)
              ));
              if (!buildingDoc.empty) {
                requestData.buildingName = buildingDoc.docs[0].data().name;
              }
            } catch (error) {
              console.log('건물 정보 로드 실패:', error);
            }

            return requestData;
          })
        );

        // 우선순위와 생성일시로 정렬
        requestsData.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

        setRequests(requestsData);
      });

      // Worker 목록 로드
      const workersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'worker')
      );
      const workersSnapshot = await getDocs(workersQuery);
      const workersData = workersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (User & { id: string })[];
      
      setWorkers(workersData);

      return unsubscribe;
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let unsubscribe: (() => void) | undefined;
      
      loadData().then((unsub) => {
        unsubscribe = unsub;
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        approvedByAdmin: true,
        status: 'assigned',
        updatedAt: new Date()
      });
      Alert.alert('승인 완료', '요청이 승인되었습니다.');
    } catch (error) {
      console.error('요청 승인 실패:', error);
      Alert.alert('오류', '요청 승인에 실패했습니다.');
    }
  };

  const handleAssignWorker = (requestId: string) => {
    Alert.alert(
      'Worker 배정',
      '이 요청에 작업자를 배정하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '배정', onPress: () => showWorkerSelection(requestId) }
      ]
    );
  };

  const showWorkerSelection = (requestId: string) => {
    // Worker 선택 모달 또는 화면으로 이동
    navigation.navigate('WorkerSelection', { requestId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'assigned': return '#007AFF';
      case 'in_progress': return '#5856D6';
      case 'completed': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'assigned': return '배정됨';
      case 'in_progress': return '진행중';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '긴급';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return priority;
    }
  };

  const filteredRequests = requests.filter(request => {
    switch (filter) {
      case 'pending':
        return request.status === 'pending';
      case 'assigned':
        return request.status === 'assigned';
      case 'approved':
        return request.approvedByAdmin === true;
      default:
        return true;
    }
  });

  const renderRequestItem = ({ item }: { item: RequestWithDetails }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.badgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{getStatusText(item.status)}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.badgeText}>{getPriorityText(item.priority)}</Text>
          </View>
        </View>
        {!item.approvedByAdmin && (
          <View style={styles.pendingIndicator}>
            <Text style={styles.pendingText}>승인 대기</Text>
          </View>
        )}
      </View>

      <Text style={styles.requestTitle}>{item.title}</Text>
      <Text style={styles.requestContent} numberOfLines={2}>{item.content}</Text>

      <View style={styles.requestInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.requesterName || '알 수 없음'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.buildingName || '건물 정보 없음'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '날짜 정보 없음'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {!item.approvedByAdmin && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveRequest(item.id)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>승인</Text>
          </TouchableOpacity>
        )}
        
        {item.approvedByAdmin && item.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.assignButton]}
            onPress={() => handleAssignWorker(item.id)}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>작업자 배정</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.detailButton]}
          onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
        >
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>상세보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>요청 목록을 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>고객 요청 관리</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                전체 ({requests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
                승인 대기 ({requests.filter(r => !r.approvedByAdmin).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'approved' && styles.activeFilter]}
              onPress={() => setFilter('approved')}
            >
              <Text style={[styles.filterText, filter === 'approved' && styles.activeFilterText]}>
                승인됨 ({requests.filter(r => r.approvedByAdmin).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'assigned' && styles.activeFilter]}
              onPress={() => setFilter('assigned')}
            >
              <Text style={[styles.filterText, filter === 'assigned' && styles.activeFilterText]}>
                배정됨 ({requests.filter(r => r.status === 'assigned').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Request List */}
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2196F3']} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>요청이 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' ? '현재 처리할 요청이 없습니다.' : '해당 조건의 요청이 없습니다.'}
              </Text>
            </View>
          }
        />
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingIndicator: {
    backgroundColor: '#ffeb3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  requestContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  assignButton: {
    backgroundColor: '#007AFF',
  },
  detailButton: {
    backgroundColor: '#8E8E93',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AdminRequestManagementScreen;