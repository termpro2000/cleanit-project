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
  Switch,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import app from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);
const { width } = Dimensions.get('window');

type RootStackParamList = {
  ManagerDashboard: undefined;
};

type SystemSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SystemSettings {
  // 앱 기본 설정
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  debugMode: boolean;
  
  // 알림 설정
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  notificationSound: boolean;
  
  // 작업 설정
  defaultJobDuration: number; // 분 단위
  autoAssignment: boolean;
  requirePhotoVerification: boolean;
  allowRescheduling: boolean;
  
  // 보안 설정
  sessionTimeout: number; // 분 단위
  passwordExpiry: number; // 일 단위
  maxLoginAttempts: number;
  twoFactorAuth: boolean;
  
  // 시스템 설정
  dataRetentionDays: number;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // 업데이트 정보
  lastUpdated: Date;
  updatedBy: string;
}

const SystemSettingsScreen: React.FC = () => {
  const navigation = useNavigation<SystemSettingsScreenNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'CleanIT',
    appVersion: '1.0.0',
    maintenanceMode: false,
    debugMode: false,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    notificationSound: true,
    defaultJobDuration: 120,
    autoAssignment: false,
    requirePhotoVerification: true,
    allowRescheduling: true,
    sessionTimeout: 30,
    passwordExpiry: 90,
    maxLoginAttempts: 5,
    twoFactorAuth: false,
    dataRetentionDays: 365,
    backupFrequency: 'daily',
    logLevel: 'info',
    lastUpdated: new Date(),
    updatedBy: ''
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<{
    key: keyof SystemSettings;
    title: string;
    value: any;
    type: 'text' | 'number' | 'select';
    options?: string[];
  } | null>(null);

  const [systemInfo, setSystemInfo] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalBuildings: 0,
    diskUsage: '2.3 GB',
    memoryUsage: '67%',
    cpuUsage: '23%',
    dbConnections: 15,
    lastBackup: new Date(),
    uptime: '15 days 7 hours'
  });

  useEffect(() => {
    loadSettings();
    loadSystemInfo();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'systemSettings', 'main'));
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({
          ...settings,
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        });
      }
    } catch (error) {
      console.error('시스템 설정 로드 실패:', error);
      Alert.alert('오류', '시스템 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      // 시스템 정보 수집
      const [usersSnapshot, jobsSnapshot, buildingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'buildings'))
      ]);

      setSystemInfo(prev => ({
        ...prev,
        totalUsers: usersSnapshot.size,
        totalJobs: jobsSnapshot.size,
        totalBuildings: buildingsSnapshot.size
      }));
    } catch (error) {
      console.error('시스템 정보 로드 실패:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsToSave = {
        ...settings,
        lastUpdated: new Date(),
        updatedBy: user?.name || user?.username || 'Unknown'
      };

      await setDoc(doc(db, 'systemSettings', 'main'), settingsToSave);
      
      setSettings(settingsToSave);
      Alert.alert('성공', '시스템 설정이 저장되었습니다.');
    } catch (error) {
      console.error('시스템 설정 저장 실패:', error);
      Alert.alert('오류', '시스템 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      '기본값 복원',
      '모든 설정을 기본값으로 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복원',
          style: 'destructive',
          onPress: () => {
            setSettings({
              appName: 'CleanIT',
              appVersion: '1.0.0',
              maintenanceMode: false,
              debugMode: false,
              pushNotifications: true,
              emailNotifications: true,
              smsNotifications: false,
              notificationSound: true,
              defaultJobDuration: 120,
              autoAssignment: false,
              requirePhotoVerification: true,
              allowRescheduling: true,
              sessionTimeout: 30,
              passwordExpiry: 90,
              maxLoginAttempts: 5,
              twoFactorAuth: false,
              dataRetentionDays: 365,
              backupFrequency: 'daily',
              logLevel: 'info',
              lastUpdated: new Date(),
              updatedBy: user?.name || 'System'
            });
            Alert.alert('완료', '기본값으로 복원되었습니다. 저장 버튼을 눌러 적용하세요.');
          }
        }
      ]
    );
  };

  const clearCache = () => {
    Alert.alert(
      '캐시 삭제',
      '시스템 캐시를 삭제하시겠습니까? 일시적으로 성능이 저하될 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: () => {
            // 캐시 삭제 로직 (실제로는 더 복잡한 구현 필요)
            setTimeout(() => {
              Alert.alert('완료', '캐시가 삭제되었습니다.');
            }, 1000);
          }
        }
      ]
    );
  };

  const runDiagnostics = () => {
    Alert.alert(
      '시스템 진단',
      '시스템 진단을 실행하시겠습니까? 진단 중에는 시스템 성능이 일시적으로 저하될 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '실행',
          onPress: () => {
            // 진단 로직 (실제로는 더 복잡한 구현 필요)
            Alert.alert('진단 시작', '시스템 진단이 백그라운드에서 실행됩니다.');
          }
        }
      ]
    );
  };

  const openSettingModal = (key: keyof SystemSettings, title: string, type: 'text' | 'number' | 'select', options?: string[]) => {
    setCurrentSetting({
      key,
      title,
      value: settings[key],
      type,
      options
    });
    setModalVisible(true);
  };

  const saveCurrentSetting = () => {
    if (currentSetting) {
      setSettings(prev => ({
        ...prev,
        [currentSetting.key]: currentSetting.value
      }));
    }
    setModalVisible(false);
    setCurrentSetting(null);
  };

  const SettingRow = ({ 
    title, 
    subtitle, 
    value, 
    onPress, 
    icon,
    type = 'navigation'
  }: {
    title: string;
    subtitle?: string;
    value?: any;
    onPress?: () => void;
    icon: string;
    type?: 'navigation' | 'switch' | 'value';
  }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={type === 'switch'}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {type === 'switch' && (
          <Switch
            value={value}
            onValueChange={(newValue) => {
              setSettings(prev => ({ ...prev, [title.toLowerCase().replace(/\s+/g, '')]: newValue }));
            }}
            trackColor={{ false: '#ddd', true: '#2a5298' }}
            thumbColor="#fff"
          />
        )}
        {type === 'value' && (
          <Text style={styles.settingValue}>{value}</Text>
        )}
        {type === 'navigation' && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SystemInfoCard = ({ title, value, icon, color }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
  }) => (
    <View style={[styles.infoCard, { borderLeftColor: color }]}>
      <View style={styles.infoContent}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <View style={styles.infoText}>
          <Text style={styles.infoValue}>{value}</Text>
          <Text style={styles.infoTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.loadingText}>시스템 설정을 불러오는 중...</Text>
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
            <Text style={styles.headerTitle}>시스템 설정</Text>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="save-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* System Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>시스템 현황</Text>
            <View style={styles.infoGrid}>
              <SystemInfoCard
                title="총 사용자"
                value={systemInfo.totalUsers}
                icon="👥"
                color="#2196f3"
              />
              <SystemInfoCard
                title="총 작업"
                value={systemInfo.totalJobs}
                icon="📋"
                color="#4caf50"
              />
              <SystemInfoCard
                title="등록 건물"
                value={systemInfo.totalBuildings}
                icon="🏢"
                color="#ff9800"
              />
              <SystemInfoCard
                title="시스템 가동시간"
                value={systemInfo.uptime}
                icon="⏱️"
                color="#9c27b0"
              />
            </View>
            
            <View style={styles.performanceContainer}>
              <Text style={styles.performanceTitle}>시스템 성능</Text>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>메모리 사용률</Text>
                <Text style={styles.performanceValue}>{systemInfo.memoryUsage}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>CPU 사용률</Text>
                <Text style={styles.performanceValue}>{systemInfo.cpuUsage}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>저장공간 사용량</Text>
                <Text style={styles.performanceValue}>{systemInfo.diskUsage}</Text>
              </View>
            </View>
          </View>

          {/* App Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>앱 설정</Text>
            <View style={styles.settingsContainer}>
              <SettingRow
                title="앱 이름"
                subtitle="애플리케이션 표시 이름"
                value={settings.appName}
                onPress={() => openSettingModal('appName', '앱 이름', 'text')}
                icon="📱"
                type="value"
              />
              <SettingRow
                title="앱 버전"
                subtitle="현재 앱 버전"
                value={settings.appVersion}
                icon="🔢"
                type="value"
              />
              <SettingRow
                title="유지보수 모드"
                subtitle="시스템 점검 중 사용자 접근 차단"
                value={settings.maintenanceMode}
                onPress={() => {}}
                icon="🔧"
                type="switch"
              />
              <SettingRow
                title="디버그 모드"
                subtitle="개발자 모드 활성화"
                value={settings.debugMode}
                onPress={() => {}}
                icon="🐛"
                type="switch"
              />
            </View>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <View style={styles.settingsContainer}>
              <SettingRow
                title="푸시 알림"
                subtitle="모바일 푸시 알림 활성화"
                value={settings.pushNotifications}
                icon="🔔"
                type="switch"
              />
              <SettingRow
                title="이메일 알림"
                subtitle="이메일 알림 발송 활성화"
                value={settings.emailNotifications}
                icon="📧"
                type="switch"
              />
              <SettingRow
                title="SMS 알림"
                subtitle="문자 메시지 알림 활성화"
                value={settings.smsNotifications}
                icon="💬"
                type="switch"
              />
              <SettingRow
                title="알림음"
                subtitle="알림 수신 시 소리 재생"
                value={settings.notificationSound}
                icon="🔊"
                type="switch"
              />
            </View>
          </View>

          {/* Job Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>작업 설정</Text>
            <View style={styles.settingsContainer}>
              <SettingRow
                title="기본 작업 시간"
                subtitle={`${settings.defaultJobDuration}분`}
                value={`${settings.defaultJobDuration}분`}
                onPress={() => openSettingModal('defaultJobDuration', '기본 작업 시간 (분)', 'number')}
                icon="⏰"
                type="value"
              />
              <SettingRow
                title="자동 할당"
                subtitle="작업자 자동 배정 활성화"
                value={settings.autoAssignment}
                icon="🎯"
                type="switch"
              />
              <SettingRow
                title="사진 확인 필수"
                subtitle="작업 전후 사진 업로드 필수"
                value={settings.requirePhotoVerification}
                icon="📸"
                type="switch"
              />
              <SettingRow
                title="일정 변경 허용"
                subtitle="작업 일정 변경 허용"
                value={settings.allowRescheduling}
                icon="📅"
                type="switch"
              />
            </View>
          </View>

          {/* Security Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>보안 설정</Text>
            <View style={styles.settingsContainer}>
              <SettingRow
                title="세션 타임아웃"
                subtitle={`${settings.sessionTimeout}분 후 자동 로그아웃`}
                value={`${settings.sessionTimeout}분`}
                onPress={() => openSettingModal('sessionTimeout', '세션 타임아웃 (분)', 'number')}
                icon="🔐"
                type="value"
              />
              <SettingRow
                title="비밀번호 만료"
                subtitle={`${settings.passwordExpiry}일마다 비밀번호 변경`}
                value={`${settings.passwordExpiry}일`}
                onPress={() => openSettingModal('passwordExpiry', '비밀번호 만료 (일)', 'number')}
                icon="🔑"
                type="value"
              />
              <SettingRow
                title="최대 로그인 시도"
                subtitle={`${settings.maxLoginAttempts}회 실패 시 계정 잠금`}
                value={`${settings.maxLoginAttempts}회`}
                onPress={() => openSettingModal('maxLoginAttempts', '최대 로그인 시도 횟수', 'number')}
                icon="🚫"
                type="value"
              />
              <SettingRow
                title="2단계 인증"
                subtitle="2단계 인증 활성화"
                value={settings.twoFactorAuth}
                icon="🛡️"
                type="switch"
              />
            </View>
          </View>

          {/* System Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>시스템 관리</Text>
            <View style={styles.settingsContainer}>
              <SettingRow
                title="데이터 보관 기간"
                subtitle={`${settings.dataRetentionDays}일 후 자동 삭제`}
                value={`${settings.dataRetentionDays}일`}
                onPress={() => openSettingModal('dataRetentionDays', '데이터 보관 기간 (일)', 'number')}
                icon="🗄️"
                type="value"
              />
              <SettingRow
                title="백업 주기"
                subtitle={`${settings.backupFrequency === 'daily' ? '매일' : settings.backupFrequency === 'weekly' ? '매주' : '매월'} 백업`}
                value={settings.backupFrequency === 'daily' ? '매일' : settings.backupFrequency === 'weekly' ? '매주' : '매월'}
                onPress={() => openSettingModal('backupFrequency', '백업 주기', 'select', ['daily', 'weekly', 'monthly'])}
                icon="💾"
                type="value"
              />
              <SettingRow
                title="로그 레벨"
                subtitle={`${settings.logLevel} 레벨 로깅`}
                value={settings.logLevel}
                onPress={() => openSettingModal('logLevel', '로그 레벨', 'select', ['error', 'warn', 'info', 'debug'])}
                icon="📄"
                type="value"
              />
            </View>
          </View>

          {/* System Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>시스템 작업</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
                <Text style={styles.actionIcon}>🗑️</Text>
                <Text style={styles.actionText}>캐시 삭제</Text>
                <Text style={styles.actionDescription}>시스템 캐시 파일 삭제</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={runDiagnostics}>
                <Text style={styles.actionIcon}>🔍</Text>
                <Text style={styles.actionText}>시스템 진단</Text>
                <Text style={styles.actionDescription}>시스템 상태 및 성능 검사</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={resetToDefaults}>
                <Text style={styles.actionIcon}>⚡</Text>
                <Text style={styles.actionText}>기본값 복원</Text>
                <Text style={styles.actionDescription}>모든 설정을 기본값으로 복원</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Updated Info */}
          <View style={styles.section}>
            <View style={styles.updateInfo}>
              <Text style={styles.updateText}>
                마지막 업데이트: {settings.lastUpdated.toLocaleString()}
              </Text>
              <Text style={styles.updateText}>
                업데이트자: {settings.updatedBy || 'System'}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{currentSetting?.title}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                {currentSetting?.type === 'text' && (
                  <TextInput
                    style={styles.modalInput}
                    value={currentSetting.value}
                    onChangeText={(text) => setCurrentSetting(prev => prev ? { ...prev, value: text } : null)}
                    placeholder={`${currentSetting.title} 입력`}
                  />
                )}
                
                {currentSetting?.type === 'number' && (
                  <TextInput
                    style={styles.modalInput}
                    value={currentSetting.value.toString()}
                    onChangeText={(text) => setCurrentSetting(prev => prev ? { ...prev, value: parseInt(text) || 0 } : null)}
                    placeholder={`${currentSetting.title} 입력`}
                    keyboardType="numeric"
                  />
                )}
                
                {currentSetting?.type === 'select' && (
                  <View style={styles.selectContainer}>
                    {currentSetting.options?.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.selectOption,
                          currentSetting.value === option && styles.selectOptionActive
                        ]}
                        onPress={() => setCurrentSetting(prev => prev ? { ...prev, value: option } : null)}
                      >
                        <Text style={[
                          styles.selectOptionText,
                          currentSetting.value === option && styles.selectOptionTextActive
                        ]}>
                          {option === 'daily' ? '매일' : option === 'weekly' ? '매주' : option === 'monthly' ? '매월' : option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={saveCurrentSetting}
                >
                  <Text style={styles.confirmButtonText}>저장</Text>
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  infoTitle: {
    fontSize: 12,
    color: '#666',
  },
  performanceContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingTextContainer: {
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
  settingRight: {
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  updateInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
    maxHeight: '70%',
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
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  selectOptionActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  confirmButton: {
    backgroundColor: '#2a5298',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default SystemSettingsScreen;