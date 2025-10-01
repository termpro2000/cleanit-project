import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions
} from 'react-native';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import app from '../firebase';
import { Building, BuildingType } from '../../../shared/types';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

const BuildingListScreen: React.FC = () => {
  const [buildings, setBuildings] = useState<(Building & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const loadBuildings = async () => {
    try {
      if (!user) {
        Alert.alert('오류', '로그인된 사용자가 없습니다.');
        return;
      }

      const q = query(collection(db, 'buildings'), where('ownerId', '==', user.uid));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedBuildings: (Building & { id: string })[] = [];
        querySnapshot.forEach((doc) => {
          fetchedBuildings.push({ id: doc.id, ...doc.data() } as Building & { id: string });
        });
        
        // Sort buildings by creation date (newest first)
        fetchedBuildings.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.toMillis() - a.createdAt.toMillis();
          }
          return 0;
        });
        
        setBuildings(fetchedBuildings);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching buildings:', error);
        Alert.alert('오류', '건물 목록을 불러올 수 없습니다.');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up building listener:', error);
      Alert.alert('오류', '건물 목록을 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadBuildings();
    }, [])
  );

  const handleBuildingPress = (buildingId: string) => {
    navigation.navigate('BuildingDetails', { buildingId });
  };

  const handleAddBuilding = () => {
    navigation.navigate('BuildingRegistration');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBuildings();
    setRefreshing(false);
  };

  const renderBuildingItem = ({ item }: { item: Building & { id: string } }) => (
    <TouchableOpacity
      style={styles.buildingCard}
      onPress={() => handleBuildingPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.buildingHeader}>
        <View style={styles.buildingIconContainer}>
          <Ionicons name="business" size={24} color="#2a5298" />
        </View>
        <View style={styles.buildingInfo}>
          <Text style={styles.buildingName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.buildingType}>
            {(item.type === 'apartment' ? '아파트' : 
             item.type === 'office' ? '사무실' : 
             item.type === 'commercial' ? '상업시설' : 
             item.type === 'house' ? '주택' : '기타') || '건물 유형 미지정'} • {item.floors?.total || '정보없음'}층
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>

      <View style={styles.buildingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.buildingAddress} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
        
        {item.area && (
          <View style={styles.detailRow}>
            <Ionicons name="resize-outline" size={16} color="#666" />
            <Text style={styles.buildingDetailText}>
              {item.area}㎡
            </Text>
          </View>
        )}

        {item.parking?.available && (
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={16} color="#666" />
            <Text style={styles.buildingDetailText}>
              주차 가능 {item.parking.spaces ? `(${item.parking.spaces}대)` : ''}
            </Text>
          </View>
        )}
      </View>

      {item.createdAt && (
        <View style={styles.buildingFooter}>
          <Text style={styles.registrationDate}>
            등록일: {item.createdAt.toDate().toLocaleDateString('ko-KR')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>건물 목록을 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>내 건물 목록</Text>
          <Text style={styles.headerSubtitle}>
            {buildings.length > 0 ? `${buildings.length}개의 건물이 등록되어 있습니다` : '건물을 등록하여 관리를 시작하세요'}
          </Text>
        </View>

        {/* 건물 목록 */}
        {buildings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>등록된 건물이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              첫 번째 건물을 등록하여{'\n'}청소 관리를 시작해보세요
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddBuilding}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>건물 등록하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={buildings}
              renderItem={renderBuildingItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#2a5298']}
                  tintColor="#2a5298"
                />
              }
            />
            
            {/* 플로팅 추가 버튼 */}
            <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddBuilding}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  buildingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  buildingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  buildingType: {
    fontSize: 14,
    color: '#666',
  },
  buildingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  buildingAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  buildingDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  buildingFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  registrationDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: '#2a5298',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a5298',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2a5298',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default BuildingListScreen;
