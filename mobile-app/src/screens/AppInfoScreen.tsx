import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import app from '../firebase';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

const db = getFirestore(app);

interface AppVersion {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  isUpdateRequired: boolean;
  lastUpdated: string;
}

const AppInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState<AppVersion>({
    currentVersion: Constants.expoConfig?.version || '1.0.0',
    latestVersion: Constants.expoConfig?.version || '1.0.0',
    releaseNotes: '',
    downloadUrl: '',
    isUpdateRequired: false,
    lastUpdated: new Date().toISOString(),
  });

  useEffect(() => {
    loadAppVersion();
  }, []);

  const loadAppVersion = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'appSettings', 'version');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const versionData = docSnap.data() as Partial<AppVersion>;
        setAppVersion(prev => ({ ...prev, ...versionData }));
      }
    } catch (error) {
      console.error('앱 버전 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      setCheckingUpdate(true);
      
      if (__DEV__) {
        // 개발 모드에서는 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const latestVersion = '1.0.1';
        const currentVersion = appVersion.currentVersion;
        const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0;
        
        if (isUpdateAvailable) {
          setAppVersion(prev => ({
            ...prev,
            latestVersion,
            releaseNotes: '• 성능 개선 및 버그 수정\n• 새로운 기능 추가\n• 보안 강화',
            downloadUrl: 'https://example.com/update',
            isUpdateRequired: false,
          }));
          
          Alert.alert(
            '업데이트 사용 가능 (시뮬레이션)',
            `새로운 버전 ${latestVersion}이 사용 가능합니다.\n개발 모드에서는 실제 업데이트가 수행되지 않습니다.`,
            [
              { text: '나중에', style: 'cancel' },
              { text: '업데이트', onPress: performUpdate }
            ]
          );
        } else {
          Alert.alert('업데이트 확인', '현재 최신 버전을 사용 중입니다.');
        }
      } else {
        // 프로덕션 모드에서는 실제 EAS Update 사용
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          setAppVersion(prev => ({
            ...prev,
            latestVersion: update.manifest?.version || '업데이트 사용 가능',
            releaseNotes: '• 성능 개선 및 버그 수정\n• 새로운 기능 추가\n• 보안 강화',
            isUpdateRequired: false,
          }));
          
          Alert.alert(
            '업데이트 사용 가능',
            '새로운 업데이트가 있습니다. 지금 업데이트하시겠습니까?',
            [
              { text: '나중에', style: 'cancel' },
              { text: '업데이트', onPress: performUpdate }
            ]
          );
        } else {
          Alert.alert('업데이트 확인', '현재 최신 버전을 사용 중입니다.');
        }
      }
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
      Alert.alert('오류', '업데이트 확인에 실패했습니다.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const compareVersions = (version1: string, version2: string): number => {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  };

  const performUpdate = async () => {
    try {
      if (__DEV__) {
        // 개발 모드에서는 시뮬레이션
        Alert.alert(
          '업데이트 시뮬레이션',
          '개발 모드에서는 실제 업데이트가 수행되지 않습니다.',
          [{ text: '확인' }]
        );
        
        // 버전 정보만 업데이트
        setAppVersion(prev => ({
          ...prev,
          currentVersion: prev.latestVersion,
        }));
      } else {
        // 프로덕션 모드에서는 실제 EAS Update 수행
        Alert.alert(
          '업데이트 시작',
          '앱 업데이트를 시작합니다. 잠시만 기다려주세요.',
          [{ text: '확인' }]
        );
        
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.error('업데이트 실패:', error);
      Alert.alert('업데이트 실패', '업데이트 중 오류가 발생했습니다.');
    }
  };

  const isUpdateAvailable = compareVersions(appVersion.latestVersion, appVersion.currentVersion) > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>앱 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>앱 정보</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.appInfoSection}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>🧹</Text>
            </View>
          </View>
          
          <Text style={styles.appName}>CleanIT</Text>
          <Text style={styles.appDescription}>청소 관리 플랫폼</Text>
        </View>

        <View style={styles.versionSection}>
          <View style={styles.versionCard}>
            <Text style={styles.versionLabel}>현재 버전</Text>
            <Text style={styles.versionText}>{appVersion.currentVersion}</Text>
          </View>
          
          {isUpdateAvailable && (
            <View style={styles.versionCard}>
              <Text style={styles.versionLabel}>최신 버전</Text>
              <Text style={[styles.versionText, styles.latestVersion]}>{appVersion.latestVersion}</Text>
            </View>
          )}
        </View>

        {isUpdateAvailable && appVersion.releaseNotes && (
          <View style={styles.releaseNotesSection}>
            <Text style={styles.sectionTitle}>업데이트 내용</Text>
            <View style={styles.releaseNotesCard}>
              <Text style={styles.releaseNotesText}>{appVersion.releaseNotes}</Text>
            </View>
          </View>
        )}

        <View style={styles.updateSection}>
          <TouchableOpacity 
            style={[
              styles.updateButton, 
              checkingUpdate && styles.updateButtonDisabled,
              isUpdateAvailable && styles.updateAvailableButton
            ]}
            onPress={checkForUpdates}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.updateButtonText}>
                  {isUpdateAvailable ? '지금 업데이트' : '업데이트 확인'}
                </Text>
                {isUpdateAvailable && <Text style={styles.updateIcon}>⬇️</Text>}
              </>
            )}
          </TouchableOpacity>
          
          {isUpdateAvailable && (
            <Text style={styles.updateAvailableText}>
              새로운 버전이 사용 가능합니다!
            </Text>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>추가 정보</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>개발사</Text>
            <Text style={styles.infoValue}>CleanIT Corp.</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>마지막 업데이트</Text>
            <Text style={styles.infoValue}>
              {new Date(appVersion.lastUpdated).toLocaleDateString('ko-KR')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>라이선스</Text>
            <Text style={styles.infoValue}>MIT License</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>문의</Text>
            <Text style={styles.infoValue}>support@cleanit.co.kr</Text>
          </View>
        </View>
      </ScrollView>
    </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  appInfoSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
  },
  appIconContainer: {
    marginBottom: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 16,
    color: '#666',
  },
  versionSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  versionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  latestVersion: {
    color: '#4CAF50',
  },
  releaseNotesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  releaseNotesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  releaseNotesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  updateSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  updateButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  updateAvailableButton: {
    backgroundColor: '#4CAF50',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateIcon: {
    fontSize: 16,
  },
  updateAvailableText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default AppInfoScreen;