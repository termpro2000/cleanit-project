import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import app from '../firebase'; // Your Firebase app instance
import { User } from '../../../shared/types';

const auth = getAuth(app);
const db = getFirestore(app);

const WorkerSignupScreen: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleSignup = async () => {
    // Basic validation
    if (!userId || !password || !phone || !bankName || !accountNumber) {
      Alert.alert('입력 오류', '모든 필수 필드를 채워주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      // 1. Create user with temporary email format
      const tempEmail = `${userId}@cleanit.temp`;
      const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, password);
      const user = userCredential.user;

      // 2. Save additional user data to Firestore
      if (user) {
        const newUser: User = {
          role: 'worker',
          name: userId, // Use userID as name for now
          email: tempEmail,
          phone: phone,
          emergencyPhone: emergencyPhone,
          isActive: true,
          isVerified: false, // Email verification can be added later
          createdAt: new Date(), // Firestore Timestamp will convert this
          updatedAt: new Date(),
          workerInfo: {
            bankName: bankName,
            accountNumber: accountNumber, // In a real app, this should be encrypted
          },
        };
        await setDoc(doc(db, 'users', user.uid), newUser);
        Alert.alert('회원가입 성공', 'Worker 계정이 성공적으로 생성되었습니다.');
        // TODO: Navigate to next screen (e.g., Worker dashboard)
      }
    } catch (error: any) {
      Alert.alert('회원가입 실패', error.message);
      console.error('Signup error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Worker 회원가입</Text>
      <TextInput
        style={styles.input}
        placeholder="사용자 ID"
        value={userId}
        onChangeText={setUserId}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (최소 6자)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="전화번호"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="비상 전화번호 (선택 사항)"
        value={emergencyPhone}
        onChangeText={setEmergencyPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="은행명"
        value={bankName}
        onChangeText={setBankName}
      />
      <TextInput
        style={styles.input}
        placeholder="계좌번호"
        value={accountNumber}
        onChangeText={setAccountNumber}
        keyboardType="numeric"
      />
      <Button title="회원가입" onPress={handleSignup} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
});

export default WorkerSignupScreen;
