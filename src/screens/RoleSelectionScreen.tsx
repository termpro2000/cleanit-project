import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the type for your root stack navigator
type RootStackParamList = {
  RoleSelection: undefined;
  ClientSignup: undefined;
  WorkerSignup: undefined; // Will be added later
  ManagerSignup: undefined; // Will be added later
};

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;

const RoleSelectionScreen: React.FC = () => {
  const navigation = useNavigation<RoleSelectionScreenNavigationProp>();

  const handleRoleSelect = (role: 'client' | 'worker' | 'manager') => {
    console.log(`Selected role: ${role}`);
    if (role === 'client') {
      navigation.navigate('ClientSignup');
    } else if (role === 'worker') {
      navigation.navigate('WorkerSignup');
    } else if (role === 'worker') {
      navigation.navigate('WorkerSignup');
    } else if (role === 'manager') {
      navigation.navigate('ManagerSignup');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Text style={styles.title}>역할을 선택해주세요</Text>
        <View style={styles.buttonContainer}>
          <Button title="Client (고객)" onPress={() => handleRoleSelect('client')} />
          <Button title="Worker (청소 작업자)" onPress={() => handleRoleSelect('worker')} />
          <Button title="Manager (청소 관리업체)" onPress={() => handleRoleSelect('manager')} />
        </View>
        <View style={styles.loginButtonContainer}>
          <Button title="이미 계정이 있으신가요? 로그인" onPress={() => navigation.navigate('Login')} />
        </View>
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
      </SafeAreaView>
    </SafeAreaProvider>
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
    marginBottom: 30,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '80%',
    gap: 15, // For React Native 0.71+ for spacing between buttons
  },
  loginButtonContainer: {
    marginTop: 20,
    width: '80%',
  },
  bottomSafeArea: {
    backgroundColor: '#ffffff',
  },
});

export default RoleSelectionScreen;
