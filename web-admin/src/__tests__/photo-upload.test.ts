import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  cleanup,
} from '@firebase/rules-unit-testing';

// TEST-004: 사진 업로드 테스트
describe('Photo Upload System Tests', () => {
  let testEnv: RulesTestEnvironment;
  const projectId = 'cleanit-photo-test';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /{document=**} {
                allow read, write: if true;
              }
            }
          }
        `,
      },
      storage: {
        rules: `
          rules_version = '2';
          service firebase.storage {
            match /b/{bucket}/o {
              match /{allPaths=**} {
                allow read, write: if true;
              }
            }
          }
        `,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
    await cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test('should validate image file types', () => {
    const validateImageFile = (fileName: string, fileType: string): boolean => {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      const hasValidType = allowedTypes.includes(fileType.toLowerCase());
      const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.toLowerCase().endsWith(ext)
      );

      return hasValidType && hasValidExtension;
    };

    // 유효한 이미지 파일들
    const validFiles = [
      { name: 'photo.jpg', type: 'image/jpeg' },
      { name: 'image.png', type: 'image/png' },
      { name: 'picture.webp', type: 'image/webp' },
      { name: 'PHOTO.JPG', type: 'image/jpeg' },
    ];

    // 유효하지 않은 파일들
    const invalidFiles = [
      { name: 'document.pdf', type: 'application/pdf' },
      { name: 'video.mp4', type: 'video/mp4' },
      { name: 'photo.gif', type: 'image/gif' },
      { name: 'file.txt', type: 'text/plain' },
    ];

    validFiles.forEach((file) => {
      expect(validateImageFile(file.name, file.type)).toBe(true);
    });

    invalidFiles.forEach((file) => {
      expect(validateImageFile(file.name, file.type)).toBe(false);
    });
  });

  test('should validate image file size limits', () => {
    const validateImageSize = (fileSize: number): boolean => {
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      return fileSize <= maxSizeInBytes;
    };

    // 유효한 파일 크기들 (5MB 이하)
    const validSizes = [
      1024 * 1024, // 1MB
      2 * 1024 * 1024, // 2MB
      5 * 1024 * 1024, // 5MB (경계값)
    ];

    // 유효하지 않은 파일 크기들 (5MB 초과)
    const invalidSizes = [
      6 * 1024 * 1024, // 6MB
      10 * 1024 * 1024, // 10MB
      20 * 1024 * 1024, // 20MB
    ];

    validSizes.forEach((size) => {
      expect(validateImageSize(size)).toBe(true);
    });

    invalidSizes.forEach((size) => {
      expect(validateImageSize(size)).toBe(false);
    });
  });

  test('should generate proper storage paths', () => {
    const generateStoragePath = (
      type: 'before' | 'after' | 'request' | 'profile',
      jobId?: string,
      requestId?: string,
      userId?: string,
      fileName?: string
    ): string => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);

      switch (type) {
        case 'before':
          return `jobs/${jobId}/before/${timestamp}_${randomId}_${fileName}`;
        case 'after':
          return `jobs/${jobId}/after/${timestamp}_${randomId}_${fileName}`;
        case 'request':
          return `requests/${requestId}/photos/${timestamp}_${randomId}_${fileName}`;
        case 'profile':
          return `users/${userId}/profile/${timestamp}_${randomId}_${fileName}`;
        default:
          return `misc/${timestamp}_${randomId}_${fileName}`;
      }
    };

    // 작업 전 사진 경로
    const beforePath = generateStoragePath(
      'before',
      'job123',
      undefined,
      undefined,
      'before.jpg'
    );
    expect(beforePath).toContain('jobs/job123/before/');
    expect(beforePath).toContain('before.jpg');

    // 작업 후 사진 경로
    const afterPath = generateStoragePath(
      'after',
      'job456',
      undefined,
      undefined,
      'after.png'
    );
    expect(afterPath).toContain('jobs/job456/after/');
    expect(afterPath).toContain('after.png');

    // 요청사항 사진 경로
    const requestPath = generateStoragePath(
      'request',
      undefined,
      'req789',
      undefined,
      'issue.jpg'
    );
    expect(requestPath).toContain('requests/req789/photos/');
    expect(requestPath).toContain('issue.jpg');

    // 프로필 사진 경로
    const profilePath = generateStoragePath(
      'profile',
      undefined,
      undefined,
      'user101',
      'profile.png'
    );
    expect(profilePath).toContain('users/user101/profile/');
    expect(profilePath).toContain('profile.png');
  });

  test('should handle multiple photo uploads for jobs', async () => {
    const simulatePhotoUpload = async (
      jobId: string,
      type: 'before' | 'after',
      photoCount: number
    ): Promise<string[]> => {
      const uploadedPhotos: string[] = [];

      for (let i = 1; i <= photoCount; i++) {
        const fileName = `${type}_photo_${i}.jpg`;
        const storagePath = `jobs/${jobId}/${type}/${Date.now()}_${fileName}`;

        // 실제 업로드 대신 경로만 시뮬레이션
        uploadedPhotos.push(storagePath);
      }

      return uploadedPhotos;
    };

    // 작업 전 사진 업로드 (최대 7장)
    const beforePhotos = await simulatePhotoUpload('job-test', 'before', 7);
    expect(beforePhotos).toHaveLength(7);
    expect(beforePhotos[0]).toContain('jobs/job-test/before/');
    expect(beforePhotos[6]).toContain('before_photo_7.jpg');

    // 작업 후 사진 업로드 (최대 7장)
    const afterPhotos = await simulatePhotoUpload('job-test', 'after', 5);
    expect(afterPhotos).toHaveLength(5);
    expect(afterPhotos[0]).toContain('jobs/job-test/after/');
  });

  test('should validate maximum photo count limits', () => {
    const validatePhotoCount = (
      type: 'job' | 'request' | 'profile',
      currentCount: number,
      newCount: number
    ): boolean => {
      const limits = {
        job: 7, // 작업 사진 (전/후 각각 최대 7장)
        request: 5, // 요청사항 사진 (최대 5장)
        profile: 1, // 프로필 사진 (1장)
      };

      return currentCount + newCount <= limits[type];
    };

    // 작업 사진 제한 테스트
    expect(validatePhotoCount('job', 5, 2)).toBe(true); // 5 + 2 = 7 (허용)
    expect(validatePhotoCount('job', 6, 2)).toBe(false); // 6 + 2 = 8 (초과)
    expect(validatePhotoCount('job', 0, 7)).toBe(true); // 0 + 7 = 7 (허용)

    // 요청사항 사진 제한 테스트
    expect(validatePhotoCount('request', 3, 2)).toBe(true); // 3 + 2 = 5 (허용)
    expect(validatePhotoCount('request', 4, 2)).toBe(false); // 4 + 2 = 6 (초과)

    // 프로필 사진 제한 테스트
    expect(validatePhotoCount('profile', 0, 1)).toBe(true); // 0 + 1 = 1 (허용)
    expect(validatePhotoCount('profile', 1, 1)).toBe(false); // 1 + 1 = 2 (초과)
  });

  test('should handle photo upload progress tracking', async () => {
    const simulateUploadProgress = async (
      fileSize: number
    ): Promise<number[]> => {
      const progressSteps: number[] = [];

      return new Promise((resolve) => {
        let uploaded = 0;
        const chunkSize = fileSize / 10; // 10% 단위로 진행

        const uploadInterval = setInterval(() => {
          uploaded += chunkSize;
          const progress = Math.min(
            Math.round((uploaded / fileSize) * 100),
            100
          );
          progressSteps.push(progress);

          if (progress >= 100) {
            clearInterval(uploadInterval);
            resolve(progressSteps);
          }
        }, 50);
      });
    };

    const progressSteps = await simulateUploadProgress(1024 * 1024); // 1MB 파일

    expect(progressSteps).toContain(100); // 100% 완료
    expect(progressSteps.length).toBeGreaterThan(5); // 여러 단계의 진행 상황
    expect(progressSteps[progressSteps.length - 1]).toBe(100); // 마지막은 100%
  });

  test('should handle photo compression before upload', () => {
    const simulateImageCompression = (
      originalSize: number,
      quality: number = 0.8
    ): { compressedSize: number; compressionRatio: number } => {
      // 압축 시뮬레이션 (실제로는 Canvas API나 라이브러리 사용)
      const compressionFactor = quality * 0.7 + 0.3; // 0.3 ~ 1.0 범위
      const compressedSize = Math.round(originalSize * compressionFactor);
      const compressionRatio =
        ((originalSize - compressedSize) / originalSize) * 100;

      return { compressedSize, compressionRatio };
    };

    // 다양한 품질로 압축 테스트
    const originalSize = 5 * 1024 * 1024; // 5MB

    const highQuality = simulateImageCompression(originalSize, 0.9);
    expect(highQuality.compressionRatio).toBeLessThan(30); // 30% 미만 압축

    const mediumQuality = simulateImageCompression(originalSize, 0.7);
    expect(mediumQuality.compressionRatio).toBeGreaterThan(20); // 20% 이상 압축

    const lowQuality = simulateImageCompression(originalSize, 0.5);
    expect(lowQuality.compressionRatio).toBeGreaterThan(40); // 40% 이상 압축
  });

  test('should handle photo metadata extraction', () => {
    const extractPhotoMetadata = (file: {
      name: string;
      size: number;
      lastModified: number;
      type: string;
    }) => {
      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date(),
        lastModified: new Date(file.lastModified),
        fileSizeFormatted: formatFileSize(file.size),
      };
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const testFile = {
      name: 'test_photo.jpg',
      size: 2048576, // 2MB
      lastModified: Date.now() - 3600000, // 1시간 전
      type: 'image/jpeg',
    };

    const metadata = extractPhotoMetadata(testFile);

    expect(metadata.fileName).toBe('test_photo.jpg');
    expect(metadata.fileType).toBe('image/jpeg');
    expect(metadata.fileSizeFormatted).toBe('2 MB');
    expect(metadata.uploadedAt).toBeInstanceOf(Date);
  });

  test('should handle photo upload error scenarios', async () => {
    const simulateUploadWithErrors = async (
      scenario: 'network_error' | 'storage_full' | 'invalid_file' | 'success'
    ): Promise<{ success: boolean; error?: string; retryable?: boolean }> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          switch (scenario) {
            case 'network_error':
              resolve({
                success: false,
                error: 'Network connection failed',
                retryable: true,
              });
              break;
            case 'storage_full':
              resolve({
                success: false,
                error: 'Storage quota exceeded',
                retryable: false,
              });
              break;
            case 'invalid_file':
              resolve({
                success: false,
                error: 'Invalid file format',
                retryable: false,
              });
              break;
            case 'success':
              resolve({
                success: true,
              });
              break;
          }
        }, 100);
      });
    };

    // 성공 케이스
    const successResult = await simulateUploadWithErrors('success');
    expect(successResult.success).toBe(true);
    expect(successResult.error).toBeUndefined();

    // 네트워크 오류 (재시도 가능)
    const networkErrorResult = await simulateUploadWithErrors('network_error');
    expect(networkErrorResult.success).toBe(false);
    expect(networkErrorResult.retryable).toBe(true);

    // 저장소 부족 (재시도 불가능)
    const storageFullResult = await simulateUploadWithErrors('storage_full');
    expect(storageFullResult.success).toBe(false);
    expect(storageFullResult.retryable).toBe(false);

    // 잘못된 파일 형식 (재시도 불가능)
    const invalidFileResult = await simulateUploadWithErrors('invalid_file');
    expect(invalidFileResult.success).toBe(false);
    expect(invalidFileResult.retryable).toBe(false);
  });

  test('should handle batch photo operations', async () => {
    const simulateBatchUpload = async (
      photos: Array<{ id: string; name: string; size: number }>
    ): Promise<{
      successful: string[];
      failed: Array<{ id: string; error: string }>;
      totalUploaded: number;
    }> => {
      const successful: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const photo of photos) {
        // 큰 파일이나 특정 이름으로 실패 시뮬레이션
        if (photo.size > 5 * 1024 * 1024) {
          failed.push({ id: photo.id, error: 'File too large' });
        } else if (photo.name.includes('invalid')) {
          failed.push({ id: photo.id, error: 'Invalid file name' });
        } else {
          successful.push(photo.id);
        }
      }

      return {
        successful,
        failed,
        totalUploaded: successful.length,
      };
    };

    const testPhotos = [
      { id: 'photo1', name: 'before1.jpg', size: 2 * 1024 * 1024 },
      { id: 'photo2', name: 'before2.jpg', size: 3 * 1024 * 1024 },
      { id: 'photo3', name: 'invalid_photo.jpg', size: 1 * 1024 * 1024 },
      { id: 'photo4', name: 'large_photo.jpg', size: 6 * 1024 * 1024 },
      { id: 'photo5', name: 'before5.jpg', size: 1.5 * 1024 * 1024 },
    ];

    const result = await simulateBatchUpload(testPhotos);

    expect(result.successful).toHaveLength(3); // photo1, photo2, photo5
    expect(result.failed).toHaveLength(2); // photo3, photo4
    expect(result.totalUploaded).toBe(3);

    expect(result.successful).toContain('photo1');
    expect(result.successful).toContain('photo2');
    expect(result.successful).toContain('photo5');

    expect(
      result.failed.some(
        (f) => f.id === 'photo3' && f.error.includes('Invalid')
      )
    ).toBe(true);
    expect(
      result.failed.some(
        (f) => f.id === 'photo4' && f.error.includes('too large')
      )
    ).toBe(true);
  });

  test('should generate photo thumbnails', () => {
    const generateThumbnailPath = (
      originalPath: string,
      size: 'small' | 'medium' | 'large'
    ): string => {
      const sizes = {
        small: '150x150',
        medium: '300x300',
        large: '600x600',
      };

      const pathParts = originalPath.split('/');
      const fileName = pathParts.pop();
      const fileNameWithoutExt = fileName?.split('.')[0];
      const fileExt = fileName?.split('.').pop();

      const thumbnailFileName = `${fileNameWithoutExt}_thumb_${sizes[size]}.${fileExt}`;

      return [...pathParts, 'thumbnails', thumbnailFileName].join('/');
    };

    const originalPath = 'jobs/job123/before/1234567890_abc123_photo.jpg';

    const smallThumb = generateThumbnailPath(originalPath, 'small');
    const mediumThumb = generateThumbnailPath(originalPath, 'medium');
    const largeThumb = generateThumbnailPath(originalPath, 'large');

    expect(smallThumb).toContain(
      'thumbnails/1234567890_abc123_photo_thumb_150x150.jpg'
    );
    expect(mediumThumb).toContain(
      'thumbnails/1234567890_abc123_photo_thumb_300x300.jpg'
    );
    expect(largeThumb).toContain(
      'thumbnails/1234567890_abc123_photo_thumb_600x600.jpg'
    );
  });
});
