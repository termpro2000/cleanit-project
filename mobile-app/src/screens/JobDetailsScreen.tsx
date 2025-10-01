import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar
} from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import app from '../firebase';
import { Job, Building } from '../../../shared/types';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const db = getFirestore(app);
const storage = getStorage(app);

type RootStackParamList = {
  JobDetails: { jobId: string };
};

type JobDetailsScreenRouteProp = RouteProp<RootStackParamList, 'JobDetails'>;
type JobDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'JobDetails'>;

interface JobWithId extends Job {
  id: string;
}

interface Props {
  route: JobDetailsScreenRouteProp;
  navigation: JobDetailsScreenNavigationProp;
}

const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const [job, setJob] = useState<JobWithId | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedBeforePhotos, setSelectedBeforePhotos] = useState<string[]>([]);
  const [selectedAfterPhotos, setSelectedAfterPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        const jobData = { id: jobDoc.id, ...jobDoc.data() } as JobWithId;
        setJob(jobData);

        if (jobData.buildingId) {
          const buildingDoc = await getDoc(doc(db, 'buildings', jobData.buildingId));
          if (buildingDoc.exists()) {
            setBuilding({ id: buildingDoc.id, ...buildingDoc.data() } as Building);
          }
        }
      }
    } catch (error) {
      console.error('작업 상세 정보 가져오기 실패:', error);
      Alert.alert('오류', '작업 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!job) return;

    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'in_progress',
        startedAt: now,
        updatedAt: now
      });
      
      setJob({ ...job, status: 'in_progress', startedAt: now });
      Alert.alert('성공', '청소를 시작했습니다.');
    } catch (error) {
      console.error('작업 시작 실패:', error);
      Alert.alert('오류', '작업을 시작할 수 없습니다.');
    }
  };

  const handleCompleteJob = async () => {
    if (!job) return;

    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'completed',
        completedAt: now,
        updatedAt: now
      });
      
      setJob({ ...job, status: 'completed', completedAt: now });
      Alert.alert('성공', '청소를 완료했습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.goBack(); // 작업 목록으로 돌아가기
          }
        }
      ]);
    } catch (error) {
      console.error('작업 완료 실패:', error);
      Alert.alert('오류', '작업을 완료할 수 없습니다.');
    }
  };

  const pickImages = async (type: 'before' | 'after') => {
    console.log(`이미지 선택 시작: ${type}`);
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('갤러리 권한 상태:', status);
      
      if (status !== 'granted') {
        Alert.alert('권한 오류', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      console.log('이미지 피커 실행 중...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      console.log('이미지 피커 결과:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log(`선택된 이미지 URI:`, imageUri);
        
        if (type === 'before') {
          setSelectedBeforePhotos(prev => [...prev, imageUri]);
        } else {
          setSelectedAfterPhotos(prev => [...prev, imageUri]);
        }
        
        Alert.alert('성공', '사진을 선택했습니다. 더 추가하려면 버튼을 다시 눌러주세요.');
      } else {
        console.log('이미지 선택이 취소되었습니다.');
      }
    } catch (error) {
      console.error('이미지 피커 오류:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.');
    }
  };

  const removeSelectedPhoto = (uri: string, type: 'before' | 'after') => {
    if (type === 'before') {
      setSelectedBeforePhotos(prev => prev.filter(photo => photo !== uri));
    } else {
      setSelectedAfterPhotos(prev => prev.filter(photo => photo !== uri));
    }
  };

  const uploadImages = async (type: 'before' | 'after') => {
    if (!job) return;

    const selectedPhotos = type === 'before' ? selectedBeforePhotos : selectedAfterPhotos;
    if (selectedPhotos.length === 0) {
      Alert.alert('알림', '업로드할 사진을 선택해주세요.');
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = selectedPhotos.map(async (uri, index) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const fileName = `${type}_${Date.now()}_${index}.jpg`;
        // Firebase Storage 경로를 public으로 변경
        const imageRef = ref(storage, `public/jobs/${jobId}/${fileName}`);
        
        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);
        return downloadURL;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      
      const fieldName = type === 'before' ? 'beforePhotos' : 'afterPhotos';
      const currentPhotos = job[fieldName] || [];
      const updatedPhotos = [...currentPhotos, ...uploadedUrls];
      
      await updateDoc(doc(db, 'jobs', jobId), {
        [fieldName]: updatedPhotos,
        updatedAt: Timestamp.now()
      });
      
      setJob({ ...job, [fieldName]: updatedPhotos });
      
      // 업로드 완료 후 선택된 사진들 초기화
      if (type === 'before') {
        setSelectedBeforePhotos([]);
      } else {
        setSelectedAfterPhotos([]);
      }
      
      Alert.alert('성공', `${selectedPhotos.length}개의 ${type === 'before' ? '청소 전' : '청소 후'} 사진이 업로드되었습니다.`);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      Alert.alert('오류', '사진 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  const formatDateTime = (timestamp: Timestamp | undefined) => {
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

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>작업 정보를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!job) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>작업 상세</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>작업 정보를 찾을 수 없습니다.</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>작업 상세</Text>
        </View>
        
        <ScrollView style={styles.content}>
          {/* 기본 정보 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>기본 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>상태:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>예정 일시:</Text>
              <Text style={styles.value}>{formatDateTime(job.scheduledAt)}</Text>
            </View>
            {job.startedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>시작 일시:</Text>
                <Text style={styles.value}>{formatDateTime(job.startedAt)}</Text>
              </View>
            )}
            {job.completedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>완료 일시:</Text>
                <Text style={styles.value}>{formatDateTime(job.completedAt)}</Text>
              </View>
            )}
          </View>

          {/* 건물 정보 */}
          {building && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>건물 정보</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>건물명:</Text>
                <Text style={styles.value}>{building.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>주소:</Text>
                <Text style={styles.value}>{building.address}</Text>
              </View>
              {job.areas && job.areas.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>청소 구역:</Text>
                  <Text style={styles.value}>{job.areas.join(', ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* 청소 전 사진 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>청소 전 사진</Text>
            
            {job.status === 'scheduled' || job.status === 'in_progress' ? (
              <View>
                <TouchableOpacity 
                  style={styles.photoButton}
                  onPress={() => pickImages('before')}
                  disabled={uploading}
                >
                  <Text style={styles.photoButtonText}>
                    {uploading ? '처리 중...' : '청소 전 사진 선택'}
                  </Text>
                </TouchableOpacity>
                
                {/* 선택된 사진들 미리보기 */}
                {selectedBeforePhotos.length > 0 && (
                  <View style={styles.selectedPhotosContainer}>
                    <Text style={styles.selectedPhotosTitle}>선택된 사진 ({selectedBeforePhotos.length}개)</Text>
                    <FlatList
                      data={selectedBeforePhotos}
                      horizontal
                      keyExtractor={(item, index) => `selected_before_${index}`}
                      renderItem={({ item }) => (
                        <View style={styles.selectedPhotoItem}>
                          <Image source={{ uri: item }} style={styles.selectedPhoto} />
                          <TouchableOpacity 
                            style={styles.removePhotoButton}
                            onPress={() => removeSelectedPhoto(item, 'before')}
                          >
                            <Text style={styles.removePhotoText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      showsHorizontalScrollIndicator={false}
                    />
                    
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={() => uploadImages('before')}
                      disabled={uploading}
                    >
                      <Text style={styles.uploadButtonText}>
                        {uploading ? '업로드 중...' : `${selectedBeforePhotos.length}개 사진 업로드`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}
            
            {/* 업로드된 사진들 */}
            {job.beforePhotos && job.beforePhotos.length > 0 ? (
              <View style={styles.uploadedPhotosContainer}>
                <Text style={styles.uploadedPhotosTitle}>업로드된 사진 ({job.beforePhotos.length}개)</Text>
                <FlatList
                  data={job.beforePhotos}
                  horizontal
                  keyExtractor={(item, index) => `before_${index}`}
                  renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={styles.photo} />
                  )}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            ) : (
              <Text style={styles.noPhotoText}>업로드된 사진이 없습니다</Text>
            )}
          </View>

          {/* 청소 후 사진 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>청소 후 사진</Text>
            
            {job.status === 'in_progress' ? (
              <View>
                <TouchableOpacity 
                  style={styles.photoButton}
                  onPress={() => pickImages('after')}
                  disabled={uploading}
                >
                  <Text style={styles.photoButtonText}>
                    {uploading ? '처리 중...' : '청소 후 사진 선택'}
                  </Text>
                </TouchableOpacity>
                
                {/* 선택된 사진들 미리보기 */}
                {selectedAfterPhotos.length > 0 && (
                  <View style={styles.selectedPhotosContainer}>
                    <Text style={styles.selectedPhotosTitle}>선택된 사진 ({selectedAfterPhotos.length}개)</Text>
                    <FlatList
                      data={selectedAfterPhotos}
                      horizontal
                      keyExtractor={(item, index) => `selected_after_${index}`}
                      renderItem={({ item }) => (
                        <View style={styles.selectedPhotoItem}>
                          <Image source={{ uri: item }} style={styles.selectedPhoto} />
                          <TouchableOpacity 
                            style={styles.removePhotoButton}
                            onPress={() => removeSelectedPhoto(item, 'after')}
                          >
                            <Text style={styles.removePhotoText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      showsHorizontalScrollIndicator={false}
                    />
                    
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={() => uploadImages('after')}
                      disabled={uploading}
                    >
                      <Text style={styles.uploadButtonText}>
                        {uploading ? '업로드 중...' : `${selectedAfterPhotos.length}개 사진 업로드`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}
            
            {/* 업로드된 사진들 */}
            {job.afterPhotos && job.afterPhotos.length > 0 ? (
              <View style={styles.uploadedPhotosContainer}>
                <Text style={styles.uploadedPhotosTitle}>업로드된 사진 ({job.afterPhotos.length}개)</Text>
                <FlatList
                  data={job.afterPhotos}
                  horizontal
                  keyExtractor={(item, index) => `after_${index}`}
                  renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={styles.photo} />
                  )}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            ) : (
              <Text style={styles.noPhotoText}>업로드된 사진이 없습니다</Text>
            )}
          </View>

          {job.workerNotes && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>작업 메모</Text>
              <Text style={styles.value}>{job.workerNotes}</Text>
            </View>
          )}
        </ScrollView>

        {/* 액션 버튼들 */}
        <View style={styles.actionContainer}>
          {job.status === 'scheduled' && (
            <TouchableOpacity style={styles.startButton} onPress={handleStartJob}>
              <Text style={styles.buttonText}>청소 시작</Text>
            </TouchableOpacity>
          )}
          
          {job.status === 'in_progress' && (
            <TouchableOpacity style={styles.completeButton} onPress={handleCompleteJob}>
              <Text style={styles.buttonText}>청소 완료</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2a5298',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoButton: {
    backgroundColor: '#2a5298',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedPhotosContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  selectedPhotosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedPhotoItem: {
    position: 'relative',
    marginRight: 8,
  },
  selectedPhoto: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#34c759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadedPhotosContainer: {
    marginTop: 12,
  },
  uploadedPhotosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noPhotoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#34c759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JobDetailsScreen;