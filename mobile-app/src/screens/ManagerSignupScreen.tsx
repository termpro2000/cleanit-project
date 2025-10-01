import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import app from '../firebase';
import { User, Company } from '../../../shared/types';

const { width, height } = Dimensions.get('window');

const auth = getAuth(app);
const db = getFirestore(app);

// FormInput 컴포넌트를 외부로 분리하여 리렌더링 최적화
const FormInput = React.memo(({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  showPassword,
  onTogglePassword,
  icon,
  multiline = false,
  editable = true
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  icon: string;
  multiline?: boolean;
  editable?: boolean;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && styles.multilineWrapper]}>
      <Text style={styles.inputIcon}>{icon}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry && !showPassword}
        editable={editable}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {secureTextEntry && onTogglePassword && (
        <TouchableOpacity style={styles.eyeButton} onPress={onTogglePassword}>
          <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
));

const ManagerSignupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // 선택 필드
  const [companyName, setCompanyName] = useState(''); // 선택 필드
  const [companyAddress, setCompanyAddress] = useState(''); // 선택 필드
  const [businessNumber, setBusinessNumber] = useState(''); // 선택 필드
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateUserId = (userId: string) => {
    const userIdRegex = /^[a-zA-Z0-9_]{4,20}$/;
    return userIdRegex.test(userId);
  };

  const validateEmail = (email: string) => {
    if (!email) return true; // 선택 필드이므로 빈 값도 허용
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone.replace(/[^0-9]/g, ''));
  };

  const handleSignup = async () => {
    // 필수 필드 validation (ID, password, 담당자명, 전화번호)
    if (!userId || !password || !confirmPassword || !name || !phone) {
      Alert.alert('입력 오류', '필수 필드를 모두 채워주세요.\n(ID, 비밀번호, 담당자명, 전화번호)');
      return;
    }
    
    if (!validateUserId(userId)) {
      Alert.alert('입력 오류', 'ID는 4-20자의 영문, 숫자, 언더스코어(_)만 사용 가능합니다.');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (!validatePhone(phone)) {
      Alert.alert('입력 오류', '유효한 전화번호를 입력해주세요. (10-11자리 숫자)');
      return;
    }

    // 선택 필드 validation (이메일이 입력된 경우만)
    if (email && !validateEmail(email)) {
      Alert.alert('입력 오류', '유효한 이메일 주소를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. 임시 이메일로 Firebase 인증 사용자 생성 (ID 기반 인증을 위한 우회)
      // 참고: Firebase Auth가 이메일 중복을 자동으로 확인하므로 별도 ID 중복 확인 불필요
      const tempEmail = `${userId}@cleanit.temp`;
      const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, password);
      const user = userCredential.user;

      // 2. Company 정보 저장 (선택 필드가 있는 경우만)
      let companyId = null;
      if (companyName || companyAddress || businessNumber) {
        const newCompany = {
          name: companyName || '',
          address: companyAddress || '',
          phone: phone,
          businessNumber: businessNumber || '',
          workerCount: 0,
          buildingCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          managerId: user.uid,
        };
        const companyRef = await addDoc(collection(db, 'companies'), newCompany);
        companyId = companyRef.id;
      }

      // 3. Manager user 정보를 Firestore에 저장 (사용자 ID를 문서 ID로 사용)
      const newUser: User = {
        id: userId, // 사용자가 입력한 ID
        firebaseUid: user.uid, // Firebase UID는 별도 저장
        role: 'manager',
        name: name,
        email: email || '', // 선택 필드
        phone: phone,
        isActive: true,
        createdAt: new Date(),
        companyId: companyId,
      };
      
      // 사용자 ID를 문서 ID로 사용하여 저장
      await setDoc(doc(db, 'users', userId), newUser);
      
      // Firebase Auth 사용자와 우리 사용자 ID 매핑 저장
      await setDoc(doc(db, 'userMappings', user.uid), {
        userId: userId,
        createdAt: new Date()
      });

      Alert.alert('회원가입 성공', 'Manager 계정이 성공적으로 생성되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      let errorMessage = '회원가입에 실패했습니다.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = '이미 사용 중인 ID입니다. 다른 ID를 사용해주세요.';
          break;
        case 'auth/weak-password':
          errorMessage = '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'ID 형식이 올바르지 않습니다.';
          break;
        case 'permission-denied':
        case 'insufficient-permissions':
          errorMessage = '권한이 부족합니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          errorMessage = error.message || '회원가입에 실패했습니다.';
      }
      
      Alert.alert('회원가입 실패', errorMessage);
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>관리업체 회원가입</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Icon Section */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.mainIcon}>🏢</Text>
              </View>
              <Text style={styles.subtitle}>청소 관리업체 계정을 생성하여</Text>
              <Text style={styles.subtitle}>직원과 건물을 효율적으로 관리하세요</Text>
            </View>

            {/* Required Information Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>⭐ 필수 정보</Text>
              <View style={styles.formContainer}>
                <FormInput
                  label="로그인 ID"
                  value={userId}
                  onChangeText={setUserId}
                  placeholder="4-20자 영문, 숫자, _ 사용"
                  autoCapitalize="none"
                  icon="🆔"
                  editable={!loading}
                />

                <FormInput
                  label="비밀번호"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="최소 6자 이상 입력"
                  secureTextEntry={true}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  icon="🔒"
                  editable={!loading}
                />

                <FormInput
                  label="비밀번호 확인"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="비밀번호를 다시 입력"
                  secureTextEntry={true}
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                  icon="✅"
                  editable={!loading}
                />

                <FormInput
                  label="담당자명"
                  value={name}
                  onChangeText={setName}
                  placeholder="담당자 이름을 입력하세요"
                  autoCapitalize="words"
                  icon="👨‍💼"
                  editable={!loading}
                />

                <FormInput
                  label="전화번호"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="010-1234-5678"
                  keyboardType="phone-pad"
                  icon="📱"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Optional Information Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>📝 선택 정보</Text>
              <View style={styles.formContainer}>
                <FormInput
                  label="이메일 (선택)"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@company.com (선택사항)"
                  keyboardType="email-address"
                  icon="📧"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Company Information Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>🏢 업체정보 (선택)</Text>
              <View style={styles.formContainer}>
                <FormInput
                  label="업체명 (선택)"
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="청소업체 이름 (선택사항)"
                  autoCapitalize="words"
                  icon="🏬"
                  editable={!loading}
                />

                <FormInput
                  label="사업자등록번호 (선택)"
                  value={businessNumber}
                  onChangeText={setBusinessNumber}
                  placeholder="123-45-67890 (선택사항)"
                  keyboardType="numeric"
                  icon="📄"
                  editable={!loading}
                />

                <FormInput
                  label="사업장 주소 (선택)"
                  value={companyAddress}
                  onChangeText={setCompanyAddress}
                  placeholder="상세 주소 (선택사항)"
                  autoCapitalize="words"
                  icon="📍"
                  multiline={true}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Terms Section */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsTitle}>📋 필수 입력 정보</Text>
              <Text style={styles.termsText}>
                ⭐ 필수: ID, 비밀번호, 담당자명, 전화번호{'\n'}
                📝 선택: 이메일, 업체정보{'\n\n'}
                • 서비스 이용약관 동의{'\n'}
                • 개인정보 처리방침 동의
              </Text>
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.signupButtonText}>회원가입 완료</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginLinkText}>이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>로그인하기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        
        {/* Bottom Safe Area */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2a5298',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomSafeArea: {
    backgroundColor: '#f8f9fa',
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainIcon: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    paddingLeft: 4,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    minHeight: 56,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 15,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 18,
  },
  multilineInput: {
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  eyeButton: {
    padding: 5,
  },
  eyeIcon: {
    fontSize: 18,
  },
  termsContainer: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e67e22',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  signupButton: {
    backgroundColor: '#2a5298',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signupButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0.1,
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  loginLink: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
  },
});

export default ManagerSignupScreen;
