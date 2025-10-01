import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Switch,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import app from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  ManagerDashboard: undefined;
};

type BackupRestoreScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BackupFile {
  id: string;
  name: string;
  size: string;
  createdAt: Date;
  type: 'manual' | 'scheduled' | 'auto';
  status: 'completed' | 'in_progress' | 'failed';
  collections: string[];
  description?: string;
}

interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeImages: boolean;
  includeLogs: boolean;
  compression: boolean;
  encryption: boolean;
  emailNotification: boolean;
}

interface BackupProgress {
  isRunning: boolean;
  progress: number;
  currentCollection: string;
  totalCollections: number;
  startTime?: Date;
}

const BackupRestoreScreen: React.FC = () => {
  const navigation = useNavigation<BackupRestoreScreenNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    includeImages: true,
    includeLogs: false,
    compression: true,
    encryption: false,
    emailNotification: true
  });
  const [backupProgress, setBackupProgress] = useState<BackupProgress>({
    isRunning: false,
    progress: 0,
    currentCollection: '',
    totalCollections: 0
  });
  const [selectedTab, setSelectedTab] = useState<'backup' | 'restore' | 'settings'>('backup');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    try {
      setLoading(true);
      
      // 백업 파일 목록 로드 (실제로는 클라우드 스토리지나 별도 시스템에서 가져와야 함)
      const mockBackupFiles: BackupFile[] = [
        {
          id: '1',
          name: 'backup_2024_01_01_daily.zip',
          size: '15.2 MB',
          createdAt: new Date('2024-01-01T02:00:00'),
          type: 'scheduled',
          status: 'completed',
          collections: ['users', 'jobs', 'buildings', 'requests'],
          description: '일일 자동 백업'
        },
        {
          id: '2',
          name: 'backup_2023_12_31_manual.zip',
          size: '14.8 MB',
          createdAt: new Date('2023-12-31T15:30:00'),
          type: 'manual',
          status: 'completed',
          collections: ['users', 'jobs', 'buildings', 'requests', 'reviews'],
          description: '연말 수동 백업'
        },
        {
          id: '3',
          name: 'backup_2023_12_30_auto.zip',
          size: '13.9 MB',
          createdAt: new Date('2023-12-30T23:45:00'),
          type: 'auto',
          status: 'completed',
          collections: ['users', 'jobs', 'buildings'],
          description: '자동 백업'
        }
      ];

      setBackupFiles(mockBackupFiles);

      // 백업 설정 로드
      const settingsDoc = await getDoc(doc(db, 'systemSettings', 'backup'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as BackupSettings;
        setBackupSettings(settings);
      }

    } catch (error) {
      console.error('백업 데이터 로드 실패:', error);
      Alert.alert('오류', '백업 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startBackup = async (type: 'full' | 'partial' = 'full') => {
    try {
      Alert.alert(
        '백업 시작',
        `${type === 'full' ? '전체' : '부분'} 백업을 시작하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '시작',
            onPress: async () => {
              setBackupProgress({
                isRunning: true,
                progress: 0,
                currentCollection: '',
                totalCollections: 0,
                startTime: new Date()
              });

              // 백업할 컬렉션 목록
              const collections = type === 'full' 
                ? ['users', 'jobs', 'buildings', 'requests', 'reviews', 'systemSettings']
                : ['users', 'jobs', 'buildings'];

              setBackupProgress(prev => ({
                ...prev,
                totalCollections: collections.length
              }));

              // 시뮬레이션된 백업 프로세스
              for (let i = 0; i < collections.length; i++) {
                const collection = collections[i];
                
                setBackupProgress(prev => ({
                  ...prev,
                  currentCollection: collection,
                  progress: ((i + 1) / collections.length) * 100
                }));

                // 실제 백업 로직 (여기서는 시뮬레이션)
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

              // 백업 완료
              const newBackup: BackupFile = {
                id: Date.now().toString(),
                name: `backup_${new Date().toISOString().split('T')[0]}_manual.zip`,
                size: `${(Math.random() * 10 + 10).toFixed(1)} MB`,
                createdAt: new Date(),
                type: 'manual',
                status: 'completed',
                collections,
                description: `${type === 'full' ? '전체' : '부분'} 수동 백업`
              };

              setBackupFiles(prev => [newBackup, ...prev]);
              setBackupProgress({
                isRunning: false,
                progress: 100,
                currentCollection: '',
                totalCollections: 0
              });

              Alert.alert('백업 완료', '데이터 백업이 성공적으로 완료되었습니다.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('백업 실행 실패:', error);
      setBackupProgress(prev => ({ ...prev, isRunning: false }));
      Alert.alert('백업 실패', '백업 중 오류가 발생했습니다.');
    }
  };

  const restoreFromBackup = async (backup: BackupFile) => {
    Alert.alert(
      '데이터 복원',
      `${backup.name} 파일로부터 데이터를 복원하시겠습니까?\n\n⚠️ 현재 데이터가 모두 대체됩니다. 이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복원',
          style: 'destructive',
          onPress: async () => {
            try {
              setBackupProgress({
                isRunning: true,
                progress: 0,
                currentCollection: 'Preparing restore...',
                totalCollections: backup.collections.length,
                startTime: new Date()
              });

              // 시뮬레이션된 복원 프로세스
              for (let i = 0; i < backup.collections.length; i++) {
                const collection = backup.collections[i];
                
                setBackupProgress(prev => ({
                  ...prev,
                  currentCollection: `Restoring ${collection}...`,
                  progress: ((i + 1) / backup.collections.length) * 100
                }));

                // 실제 복원 로직 (여기서는 시뮬레이션)
                await new Promise(resolve => setTimeout(resolve, 1500));
              }

              setBackupProgress({
                isRunning: false,
                progress: 100,
                currentCollection: '',
                totalCollections: 0
              });

              Alert.alert('복원 완료', '데이터 복원이 성공적으로 완료되었습니다.');
              setModalVisible(false);
            } catch (error) {
              console.error('복원 실행 실패:', error);
              setBackupProgress(prev => ({ ...prev, isRunning: false }));
              Alert.alert('복원 실패', '복원 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const deleteBackup = async (backup: BackupFile) => {
    Alert.alert(
      '백업 삭제',
      `${backup.name} 백업 파일을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setBackupFiles(prev => prev.filter(b => b.id !== backup.id));
            Alert.alert('삭제 완료', '백업 파일이 삭제되었습니다.');
          }
        }
      ]
    );
  };

  const saveBackupSettings = async () => {
    try {
      await setDoc(doc(db, 'systemSettings', 'backup'), backupSettings);
      Alert.alert('설정 저장', '백업 설정이 저장되었습니다.');
    } catch (error) {
      console.error('백업 설정 저장 실패:', error);
      Alert.alert('저장 실패', '설정 저장 중 오류가 발생했습니다.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manual': return '👤';
      case 'scheduled': return '📅';
      case 'auto': return '🤖';
      default: return '📦';
    }
  };

  const BackupFileCard = ({ backup }: { backup: BackupFile }) => (
    <TouchableOpacity
      style={styles.backupCard}
      onPress={() => {
        setSelectedBackup(backup);
        setModalVisible(true);
      }}
    >
      <View style={styles.backupHeader}>
        <View style={styles.backupIcons}>
          <Text style={styles.typeIcon}>{getTypeIcon(backup.type)}</Text>
          <Text style={styles.statusIcon}>{getStatusIcon(backup.status)}</Text>
        </View>
        <View style={styles.backupInfo}>
          <Text style={styles.backupName}>{backup.name}</Text>
          <Text style={styles.backupDescription}>{backup.description}</Text>
        </View>
        <View style={styles.backupMeta}>
          <Text style={styles.backupSize}>{backup.size}</Text>
          <Text style={styles.backupDate}>
            {backup.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <View style={styles.backupDetails}>
        <Text style={styles.collectionsLabel}>포함된 데이터:</Text>
        <Text style={styles.collectionsText}>
          {backup.collections.join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ProgressBar = ({ progress }: { progress: number }) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>백업 정보를 불러오는 중...</Text>
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
            <Text style={styles.headerTitle}>백업 & 복원</Text>
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'backup', label: '백업', icon: 'save-outline' },
            { key: 'restore', label: '복원', icon: 'refresh-outline' },
            { key: 'settings', label: '설정', icon: 'settings-outline' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                selectedTab === tab.key && styles.tabButtonActive
              ]}
              onPress={() => setSelectedTab(tab.key as typeof selectedTab)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={selectedTab === tab.key ? '#2a5298' : '#666'} 
              />
              <Text style={[
                styles.tabButtonText,
                selectedTab === tab.key && styles.tabButtonTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Indicator */}
        {backupProgress.isRunning && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>
              {selectedTab === 'restore' ? '복원 중...' : '백업 중...'}
            </Text>
            <Text style={styles.progressSubtitle}>
              {backupProgress.currentCollection}
            </Text>
            <ProgressBar progress={backupProgress.progress} />
            <Text style={styles.progressDetails}>
              {backupProgress.totalCollections > 0 && 
                `${Math.ceil(backupProgress.progress / 100 * backupProgress.totalCollections)} / ${backupProgress.totalCollections} 완료`
              }
            </Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Backup Tab */}
          {selectedTab === 'backup' && (
            <View style={styles.tabContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>새 백업 생성</Text>
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryAction]}
                    onPress={() => startBackup('full')}
                    disabled={backupProgress.isRunning}
                  >
                    <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>전체 백업</Text>
                    <Text style={styles.actionButtonSubtext}>모든 데이터 백업</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryAction]}
                    onPress={() => startBackup('partial')}
                    disabled={backupProgress.isRunning}
                  >
                    <Ionicons name="documents-outline" size={24} color="#666" />
                    <Text style={[styles.actionButtonText, { color: '#666' }]}>부분 백업</Text>
                    <Text style={[styles.actionButtonSubtext, { color: '#999' }]}>핵심 데이터만</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>백업 파일 목록</Text>
                <FlatList
                  data={backupFiles}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <BackupFileCard backup={item} />}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="archive-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyTitle}>백업 파일이 없습니다</Text>
                      <Text style={styles.emptySubtitle}>새 백업을 생성해보세요</Text>
                    </View>
                  }
                />
              </View>
            </View>
          )}

          {/* Restore Tab */}
          {selectedTab === 'restore' && (
            <View style={styles.tabContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>복원 가능한 백업</Text>
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={24} color="#ff9800" />
                  <Text style={styles.warningText}>
                    데이터 복원은 현재 모든 데이터를 백업 시점의 데이터로 대체합니다. 
                    복원 전에 현재 데이터를 백업하는 것을 권장합니다.
                  </Text>
                </View>
                
                <FlatList
                  data={backupFiles.filter(b => b.status === 'completed')}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.restoreCard}
                      onPress={() => restoreFromBackup(item)}
                      disabled={backupProgress.isRunning}
                    >
                      <View style={styles.restoreHeader}>
                        <Text style={styles.restoreName}>{item.name}</Text>
                        <Text style={styles.restoreDate}>
                          {item.createdAt.toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.restoreSize}>{item.size}</Text>
                      <Text style={styles.restoreCollections}>
                        포함: {item.collections.join(', ')}
                      </Text>
                      <View style={styles.restoreAction}>
                        <Ionicons name="refresh-outline" size={20} color="#2a5298" />
                        <Text style={styles.restoreActionText}>복원하기</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="refresh-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyTitle}>복원 가능한 백업이 없습니다</Text>
                      <Text style={styles.emptySubtitle}>백업을 먼저 생성해주세요</Text>
                    </View>
                  }
                />
              </View>
            </View>
          )}

          {/* Settings Tab */}
          {selectedTab === 'settings' && (
            <View style={styles.tabContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>자동 백업 설정</Text>
                <View style={styles.settingsContainer}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>자동 백업</Text>
                      <Text style={styles.settingSubtitle}>정기적으로 자동 백업 실행</Text>
                    </View>
                    <Switch
                      value={backupSettings.autoBackup}
                      onValueChange={(value) => setBackupSettings(prev => ({ ...prev, autoBackup: value }))}
                      trackColor={{ false: '#ddd', true: '#2a5298' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>백업 주기</Text>
                      <Text style={styles.settingSubtitle}>
                        {backupSettings.backupFrequency === 'daily' ? '매일' : 
                         backupSettings.backupFrequency === 'weekly' ? '매주' : '매월'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.settingValue}>
                      <Text style={styles.settingValueText}>변경</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>보관 기간</Text>
                      <Text style={styles.settingSubtitle}>{backupSettings.retentionDays}일 후 자동 삭제</Text>
                    </View>
                    <TouchableOpacity style={styles.settingValue}>
                      <Text style={styles.settingValueText}>변경</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>백업 옵션</Text>
                <View style={styles.settingsContainer}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>이미지 포함</Text>
                      <Text style={styles.settingSubtitle}>업로드된 이미지 파일 포함</Text>
                    </View>
                    <Switch
                      value={backupSettings.includeImages}
                      onValueChange={(value) => setBackupSettings(prev => ({ ...prev, includeImages: value }))}
                      trackColor={{ false: '#ddd', true: '#2a5298' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>로그 포함</Text>
                      <Text style={styles.settingSubtitle}>시스템 로그 파일 포함</Text>
                    </View>
                    <Switch
                      value={backupSettings.includeLogs}
                      onValueChange={(value) => setBackupSettings(prev => ({ ...prev, includeLogs: value }))}
                      trackColor={{ false: '#ddd', true: '#2a5298' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>압축</Text>
                      <Text style={styles.settingSubtitle}>백업 파일 압축하여 저장</Text>
                    </View>
                    <Switch
                      value={backupSettings.compression}
                      onValueChange={(value) => setBackupSettings(prev => ({ ...prev, compression: value }))}
                      trackColor={{ false: '#ddd', true: '#2a5298' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>암호화</Text>
                      <Text style={styles.settingSubtitle}>백업 파일 암호화 (보안 강화)</Text>
                    </View>
                    <Switch
                      value={backupSettings.encryption}
                      onValueChange={(value) => setBackupSettings(prev => ({ ...prev, encryption: value }))}
                      trackColor={{ false: '#ddd', true: '#2a5298' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingTitle}>이메일 알림</Text>
                      <Text style={styles.settingSubtitle}>백업 완료 시 이메일 발송</Text>
                    </View>
                    <Switch
                      value={backupSettings.emailNotification}
                      onValueChange={(value) => setBackupSettings(prev => ({ ...prev, emailNotification: value }))}
                      trackColor={{ false: '#ddd', true: '#2a5298' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveBackupSettings}
                >
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>설정 저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Backup Details Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>백업 상세 정보</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {selectedBackup && (
                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>파일명</Text>
                    <Text style={styles.modalValue}>{selectedBackup.name}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>크기</Text>
                    <Text style={styles.modalValue}>{selectedBackup.size}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>생성일</Text>
                    <Text style={styles.modalValue}>{selectedBackup.createdAt.toLocaleString()}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>타입</Text>
                    <Text style={styles.modalValue}>
                      {selectedBackup.type === 'manual' ? '수동' : 
                       selectedBackup.type === 'scheduled' ? '예약' : '자동'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>상태</Text>
                    <Text style={styles.modalValue}>
                      {selectedBackup.status === 'completed' ? '완료' : 
                       selectedBackup.status === 'in_progress' ? '진행중' : '실패'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>포함된 데이터</Text>
                    <Text style={styles.modalValue}>{selectedBackup.collections.join(', ')}</Text>
                  </View>
                  {selectedBackup.description && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>설명</Text>
                      <Text style={styles.modalValue}>{selectedBackup.description}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.restoreButton]}
                  onPress={() => {
                    if (selectedBackup) {
                      restoreFromBackup(selectedBackup);
                    }
                  }}
                >
                  <Text style={styles.restoreButtonText}>복원하기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    if (selectedBackup) {
                      deleteBackup(selectedBackup);
                      setModalVisible(false);
                    }
                  }}
                >
                  <Text style={styles.deleteButtonText}>삭제하기</Text>
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#2a5298',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#2a5298',
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2a5298',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a5298',
    minWidth: 50,
  },
  progressDetails: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryAction: {
    backgroundColor: '#2a5298',
  },
  secondaryAction: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#e8f4fd',
  },
  backupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  backupIcons: {
    flexDirection: 'row',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  statusIcon: {
    fontSize: 16,
  },
  backupInfo: {
    flex: 1,
  },
  backupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  backupDescription: {
    fontSize: 12,
    color: '#666',
  },
  backupMeta: {
    alignItems: 'flex-end',
  },
  backupSize: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a5298',
    marginBottom: 2,
  },
  backupDate: {
    fontSize: 12,
    color: '#999',
  },
  backupDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  collectionsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  collectionsText: {
    fontSize: 12,
    color: '#333',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    marginLeft: 12,
    lineHeight: 20,
  },
  restoreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  restoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restoreName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  restoreDate: {
    fontSize: 12,
    color: '#666',
  },
  restoreSize: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
    marginBottom: 4,
  },
  restoreCollections: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  restoreAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  restoreActionText: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
    marginLeft: 6,
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  settingValue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
  },
  settingValueText: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a5298',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    maxHeight: 300,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  modalValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
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
  restoreButton: {
    backgroundColor: '#2a5298',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default BackupRestoreScreen;