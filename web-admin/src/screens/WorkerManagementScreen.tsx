import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import app from '../firebase';
import { User } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);

const WorkerManagementScreen: React.FC = () => {
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'worker'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedWorkers: User[] = [];
        querySnapshot.forEach((doc) => {
          fetchedWorkers.push({ id: doc.id, ...doc.data() } as User);
        });
        setWorkers(fetchedWorkers);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching workers:', err);
        setError('Worker 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div>
        <p>Worker 목록 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div>
        <p>등록된 Worker가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div>
        <h1>Worker 관리</h1>
        <ul>
          {workers.map((worker) => (
            <li key={worker.id}>
              {worker.email} - 상태: {worker.isActive ? '활성' : '비활성'}
              {/* TODO: Add more worker details and management options */}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default WorkerManagementScreen;
