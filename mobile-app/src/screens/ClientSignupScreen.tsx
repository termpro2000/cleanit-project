import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import app from '../firebase';
import { User } from '../../../shared/types';

const auth = getAuth(app);
const db = getFirestore(app);

const ClientSignupScreen: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateInputs = () => {
    if (!userId.trim()) {
      Alert.alert('입력 오류', '사용자 ID를 입력해주세요.');
      return false;
    }
    if (userId.length < 3) {
      Alert.alert('입력 오류', '사용자 ID는 3자 이상이어야 합니다.');
      return false;
    }
    if (!password) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('입력 오류', '전화번호를 입력해주세요.');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('입력 오류', '주소를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      const tempEmail = `${userId}@cleanit.temp`;
      const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, password);
      const user = userCredential.user;

      if (user) {
        const newUser: User = {
          role: 'client',
          name: userId,
          email: tempEmail,
          phone: phone.trim(),
          emergencyPhone: emergencyPhone.trim() || undefined,
          isActive: true,
          isVerified: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          clientInfo: {
            address: address.trim(),
          },
        };
        
        await setDoc(doc(db, 'users', user.uid), newUser);
        
        Alert.alert(
          '회원가입 성공! 🎉', 
          'CleanIT에 오신 것을 환영합니다.\n이제 로그인하여 서비스를 이용해보세요!',
          [
            {
              text: '로그인 하러 가기',
              onPress: () => {
                // TODO: Navigate to login screen
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = '회원가입에 실패했습니다.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 ID입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }
      
      Alert.alert('회원가입 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Client 회원가입</Text>
          <Text style={styles.headerSubtitle}>청소 서비스를 이용하시려면 가입해주세요</Text>
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
            {/* 폼 카드 */}
            <View style={styles.formCard}>
              {/* 사용자 ID */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*사용자 ID</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'userId' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'userId' ? '#2a5298' : '#999'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="3자 이상 입력해주세요"
                    value={userId}
                    onChangeText={setUserId}
                    onFocus={() => setFocusedField('userId')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* 비밀번호 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*비밀번호</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? '#2a5298' : '#999'} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="6자 이상 입력해주세요"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 전화번호 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*전화번호</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'phone' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="call-outline" size={20} color={focusedField === 'phone' ? '#2a5298' : '#999'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="010-1234-5678"
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* 비상 전화번호 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>비상 연락처 (선택)</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'emergencyPhone' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="call-outline" size={20} color={focusedField === 'emergencyPhone' ? '#2a5298' : '#999'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="010-1234-5678"
                    value={emergencyPhone}
                    onChangeText={setEmergencyPhone}
                    onFocus={() => setFocusedField('emergencyPhone')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* 주소 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>*주소</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedField === 'address' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="location-outline" size={20} color={focusedField === 'address' ? '#2a5298' : '#999'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="청소 서비스를 받을 주소"
                    value={address}
                    onChangeText={setAddress}
                    onFocus={() => setFocusedField('address')}
                    onBlur={() => setFocusedField(null)}
                    multiline
                  />
                </View>
              </View>

              {/* 필수 필드 안내 */}
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
                styles.signupButton,
                loading && styles.signupButtonDisabled
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.signupButtonText}>회원가입</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
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
    marginBottom: 20,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
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
  signupButton: {
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
  signupButtonDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
    shadowOpacity: 0,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});

export default ClientSignupScreen;
