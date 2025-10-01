import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app from '../firebase';
import { User, Building, Job } from '../../../shared/types';

const db = getFirestore(app);
const auth = getAuth(app);

type RootStackParamList = {
  Dashboard: undefined;
};

type WorkerAssignmentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WorkerAssignmentScreen: React.FC = () => {
  const navigation = useNavigation<WorkerAssignmentScreenNavigationProp>();
  const [workers, setWorkers] = useState<(User & { id: string })[]>([]);
  const [buildings, setBuildings] = useState<(Building & { id: string })[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 직원 데이터 로드
      const workersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'worker')
      );
      const workersSnapshot = await getDocs(workersQuery);
      const workersData = workersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (User & { id: string })[];
      setWorkers(workersData);

      // 건물 데이터 로드
      const buildingsSnapshot = await getDocs(collection(db, 'buildings'));
      const buildingsData = buildingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Building & { id: string })[];
      setBuildings(buildingsData);

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignJob = async () => {
    if (!selectedWorkerId || !selectedBuildingId) {
      Alert.alert('선택 오류', '직원과 건물을 모두 선택해주세요.');
      return;
    }

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

    if (!selectedWorker || !selectedBuilding) {
      Alert.alert('오류', '선택한 직원 또는 건물을 찾을 수 없습니다.');
      return;
    }

    setAssigning(true);

    try {
      const newJob: Omit<Job, 'id'> = {
        buildingId: selectedBuildingId,
        workerId: selectedWorkerId,
        companyId: selectedWorker.workerInfo?.companyId || 'default-company',
        scheduledAt: Timestamp.now(),
        status: 'scheduled',
        areas: Array.isArray(selectedBuilding.cleaningAreas) ? selectedBuilding.cleaningAreas : [],
        beforePhotos: [],
        afterPhotos: [],
        completionRate: 0,
        isVisible: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'jobs'), newJob);
      
      Alert.alert(
        '할당 완료',
        `${selectedWorker.name} 직원에게 ${selectedBuilding.name} 청소 작업이 할당되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => {
              setSelectedWorkerId(null);
              setSelectedBuildingId(null);
            }
          }
        ]
      );

    } catch (error) {
      console.error('작업 할당 실패:', error);
      Alert.alert('할당 실패', '작업 할당에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setAssigning(false);
    }
  };

  const WorkerCard = ({ worker, isSelected }: { worker: User & { id: string }, isSelected: boolean }) => (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={() => setSelectedWorkerId(worker.id)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardIcon}>👷</Text>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, isSelected && styles.selectedText]}>
            {worker.name}
          </Text>
          <Text style={[styles.cardSubtitle, isSelected && styles.selectedSubtext]}>
            📧 {worker.email}
          </Text>
          <Text style={[styles.cardSubtitle, isSelected && styles.selectedSubtext]}>
            📱 {worker.phone}
          </Text>
          {worker.workerInfo?.experience && (
            <Text style={[styles.cardSubtitle, isSelected && styles.selectedSubtext]}>
              💼 경력: {worker.workerInfo.experience}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const BuildingCard = ({ building, isSelected }: { building: Building & { id: string }, isSelected: boolean }) => (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={() => setSelectedBuildingId(building.id)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardIcon}>🏢</Text>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, isSelected && styles.selectedText]}>
            {building.name}
          </Text>
          <Text style={[styles.cardSubtitle, isSelected && styles.selectedSubtext]}>
            📍 {building.address}
          </Text>
          <Text style={[styles.cardSubtitle, isSelected && styles.selectedSubtext]}>
            🏗️ {building.floors.basement + building.floors.ground}층 건물
          </Text>
          <Text style={[styles.cardSubtitle, isSelected && styles.selectedSubtext]}>
            🧹 청소 영역: {Array.isArray(building.cleaningAreas) ? building.cleaningAreas.join(', ') : '정보 없음'}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeAreaTop} edges={['top']} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backButton}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>작업 할당</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>작업 할당</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[styles.progressCircle, selectedWorkerId && styles.progressCircleActive]}>
                <Text style={[styles.progressNumber, selectedWorkerId && styles.progressNumberActive]}>1</Text>
              </View>
              <Text style={styles.progressLabel}>직원 선택</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressCircle, selectedBuildingId && styles.progressCircleActive]}>
                <Text style={[styles.progressNumber, selectedBuildingId && styles.progressNumberActive]}>2</Text>
              </View>
              <Text style={styles.progressLabel}>건물 선택</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressCircle, selectedWorkerId && selectedBuildingId && styles.progressCircleActive]}>
                <Text style={[styles.progressNumber, selectedWorkerId && selectedBuildingId && styles.progressNumberActive]}>3</Text>
              </View>
              <Text style={styles.progressLabel}>할당 완료</Text>
            </View>
          </View>

          {/* Worker Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👷 직원 선택</Text>
            <Text style={styles.sectionSubtitle}>청소 작업을 수행할 직원을 선택하세요</Text>
            
            {workers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>등록된 직원이 없습니다</Text>
              </View>
            ) : (
              workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  isSelected={selectedWorkerId === worker.id}
                />
              ))
            )}
          </View>

          {/* Building Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 건물 선택</Text>
            <Text style={styles.sectionSubtitle}>청소할 건물을 선택하세요</Text>
            
            {buildings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏢</Text>
                <Text style={styles.emptyText}>등록된 건물이 없습니다</Text>
              </View>
            ) : (
              buildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  isSelected={selectedBuildingId === building.id}
                />
              ))
            )}
          </View>

          {/* Assignment Button */}
          <TouchableOpacity
            style={[
              styles.assignButton,
              (!selectedWorkerId || !selectedBuildingId || assigning) && styles.assignButtonDisabled
            ]}
            onPress={handleAssignJob}
            disabled={!selectedWorkerId || !selectedBuildingId || assigning}
          >
            {assigning ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.assignButtonText}>작업 할당하기</Text>
            )}
          </TouchableOpacity>

          {/* Help Section */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>💡 도움말</Text>
            <Text style={styles.helpText}>
              • 직원과 건물을 선택한 후 '작업 할당하기'를 누르세요{'\n'}
              • 할당된 작업은 해당 직원의 작업 목록에 나타납니다{'\n'}
              • 작업 상태는 '작업 관리' 메뉴에서 확인할 수 있습니다
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Safe Area */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeAreaTop: {
    backgroundColor: '#2a5298',
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
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bottomSafeArea: {
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e1e8ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCircleActive: {
    backgroundColor: '#2a5298',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
  },
  progressNumberActive: {
    color: '#ffffff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e1e8ed',
    marginHorizontal: 10,
    marginBottom: 32,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#2a5298',
    backgroundColor: '#f0f4ff',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedText: {
    color: '#2a5298',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  selectedSubtext: {
    color: '#2a5298',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a5298',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
  assignButton: {
    backgroundColor: '#2a5298',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  assignButtonDisabled: {
    backgroundColor: '#ccc',
  },
  assignButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  helpContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default WorkerAssignmentScreen;