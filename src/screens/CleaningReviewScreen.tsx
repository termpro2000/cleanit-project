import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import app from '../firebase';
import { Review } from '../../../shared/types';

const db = getFirestore(app);


interface CleaningReviewScreenProps {
  route: { params: { jobId: string; buildingId: string; workerId: string; companyId: string; } };
  navigation: any; // TODO: Use proper navigation type
}

const CleaningReviewScreen: React.FC<CleaningReviewScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { jobId, buildingId, workerId, companyId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [improvements, setImprovements] = useState('');

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('오류', '로그인된 사용자가 없습니다.');
      return;
    }

    if (rating === 0 || !comment) {
      Alert.alert('입력 오류', '별점과 코멘트를 입력해주세요.');
      return;
    }

    try {
      const newReview: Review = {
        jobId: jobId,
        buildingId: buildingId,
        reviewerId: user.uid,
        workerId: workerId,
        companyId: companyId,
        rating: rating,
        comment: comment,
        categories: {
          cleanliness: cleanlinessRating,
          punctuality: punctualityRating,
          communication: communicationRating,
          overall: overallRating,
        },
        improvements: improvements.split(',').map(item => item.trim()).filter(item => item !== ''),
        isVisible: true,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'reviews'), newReview);
      Alert.alert('평가 등록 성공', '청소 평가가 성공적으로 등록되었습니다.');
      // TODO: Navigate back or to a confirmation screen
    } catch (error: any) {
      Alert.alert('평가 등록 실패', error.message);
      console.error('Review submission error:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <Text style={styles.title}>청소 평가</Text>
        <Text style={styles.subtitle}>작업 ID: {jobId}</Text>

        <Text style={styles.label}>전체 별점:</Text>
        <TextInput
          style={styles.input}
          placeholder="1-5점 사이로 입력"
          keyboardType="numeric"
          value={String(rating)}
          onChangeText={(text) => setRating(parseInt(text) || 0)}
        />

        <Text style={styles.label}>코멘트:</Text>
        <TextInput
          style={styles.input}
          placeholder="자유롭게 코멘트를 남겨주세요."
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <Text style={styles.sectionTitle}>세부 평가</Text>
        <Text style={styles.label}>청결도 (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(cleanlinessRating)} onChangeText={(text) => setCleanlinessRating(parseInt(text) || 0)} />
        <Text style={styles.label}>시간 준수 (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(punctualityRating)} onChangeText={(text) => setPunctualityRating(parseInt(text) || 0)} />
        <Text style={styles.label}>소통 (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(communicationRating)} onChangeText={(text) => setCommunicationRating(parseInt(text) || 0)} />
        <Text style={styles.label}>전체 만족도 (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(overallRating)} onChangeText={(text) => setOverallRating(parseInt(text) || 0)} />

        <Text style={styles.label}>개선사항 (쉼표로 구분):</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 창문 청소 개선, 바닥 얼룩 제거"
          value={improvements}
          onChangeText={setImprovements}
          multiline
        />

        <Button title="평가 제출" onPress={handleSubmitReview} />
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
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#555',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    alignSelf: 'flex-start',
    color: '#555',
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
});

export default CleaningReviewScreen;
