import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import app from '../firebase';
import { Request } from '../../../shared/types';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const db = getFirestore(app);

type RootStackParamList = {
  RequestDetails: { requestId: string };
};

type RequestDetailsScreenRouteProp = RouteProp<RootStackParamList, 'RequestDetails'>;
type RequestDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RequestDetails'>;

interface RequestDetailsScreenProps {
  route: RequestDetailsScreenRouteProp;
  navigation: RequestDetailsScreenNavigationProp;
}

const RequestDetailsScreen: React.FC<RequestDetailsScreenProps> = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerNotes, setWorkerNotes] = useState('');
  const [processingStatus, setProcessingStatus] = useState<'completed' | 'incomplete' | null>(null);

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

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const docRef = doc(db, 'requests', requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const requestData = { id: docSnap.id, ...docSnap.data() } as Request;
          setRequest(requestData);
          setWorkerNotes(requestData.response?.notes || '');
          setProcessingStatus(requestData.response?.status || null);
        } else {
          setError('요청 정보를 찾을 수 없습니다.');
        }
      } catch (err: any) {
        console.error('Error fetching request details:', err);
        setError('요청 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [requestId]);

  const handleUpdateStatus = async () => {
    if (!request || !processingStatus) {
      Alert.alert('알림', '처리 상태를 선택해주세요.');
      return;
    }

    try {
      const requestDocRef = doc(db, 'requests', requestId);
      await updateDoc(requestDocRef, {
        status: processingStatus === 'completed' ? 'completed' : 'in_progress',
        response: {
          status: processingStatus,
          notes: workerNotes,
          completedAt: new Date(),
        },
      });
      Alert.alert('업데이트 성공', '요청 처리 상태가 업데이트되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('업데이트 실패', error.message);
      console.error('Update request error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>요청 정보 로딩 중...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!request) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
          <Ionicons name="document-outline" size={64} color="#8E8E93" />
          <Text style={styles.errorText}>요청 정보를 찾을 수 없습니다.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>돌아가기</Text>
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>요청 상세정보</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Request Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) }]}>
                  <Text style={styles.priorityText}>{getPriorityText(request.priority)}</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.requestTitle}>{request.title}</Text>
            <Text style={styles.requestContent}>{request.content}</Text>
            
            {request.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.locationText}>{request.location}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.infoLabel}>등록일시</Text>
              </View>
              <Text style={styles.infoValue}>
                {request.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '날짜 정보 없음'}
              </Text>
            </View>
          </View>

          {/* Photos Section */}
          {request.photos && request.photos.length > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="images-outline" size={20} color="#333" />
                <Text style={styles.sectionTitle}>첨부 사진</Text>
              </View>
              <Text style={styles.photoCount}>{request.photos.length}장의 사진이 첨부되었습니다.</Text>
            </View>
          )}

          {/* Action Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>처리 상태 업데이트</Text>
            </View>
            
            <View style={styles.statusButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  processingStatus === 'completed' && styles.statusButtonActive
                ]}
                onPress={() => setProcessingStatus('completed')}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={processingStatus === 'completed' ? '#fff' : '#34C759'} 
                />
                <Text style={[
                  styles.statusButtonText,
                  processingStatus === 'completed' && styles.statusButtonTextActive
                ]}>완료</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  processingStatus === 'incomplete' && styles.statusButtonActive
                ]}
                onPress={() => setProcessingStatus('incomplete')}
              >
                <Ionicons 
                  name="close-circle" 
                  size={20} 
                  color={processingStatus === 'incomplete' ? '#fff' : '#FF3B30'} 
                />
                <Text style={[
                  styles.statusButtonText,
                  processingStatus === 'incomplete' && styles.statusButtonTextActive
                ]}>미완료</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="처리 메모를 입력하세요 (선택사항)"
              placeholderTextColor="#999"
              value={workerNotes}
              onChangeText={setWorkerNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.updateButton} onPress={handleUpdateStatus}>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.updateButtonText}>상태 업데이트</Text>
            </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
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
    color: '#333',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  requestContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
  },
  statusButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 6,
  },
  statusButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    marginBottom: 16,
  },
  updateButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RequestDetailsScreen;
