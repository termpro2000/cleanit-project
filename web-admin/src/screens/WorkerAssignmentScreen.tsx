import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import app from '../firebase';
import { User, Building, Job } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);
const auth = getAuth(app);

const WorkerAssignmentScreen: React.FC = () => {
  const [workers, setWorkers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Firebase 인증 상태 확인
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // 인증된 사용자가 있을 때만 데이터 로드
        loadFirebaseData();
      } else {
        // 인증되지 않은 경우 localStorage 데이터 사용
        loadLocalData();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loadFirebaseData = () => {
    try {
      // Fetch Workers from Firebase
      const unsubscribeWorkers = onSnapshot(
        query(collection(db, 'users'), where('role', '==', 'worker')),
        (snapshot) => {
          const fetchedWorkers: User[] = [];
          snapshot.forEach((doc) =>
            fetchedWorkers.push({ id: doc.id, ...doc.data() } as User)
          );
          setWorkers(fetchedWorkers);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching workers:', err);
          // Firebase 오류 시 로컬 데이터로 폴백
          loadLocalData();
        }
      );

      // Fetch Buildings from Firebase
      const unsubscribeBuildings = onSnapshot(
        collection(db, 'buildings'),
        (snapshot) => {
          const fetchedBuildings: Building[] = [];
          snapshot.forEach((doc) =>
            fetchedBuildings.push({ id: doc.id, ...doc.data() } as Building)
          );
          setBuildings(fetchedBuildings);
        },
        (err) => {
          console.error('Error fetching buildings:', err);
          // 건물 데이터는 localStorage에서 가져오기
          const storedBuildings = localStorage.getItem('buildings');
          const buildingsData = storedBuildings
            ? JSON.parse(storedBuildings)
            : [];
          setBuildings(buildingsData);
        }
      );

      return () => {
        unsubscribeWorkers();
        unsubscribeBuildings();
      };
    } catch (err) {
      console.error('Error setting up Firebase listeners:', err);
      loadLocalData();
    }
  };

  const loadLocalData = () => {
    try {
      // 가상의 worker 데이터
      const mockWorkers: User[] = [
        {
          id: 'worker1',
          role: 'worker',
          email: 'worker1@cleanit.com',
          phone: '010-1111-1111',
          isActive: true,
          isVerified: true,
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          workerInfo: {
            bankName: 'KB국민은행',
            accountNumber: '123-456-789',
            companyId: 'cleanit-company',
          },
        },
        {
          id: 'worker2',
          role: 'worker',
          email: 'worker2@cleanit.com',
          phone: '010-2222-2222',
          isActive: true,
          isVerified: true,
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          workerInfo: {
            bankName: '신한은행',
            accountNumber: '987-654-321',
            companyId: 'cleanit-company',
          },
        },
      ];

      // localStorage에서 건물 데이터 가져오기
      const storedBuildings = localStorage.getItem('buildings');
      const buildingsData = storedBuildings ? JSON.parse(storedBuildings) : [];

      setWorkers(mockWorkers);
      setBuildings(buildingsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading local data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleAssignJob = async () => {
    if (!selectedWorkerId || !selectedBuildingId) {
      alert('Worker와 건물을 선택해주세요.');
      return;
    }

    try {
      if (currentUser) {
        // Firebase에 저장
        const newJob: Omit<Job, 'id'> = {
          buildingId: selectedBuildingId,
          workerId: selectedWorkerId,
          companyId: 'cleanit-company',
          scheduledAt: Timestamp.now(),
          status: 'scheduled',
          areas: [],
          beforePhotos: [],
          afterPhotos: [],
          completionRate: 0,
          isVisible: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, 'jobs'), newJob);
        alert('작업이 성공적으로 Firebase에 배정되었습니다! 🔥');
      } else {
        // localStorage에 저장 (폴백)
        const newJob = {
          id: Date.now().toString(),
          buildingId: selectedBuildingId,
          workerId: selectedWorkerId,
          companyId: 'cleanit-company',
          scheduledAt: new Date().toISOString(),
          status: 'scheduled',
          areas: [],
          beforePhotos: [],
          afterPhotos: [],
          completionRate: 0,
          isVisible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existingJobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        existingJobs.push(newJob);
        localStorage.setItem('jobs', JSON.stringify(existingJobs));
        alert('작업이 성공적으로 로컬에 배정되었습니다! 💾');
      }

      setSelectedWorkerId(null);
      setSelectedBuildingId(null);
    } catch (err: any) {
      console.error('Error assigning job:', err);
      alert('작업 배정 실패: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '100vh',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px',
              }}
            >
              👷‍♂️ Worker 작업 배정
            </h1>
            <p
              style={{
                color: '#6b7280',
                fontSize: '16px',
                margin: 0,
              }}
            >
              적절한 Worker에게 청소 작업을 배정하세요
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '30px',
              marginBottom: '40px',
            }}
          >
            {/* Worker 선택 카드 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                👤 Worker 선택
              </h3>
              <select
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                value={selectedWorkerId || ''}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#374151',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">Worker를 선택하세요</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.email}
                  </option>
                ))}
              </select>
            </div>

            {/* 건물 선택 카드 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                🏢 건물 선택
              </h3>
              <select
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                value={selectedBuildingId || ''}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#374151',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">건물을 선택하세요</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name} ({building.address})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 배정 버튼 */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleAssignJob}
              disabled={!selectedWorkerId || !selectedBuildingId}
              style={{
                background:
                  selectedWorkerId && selectedBuildingId
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '16px 48px',
                fontSize: '18px',
                fontWeight: '600',
                cursor:
                  selectedWorkerId && selectedBuildingId
                    ? 'pointer'
                    : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow:
                  selectedWorkerId && selectedBuildingId
                    ? '0 10px 20px rgba(16, 185, 129, 0.3)'
                    : 'none',
                transform:
                  selectedWorkerId && selectedBuildingId
                    ? 'translateY(-2px)'
                    : 'none',
              }}
              onMouseEnter={(e) => {
                if (selectedWorkerId && selectedBuildingId) {
                  (e.target as HTMLButtonElement).style.transform =
                    'translateY(-4px)';
                  (e.target as HTMLButtonElement).style.boxShadow =
                    '0 15px 30px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedWorkerId && selectedBuildingId) {
                  (e.target as HTMLButtonElement).style.transform =
                    'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow =
                    '0 10px 20px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              ✨ 작업 배정하기
            </button>
          </div>

          {/* 선택된 정보 미리보기 */}
          {(selectedWorkerId || selectedBuildingId) && (
            <div
              style={{
                marginTop: '30px',
                padding: '20px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
              }}
            >
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px',
                }}
              >
                📋 선택된 정보
              </h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {selectedWorkerId && (
                  <div
                    style={{
                      background: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #3b82f6',
                      color: '#3b82f6',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    👤 {workers.find((w) => w.id === selectedWorkerId)?.email}
                  </div>
                )}
                {selectedBuildingId && (
                  <div
                    style={{
                      background: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #6366f1',
                      color: '#6366f1',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    🏢{' '}
                    {buildings.find((b) => b.id === selectedBuildingId)?.name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WorkerAssignmentScreen;
