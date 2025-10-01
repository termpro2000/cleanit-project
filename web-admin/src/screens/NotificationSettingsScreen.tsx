import React, { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  getFirestore,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { app } from '../firebase';
import { NotificationSettings } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);

const NotificationSettingsScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(
          doc(db, 'notificationSettings', currentUser.uid)
        );

        if (settingsDoc.exists()) {
          setSettings({
            id: settingsDoc.id,
            ...settingsDoc.data(),
          } as NotificationSettings);
        } else {
          // 기본 설정 생성
          const defaultSettings: NotificationSettings = {
            userId: currentUser.uid,
            preferences: {
              jobAssigned: true,
              jobStatusChanges: true,
              requestUpdates: true,
              messages: true,
              reviews: true,
              systemAnnouncements: true,
            },
            pushNotifications: true,
            emailNotifications: true,
            inAppNotifications: true,
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
            },
            updatedAt: Timestamp.now(),
          };

          await setDoc(
            doc(db, 'notificationSettings', currentUser.uid),
            defaultSettings
          );
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentUser]);

  const saveSettings = async (updatedSettings: NotificationSettings) => {
    if (!currentUser || saving) return;

    setSaving(true);
    try {
      const settingsToSave = {
        ...updatedSettings,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(
        doc(db, 'notificationSettings', currentUser.uid),
        settingsToSave
      );
      setSettings(settingsToSave);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (
    key: keyof NotificationSettings['preferences'],
    value: boolean
  ) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };

    saveSettings(updatedSettings);
  };

  const updateGlobalSetting = (
    key: 'pushNotifications' | 'emailNotifications' | 'inAppNotifications',
    value: boolean
  ) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      [key]: value,
    };

    saveSettings(updatedSettings);
  };

  const updateQuietHours = (
    field: 'enabled' | 'startTime' | 'endTime',
    value: boolean | string
  ) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        [field]: value,
      },
    };

    saveSettings(updatedSettings);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>설정을 불러오는 중...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>설정을 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ 알림 설정</h2>
          <div style={styles.subtitle}>알림 수신 방법과 유형을 설정하세요</div>
        </div>

        <div style={styles.content}>
          {/* 전역 알림 설정 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📱 알림 수신 방법</h3>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>앱 내 알림</div>
                  <div style={styles.settingDescription}>
                    앱을 사용 중일 때 알림을 표시합니다
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.inAppNotifications}
                    onChange={(e) =>
                      updateGlobalSetting(
                        'inAppNotifications',
                        e.target.checked
                      )
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>푸시 알림</div>
                  <div style={styles.settingDescription}>
                    앱이 실행되지 않을 때도 알림을 받습니다
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) =>
                      updateGlobalSetting('pushNotifications', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>이메일 알림</div>
                  <div style={styles.settingDescription}>
                    중요한 알림을 이메일로도 받습니다
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) =>
                      updateGlobalSetting(
                        'emailNotifications',
                        e.target.checked
                      )
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>
            </div>
          </div>

          {/* 알림 유형별 설정 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🔔 알림 유형별 설정</h3>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>👷 작업 배정</div>
                  <div style={styles.settingDescription}>
                    새로운 작업이 배정되었을 때
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.preferences.jobAssigned}
                    onChange={(e) =>
                      updatePreference('jobAssigned', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>📋 작업 상태 변경</div>
                  <div style={styles.settingDescription}>
                    작업이 시작되거나 완료되었을 때
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.preferences.jobStatusChanges}
                    onChange={(e) =>
                      updatePreference('jobStatusChanges', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>📝 요청사항 업데이트</div>
                  <div style={styles.settingDescription}>
                    요청사항이 생성되거나 처리되었을 때
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.preferences.requestUpdates}
                    onChange={(e) =>
                      updatePreference('requestUpdates', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>💬 메시지</div>
                  <div style={styles.settingDescription}>
                    새로운 메시지를 받았을 때
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.preferences.messages}
                    onChange={(e) =>
                      updatePreference('messages', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>⭐ 리뷰</div>
                  <div style={styles.settingDescription}>
                    새로운 리뷰나 평가를 받았을 때
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.preferences.reviews}
                    onChange={(e) =>
                      updatePreference('reviews', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>📢 시스템 공지</div>
                  <div style={styles.settingDescription}>
                    중요한 시스템 공지사항
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.preferences.systemAnnouncements}
                    onChange={(e) =>
                      updatePreference('systemAnnouncements', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>
            </div>
          </div>

          {/* 방해 금지 시간 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🌙 방해 금지 시간</h3>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingName}>방해 금지 시간 사용</div>
                  <div style={styles.settingDescription}>
                    지정된 시간에는 알림을 받지 않습니다
                  </div>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings.quietHours.enabled}
                    onChange={(e) =>
                      updateQuietHours('enabled', e.target.checked)
                    }
                    style={styles.switchInput}
                  />
                  <span style={styles.switchSlider}></span>
                </label>
              </div>

              {settings.quietHours.enabled && (
                <>
                  <div style={styles.settingItem}>
                    <div style={styles.settingInfo}>
                      <div style={styles.settingName}>시작 시간</div>
                    </div>
                    <input
                      type="time"
                      value={settings.quietHours.startTime}
                      onChange={(e) =>
                        updateQuietHours('startTime', e.target.value)
                      }
                      style={styles.timeInput}
                    />
                  </div>

                  <div style={styles.settingItem}>
                    <div style={styles.settingInfo}>
                      <div style={styles.settingName}>종료 시간</div>
                    </div>
                    <input
                      type="time"
                      value={settings.quietHours.endTime}
                      onChange={(e) =>
                        updateQuietHours('endTime', e.target.value)
                      }
                      style={styles.timeInput}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {saving && (
            <div style={styles.savingIndicator}>💾 설정을 저장하는 중...</div>
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '30px',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '15px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    color: '#666',
    fontSize: '14px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  section: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    padding: '15px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '14px',
    color: '#666',
  },
  switch: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '50px',
    height: '24px',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchSlider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '0.3s',
    borderRadius: '24px',
    '&:before': {
      position: 'absolute' as const,
      content: '""',
      height: '18px',
      width: '18px',
      left: '3px',
      bottom: '3px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '50%',
    },
  },
  timeInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  savingIndicator: {
    textAlign: 'center' as const,
    padding: '10px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '16px',
    color: '#666',
  },
  error: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '16px',
    color: '#ff4444',
  },
};

export default NotificationSettingsScreen;
