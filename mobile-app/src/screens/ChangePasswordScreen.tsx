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
  StatusBar
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import app from '../firebase';



const ChangePasswordScreen: React.FC = () => {
  const { changePassword } = useAuth();
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('입력 오류', '모든 필드를 채워주세요.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('입력 오류', '새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('입력 오류', '새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      // Use custom auth change password function
      await changePassword(currentPassword, newPassword);
      Alert.alert('성공', '비밀번호가 성공적으로 변경되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      let errorMessage = '비밀번호 변경에 실패했습니다.';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = '현재 비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/weak-password':
          errorMessage = '새 비밀번호가 너무 약합니다.';
          break;
        default:
          errorMessage = error.message || '비밀번호 변경에 실패했습니다.';
      }
      
      Alert.alert('비밀번호 변경 실패', errorMessage);
      console.error('Change password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    showPassword, 
    onTogglePassword, 
    icon 
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    showPassword: boolean;
    onTogglePassword: () => void;
    icon: string;
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={onTogglePassword}>
          <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 변경</Text>
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
                <Text style={styles.mainIcon}>🔒</Text>
              </View>
              <Text style={styles.subtitle}>보안을 위해 비밀번호를 정기적으로 변경하세요</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <PasswordInput
                label="현재 비밀번호"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="현재 사용 중인 비밀번호"
                showPassword={showCurrentPassword}
                onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
                icon="🔐"
              />

              <PasswordInput
                label="새 비밀번호"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="새로운 비밀번호 (최소 6자)"
                showPassword={showNewPassword}
                onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                icon="🆕"
              />

              <PasswordInput
                label="새 비밀번호 확인"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="새 비밀번호를 다시 입력"
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                icon="✅"
              />

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>비밀번호 요구사항:</Text>
                <Text style={styles.requirementItem}>• 최소 6자 이상</Text>
                <Text style={styles.requirementItem}>• 영문, 숫자 조합 권장</Text>
                <Text style={styles.requirementItem}>• 특수문자 포함 권장</Text>
              </View>

              {/* Change Password Button */}
              <TouchableOpacity
                style={[styles.changeButton, loading && styles.changeButtonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.changeButtonText}>비밀번호 변경</Text>
                )}
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
    fontSize: 20,
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
    paddingVertical: 40,
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
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
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
  eyeButton: {
    padding: 5,
  },
  eyeIcon: {
    fontSize: 18,
  },
  requirementsContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2a5298',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a5298',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
    lineHeight: 18,
  },
  changeButton: {
    backgroundColor: '#2a5298',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  changeButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0.1,
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default ChangePasswordScreen;
