import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import app from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const db = getFirestore(app);

interface CompanyInfo {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  businessHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
  serviceAreas: string[];
  pricingTiers: {
    basic: { name: string; price: number; description: string };
    standard: { name: string; price: number; description: string };
    premium: { name: string; price: number; description: string };
  };
  companySettings: {
    autoAssignJobs: boolean;
    requirePhotoProof: boolean;
    allowEmergencyBooking: boolean;
    maxJobsPerWorker: number;
    notificationEnabled: boolean;
    qualityScoreThreshold: number;
  };
}

const CompanySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'hours' | 'pricing' | 'settings'>('info');
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newArea, setNewArea] = useState('');
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    id: 'cleanit-company',
    name: 'CleanIT',
    description: '전문적이고 신뢰할 수 있는 청소 서비스를 제공합니다.',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    email: 'info@cleanit.co.kr',
    website: 'https://cleanit.co.kr',
    logoUrl: '',
    businessHours: {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '10:00', close: '16:00', isOpen: true },
      sunday: { open: '10:00', close: '16:00', isOpen: false },
    },
    serviceAreas: ['강남구', '서초구', '송파구', '중구', '종로구'],
    pricingTiers: {
      basic: { name: '기본 청소', price: 50000, description: '일반 청소 서비스' },
      standard: { name: '표준 청소', price: 80000, description: '꼼꼼한 청소 + 정리정돈' },
      premium: { name: '프리미엄 청소', price: 120000, description: '완벽한 청소 + 소독 + A/S' },
    },
    companySettings: {
      autoAssignJobs: true,
      requirePhotoProof: true,
      allowEmergencyBooking: true,
      maxJobsPerWorker: 5,
      notificationEnabled: true,
      qualityScoreThreshold: 4.0,
    },
  });

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'companySettings', 'cleanit-company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<CompanyInfo>;
        setCompanyInfo(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('회사 정보 로드 실패:', error);
      Alert.alert('오류', '회사 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyInfo = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'companySettings', 'cleanit-company');
      await setDoc(docRef, {
        ...companyInfo,
        updatedAt: new Date(),
        updatedBy: user?.id || 'system',
      });
      
      Alert.alert('성공', '회사 설정이 저장되었습니다.');
    } catch (error) {
      console.error('회사 정보 저장 실패:', error);
      Alert.alert('오류', '회사 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addServiceArea = () => {
    if (newArea.trim()) {
      setCompanyInfo(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, newArea.trim()]
      }));
      setNewArea('');
      setShowAreaModal(false);
    }
  };

  const removeServiceArea = (index: number) => {
    setCompanyInfo(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, i) => i !== index)
    }));
  };

  const updateBusinessHour = (day: keyof typeof companyInfo.businessHours, field: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    setCompanyInfo(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const updatePricingTier = (tier: keyof typeof companyInfo.pricingTiers, field: string, value: string | number) => {
    setCompanyInfo(prev => ({
      ...prev,
      pricingTiers: {
        ...prev.pricingTiers,
        [tier]: {
          ...prev.pricingTiers[tier],
          [field]: value
        }
      }
    }));
  };

  const updateSetting = (key: keyof typeof companyInfo.companySettings, value: boolean | number) => {
    setCompanyInfo(prev => ({
      ...prev,
      companySettings: {
        ...prev.companySettings,
        [key]: value
      }
    }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>회사명</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.name}
                onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, name: text }))}
                placeholder="회사명을 입력하세요"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>회사 소개</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={companyInfo.description}
                onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, description: text }))}
                placeholder="회사 소개를 입력하세요"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>주소</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.address}
                onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, address: text }))}
                placeholder="회사 주소를 입력하세요"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전화번호</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.phone}
                onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, phone: text }))}
                placeholder="전화번호를 입력하세요"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.email}
                onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, email: text }))}
                placeholder="이메일을 입력하세요"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>웹사이트</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.website}
                onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, website: text }))}
                placeholder="웹사이트 URL을 입력하세요"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>서비스 지역</Text>
              <View style={styles.areaContainer}>
                {companyInfo.serviceAreas.map((area, index) => (
                  <View key={index} style={styles.areaTag}>
                    <Text style={styles.areaText}>{area}</Text>
                    <TouchableOpacity onPress={() => removeServiceArea(index)}>
                      <Text style={styles.removeArea}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity 
                  style={styles.addAreaButton}
                  onPress={() => setShowAreaModal(true)}
                >
                  <Text style={styles.addAreaText}>+ 지역 추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'hours':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>영업 시간</Text>
            
            {Object.entries(companyInfo.businessHours).map(([day, hours]) => (
              <View key={day} style={styles.hourRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayName}>{getDayName(day)}</Text>
                  <Switch
                    value={hours.isOpen}
                    onValueChange={(value) => updateBusinessHour(day as keyof typeof companyInfo.businessHours, 'isOpen', value)}
                  />
                </View>
                
                {hours.isOpen && (
                  <View style={styles.timeInputs}>
                    <TextInput
                      style={styles.timeInput}
                      value={hours.open}
                      onChangeText={(text) => updateBusinessHour(day as keyof typeof companyInfo.businessHours, 'open', text)}
                      placeholder="09:00"
                    />
                    <Text style={styles.timeSeparator}>~</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={hours.close}
                      onChangeText={(text) => updateBusinessHour(day as keyof typeof companyInfo.businessHours, 'close', text)}
                      placeholder="18:00"
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        );

      case 'pricing':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>가격 설정</Text>
            
            {Object.entries(companyInfo.pricingTiers).map(([tier, pricing]) => (
              <View key={tier} style={styles.pricingCard}>
                <Text style={styles.pricingTierTitle}>{getTierName(tier)}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>서비스명</Text>
                  <TextInput
                    style={styles.input}
                    value={pricing.name}
                    onChangeText={(text) => updatePricingTier(tier as keyof typeof companyInfo.pricingTiers, 'name', text)}
                    placeholder="서비스명"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>가격 (원)</Text>
                  <TextInput
                    style={styles.input}
                    value={pricing.price.toString()}
                    onChangeText={(text) => updatePricingTier(tier as keyof typeof companyInfo.pricingTiers, 'price', parseInt(text) || 0)}
                    placeholder="가격"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>설명</Text>
                  <TextInput
                    style={styles.input}
                    value={pricing.description}
                    onChangeText={(text) => updatePricingTier(tier as keyof typeof companyInfo.pricingTiers, 'description', text)}
                    placeholder="서비스 설명"
                  />
                </View>
              </View>
            ))}
          </View>
        );

      case 'settings':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>운영 설정</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>자동 작업 배정</Text>
              <Switch
                value={companyInfo.companySettings.autoAssignJobs}
                onValueChange={(value) => updateSetting('autoAssignJobs', value)}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>사진 증빙 필수</Text>
              <Switch
                value={companyInfo.companySettings.requirePhotoProof}
                onValueChange={(value) => updateSetting('requirePhotoProof', value)}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>긴급 예약 허용</Text>
              <Switch
                value={companyInfo.companySettings.allowEmergencyBooking}
                onValueChange={(value) => updateSetting('allowEmergencyBooking', value)}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>알림 활성화</Text>
              <Switch
                value={companyInfo.companySettings.notificationEnabled}
                onValueChange={(value) => updateSetting('notificationEnabled', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>작업자당 최대 작업 수</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.companySettings.maxJobsPerWorker.toString()}
                onChangeText={(text) => updateSetting('maxJobsPerWorker', parseInt(text) || 5)}
                placeholder="5"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>품질 점수 임계값</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.companySettings.qualityScoreThreshold.toString()}
                onChangeText={(text) => updateSetting('qualityScoreThreshold', parseFloat(text) || 4.0)}
                placeholder="4.0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getDayName = (day: string) => {
    const dayNames: { [key: string]: string } = {
      monday: '월요일',
      tuesday: '화요일',
      wednesday: '수요일',
      thursday: '목요일',
      friday: '금요일',
      saturday: '토요일',
      sunday: '일요일',
    };
    return dayNames[day] || day;
  };

  const getTierName = (tier: string) => {
    const tierNames: { [key: string]: string } = {
      basic: '기본',
      standard: '표준',
      premium: '프리미엄',
    };
    return tierNames[tier] || tier;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>회사 설정을 불러오는 중...</Text>
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
        <Text style={styles.title}>회사 설정</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveCompanyInfo}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>기본정보</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'hours' && styles.activeTab]}
          onPress={() => setActiveTab('hours')}
        >
          <Text style={[styles.tabText, activeTab === 'hours' && styles.activeTabText]}>영업시간</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pricing' && styles.activeTab]}
          onPress={() => setActiveTab('pricing')}
        >
          <Text style={[styles.tabText, activeTab === 'pricing' && styles.activeTabText]}>가격설정</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>운영설정</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderTabContent()}
      </ScrollView>

      <Modal
        visible={showAreaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAreaModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>서비스 지역 추가</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newArea}
              onChangeText={setNewArea}
              placeholder="지역명을 입력하세요"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewArea('');
                  setShowAreaModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addServiceArea}
              >
                <Text style={styles.confirmButtonText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  areaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaText: {
    color: '#fff',
    fontSize: 14,
  },
  removeArea: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  addAreaButton: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addAreaText: {
    color: '#2196F3',
    fontSize: 14,
  },
  hourRow: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    color: '#666',
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  pricingTierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
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
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CompanySettingsScreen;