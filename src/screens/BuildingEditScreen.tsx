import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import app from '../firebase';
import { Building } from '../../../shared/types';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const db = getFirestore(app);

type RootStackParamList = {
  BuildingEdit: { buildingId: string };
  BuildingDetails: { buildingId: string };
};

type BuildingEditScreenRouteProp = RouteProp<RootStackParamList, 'BuildingEdit'>;
type BuildingEditScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BuildingEdit'>;

interface BuildingEditScreenProps {
  route: BuildingEditScreenRouteProp;
  navigation: BuildingEditScreenNavigationProp;
}

const BuildingEditScreen: React.FC<BuildingEditScreenProps> = ({ route, navigation }) => {
  const { buildingId } = route.params;
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchBuildingDetails = async () => {
      try {
        const docRef = doc(db, 'buildings', buildingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Building;
          setBuilding(data);
          setName(data.name);
          setAddress(data.address);
          setContactName(data.contact.name);
          setContactPhone(data.contact.phone);
          setContactAddress(data.contact.address);
          setBasementFloors(String(data.floors.basement));
          setGroundFloors(String(data.floors.ground));
          setHasElevator(data.floors.hasElevator);
          setHasParking(data.parking.available);
          setParkingSpaces(String(data.parking.spaces || ''));
          setCleaningAreas(data.cleaningAreas.join(', '));
          setSpecialNotes(data.specialNotes || '');
        } else {
          setError('건물 정보를 찾을 수 없습니다.');
        }
      } catch (err: any) {
        console.error('Error fetching building details:', err);
        setError('건물 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBuildingDetails();
  }, [buildingId]);

  const handleUpdateBuilding = async () => {
    // Basic validation
    if (!name || !address || !contactName || !contactPhone || !contactAddress || !basementFloors || !groundFloors) {
      Alert.alert('입력 오류', '모든 필수 필드를 채워주세요.');
      return;
    }

    try {
      const updatedBuilding: Partial<Building> = {
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
        cleaningAreas: cleaningAreas.split(',').map(area => area.trim()),
        specialNotes: specialNotes,
        updatedAt: new Date(),
      };

      const docRef = doc(db, 'buildings', buildingId);
      await updateDoc(docRef, updatedBuilding);
      Alert.alert('건물 정보 수정 성공', '건물 정보가 성공적으로 업데이트되었습니다.');
      navigation.navigate('BuildingDetails', { buildingId: buildingId }); // Go back to details
    } catch (error: any) {
      Alert.alert('건물 정보 수정 실패', error.message);
      console.error('Building update error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>건물 정보 로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!building) {
    return (
      <View style={styles.container}>
        <Text>건물 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <Text style={styles.title}>건물 정보 수정</Text>

        <TextInput style={styles.input} placeholder="건물명" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="건물 주소" value={address} onChangeText={setAddress} />

        <Text style={styles.sectionTitle}>담당자 정보</Text>
        <TextInput style={styles.input} placeholder="담당자 이름" value={contactName} onChangeText={setContactName} />
        <TextInput style={styles.input} placeholder="담당자 전화번호" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="담당자 주소" value={contactAddress} onChangeText={setContactAddress} />

        <Text style={styles.sectionTitle}>건물 구조</Text>
        <TextInput style={styles.input} placeholder="지하층 수" value={basementFloors} onChangeText={setBasementFloors} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="지상층 수" value={groundFloors} onChangeText={setGroundFloors} keyboardType="numeric" />
        <View style={styles.checkboxContainer}>
          <Text>엘리베이터 유무:</Text>
          <Button title={hasElevator ? "있음" : "없음"} onPress={() => setHasElevator(!hasElevator)} />
        </View>

        <Text style={styles.sectionTitle}>부대시설</Text>
        <View style={styles.checkboxContainer}>
          <Text>주차장 유무:</Text>
          <Button title={hasParking ? "있음" : "없음"} onPress={() => setHasParking(!hasParking)} />
        </View>
        {hasParking && (
          <TextInput style={styles.input} placeholder="주차 가능 대수" value={parkingSpaces} onChangeText={setParkingSpaces} keyboardType="numeric" />
        )}

        <Text style={styles.sectionTitle}>청소 관련 정보</Text>
        <TextInput style={styles.input} placeholder="청소 영역 (쉼표로 구분)" value={cleaningAreas} onChangeText={setCleaningAreas} />
        <TextInput style={styles.input} placeholder="특별 지시사항 (선택 사항)" value={specialNotes} onChangeText={setSpecialNotes} multiline />

        <Button title="건물 정보 업데이트" onPress={handleUpdateBuilding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#555',
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
});

export default BuildingEditScreen;
