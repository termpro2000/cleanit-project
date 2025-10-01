import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('입력 오류', '사용자명과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      
      if (success) {
        // 로그인 성공 - AuthContext에서 자동으로 사용자 상태가 업데이트됨
        // App.tsx에서 자동으로 적절한 대시보드로 이동
      } else {
        Alert.alert('로그인 실패', '사용자명 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error: any) {
      console.error('로그인 오류:', error);
      Alert.alert('로그인 실패', '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoIcon}>🧹</Text>
                <Text style={styles.logoText}>CleanIT</Text>
              </View>
              <Text style={styles.subtitle}>전문 청소 관리 시스템</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <Text style={styles.welcomeTitle}>환영합니다</Text>
              <Text style={styles.welcomeSubtitle}>계정에 로그인하세요</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ID</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🆔</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ID를 입력하세요"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>비밀번호</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호를 입력하세요"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>로그인</Text>
                )}
              </TouchableOpacity>

              {/* Demo Credentials */}
              <View style={styles.demoContainer}>
                <Text style={styles.demoTitle}>테스트 계정</Text>
                <View style={styles.demoCredentials}>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => {
                      setUsername('admin');
                      setPassword('admin123');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.demoButtonText}>관리자</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => {
                      setUsername('manager1');
                      setPassword('manager123');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.demoButtonText}>매니저</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => {
                      setUsername('client1');
                      setPassword('client123');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.demoButtonText}>고객</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => {
                      setUsername('worker1');
                      setPassword('worker123');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.demoButtonText}>작업자</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
  },
  header: {
    backgroundColor: '#2a5298',
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 25,
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
    backgroundColor: '#ffffff',
    borderRadius: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: '#2c3e50',
  },
  loginButton: {
    backgroundColor: '#2a5298',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  demoContainer: {
    marginTop: 40,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  demoCredentials: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d5dbdb',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
  },
  bottomSafeArea: {
    backgroundColor: '#f8f9fa',
  },
});

export default LoginScreen;