import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import app from '../firebase';
import { Building } from '../../../shared/types';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);

type RootStackParamList = {
  BuildingList: undefined;
};

type BuildingRegistrationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BuildingFormData {
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  basementFloors: string;
  groundFloors: string;
  hasElevator: boolean;
  hasParking: boolean;
  parkingSpaces: string;
  cleaningAreas: string;
  specialNotes: string;
}

const BuildingRegistrationScreen: React.FC = () => {
  const navigation = useNavigation<BuildingRegistrationScreenNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BuildingFormData>({
    name: '',
    address: '',
    contactName: '',
    contactPhone: '',
    contactAddress: '',
    basementFloors: '',
    groundFloors: '',
    hasElevator: false,
    hasParking: false,
    parkingSpaces: '',
    cleaningAreas: '',
    specialNotes: ''
  });

  const [errors, setErrors] = useState<Partial<BuildingFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<BuildingFormData> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = '건물명을 입력해주세요';
    }

    if (!formData.address.trim()) {
      newErrors.address = '건물 주소를 입력해주세요';
    }

    if (!formData.contactName.trim()) {
      newErrors.contactName = '담당자 이름을 입력해주세요';
    }

    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = '담당자 전화번호를 입력해주세요';
    } else if (!/^[0-9\-+\s()]{10,}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
      newErrors.contactPhone = '올바른 전화번호를 입력해주세요';
    }

    if (!formData.contactAddress.trim()) {
      newErrors.contactAddress = '담당자 주소를 입력해주세요';
    }

    if (!formData.basementFloors.trim()) {
      newErrors.basementFloors = '지하층 수를 입력해주세요';
    } else if (isNaN(Number(formData.basementFloors)) || Number(formData.basementFloors) < 0) {
      newErrors.basementFloors = '올바른 숫자를 입력해주세요';
    }

    if (!formData.groundFloors.trim()) {
      newErrors.groundFloors = '지상층 수를 입력해주세요';
    } else if (isNaN(Number(formData.groundFloors)) || Number(formData.groundFloors) <= 0) {
      newErrors.groundFloors = '1층 이상의 숫자를 입력해주세요';
    }

    if (formData.hasParking && !formData.parkingSpaces.trim()) {
      newErrors.parkingSpaces = '주차 가능 대수를 입력해주세요';
    }

    if (!formData.cleaningAreas.trim()) {
      newErrors.cleaningAreas = '청소 영역을 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterBuilding = async () => {
    if (!validateForm()) {
      Alert.alert('입력 오류', '필수 항목을 모두 올바르게 입력해주세요.');
      return;
    }

    if (!user) {
      Alert.alert('오류', '로그인된 사용자가 없습니다.');
      return;
    }

    setLoading(true);

    try {
      const newBuilding: Omit<Building, 'id'> = {
        name: formData.name,
        address: formData.address,
        contact: {
          name: formData.contactName,
          phone: formData.contactPhone,
          address: formData.contactAddress,
        },
        floors: {
          basement: parseInt(formData.basementFloors),
          ground: parseInt(formData.groundFloors),
          total: parseInt(formData.basementFloors) + parseInt(formData.groundFloors),
          hasElevator: formData.hasElevator,
        },
        parking: {
          available: formData.hasParking,
          ...(formData.hasParking && formData.parkingSpaces && { spaces: parseInt(formData.parkingSpaces) }),
        },
        ownerId: user.uid,
        cleaningAreas: formData.cleaningAreas.split(',').map(area => area.trim()),
        ...(formData.specialNotes && { specialNotes: formData.specialNotes }),
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'buildings'), newBuilding);
      
      Alert.alert(
        '등록 완료',
        '새 건물이 성공적으로 등록되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error: any) {
      console.error('건물 등록 실패:', error);
      Alert.alert('등록 실패', '건물 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof BuildingFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const ToggleButton = ({ 
    label, 
    value, 
    onPress, 
    trueText = '있음', 
    falseText = '없음' 
  }: { 
    label: string; 
    value: boolean; 
    onPress: () => void; 
    trueText?: string; 
    falseText?: string; 
  }) => (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.toggleButton, value && styles.toggleButtonActive]}
        onPress={onPress}
      >
        <Text style={[styles.toggleButtonText, value && styles.toggleButtonTextActive]}>
          {value ? trueText : falseText}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
            <Text style={styles.headerTitle}>건물 등록</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <KeyboardAvoidingView 
          style={styles.content} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Building Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏢 건물 기본 정보</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>건물명 *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="건물명을 입력하세요"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>건물 주소 *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.address && styles.inputError]}
                  placeholder="건물의 전체 주소를 입력하세요"
                  value={formData.address}
                  onChangeText={(value) => updateFormData('address', value)}
                  multiline
                  numberOfLines={3}
                />
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👤 담당자 정보</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>담당자 이름 *</Text>
                <TextInput
                  style={[styles.input, errors.contactName && styles.inputError]}
                  placeholder="담당자 이름을 입력하세요"
                  value={formData.contactName}
                  onChangeText={(value) => updateFormData('contactName', value)}
                  autoCapitalize="words"
                />
                {errors.contactName && <Text style={styles.errorText}>{errors.contactName}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>담당자 전화번호 *</Text>
                <TextInput
                  style={[styles.input, errors.contactPhone && styles.inputError]}
                  placeholder="010-1234-5678"
                  value={formData.contactPhone}
                  onChangeText={(value) => updateFormData('contactPhone', value)}
                  keyboardType="phone-pad"
                />
                {errors.contactPhone && <Text style={styles.errorText}>{errors.contactPhone}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>담당자 주소 *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.contactAddress && styles.inputError]}
                  placeholder="담당자 주소를 입력하세요"
                  value={formData.contactAddress}
                  onChangeText={(value) => updateFormData('contactAddress', value)}
                  multiline
                  numberOfLines={3}
                />
                {errors.contactAddress && <Text style={styles.errorText}>{errors.contactAddress}</Text>}
              </View>
            </View>

            {/* Building Structure */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏗️ 건물 구조</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>지하층 수 *</Text>
                <TextInput
                  style={[styles.input, errors.basementFloors && styles.inputError]}
                  placeholder="지하층이 없으면 0을 입력하세요"
                  value={formData.basementFloors}
                  onChangeText={(value) => updateFormData('basementFloors', value)}
                  keyboardType="numeric"
                />
                {errors.basementFloors && <Text style={styles.errorText}>{errors.basementFloors}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>지상층 수 *</Text>
                <TextInput
                  style={[styles.input, errors.groundFloors && styles.inputError]}
                  placeholder="지상층 수를 입력하세요"
                  value={formData.groundFloors}
                  onChangeText={(value) => updateFormData('groundFloors', value)}
                  keyboardType="numeric"
                />
                {errors.groundFloors && <Text style={styles.errorText}>{errors.groundFloors}</Text>}
              </View>

              <ToggleButton
                label="엘리베이터 유무"
                value={formData.hasElevator}
                onPress={() => updateFormData('hasElevator', !formData.hasElevator)}
              />
            </View>

            {/* Facilities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚗 부대시설</Text>
              
              <ToggleButton
                label="주차장 유무"
                value={formData.hasParking}
                onPress={() => updateFormData('hasParking', !formData.hasParking)}
              />

              {formData.hasParking && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>주차 가능 대수 *</Text>
                  <TextInput
                    style={[styles.input, errors.parkingSpaces && styles.inputError]}
                    placeholder="주차 가능한 차량 대수를 입력하세요"
                    value={formData.parkingSpaces}
                    onChangeText={(value) => updateFormData('parkingSpaces', value)}
                    keyboardType="numeric"
                  />
                  {errors.parkingSpaces && <Text style={styles.errorText}>{errors.parkingSpaces}</Text>}
                </View>
              )}
            </View>

            {/* Cleaning Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧹 청소 관련 정보</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>청소 영역 *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.cleaningAreas && styles.inputError]}
                  placeholder="로비, 화장실, 계단, 복도 등 (쉼표로 구분)"
                  value={formData.cleaningAreas}
                  onChangeText={(value) => updateFormData('cleaningAreas', value)}
                  multiline
                  numberOfLines={3}
                />
                {errors.cleaningAreas && <Text style={styles.errorText}>{errors.cleaningAreas}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>특별 지시사항</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="특별한 청소 요구사항이나 주의사항을 입력하세요"
                  value={formData.specialNotes}
                  onChangeText={(value) => updateFormData('specialNotes', value)}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegisterBuilding}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.registerButtonText}>건물 등록</Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>📝 등록 안내</Text>
              <Text style={styles.infoText}>
                • 모든 필수 항목(*)을 정확히 입력해주세요{'\n'}
                • 건물 정보는 등록 후 수정할 수 있습니다{'\n'}
                • 청소 영역은 쉼표(,)로 구분하여 입력하세요{'\n'}
                • 담당자 정보는 청소 일정 조율에 사용됩니다
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bottomSafeArea: {
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 5,
    marginLeft: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  toggleButtonActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  registerButton: {
    backgroundColor: '#2a5298',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default BuildingRegistrationScreen;