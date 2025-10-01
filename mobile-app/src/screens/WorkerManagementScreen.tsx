import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  Dashboard: undefined;
  WorkerRegistration: undefined;
  WorkerDetails: { workerId: string };
};

type WorkerManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  inactiveWorkers: number;
  newWorkers: number;
}

const WorkerManagementScreen: React.FC = () => {
  const navigation = useNavigation<WorkerManagementScreenNavigationProp>();
  const [workers, setWorkers] = useState<User[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<User[]>([]);
  const [stats, setStats] = useState<WorkerStats>({
    totalWorkers: 0,
    activeWorkers: 0,
    inactiveWorkers: 0,
    newWorkers: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [workers, searchText, selectedFilter]);

  const loadWorkers = async () => {
    try {
      const workersQuery = query(collection(db, 'users'), where('role', '==', 'worker'));
      const workersSnapshot = await getDocs(workersQuery);
      const workersData = workersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as User));

      setWorkers(workersData);

      // Calculate stats
      const totalWorkers = workersData.length;
      const activeWorkers = workersData.filter(w => w.isActive).length;
      const inactiveWorkers = totalWorkers - activeWorkers;
      const newWorkers = workersData.filter(w => {
        const createdDate = w.createdAt?.toDate();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return createdDate && createdDate > oneWeekAgo;
      }).length;

      setStats({
        totalWorkers,
        activeWorkers,
        inactiveWorkers,
        newWorkers
      });

    } catch (error) {
      console.error('직원 데이터 로드 실패:', error);
      Alert.alert('오류', '직원 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let filtered = workers;

    // Filter by status
    if (selectedFilter === 'active') {
      filtered = filtered.filter(worker => worker.isActive);
    } else if (selectedFilter === 'inactive') {
      filtered = filtered.filter(worker => !worker.isActive);
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(worker => 
        worker.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        worker.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        worker.phoneNumber?.includes(searchText)
      );
    }

    setFilteredWorkers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const toggleWorkerStatus = async (workerId: string, currentStatus: boolean) => {
    try {
      const workerRef = doc(db, 'users', workerId);
      await updateDoc(workerRef, {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      Alert.alert('완료', `직원 상태가 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`);
      await loadWorkers();
    } catch (error) {
      console.error('직원 상태 변경 실패:', error);
      Alert.alert('오류', '직원 상태 변경에 실패했습니다.');
    }
  };

  const deleteWorker = async (workerId: string, workerName: string) => {
    Alert.alert(
      '직원 삭제',
      `${workerName} 직원을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', workerId));
              Alert.alert('완료', '직원이 삭제되었습니다.');
              await loadWorkers();
            } catch (error) {
              console.error('직원 삭제 실패:', error);
              Alert.alert('오류', '직원 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <Text style={styles.statIcon}>{icon}</Text>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );

  const FilterButton = ({ title, isSelected, onPress }: { title: string; isSelected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextSelected]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const WorkerCard = ({ worker }: { worker: User }) => (
    <View style={styles.workerCard}>
      <View style={styles.workerHeader}>
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.workerEmail}>{worker.email}</Text>
          <Text style={styles.workerPhone}>{worker.phoneNumber}</Text>
        </View>
        <View style={styles.workerStatus}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: worker.isActive ? '#4CAF50' : '#F44336' }
          ]}>
            <Text style={styles.statusText}>
              {worker.isActive ? '활성' : '비활성'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.workerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.detailButton]}
          onPress={() => navigation.navigate('WorkerDetails', { workerId: worker.id })}
        >
          <Text style={styles.actionButtonText}>상세보기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, worker.isActive ? styles.deactivateButton : styles.activateButton]}
          onPress={() => toggleWorkerStatus(worker.id, worker.isActive)}
        >
          <Text style={styles.actionButtonText}>
            {worker.isActive ? '비활성화' : '활성화'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteWorker(worker.id, worker.name || '알 수 없음')}
        >
          <Text style={styles.actionButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>직원 데이터를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>직원 관리</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('WorkerRegistration')}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Statistics */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>직원 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard title="총 직원" value={stats.totalWorkers} color="#2196F3" icon="👥" />
              <StatCard title="활성 직원" value={stats.activeWorkers} color="#4CAF50" icon="✅" />
              <StatCard title="비활성 직원" value={stats.inactiveWorkers} color="#F44336" icon="❌" />
              <StatCard title="신규 직원" value={stats.newWorkers} color="#FF9800" icon="🆕" />
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <Text style={styles.sectionTitle}>직원 검색</Text>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="이름, 이메일, 전화번호로 검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            
            <View style={styles.filterContainer}>
              <FilterButton
                title="전체"
                isSelected={selectedFilter === 'all'}
                onPress={() => setSelectedFilter('all')}
              />
              <FilterButton
                title="활성"
                isSelected={selectedFilter === 'active'}
                onPress={() => setSelectedFilter('active')}
              />
              <FilterButton
                title="비활성"
                isSelected={selectedFilter === 'inactive'}
                onPress={() => setSelectedFilter('inactive')}
              />
            </View>
          </View>

          {/* Workers List */}
          <View style={styles.workersContainer}>
            <Text style={styles.sectionTitle}>
              직원 목록 ({filteredWorkers.length}명)
            </Text>
            {filteredWorkers.length > 0 ? (
              filteredWorkers.map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>
                  {searchText || selectedFilter !== 'all' 
                    ? '조건에 맞는 직원이 없습니다' 
                    : '등록된 직원이 없습니다'
                  }
                </Text>
              </View>
            )}
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomSafeArea: {
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 20,
  },
  statsContainer: {
    marginTop: -10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    marginTop: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  filterButtonSelected: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextSelected: {
    color: '#ffffff',
  },
  workersContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  workerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  workerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  workerPhone: {
    fontSize: 14,
    color: '#666',
  },
  workerStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  workerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  detailButton: {
    backgroundColor: '#2196F3',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default WorkerManagementScreen;