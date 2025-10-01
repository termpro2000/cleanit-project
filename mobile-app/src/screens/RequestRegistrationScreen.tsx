import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList
} from 'react-native';
import { getFirestore, collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import app from '../firebase';
import { Request, RequestType, RequestPriority, Building } from '../../../shared/types';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const db = getFirestore(app);
const storage = getStorage(app);

const RequestRegistrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<(Building & { id: string })[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [requestType, setRequestType] = useState<RequestType | ''>('');
  const [priority, setPriority] = useState<RequestPriority | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  // const [focusedField, setFocusedField] = useState<string | null>(null); // 제거 - 포커스 루프 문제 해결

  useEffect(() => {
    loadBuildings();
    requestPermissions();
  }, []);

  const loadBuildings = async () => {
    try {
      if (!user) return;

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
    } catch (error) {
      console.error('건물 목록 로드 실패:', error);
      Alert.alert('오류', '건물 목록을 불러올 수 없습니다.');
    } finally {
      setLoadingBuildings(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진을 업로드하려면 갤러리 접근 권한이 필요합니다.');
      }
    }
  };

  const handlePickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos(prevPhotos => [...prevPhotos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '사진을 선택할 수 없습니다.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      '사진 삭제',
      '이 사진을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', onPress: () => {
            setPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
          }
        },
      ],
      { cancelable: true }
    );
  };

  const validateInputs = () => {
    if (!buildingId) {
      Alert.alert('입력 오류', '건물을 선택해주세요.');
      return false;
    }
    if (!requestType) {
      Alert.alert('입력 오류', '요청 유형을 선택해주세요.');
      return false;
    }
    if (!priority) {
      Alert.alert('입력 오류', '우선순위를 선택해주세요.');
      return false;
    }
    if (!title.trim()) {
      Alert.alert('입력 오류', '요청 제목을 입력해주세요.');
      return false;
    }
    if (!content.trim()) {
      Alert.alert('입력 오류', '상세 내용을 입력해주세요.');
      return false;
    }
    return true;
  };

  const findAdminUser = async () => {
    try {
      const adminQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        return adminSnapshot.docs[0].id; // 첫 번째 admin 사용자 ID 반환
      }
      return null;
    } catch (error) {
      console.error('Admin 사용자 찾기 실패:', error);
      return null;
    }
  };

  const handleRegisterRequest = async () => {
    if (!user) {
      Alert.alert('오류', '로그인된 사용자가 없습니다.');
      return;
    }

    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      const uploadedPhotoUrls: string[] = [];
      
      if (photos.length > 0) {
        for (const photoUri of photos) {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          const filename = `public/requests/${user.uid}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);
          uploadedPhotoUrls.push(downloadURL);
        }
      }

      // Admin 사용자 찾기
      const adminId = await findAdminUser();
      
      const newRequestData = {
        buildingId: buildingId,
        requesterId: user.uid,
        type: requestType as RequestType,
        priority: priority as RequestPriority,
        title: title.trim(),
        content: content.trim(),
        photos: uploadedPhotoUrls,
        assignedTo: {
          adminId: adminId // admin에게 자동 할당
        },
        status: 'pending' as const,
        approvedByAdmin: false, // admin 승인 대기
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      if (location.trim()) {
        (newRequestData as any).location = location.trim();
      }

      await addDoc(collection(db, 'requests'), newRequestData);
      
      Alert.alert(
        '요청 등록 성공! 🎉',
        '요청이 성공적으로 등록되었습니다.\n시스템 관리자가 검토 후 작업자를 배정합니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      console.error('Request registration error:', error);
      Alert.alert('요청 등록 실패', '요청 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeText = (type: RequestType) => {
    switch (type) {
      case 'general': return '일반 요청';
      case 'additional': return '추가 요청';
      case 'urgent': return '긴급 요청';
      case 'special': return '특별 요청';
      default: return type;
    }
  };

  const getPriorityText = (priority: RequestPriority) => {
    switch (priority) {
      case 'normal': return '보통';
      case 'high': return '높음';
      case 'urgent': return '긴급';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: RequestPriority) => {
    switch (priority) {
      case 'normal': return '#34c759';
      case 'high': return '#ff9500';
      case 'urgent': return '#ff3b30';
      default: return '#666';
    }
  };

  if (loadingBuildings) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>건물 목록을 불러오는 중...</Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>요청 등록</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* 폼 카드 */}
            <View style={styles.formCard}>
              {/* 건물 선택 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*건물 선택</Text>
                <View style={styles.buildingSelectorContainer}>
                  <Ionicons name="business-outline" size={20} color={buildingId ? '#2a5298' : '#999'} style={styles.inputIcon} />
                  <ScrollView style={styles.buildingSelector} nestedScrollEnabled={false} keyboardShouldPersistTaps="handled">
                    {buildings.length === 0 ? (
                      <Text style={styles.noBuildingsText}>등록된 건물이 없습니다. 건물을 먼저 등록해주세요.</Text>
                    ) : (
                      buildings.map((building) => (
                        <TouchableOpacity
                          key={building.id}
                          style={[
                            styles.buildingOption,
                            buildingId === building.id && styles.buildingOptionSelected
                          ]}
                          onPress={() => setBuildingId(building.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.buildingOptionText,
                            buildingId === building.id && styles.buildingOptionTextSelected
                          ]}>
                            {building.name}
                          </Text>
                          <Text style={[
                            styles.buildingOptionAddress,
                            buildingId === building.id && styles.buildingOptionAddressSelected
                          ]}>
                            {building.address}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>

              {/* 요청 유형 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*요청 유형</Text>
                <View style={styles.buttonGrid}>
                  {(['general', 'additional', 'urgent', 'special'] as RequestType[]).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        requestType === type && styles.typeButtonSelected
                      ]}
                      onPress={() => setRequestType(type)}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        requestType === type && styles.typeButtonTextSelected
                      ]}>
                        {getRequestTypeText(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 우선순위 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*우선순위</Text>
                <View style={styles.buttonGrid}>
                  {(['normal', 'high', 'urgent'] as RequestPriority[]).map(prio => (
                    <TouchableOpacity
                      key={prio}
                      style={[
                        styles.priorityButton,
                        priority === prio && {
                          backgroundColor: getPriorityColor(prio),
                          borderColor: getPriorityColor(prio)
                        }
                      ]}
                      onPress={() => setPriority(prio)}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        priority === prio && styles.priorityButtonTextSelected
                      ]}>
                        {getPriorityText(prio)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 제목 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*요청 제목</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="간단한 제목을 입력해주세요"
                    value={title}
                    onChangeText={setTitle}
                    // onFocus/onBlur 제거 - 포커스 루프 문제 해결
                  />
                </View>
              </View>

              {/* 내용 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*상세 내용</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <Ionicons name="create-outline" size={20} color="#666" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 4 }]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="요청 내용을 자세히 설명해주세요"
                    value={content}
                    onChangeText={setContent}
                    // onFocus/onBlur 제거 - 포커스 루프 문제 해결
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* 위치 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>건물 내 위치 (선택)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="예: 3층 사무실, 로비, 화장실 등"
                    value={location}
                    onChangeText={setLocation}
                    // onFocus/onBlur 제거 - 포커스 루프 문제 해결
                  />
                </View>
              </View>

              {/* 사진 첨부 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>사진 첨부 (선택)</Text>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                  <Ionicons name="camera-outline" size={24} color="#2a5298" />
                  <Text style={styles.photoButtonText}>사진 추가</Text>
                </TouchableOpacity>
                
                {photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={styles.photosTitle}>첨부된 사진 ({photos.length}장)</Text>
                    <FlatList
                      data={photos}
                      horizontal
                      keyExtractor={(item, index) => `photo_${index}`}
                      renderItem={({ item, index }) => (
                        <View style={styles.photoItem}>
                          <Image source={{ uri: item }} style={styles.photoPreview} />
                          <TouchableOpacity 
                            style={styles.removePhotoButton}
                            onPress={() => handleRemovePhoto(index)}
                          >
                            <Ionicons name="close" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                      showsHorizontalScrollIndicator={false}
                    />
                  </View>
                )}
              </View>

              {/* 안내 메시지 */}
              <View style={styles.infoContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#666" />
                <Text style={styles.infoText}>*표시된 항목은 필수 입력 사항입니다.</Text>
              </View>
            </View>
          </ScrollView>

          {/* 버튼 영역 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleRegisterRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.submitButtonText}>요청 등록</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  inputWrapperFocused: {
    borderColor: '#2a5298',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    minHeight: 100,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  buildingSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    maxHeight: 150,
  },
  buildingSelector: {
    flex: 1,
    maxHeight: 130,
  },
  noBuildingsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  buildingOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  buildingOptionSelected: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  buildingOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buildingOptionTextSelected: {
    color: '#fff',
  },
  buildingOptionAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buildingOptionAddressSelected: {
    color: '#e8f4fd',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  priorityButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  priorityButtonTextSelected: {
    color: '#fff',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 2,
    borderColor: '#2a5298',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a5298',
    marginLeft: 8,
  },
  photosContainer: {
    marginTop: 16,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  photoItem: {
    position: 'relative',
    marginRight: 8,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  submitButton: {
    backgroundColor: '#2a5298',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
});

export default RequestRegistrationScreen;
