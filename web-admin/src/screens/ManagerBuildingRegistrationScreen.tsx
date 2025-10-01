import React, { useState } from 'react';
import AddressInput from '../components/AddressInput';
import BackToDashboard from '../components/BackToDashboard';

const ManagerBuildingRegistrationScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [basementFloors, setBasementFloors] = useState('');
  const [groundFloors, setGroundFloors] = useState('');
  const [hasElevator, setHasElevator] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [cleaningAreas, setCleaningAreas] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  const handleRegisterBuilding = async () => {
    // localStorage에서 인증 정보 확인
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userInfo = localStorage.getItem('userInfo');

    if (!isAuthenticated || !userInfo) {
      alert('오류: 로그인된 사용자가 없습니다.');
      return;
    }

    // Basic validation
    if (
      !name ||
      !address ||
      !contactName ||
      !contactPhone ||
      !contactAddress ||
      !basementFloors ||
      !groundFloors
    ) {
      alert('입력 오류: 모든 필수 필드를 채워주세요.');
      return;
    }

    try {
      const user = JSON.parse(userInfo);

      const newBuilding = {
        id: Date.now().toString(), // 간단한 ID 생성
        name: name,
        address: address,
        contact: {
          name: contactName,
          phone: contactPhone,
          address: contactAddress,
        },
        floors: {
          basement: parseInt(basementFloors),
          ground: parseInt(groundFloors),
          total: parseInt(basementFloors) + parseInt(groundFloors),
          hasElevator: hasElevator,
        },
        parking: {
          available: hasParking,
          spaces: hasParking ? parseInt(parkingSpaces) : undefined,
        },
        ownerId: user.username,
        companyId: 'cleanit-company',
        cleaningAreas: cleaningAreas.split(',').map((area) => area.trim()),
        specialNotes: specialNotes,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // localStorage에 건물 정보 저장
      const existingBuildings = JSON.parse(
        localStorage.getItem('buildings') || '[]'
      );
      existingBuildings.push(newBuilding);
      localStorage.setItem('buildings', JSON.stringify(existingBuildings));

      alert('건물 등록 성공: 새 건물이 성공적으로 등록되었습니다.');

      // 폼 초기화
      setName('');
      setAddress('');
      setContactName('');
      setContactPhone('');
      setContactAddress('');
      setBasementFloors('');
      setGroundFloors('');
      setHasElevator(false);
      setHasParking(false);
      setParkingSpaces('');
      setCleaningAreas('');
      setSpecialNotes('');
    } catch (error: any) {
      alert('건물 등록 실패: ' + error.message);
      console.error('Building registration error:', error);
    }
  };

  return (
    <>
      <BackToDashboard />
      <div
        style={{
          padding: '20px',
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#f8f8f8',
          minHeight: '100vh',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#333',
            textAlign: 'center',
          }}
        >
          Manager 건물 등록
        </h1>

        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
          placeholder="건물명"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AddressInput
          value={address}
          onChange={setAddress}
          placeholder="건물 주소"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
        />

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '10px',
            color: '#555',
          }}
        >
          담당자 정보
        </h3>
        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
          placeholder="담당자 이름"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
          placeholder="담당자 전화번호"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          type="tel"
        />
        <AddressInput
          value={contactAddress}
          onChange={setContactAddress}
          placeholder="담당자 주소"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
        />

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '10px',
            color: '#555',
          }}
        >
          건물 구조
        </h3>
        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
          placeholder="지하층 수"
          value={basementFloors}
          onChange={(e) => setBasementFloors(e.target.value)}
          type="number"
        />
        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
          placeholder="지상층 수"
          value={groundFloors}
          onChange={(e) => setGroundFloors(e.target.value)}
          type="number"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
            width: '100%',
            justifyContent: 'space-between',
            paddingLeft: '5px',
            paddingRight: '5px',
          }}
        >
          <span>엘리베이터 유무:</span>
          <button
            onClick={() => setHasElevator(!hasElevator)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            {hasElevator ? '있음' : '없음'}
          </button>
        </div>

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '10px',
            color: '#555',
          }}
        >
          부대시설
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
            width: '100%',
            justifyContent: 'space-between',
            paddingLeft: '5px',
            paddingRight: '5px',
          }}
        >
          <span>주차장 유무:</span>
          <button
            onClick={() => setHasParking(!hasParking)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            {hasParking ? '있음' : '없음'}
          </button>
        </div>
        {hasParking && (
          <input
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
            placeholder="주차 가능 대수"
            value={parkingSpaces}
            onChange={(e) => setParkingSpaces(e.target.value)}
            type="number"
          />
        )}

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '10px',
            color: '#555',
          }}
        >
          청소 관련 정보
        </h3>
        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
          placeholder="청소 영역 (쉼표로 구분)"
          value={cleaningAreas}
          onChange={(e) => setCleaningAreas(e.target.value)}
        />
        <textarea
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
            minHeight: '80px',
          }}
          placeholder="특별 지시사항 (선택 사항)"
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
        />

        <button
          onClick={handleRegisterBuilding}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          건물 등록
        </button>
      </div>
    </>
  );
};

export default ManagerBuildingRegistrationScreen;
