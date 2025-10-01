import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import app from '../firebase';
import { User } from '../../../shared/types';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);

type RootStackParamList = {
  ManagerDashboard: undefined;
};

type UserManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserWithId extends User {
  id: string;
}

interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'client' | 'worker';
  phone: string;
  isActive: boolean;
}

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation<UserManagementScreenNavigationProp>();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'worker',
    phone: '',
    isActive: true
  });
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'manager' | 'client' | 'worker'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = collection(db, 'users');
      const querySnapshot = await getDocs(usersQuery);
      
      const usersList: UserWithId[] = [];
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as UserWithId;
        usersList.push(userData);
      });

      // 생성일자 순으로 정렬
      usersList.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date();
        const bTime = b.createdAt?.toDate?.() || new Date();
        return bTime.getTime() - aTime.getTime();
      });

      setUsers(usersList);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      Alert.alert('오류', '사용자 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'worker',
      phone: '',
      isActive: true
    });
    setModalVisible(true);
  };

  const handleEditUser = (user: UserWithId) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive !== false
    });
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('입력 오류', '이름과 이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      if (editingUser) {
        // 사용자 수정
        const userRef = doc(db, 'users', editingUser.id);
        await updateDoc(userRef, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          isActive: formData.isActive,
          updatedAt: new Date()
        });
        Alert.alert('성공', '사용자 정보가 수정되었습니다.');
      } else {
        // 새 사용자 추가
        await addDoc(collection(db, 'users'), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          isActive: formData.isActive,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        Alert.alert('성공', '새 사용자가 추가되었습니다.');
      }

      setModalVisible(false);
      await loadUsers();
    } catch (error) {
      console.error('사용자 저장 실패:', error);
      Alert.alert('오류', '사용자 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user: UserWithId) => {
    Alert.alert(
      '사용자 삭제',
      `${user.name} 사용자를 정말 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.id));
              Alert.alert('성공', '사용자가 삭제되었습니다.');
              await loadUsers();
            } catch (error) {
              console.error('사용자 삭제 실패:', error);
              Alert.alert('오류', '사용자 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (user: UserWithId) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isActive: !user.isActive,
        updatedAt: new Date()
      });
      await loadUsers();
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      Alert.alert('오류', '사용자 상태 변경에 실패했습니다.');
    }
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchText.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesRole;
    });
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'manager': return '매니저';
      case 'client': return '고객';
      case 'worker': return '직원';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#ff5722';
      case 'manager': return '#2196f3';
      case 'client': return '#4caf50';
      case 'worker': return '#ff9800';
      default: return '#666';
    }
  };

  const UserCard = ({ user }: { user: UserWithId }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
            <Text style={styles.roleText}>{getRoleText(user.role)}</Text>
          </View>
        </View>
        
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.phone && <Text style={styles.userPhone}>📞 {user.phone}</Text>}
        
        <View style={styles.userMeta}>
          <View style={[styles.statusBadge, { backgroundColor: user.isActive ? '#4caf50' : '#f44336' }]}>
            <Text style={styles.statusText}>{user.isActive ? '활성' : '비활성'}</Text>
          </View>
          <Text style={styles.dateText}>
            가입: {user.createdAt?.toDate?.().toLocaleDateString() || '정보 없음'}
          </Text>
        </View>
      </View>
      
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: user.isActive ? '#ff9800' : '#4caf50' }]}
          onPress={() => handleToggleStatus(user)}
        >
          <Ionicons 
            name={user.isActive ? 'pause' : 'play'} 
            size={16} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
          onPress={() => handleEditUser(user)}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
        
        {user.id !== currentUser?.uid && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#f44336' }]}
            onPress={() => handleDeleteUser(user)}
          >
            <Ionicons name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>사용자 목록을 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>사용자 관리</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddUser}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="이름 또는 이메일 검색..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {['all', 'admin', 'manager', 'client', 'worker'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.filterButton,
                  filterRole === role && styles.filterButtonActive
                ]}
                onPress={() => setFilterRole(role as typeof filterRole)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterRole === role && styles.filterButtonTextActive
                ]}>
                  {role === 'all' ? '전체' : getRoleText(role)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* User List */}
        <FlatList
          data={getFilteredUsers()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserCard user={item} />}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2a5298']}
              tintColor="#2a5298"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>사용자가 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                새 사용자를 추가해보세요
              </Text>
            </View>
          }
        />

        {/* User Form Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingUser ? '사용자 수정' : '새 사용자 추가'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>이름</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    placeholder="사용자 이름"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>이메일</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    placeholder="이메일 주소"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>역할</Text>
                  <View style={styles.roleContainer}>
                    {['admin', 'manager', 'client', 'worker'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          formData.role === role && styles.roleOptionActive
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, role: role as typeof prev.role }))}
                      >
                        <Text style={[
                          styles.roleOptionText,
                          formData.role === role && styles.roleOptionTextActive
                        ]}>
                          {getRoleText(role)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>전화번호</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.phone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                    placeholder="전화번호"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  >
                    <View style={[styles.checkbox, formData.isActive && styles.checkboxActive]}>
                      {formData.isActive && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>활성 상태</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveUser}
                >
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  userActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  roleOptionActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#666',
  },
  roleOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#2a5298',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default UserManagementScreen;