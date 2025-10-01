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
  ScrollView,
  Modal,
  Dimensions
} from 'react-native';
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import app from '../firebase';
import { Request, Building } from '../../../shared/types';

const db = getFirestore(app);

const { width } = Dimensions.get('window');

const ClientRequestTrackingScreen: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<(Request & { id: string })[]>([]);
  const [buildings, setBuildings] = useState<{ [key: string]: Building }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [selectedRequest, setSelectedRequest] = useState<(Request & { id: string }) | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadRequests = async () => {
    try {
      // Using user from useAuth hook
      if (!user) {
        Alert.alert('오류', '로그인된 사용자가 없습니다.');
        return;
      }

      const q = query(
        collection(db, 'requests'),
        where('requesterId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const fetchedRequests: (Request & { id: string })[] = [];
        const buildingIds = new Set<string>();
        
        querySnapshot.forEach((docSnapshot) => {
          const requestData = { id: docSnapshot.id, ...docSnapshot.data() } as Request & { id: string };
          fetchedRequests.push(requestData);
          if (requestData.buildingId) {
            buildingIds.add(requestData.buildingId);
          }
        });

        fetchedRequests.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
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

  const handleRequestPress = (request: Request & { id: string }) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

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

  const renderRequestItem = ({ item }: { item: Request & { id: string } }) => {
    const building = buildings[item.buildingId || ''];
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleRequestPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleContainer}>
            <Text style={styles.requestTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.priorityBadgeText}>
              {getPriorityText(item.priority)}
            </Text>
          </View>
        </View>

        <View style={styles.requestInfo}>
          <View style={styles.requestInfoRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.requestInfoText}>
              {building?.name || '건물 정보 없음'}
            </Text>
          </View>
          <View style={styles.requestInfoRow}>
            <Ionicons name="pricetag-outline" size={16} color="#666" />
            <Text style={styles.requestInfoText}>
              {getRequestTypeText(item.type)}
            </Text>
          </View>
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
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
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
          <Text style={styles.headerTitle}>내 요청 추적</Text>
          <Text style={styles.headerSubtitle}>등록한 요청의 진행 상황을 확인하세요</Text>
        </View>

        {/* 필터 버튼들 */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            {renderFilterButton('all', '전체', requests.length)}
            {renderFilterButton('pending', '대기중', requests.filter(r => r.status === 'pending').length)}
            {renderFilterButton('assigned', '배정됨', requests.filter(r => r.status === 'assigned').length)}
            {renderFilterButton('in_progress', '진행중', requests.filter(r => r.status === 'in_progress').length)}
            {renderFilterButton('completed', '완료', requests.filter(r => r.status === 'completed').length)}
            {renderFilterButton('cancelled', '취소됨', requests.filter(r => r.status === 'cancelled').length)}
          </ScrollView>
        </View>

        {/* 요청 목록 */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'all' ? '등록된 요청이 없습니다' : `${getStatusText(selectedFilter)} 요청이 없습니다`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'all' ? '새로운 요청을 등록해보세요' : '다른 상태의 요청을 확인해보세요'}
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

        {/* 요청 상세 모달 */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedRequest && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>요청 상세 정보</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>기본 정보</Text>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>제목</Text>
                        <Text style={styles.modalValue}>{selectedRequest.title}</Text>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>상태</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                          <Text style={styles.statusBadgeText}>{getStatusText(selectedRequest.status)}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>우선순위</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedRequest.priority) }]}>
                          <Text style={styles.priorityBadgeText}>{getPriorityText(selectedRequest.priority)}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>유형</Text>
                        <Text style={styles.modalValue}>{getRequestTypeText(selectedRequest.type)}</Text>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>건물</Text>
                        <Text style={styles.modalValue}>{buildings[selectedRequest.buildingId || '']?.name || '건물 정보 없음'}</Text>
                      </View>
                      {selectedRequest.location && (
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>위치</Text>
                          <Text style={styles.modalValue}>{selectedRequest.location}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>상세 내용</Text>
                      <Text style={styles.modalContent}>{selectedRequest.content}</Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>일정</Text>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>등록일</Text>
                        <Text style={styles.modalValue}>
                          {selectedRequest.createdAt.toDate().toLocaleDateString('ko-KR')} {selectedRequest.createdAt.toDate().toLocaleTimeString('ko-KR')}
                        </Text>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>최종 수정</Text>
                        <Text style={styles.modalValue}>
                          {selectedRequest.updatedAt.toDate().toLocaleDateString('ko-KR')} {selectedRequest.updatedAt.toDate().toLocaleTimeString('ko-KR')}
                        </Text>
                      </View>
                    </View>

                    {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>첨부 사진 ({selectedRequest.photos.length}장)</Text>
                        <Text style={styles.modalContent}>사진이 첨부되어 있습니다.</Text>
                      </View>
                    )}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>
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
    marginBottom: 12,
  },
  requestTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 12,
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
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgb(0, 0, 0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width - 40,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    maxHeight: '85%',
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  modalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  modalContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default ClientRequestTrackingScreen;
