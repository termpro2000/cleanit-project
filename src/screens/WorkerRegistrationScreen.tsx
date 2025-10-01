import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
// Firebase auth imports removed - using custom auth
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User } from '../../../shared/types';

const db = getFirestore(app);


type RootStackParamList = {
  WorkerManagement: undefined;
};

type WorkerRegistrationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface WorkerFormData {
  name: string;
  email: string;
  phone: string;
  emergencyPhone: string;
  bankName: string;
  accountNumber: string;
  address: string;
  experience: string;
  specialSkills: string;
}

const WorkerRegistrationScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<WorkerRegistrationScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WorkerFormData>({
    name: '',
    email: '',
    phone: '',
    emergencyPhone: '',
    bankName: '',
    accountNumber: '',
    address: '',
    experience: '',
    specialSkills: ''
  });

  const [errors, setErrors] = useState<Partial<WorkerFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<WorkerFormData> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요';
    } else if (!/^[0-9\-+\s()]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = '올바른 전화번호를 입력해주세요';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = '은행명을 입력해주세요';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = '계좌번호를 입력해주세요';
    }

    if (!formData.address.trim()) {
      newErrors.address = '주소를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateTemporaryPassword = (): string => {
    // Generate a temporary 8-character password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(usersQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('이메일 중복 확인 실패:', error);
      return false;
    }
  };

  const getManagerCompanyId = async (): Promise<string | null> => {
    try {
      // Using user from useAuth hook
      if (!user) return null;

      // Check userMappings first
      const mappingDoc = await getDoc(doc(db, 'userMappings', user.uid));
      let userId = user.uid;
      
      if (mappingDoc.exists()) {
        userId = mappingDoc.data().userId;
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        return userData.managerInfo?.companyId || null;
      }
      
      return null;
    } catch (error) {
      console.error('매니저 회사 ID 조회 실패:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('입력 오류', '필수 항목을 모두 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        Alert.alert('등록 실패', '이미 등록된 이메일입니다.');
        setLoading(false);
        return;
      }

      // Get manager's company ID
      const companyId = await getManagerCompanyId();
      if (!companyId) {
        Alert.alert('등록 실패', '매니저의 회사 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      // Generate temporary password
      const tempPassword = generateTemporaryPassword();

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, tempPassword);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const userData: Omit<User, 'id'> = {
        role: 'worker',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        emergencyPhone: formData.emergencyPhone || undefined,
        isActive: true,
        isVerified: false,
        workerInfo: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          companyId: companyId,
          address: formData.address,
          experience: formData.experience || undefined,
          specialSkills: formData.specialSkills || undefined,
          joinDate: new Date(),
          rating: 0,
          completedJobs: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add user to Firestore
      const userDocRef = await addDoc(collection(db, 'users'), userData);

      // Create user mapping
      await addDoc(collection(db, 'userMappings'), {
        firebaseUid: firebaseUser.uid,
        userId: userDocRef.id,
        createdAt: new Date()
      });

      Alert.alert(
        '등록 완료',
        `직원이 성공적으로 등록되었습니다.\n\n임시 비밀번호: ${tempPassword}\n\n직원에게 이메일과 임시 비밀번호를 전달해주세요. 최초 로그인 후 비밀번호를 변경하도록 안내해주세요.`,
        [
          {
            text: '확인',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error: any) {
      console.error('직원 등록 실패:', error);
      
      let errorMessage = '직원 등록에 실패했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바르지 않은 이메일 형식입니다.';
      }
      
      Alert.alert('등록 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof WorkerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

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
            <Text style={styles.headerTitle}>직원 등록</Text>
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
            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 기본 정보</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>이름 *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="직원 이름을 입력하세요"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>이메일 *</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="example@email.com"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>전화번호 *</Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChangeText={(value) => updateFormData('phone', value)}
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>비상 연락처</Text>
                <TextInput
                  style={styles.input}
                  placeholder="010-9876-5432"
                  value={formData.emergencyPhone}
                  onChangeText={(value) => updateFormData('emergencyPhone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>주소 *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.address && styles.inputError]}
                  placeholder="거주지 주소를 입력하세요"
                  value={formData.address}
                  onChangeText={(value) => updateFormData('address', value)}
                  multiline
                  numberOfLines={3}
                />
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>
            </View>

            {/* Banking Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💳 급여 정보</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>은행명 *</Text>
                <TextInput
                  style={[styles.input, errors.bankName && styles.inputError]}
                  placeholder="예: 국민은행, 신한은행"
                  value={formData.bankName}
                  onChangeText={(value) => updateFormData('bankName', value)}
                />
                {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>계좌번호 *</Text>
                <TextInput
                  style={[styles.input, errors.accountNumber && styles.inputError]}
                  placeholder="계좌번호를 입력하세요"
                  value={formData.accountNumber}
                  onChangeText={(value) => updateFormData('accountNumber', value)}
                  keyboardType="numeric"
                />
                {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
              </View>
            </View>

            {/* Additional Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔧 추가 정보</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>경력 사항</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="청소 관련 경력이나 이전 직장 경험을 입력하세요"
                  value={formData.experience}
                  onChangeText={(value) => updateFormData('experience', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>특기 및 자격증</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="특별한 기술이나 자격증이 있다면 입력하세요"
                  value={formData.specialSkills}
                  onChangeText={(value) => updateFormData('specialSkills', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.registerButtonText}>직원 등록</Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>📝 등록 안내</Text>
              <Text style={styles.infoText}>
                • 직원 등록 시 임시 비밀번호가 생성됩니다{'\n'}
                • 생성된 이메일과 비밀번호를 직원에게 전달해주세요{'\n'}
                • 직원은 최초 로그인 후 비밀번호를 변경해야 합니다{'\n'}
                • 모든 필수 항목(*)을 입력해주세요
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

export default WorkerRegistrationScreen;