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
import { getFirestore, collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Building } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  Dashboard: undefined;
  BuildingRegistration: undefined;
  BuildingDetails: { buildingId: string };
  BuildingEdit: { buildingId: string };
};

type BuildingManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BuildingStats {
  totalBuildings: number;
  activeBuildings: number;
  inactiveBuildings: number;
  newBuildings: number;
  totalFloors: number;
  totalArea: number;
}

const BuildingManagementScreen: React.FC = () => {
  const navigation = useNavigation<BuildingManagementScreenNavigationProp>();
  const [buildings, setBuildings] = useState<(Building & { id: string })[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<(Building & { id: string })[]>([]);
  const [stats, setStats] = useState<BuildingStats>({
    totalBuildings: 0,
    activeBuildings: 0,
    inactiveBuildings: 0,
    newBuildings: 0,
    totalFloors: 0,
    totalArea: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadBuildings();
  }, []);

  useEffect(() => {
    filterBuildings();
  }, [buildings, searchText, selectedFilter]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      const buildingsQuery = query(collection(db, 'buildings'));
      const buildingsSnapshot = await getDocs(buildingsQuery);
      const buildingsData = buildingsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Building & { id: string }));

      setBuildings(buildingsData);

      // Calculate stats
      const totalBuildings = buildingsData.length;
      const activeBuildings = buildingsData.filter(b => b && b.isActive !== false).length;
      const inactiveBuildings = totalBuildings - activeBuildings;
      
      const newBuildings = buildingsData.filter(b => {
        try {
          const createdDate = b.createdAt?.toDate ? b.createdAt.toDate() : null;
          if (!createdDate) return false;
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return createdDate > oneWeekAgo;
        } catch (error) {
          return false;
        }
      }).length;

      const totalFloors = buildingsData.reduce((sum, building) => {
        if (building && building.floors && typeof building.floors.total === 'number') {
          return sum + building.floors.total;
        }
        return sum;
      }, 0);

      const totalArea = buildingsData.reduce((sum, building) => {
        // area 필드가 없으므로 기본값 0으로 설정
        return sum + 0;
      }, 0);

      setStats({
        totalBuildings,
        activeBuildings,
        inactiveBuildings,
        newBuildings,
        totalFloors,
        totalArea
      });

    } catch (error) {
      console.error('건물 데이터 로드 실패:', error);
      Alert.alert('오류', '건물 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterBuildings = () => {
    let filtered = buildings;

    // Filter by status
    if (selectedFilter === 'active') {
      filtered = filtered.filter(building => building.isActive !== false);
    } else if (selectedFilter === 'inactive') {
      filtered = filtered.filter(building => building.isActive === false);
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(building => 
        building.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        building.address?.toLowerCase().includes(searchText.toLowerCase()) ||
        building.contact?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        building.contact?.phone?.includes(searchText)
      );
    }

    setFilteredBuildings(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBuildings();
    setRefreshing(false);
  };

  const toggleBuildingStatus = async (buildingId: string, currentStatus: boolean | undefined) => {
    try {
      const newStatus = !currentStatus;
      const buildingRef = doc(db, 'buildings', buildingId);
      await updateDoc(buildingRef, {
        isActive: newStatus,
        updatedAt: new Date()
      });
      
      Alert.alert('완료', `건물이 ${newStatus ? '활성화' : '비활성화'}되었습니다.`);
      await loadBuildings();
    } catch (error) {
      console.error('건물 상태 변경 실패:', error);
      Alert.alert('오류', '건물 상태 변경에 실패했습니다.');
    }
  };

  const deleteBuilding = async (buildingId: string, buildingName: string) => {
    Alert.alert(
      '건물 삭제',
      `${buildingName} 건물을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'buildings', buildingId));
              Alert.alert('완료', '건물이 삭제되었습니다.');
              await loadBuildings();
            } catch (error) {
              console.error('건물 삭제 실패:', error);
              Alert.alert('오류', '건물 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, unit, color, icon }: { 
    title: string; 
    value: number; 
    unit?: string; 
    color: string; 
    icon: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <Text style={styles.statIcon}>{icon}</Text>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue}>
            {unit === 'm²' ? `${value.toLocaleString()}${unit}` : 
             unit ? `${value}${unit}` : value}
          </Text>
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

  const BuildingCard = ({ building }: { building: Building & { id: string } }) => {
    const isActive = building.isActive !== false;
    
    return (
      <View style={styles.buildingCard}>
        <View style={styles.buildingHeader}>
          <View style={styles.buildingInfo}>
            <Text style={styles.buildingName}>{building.name}</Text>
            <Text style={styles.buildingAddress}>{building.address}</Text>
            <View style={styles.buildingDetails}>
              <Text style={styles.buildingDetailText}>
                {building.floors ? `${building.floors.total}층 (지하${building.floors.basement}층 + 지상${building.floors.ground}층)` : '층수 미상'}
              </Text>
            </View>
            {building.contact && (
              <Text style={styles.buildingManager}>
                담당자: {building.contact.name} ({building.contact.phone})
              </Text>
            )}
          </View>
          <View style={styles.buildingStatus}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: isActive ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {isActive ? '활성' : '비활성'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.buildingActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.detailButton]}
            onPress={() => navigation.navigate('BuildingDetails', { buildingId: building.id })}
          >
            <Text style={styles.actionButtonText}>상세보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('BuildingEdit', { buildingId: building.id })}
          >
            <Text style={styles.actionButtonText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, isActive ? styles.deactivateButton : styles.activateButton]}
            onPress={() => toggleBuildingStatus(building.id, isActive)}
          >
            <Text style={styles.actionButtonText}>
              {isActive ? '비활성화' : '활성화'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteBuilding(building.id, building.name || '알 수 없음')}
          >
            <Text style={styles.actionButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>건물 데이터를 불러오는 중...</Text>
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
            <Text style={styles.headerTitle}>건물 관리</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('BuildingRegistration')}
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
            <Text style={styles.sectionTitle}>건물 현황</Text>
            <View style={styles.statsGrid}>
              <StatCard title="총 건물" value={stats.totalBuildings} unit="개" color="#2196F3" icon="🏢" />
              <StatCard title="활성 건물" value={stats.activeBuildings} unit="개" color="#4CAF50" icon="✅" />
              <StatCard title="비활성 건물" value={stats.inactiveBuildings} unit="개" color="#F44336" icon="❌" />
              <StatCard title="신규 등록" value={stats.newBuildings} unit="개" color="#FF9800" icon="🆕" />
            </View>
            <View style={styles.statsGrid}>
              <StatCard title="총 층수" value={stats.totalFloors} unit="층" color="#9C27B0" icon="🏗️" />
              <StatCard title="총 면적" value={stats.totalArea} unit="m²" color="#009688" icon="📐" />
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <Text style={styles.sectionTitle}>건물 검색</Text>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="건물명, 주소, 담당자명으로 검색"
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

          {/* Buildings List */}
          <View style={styles.buildingsContainer}>
            <Text style={styles.sectionTitle}>
              건물 목록 ({filteredBuildings.length}개)
            </Text>
            {filteredBuildings.length > 0 ? (
              filteredBuildings.map((building) => (
                <BuildingCard key={building.id} building={building} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏢</Text>
                <Text style={styles.emptyText}>
                  {searchText || selectedFilter !== 'all' 
                    ? '조건에 맞는 건물이 없습니다' 
                    : '등록된 건물이 없습니다'
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
    marginBottom: 10,
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
    fontSize: 20,
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
  buildingsContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  buildingCard: {
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
  buildingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  buildingAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buildingDetails: {
    marginBottom: 4,
  },
  buildingDetailText: {
    fontSize: 12,
    color: '#999',
  },
  buildingManager: {
    fontSize: 12,
    color: '#666',
  },
  buildingStatus: {
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
  buildingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  detailButton: {
    backgroundColor: '#2196F3',
  },
  editButton: {
    backgroundColor: '#9C27B0',
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
    fontSize: 11,
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

export default BuildingManagementScreen;