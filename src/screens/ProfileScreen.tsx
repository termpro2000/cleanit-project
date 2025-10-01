import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import app from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../../../shared/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const db = getFirestore(app);

type RootStackParamList = {
  ChangePassword: undefined;
  Dashboard: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      console.log('Current user status:', user ? 'Logged in' : 'Not logged in');
      console.log('User ID:', user?.uid);
      
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      try {
        console.log('Attempting to fetch user profile from Firestore...');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setUserProfile(userData);
        } else {
          // Use custom auth user info
          setUserProfile({
            id: user.uid,
            email: user.email || '',
            name: user.name || '사용자',
            role: user.role || 'worker',
            createdAt: new Date()
          } as User);
        }
      } catch (firestoreError) {
        console.error('Firestore Error Details:', firestoreError);
        console.warn('Firestore 프로필 로드 실패, 사용자 정보 사용:', firestoreError);
        // Use custom auth user info on error
        setUserProfile({
          id: user.uid,
          email: user.email || '',
          name: user.name || user.email?.split('@')[0] || '사용자',
          role: user.role || 'worker',
          createdAt: new Date()
        } as User);
      }
    } catch (error) {
      Alert.alert('오류', '프로필 정보를 불러오는데 실패했습니다.');
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a5298" />
        <Text style={styles.loadingText}>프로필 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>프로필 정보를 불러올 수 없습니다.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>내 프로필</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>👤</Text>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userProfile.name}</Text>
            <Text style={styles.userEmail}>{userProfile.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {userProfile.role === 'manager' ? '관리자' : 
                 userProfile.role === 'worker' ? '직원' : '고객'}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>이메일</Text>
            <Text style={styles.detailValue}>{userProfile.email}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>이름</Text>
            <Text style={styles.detailValue}>{userProfile.name}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>역할</Text>
            <Text style={styles.detailValue}>
              {userProfile.role === 'manager' ? '관리자' : 
               userProfile.role === 'worker' ? '직원' : '고객'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>가입일</Text>
            <Text style={styles.detailValue}>
              {userProfile.createdAt ? 
                new Date(userProfile.createdAt).toLocaleDateString() : 
                '정보 없음'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionText}>비밀번호 변경</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bottomSafeArea: {
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2a5298',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#2a5298',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    fontSize: 40,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#2a5298',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  detailLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    margin: 20,
    marginTop: 0,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  actionArrow: {
    fontSize: 18,
    color: '#7f8c8d',
  },
});

export default ProfileScreen;