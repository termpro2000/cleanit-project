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
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import app from '../firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Building, Job } from '../../../shared/types';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  BuildingManagement: undefined;
  BuildingDetails: { buildingId: string };
  BuildingEdit: { buildingId: string };
};

type BuildingDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BuildingDetailsScreenRouteProp = RouteProp<RootStackParamList, 'BuildingDetails'>;

interface BuildingStats {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  thisMonthJobs: number;
}

const BuildingDetailsScreen: React.FC = () => {
  const navigation = useNavigation<BuildingDetailsScreenNavigationProp>();
  const route = useRoute<BuildingDetailsScreenRouteProp>();
  const { buildingId } = route.params;

  const [building, setBuilding] = useState<Building | null>(null);
  const [stats, setStats] = useState<BuildingStats>({
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    thisMonthJobs: 0
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuildingDetails();
  }, [buildingId]);

  const loadBuildingDetails = async () => {
    try {
      // Load building basic info
      const buildingDoc = await getDoc(doc(db, 'buildings', buildingId));
      if (!buildingDoc.exists()) {
        Alert.alert('오류', '건물 정보를 찾을 수 없습니다.');
        navigation.goBack();
        return;
      }

      const buildingData = { id: buildingDoc.id, ...buildingDoc.data() } as Building;
      setBuilding(buildingData);

      // Load building's jobs for stats calculation
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('buildingId', '==', buildingId)
      );
      
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

      // Calculate stats
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const pendingJobs = jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress').length;

      // Calculate this month's jobs
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthJobs = jobs.filter(job => {
        const jobDate = job.createdAt?.toDate();
        return jobDate && jobDate >= thisMonthStart;
      }).length;

      setStats({
        totalJobs,
        completedJobs,
        pendingJobs,
        thisMonthJobs
      });

      // Load recent jobs (limit 5)
      const sortedJobs = jobs
        .filter(job => job.isVisible !== false)
        .sort((a, b) => {
          const dateA = a.completedAt?.toDate() || a.createdAt?.toDate() || new Date(0);
          const dateB = b.completedAt?.toDate() || b.createdAt?.toDate() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      
      setRecentJobs(sortedJobs);

    } catch (error) {
      console.error('건물 상세 정보 로드 실패:', error);
      Alert.alert('오류', '건물 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBuildingDetails();
    setRefreshing(false);
  };

  const toggleBuildingStatus = async () => {
    if (!building) return;

    try {
      const newStatus = !building.isActive;
      await updateDoc(doc(db, 'buildings', buildingId), {
        isActive: newStatus,
        updatedAt: new Date()
      });
      
      setBuilding({ ...building, isActive: newStatus });
      Alert.alert('완료', `건물이 ${newStatus ? '활성화' : '비활성화'}되었습니다.`);
    } catch (error) {
      console.error('건물 상태 변경 실패:', error);
      Alert.alert('오류', '건물 상태 변경에 실패했습니다.');
    }
  };

  const deleteBuilding = async () => {
    if (!building) return;

    Alert.alert(
      '건물 삭제',
      `${building.name} 건물을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'buildings', buildingId));
              Alert.alert('완료', '건물이 삭제되었습니다.');
              navigation.goBack();
            } catch (error) {
              console.error('건물 삭제 실패:', error);
              Alert.alert('오류', '건물 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'scheduled': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'scheduled': return '예정';
      case 'cancelled': return '취소';
      default: return '대기';
    }
  };

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>{title}</Text>
      {children}
    </View>
  );

  const MetricCard = ({ title, value, unit, color, icon }: { 
    title: string; 
    value: number | string; 
    unit?: string; 
    color: string; 
    icon: string;
  }) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>
        {`${value}${unit || ''}`}
      </Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>건물 정보를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!building) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>건물 정보를 찾을 수 없습니다.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>돌아가기</Text>
            </TouchableOpacity>
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
            <Text style={styles.headerTitle}>건물 상세정보</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('BuildingEdit', { buildingId })}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Building Basic Info */}
          <InfoCard title="기본 정보">
            <View style={styles.basicInfoContainer}>
              <View style={styles.basicInfoHeader}>
                <View style={styles.buildingNameContainer}>
                  <Text style={styles.buildingName}>{building.name || '건물명 없음'}</Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: building.isActive !== false ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Text style={styles.statusText}>
                      {building.isActive !== false ? '활성' : '비활성'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>주소:</Text>
                <Text style={styles.infoValue}>{building.address || '주소 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>층수:</Text>
                <Text style={styles.infoValue}>{building.floors?.total || building.floors ? `${building.floors}층` : '정보 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>면적:</Text>
                <Text style={styles.infoValue}>{building.area ? `${building.area}m²` : '정보 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>담당자:</Text>
                <Text style={styles.infoValue}>{building.contact?.name || '정보 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>연락처:</Text>
                <Text style={styles.infoValue}>{building.contact?.phone || '정보 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>건물유형:</Text>
                <Text style={styles.infoValue}>{building.buildingType || '정보 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>청소주기:</Text>
                <Text style={styles.infoValue}>{building.cleaningSchedule || '정보 없음'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>등록일:</Text>
                <Text style={styles.infoValue}>
                  {building.createdAt?.toDate?.()?.toLocaleDateString() || '정보 없음'}
                </Text>
              </View>
            </View>
          </InfoCard>

          {/* Building Stats */}
          <InfoCard title="작업 통계">
            <View style={styles.metricsGrid}>
              <MetricCard
                title="총 작업"
                value={stats.totalJobs}
                unit="건"
                color="#2196F3"
                icon="📊"
              />
              <MetricCard
                title="완료 작업"
                value={stats.completedJobs}
                unit="건"
                color="#4CAF50"
                icon="✅"
              />
              <MetricCard
                title="대기 작업"
                value={stats.pendingJobs}
                unit="건"
                color="#FF9800"
                icon="⏳"
              />
              <MetricCard
                title="이번 달"
                value={stats.thisMonthJobs}
                unit="건"
                color="#9C27B0"
                icon="📅"
              />
            </View>
          </InfoCard>

          {/* Recent Jobs */}
          <InfoCard title="최근 작업 내역">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobType}>{job.type || '작업'}</Text>
                    <View style={[styles.jobStatusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                      <Text style={styles.jobStatusText}>{getStatusText(job.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description || '설명 없음'}
                  </Text>
                  <Text style={styles.jobDate}>
                    {job.scheduledDate?.toDate?.()?.toLocaleDateString() || 
                     job.createdAt?.toDate?.()?.toLocaleDateString() || '날짜 미정'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>작업 내역이 없습니다</Text>
              </View>
            )}
          </InfoCard>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, building.isActive !== false ? styles.deactivateButton : styles.activateButton]}
              onPress={toggleBuildingStatus}
            >
              <Text style={styles.actionButtonText}>
                {building.isActive !== false ? '비활성화' : '활성화'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={deleteBuilding}
            >
              <Text style={styles.actionButtonText}>건물 삭제</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 18,
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
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  basicInfoContainer: {
    marginTop: 5,
  },
  basicInfoHeader: {
    marginBottom: 15,
  },
  buildingNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildingName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 70) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  jobDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2a5298',
    fontWeight: '600',
  },
});

export default BuildingDetailsScreen;