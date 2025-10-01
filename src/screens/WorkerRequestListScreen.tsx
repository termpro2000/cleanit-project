import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions
} from 'react-native';
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import app from '../firebase';
import { Request, Building } from '../../../shared/types';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

interface RequestWithBuilding extends Request {
  id: string;
  building?: Building;
}

const WorkerRequestListScreen: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithBuilding[]>([]);
  const [buildings, setBuildings] = useState<{ [key: string]: Building }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'assigned' | 'in_progress'>('all');
  const navigation = useNavigation<any>();

  const loadRequests = async () => {
    try {
      if (!user) {
        Alert.alert('오류', '로그인된 사용자가 없습니다.');
        return;
      }

      // Query for requests assigned to the current worker
      const q = query(
        collection(db, 'requests'),
        where('assignedTo.workerId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const fetchedRequests: RequestWithBuilding[] = [];
        const buildingIds = new Set<string>();
        
        querySnapshot.forEach((docSnapshot) => {
          const requestData = { id: docSnapshot.id, ...docSnapshot.data() } as RequestWithBuilding;
          fetchedRequests.push(requestData);
          if (requestData.buildingId) {
            buildingIds.add(requestData.buildingId);
          }
        });

        // Sort by priority and creation date
        fetchedRequests.sort((a, b) => {
          const priorityOrder = { urgent: 3, high: 2, normal: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

        setRequests(fetchedRequests);

        // Load building information
        const buildingData: { [key: string]: Building } = {};
        for (const buildingId of buildingIds) {
          try {
            const buildingDoc = await getDoc(doc(db, 'buildings', buildingId));
            if (buildingDoc.exists()) {
              buildingData[buildingId] = buildingDoc.data() as Building;
            }
          } catch (error) {
            console.error('Error loading building:', error);
          }
        }
        setBuildings(buildingData);
        
        setLoading(false);
      }, (error) => {
        console.error('Error fetching requests:', error);
        Alert.alert('오류', '요청 목록을 불러올 수 없습니다.');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up request listener:', error);
      Alert.alert('오류', '요청 목록을 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadRequests();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleRequestPress = (requestId: string) => {
    navigation.navigate('RequestDetails', { requestId });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'assigned': return '배정됨';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9500';
      case 'assigned': return '#007aff';
      case 'in_progress': return '#34c759';
      case 'completed': return '#28a745';
      case 'cancelled': return '#6c757d';
      default: return '#666';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'normal': return '보통';
      case 'high': return '높음';
      case 'urgent': return '긴급';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'normal': return '#34c759';
      case 'high': return '#ff9500';
      case 'urgent': return '#ff3b30';
      default: return '#666';
    }
  };

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'general': return '일반 요청';
      case 'additional': return '추가 요청';
      case 'urgent': return '긴급 요청';
      case 'special': return '특별 요청';
      default: return type;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (selectedFilter === 'all') return true;
    return request.status === selectedFilter;
  });

  const renderFilterButton = (filter: typeof selectedFilter, title: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
      <View style={[
        styles.filterBadge,
        selectedFilter === filter && styles.filterBadgeActive
      ]}>
        <Text style={[
          styles.filterBadgeText,
          selectedFilter === filter && styles.filterBadgeTextActive
        ]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: { item: RequestWithBuilding }) => {
    const building = buildings[item.buildingId || ''];
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleRequestPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleContainer}>
            <Text style={styles.requestTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.requestTypeContainer}>
              <Ionicons name="pricetag-outline" size={14} color="#666" />
              <Text style={styles.requestTypeText}>
                {getRequestTypeText(item.type)}
              </Text>
            </View>
          </View>
          <View style={styles.requestBadges}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityBadgeText}>
                {getPriorityText(item.priority)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.requestInfo}>
          <View style={styles.requestInfoRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.requestInfoText}>
              {building?.name || '건물 정보 없음'}
            </Text>
          </View>
          {building?.address && (
            <View style={styles.requestInfoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.requestInfoText} numberOfLines={1}>
                {building.address}
              </Text>
            </View>
          )}
          {item.location && (
            <View style={styles.requestInfoRow}>
              <Ionicons name="pin-outline" size={16} color="#666" />
              <Text style={styles.requestInfoText}>
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.requestInfoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.requestInfoText}>
              {item.createdAt.toDate().toLocaleDateString('ko-KR')} {item.createdAt.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <Text style={styles.requestContent} numberOfLines={2}>
          {item.content}
        </Text>

        <View style={styles.requestFooter}>
          {item.photos && item.photos.length > 0 && (
            <View style={styles.photoIndicator}>
              <Ionicons name="image-outline" size={16} color="#666" />
              <Text style={styles.photoCount}>{item.photos.length}장</Text>
            </View>
          )}
          <View style={styles.actionIndicator}>
            <Text style={styles.actionText}>자세히 보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>요청 목록을 불러오는 중...</Text>
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
          <Text style={styles.headerTitle}>할당받은 요청</Text>
          <Text style={styles.headerSubtitle}>
            {requests.length > 0 ? `${requests.length}개의 요청이 할당되어 있습니다` : '새로운 요청을 기다리고 있습니다'}
          </Text>
        </View>

        {/* 필터 버튼들 */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollView}
            data={[
              { key: 'all', title: '전체', count: requests.length },
              { key: 'pending', title: '대기중', count: requests.filter(r => r.status === 'pending').length },
              { key: 'assigned', title: '배정됨', count: requests.filter(r => r.status === 'assigned').length },
              { key: 'in_progress', title: '진행중', count: requests.filter(r => r.status === 'in_progress').length }
            ]}
            renderItem={({ item }) => renderFilterButton(item.key as any, item.title, item.count)}
            keyExtractor={item => item.key}
          />
        </View>

        {/* 요청 목록 */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'all' ? '할당된 요청이 없습니다' : `${getStatusText(selectedFilter)} 요청이 없습니다`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'all' ? '새로운 요청이 할당되면 여기에 표시됩니다' : '다른 상태의 요청을 확인해보세요'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2a5298']}
                tintColor="#2a5298"
              />
            }
          />
        )}
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
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e8f4fd',
    textAlign: 'center',
    lineHeight: 22,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  filterScrollView: {
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 6,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#e1e5e9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requestTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestTypeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  requestBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  requestContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WorkerRequestListScreen;
