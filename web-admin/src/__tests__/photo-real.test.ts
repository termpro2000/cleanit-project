import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  listAll,
} from 'firebase/storage';
import { doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';

// TEST-004: 사진 업로드 테스트 (실제 Firebase Storage 사용)
describe('Photo Upload System Tests (Real Firebase Storage)', () => {
  const testPrefix = 'test_' + Date.now();
  const uploadedFiles: string[] = [];
  const createdDocuments: Array<{ collection: string; id: string }> = [];

  afterAll(async () => {
    // 업로드된 파일들 삭제
    const deletePromises = uploadedFiles.map(async (filePath) => {
      try {
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      } catch (error) {
        console.warn('Failed to delete test file:', filePath, error);
      }
    });

    // 생성된 문서들 삭제
    const docDeletePromises = createdDocuments.map(
      async ({ collection, id }) => {
        try {
          await deleteDoc(doc(db, collection, id));
        } catch (error) {
          console.warn(
            'Failed to delete test document:',
            collection,
            id,
            error
          );
        }
      }
    );

    await Promise.all([...deletePromises, ...docDeletePromises]);
  });

  const trackUploadedFile = (filePath: string) => {
    uploadedFiles.push(filePath);
  };

  const trackDocument = (collection: string, id: string) => {
    createdDocuments.push({ collection, id });
  };

  const createTestImageBlob = (width = 100, height = 100): Blob => {
    // Canvas를 사용해 테스트용 이미지 생성
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 간단한 테스트 이미지 그리기
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, width / 2, height);
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(width / 2, 0, width / 2, height);
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText('TEST', 10, height / 2);
    }

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob || new Blob());
        },
        'image/jpeg',
        0.8
      );
    }) as any;
  };

  test('should validate image file formats and sizes', () => {
    const validateImageFile = (
      fileName: string,
      fileSize: number,
      fileType: string
    ) => {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      const errors = [];

      // 파일 타입 검증
      if (!allowedTypes.includes(fileType.toLowerCase())) {
        errors.push('지원되지 않는 파일 형식입니다.');
      }

      // 파일 확장자 검증
      const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        errors.push('유효하지 않은 파일 확장자입니다.');
      }

      // 파일 크기 검증
      if (fileSize > maxSize) {
        errors.push('파일 크기가 5MB를 초과합니다.');
      }

      if (fileSize === 0) {
        errors.push('빈 파일입니다.');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    };

    // 유효한 파일들
    expect(
      validateImageFile('photo.jpg', 1024 * 1024, 'image/jpeg').isValid
    ).toBe(true);
    expect(
      validateImageFile('image.png', 2 * 1024 * 1024, 'image/png').isValid
    ).toBe(true);
    expect(
      validateImageFile('picture.webp', 3 * 1024 * 1024, 'image/webp').isValid
    ).toBe(true);

    // 유효하지 않은 파일들
    const oversizedResult = validateImageFile(
      'large.jpg',
      6 * 1024 * 1024,
      'image/jpeg'
    );
    expect(oversizedResult.isValid).toBe(false);
    expect(oversizedResult.errors).toContain('파일 크기가 5MB를 초과합니다.');

    const invalidTypeResult = validateImageFile(
      'document.pdf',
      1024,
      'application/pdf'
    );
    expect(invalidTypeResult.isValid).toBe(false);
    expect(invalidTypeResult.errors).toContain(
      '지원되지 않는 파일 형식입니다.'
    );

    const emptyFileResult = validateImageFile('empty.jpg', 0, 'image/jpeg');
    expect(emptyFileResult.isValid).toBe(false);
    expect(emptyFileResult.errors).toContain('빈 파일입니다.');
  });

  test('should generate proper storage paths for different photo types', () => {
    const generateStoragePath = (
      type: 'before' | 'after' | 'request' | 'profile',
      entityId: string,
      fileName: string
    ): string => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

      switch (type) {
        case 'before':
          return `jobs/${entityId}/before/${timestamp}_${randomId}_${cleanFileName}`;
        case 'after':
          return `jobs/${entityId}/after/${timestamp}_${randomId}_${cleanFileName}`;
        case 'request':
          return `requests/${entityId}/photos/${timestamp}_${randomId}_${cleanFileName}`;
        case 'profile':
          return `users/${entityId}/profile/${timestamp}_${randomId}_${cleanFileName}`;
        default:
          return `misc/${timestamp}_${randomId}_${cleanFileName}`;
      }
    };

    const beforePath = generateStoragePath(
      'before',
      'job123',
      'before_photo.jpg'
    );
    expect(beforePath).toMatch(
      /^jobs\/job123\/before\/\d+_[a-z0-9]+_before_photo\.jpg$/
    );

    const afterPath = generateStoragePath('after', 'job456', 'after_photo.png');
    expect(afterPath).toMatch(
      /^jobs\/job456\/after\/\d+_[a-z0-9]+_after_photo\.png$/
    );

    const requestPath = generateStoragePath(
      'request',
      'req789',
      'issue_photo.jpg'
    );
    expect(requestPath).toMatch(
      /^requests\/req789\/photos\/\d+_[a-z0-9]+_issue_photo\.jpg$/
    );

    const profilePath = generateStoragePath(
      'profile',
      'user101',
      'profile_pic.jpg'
    );
    expect(profilePath).toMatch(
      /^users\/user101\/profile\/\d+_[a-z0-9]+_profile_pic\.jpg$/
    );

    // 특수문자가 포함된 파일명 처리
    const specialCharsPath = generateStoragePath(
      'before',
      'job123',
      '사진 파일 (1).jpg'
    );
    expect(specialCharsPath).toContain('___1_.jpg');
  });

  test('should upload and retrieve job photos', async () => {
    const jobId = `${testPrefix}_job_photo`;
    const testImageBlob = createTestImageBlob(200, 150);

    // Before 사진 업로드
    const beforePhotoPath = `jobs/${jobId}/before/${Date.now()}_test_before.jpg`;
    const beforeRef = ref(storage, beforePhotoPath);
    trackUploadedFile(beforePhotoPath);

    const beforeUploadResult = await uploadBytes(
      beforeRef,
      await testImageBlob
    );
    expect(beforeUploadResult.metadata).toBeDefined();
    expect(beforeUploadResult.metadata.name).toContain('test_before.jpg');

    // Before 사진 다운로드 URL 얻기
    const beforeDownloadURL = await getDownloadURL(beforeRef);
    expect(beforeDownloadURL).toContain('firebasestorage.googleapis.com');

    // After 사진 업로드
    const afterPhotoPath = `jobs/${jobId}/after/${Date.now()}_test_after.jpg`;
    const afterRef = ref(storage, afterPhotoPath);
    trackUploadedFile(afterPhotoPath);

    const afterUploadResult = await uploadBytes(afterRef, await testImageBlob);
    expect(afterUploadResult.metadata).toBeDefined();

    const afterDownloadURL = await getDownloadURL(afterRef);
    expect(afterDownloadURL).toContain('firebasestorage.googleapis.com');

    // Job 문서에 사진 URL 저장
    const jobDocId = `${testPrefix}_job_with_photos`;
    trackDocument('test_jobs', jobDocId);

    await setDoc(doc(db, 'test_jobs', jobDocId), {
      id: jobDocId,
      buildingId: 'test-building',
      workerId: 'test-worker',
      status: 'completed',
      beforePhotos: [beforeDownloadURL],
      afterPhotos: [afterDownloadURL],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 저장된 데이터 확인
    const jobDoc = await getDoc(doc(db, 'test_jobs', jobDocId));
    const jobData = jobDoc.data();

    expect(jobData?.beforePhotos).toHaveLength(1);
    expect(jobData?.afterPhotos).toHaveLength(1);
    expect(jobData?.beforePhotos[0]).toBe(beforeDownloadURL);
    expect(jobData?.afterPhotos[0]).toBe(afterDownloadURL);
  }, 30000);

  test('should handle photo metadata and file information', async () => {
    const testImageBlob = createTestImageBlob(300, 200);
    const photoPath = `test_metadata/${testPrefix}_metadata_test.jpg`;
    const photoRef = ref(storage, photoPath);
    trackUploadedFile(photoPath);

    // 커스텀 메타데이터와 함께 업로드
    const customMetadata = {
      customMetadata: {
        uploadedBy: 'test-user',
        jobId: `${testPrefix}_job`,
        photoType: 'before',
        description: '청소 전 상태',
      },
    };

    await uploadBytes(photoRef, await testImageBlob, customMetadata);

    // 메타데이터 조회
    const metadata = await getMetadata(photoRef);

    expect(metadata.name).toContain('metadata_test.jpg');
    expect(metadata.contentType).toBe('image/jpeg');
    expect(metadata.size).toBeGreaterThan(0);
    expect(metadata.customMetadata?.uploadedBy).toBe('test-user');
    expect(metadata.customMetadata?.jobId).toBe(`${testPrefix}_job`);
    expect(metadata.customMetadata?.photoType).toBe('before');
    expect(metadata.timeCreated).toBeDefined();
    expect(metadata.updated).toBeDefined();
  }, 20000);

  test('should handle multiple photo uploads for a job', async () => {
    const jobId = `${testPrefix}_multi_photos`;
    const photoCount = 5;
    const uploadedPhotos = [];

    // 여러 사진 업로드
    for (let i = 1; i <= photoCount; i++) {
      const testImageBlob = createTestImageBlob(150, 150);
      const photoPath = `jobs/${jobId}/before/photo_${i}_${Date.now()}.jpg`;
      const photoRef = ref(storage, photoPath);
      trackUploadedFile(photoPath);

      await uploadBytes(photoRef, await testImageBlob);
      const downloadURL = await getDownloadURL(photoRef);
      uploadedPhotos.push(downloadURL);

      // 업로드 간격
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(uploadedPhotos).toHaveLength(photoCount);
    uploadedPhotos.forEach((url) => {
      expect(url).toContain('firebasestorage.googleapis.com');
    });

    // Job 문서에 모든 사진 URL 저장
    const jobDocId = `${testPrefix}_multi_photo_job`;
    trackDocument('test_jobs', jobDocId);

    await setDoc(doc(db, 'test_jobs', jobDocId), {
      id: jobDocId,
      buildingId: 'test-building',
      workerId: 'test-worker',
      status: 'in_progress',
      beforePhotos: uploadedPhotos,
      afterPhotos: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const jobDoc = await getDoc(doc(db, 'test_jobs', jobDocId));
    const jobData = jobDoc.data();

    expect(jobData?.beforePhotos).toHaveLength(photoCount);
  }, 45000);

  test('should handle request photos upload', async () => {
    const requestId = `${testPrefix}_request_photos`;
    const testImageBlob = createTestImageBlob(400, 300);

    // 요청사항 사진 업로드
    const photoPath = `requests/${requestId}/photos/${Date.now()}_issue_photo.jpg`;
    const photoRef = ref(storage, photoPath);
    trackUploadedFile(photoPath);

    await uploadBytes(photoRef, await testImageBlob);
    const downloadURL = await getDownloadURL(photoRef);

    // Request 문서 생성
    const requestDocId = `${testPrefix}_request_with_photo`;
    trackDocument('test_requests', requestDocId);

    await setDoc(doc(db, 'test_requests', requestDocId), {
      id: requestDocId,
      buildingId: 'test-building',
      requesterId: 'test-client',
      type: 'urgent',
      priority: 'high',
      title: '화장실 청소 요청',
      content: '화장실 상태가 좋지 않습니다.',
      photos: [downloadURL],
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const requestDoc = await getDoc(doc(db, 'test_requests', requestDocId));
    const requestData = requestDoc.data();

    expect(requestData?.photos).toHaveLength(1);
    expect(requestData?.photos[0]).toBe(downloadURL);
  }, 20000);

  test('should validate photo count limits', () => {
    const validatePhotoCount = (
      type: 'job_before' | 'job_after' | 'request' | 'profile',
      currentCount: number,
      newCount: number
    ): { isValid: boolean; error?: string; maxAllowed: number } => {
      const limits = {
        job_before: 7,
        job_after: 7,
        request: 5,
        profile: 1,
      };

      const maxAllowed = limits[type];
      const totalCount = currentCount + newCount;

      if (totalCount > maxAllowed) {
        return {
          isValid: false,
          error: `최대 ${maxAllowed}장까지만 업로드할 수 있습니다. (현재: ${currentCount}장, 추가: ${newCount}장)`,
          maxAllowed,
        };
      }

      return {
        isValid: true,
        maxAllowed,
      };
    };

    // 작업 사진 제한 테스트
    expect(validatePhotoCount('job_before', 5, 2).isValid).toBe(true);
    expect(validatePhotoCount('job_before', 6, 2).isValid).toBe(false);
    expect(validatePhotoCount('job_after', 0, 7).isValid).toBe(true);
    expect(validatePhotoCount('job_after', 7, 1).isValid).toBe(false);

    // 요청사항 사진 제한 테스트
    expect(validatePhotoCount('request', 3, 2).isValid).toBe(true);
    expect(validatePhotoCount('request', 4, 2).isValid).toBe(false);

    // 프로필 사진 제한 테스트
    expect(validatePhotoCount('profile', 0, 1).isValid).toBe(true);
    expect(validatePhotoCount('profile', 1, 1).isValid).toBe(false);

    const errorResult = validatePhotoCount('job_before', 6, 3);
    expect(errorResult.isValid).toBe(false);
    expect(errorResult.error).toContain('최대 7장까지만');
  });

  test('should list and manage job photos', async () => {
    const jobId = `${testPrefix}_list_photos`;
    const beforeFolderRef = ref(storage, `jobs/${jobId}/before/`);

    // 여러 before 사진 업로드
    const uploadPromises = [];
    for (let i = 1; i <= 3; i++) {
      const testImageBlob = createTestImageBlob(100, 100);
      const photoPath = `jobs/${jobId}/before/before_${i}_${Date.now()}.jpg`;
      const photoRef = ref(storage, photoPath);
      trackUploadedFile(photoPath);

      uploadPromises.push(uploadBytes(photoRef, await testImageBlob));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await Promise.all(uploadPromises);

    // 폴더 내 파일 목록 조회
    const listResult = await listAll(beforeFolderRef);
    expect(listResult.items.length).toBeGreaterThanOrEqual(3);

    // 각 파일의 다운로드 URL 획득
    const urlPromises = listResult.items.map((item) => getDownloadURL(item));
    const downloadURLs = await Promise.all(urlPromises);

    expect(downloadURLs).toHaveLength(listResult.items.length);
    downloadURLs.forEach((url) => {
      expect(url).toContain('firebasestorage.googleapis.com');
    });
  }, 30000);

  test('should handle photo compression simulation', () => {
    const simulateCompression = (
      originalSize: number,
      quality: number = 0.8
    ): {
      compressedSize: number;
      compressionRatio: number;
      shouldCompress: boolean;
    } => {
      const compressionThreshold = 1024 * 1024; // 1MB
      const shouldCompress = originalSize > compressionThreshold;

      if (!shouldCompress) {
        return {
          compressedSize: originalSize,
          compressionRatio: 0,
          shouldCompress: false,
        };
      }

      // 품질에 따른 압축 시뮬레이션
      const compressionFactor = Math.min(quality * 0.8 + 0.2, 1.0);
      const compressedSize = Math.round(originalSize * compressionFactor);
      const compressionRatio =
        ((originalSize - compressedSize) / originalSize) * 100;

      return {
        compressedSize,
        compressionRatio,
        shouldCompress: true,
      };
    };

    // 작은 파일 (압축 불필요)
    const smallFileResult = simulateCompression(500 * 1024); // 500KB
    expect(smallFileResult.shouldCompress).toBe(false);
    expect(smallFileResult.compressionRatio).toBe(0);

    // 큰 파일 (압축 필요)
    const largeFileResult = simulateCompression(5 * 1024 * 1024, 0.7); // 5MB
    expect(largeFileResult.shouldCompress).toBe(true);
    expect(largeFileResult.compressionRatio).toBeGreaterThan(20);
    expect(largeFileResult.compressedSize).toBeLessThan(5 * 1024 * 1024);

    // 다양한 품질 레벨 테스트
    const highQuality = simulateCompression(3 * 1024 * 1024, 0.9);
    const lowQuality = simulateCompression(3 * 1024 * 1024, 0.5);

    expect(highQuality.compressionRatio).toBeLessThan(
      lowQuality.compressionRatio
    );
    expect(highQuality.compressedSize).toBeGreaterThan(
      lowQuality.compressedSize
    );
  });

  test('should format file sizes correctly', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(2560000)).toBe('2.44 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');

    // 실제 파일 크기들
    expect(formatFileSize(500 * 1024)).toBe('500 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });
}, 120000); // 2분 타임아웃 설정
