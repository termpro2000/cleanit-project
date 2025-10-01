// Performance Optimization Utilities
import React from 'react';
import { config, trackPerformance } from '../config/environment';

// 이미지 최적화
export const optimizeImage = async (
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<Blob> => {
  const startTime = performance.now();

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 최적 크기 계산
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx?.drawImage(img, 0, 0, width, height);

      // 최적화된 이미지를 Blob으로 변환
      canvas.toBlob(
        (blob) => {
          const endTime = performance.now();
          trackPerformance('image-optimization', endTime - startTime);
          resolve(blob || new Blob());
        },
        'image/jpeg',
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// 청크별 업로드 (대용량 파일)
export const uploadInChunks = async (
  file: Blob,
  uploadFunction: (chunk: Blob, index: number, total: number) => Promise<void>,
  chunkSize = 1024 * 1024 // 1MB 청크
): Promise<void> => {
  const startTime = performance.now();
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    await uploadFunction(chunk, i, totalChunks);
  }

  const endTime = performance.now();
  trackPerformance('chunked-upload', endTime - startTime);
};

// 지연 로딩 Hook
export const useLazyLoad = (callback: () => void, deps: any[] = []) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      callback();
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, deps);

  return isLoaded;
};

// 메모이제이션 캐시
class MemoCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private readonly ttl: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    // 5분 기본 TTL
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const apiCache = new MemoCache(10 * 60 * 1000); // 10분 캐시

// 배치 요청 최적화
export class BatchRequestManager<T> {
  private pending: Array<{
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    key: string;
  }> = [];

  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly batchDelay: number;

  constructor(
    private batchFunction: (keys: string[]) => Promise<T[]>,
    batchSize = 10,
    batchDelayMs = 100
  ) {
    this.batchSize = batchSize;
    this.batchDelay = batchDelayMs;
  }

  request(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject, key });

      if (this.pending.length >= this.batchSize) {
        this.flush();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const currentBatch = this.pending.splice(0, this.batchSize);
    if (currentBatch.length === 0) return;

    const startTime = performance.now();

    try {
      const keys = currentBatch.map((item) => item.key);
      const results = await this.batchFunction(keys);

      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });

      const endTime = performance.now();
      trackPerformance('batch-request', endTime - startTime);
    } catch (error) {
      currentBatch.forEach((item) => {
        item.reject(error as Error);
      });
    }
  }
}

// Virtual Scrolling 최적화
export const calculateVirtualScrolling = (
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
): {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
} => {
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItems + 2, totalItems); // 2개 추가 버퍼

  return {
    startIndex: Math.max(0, startIndex - 2), // 2개 이전 버퍼
    endIndex,
    offsetY: startIndex * itemHeight,
    totalHeight: totalItems * itemHeight,
  };
};

// 디바운스 Hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 쓰로틀링 Hook
export const useThrottle = <T>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= limit) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      limit - (Date.now() - lastRan.current)
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// 메모리 사용량 모니터링
export const monitorMemoryUsage = (): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
} => {
  const memory = (performance as any).memory;

  if (!memory) {
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercentage: 0,
    };
  }

  const usagePercentage =
    (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

  if (usagePercentage > 80) {
    console.warn('메모리 사용량이 높습니다:', usagePercentage.toFixed(2) + '%');
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage,
  };
};

// 네트워크 상태 모니터링
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [connectionSpeed, setConnectionSpeed] = React.useState<'slow' | 'fast'>(
    'fast'
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 연결 속도 추정
    const connection = (navigator as any).connection;
    if (connection) {
      const updateConnectionSpeed = () => {
        const effectiveType = connection.effectiveType;
        setConnectionSpeed(
          ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast'
        );
      };

      connection.addEventListener('change', updateConnectionSpeed);
      updateConnectionSpeed();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionSpeed };
};

// 성능 메트릭 수집
export const collectPerformanceMetrics = () => {
  const navigation = performance.getEntriesByType(
    'navigation'
  )[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  const metrics = {
    // 페이지 로드 시간
    pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,

    // DOM 준비 시간
    domReadyTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,

    // First Paint
    firstPaint:
      paint.find((entry) => entry.name === 'first-paint')?.startTime || 0,

    // First Contentful Paint
    firstContentfulPaint:
      paint.find((entry) => entry.name === 'first-contentful-paint')
        ?.startTime || 0,

    // 네트워크 시간
    networkTime: navigation.responseEnd - navigation.fetchStart,

    // 서버 응답 시간
    serverResponseTime: navigation.responseStart - navigation.requestStart,

    // 메모리 사용량
    memory: monitorMemoryUsage(),
  };

  // 성능 임계값 체크
  if (metrics.pageLoadTime > 3000) {
    console.warn(
      '페이지 로드 시간이 3초를 초과했습니다:',
      metrics.pageLoadTime + 'ms'
    );
  }

  if (metrics.firstContentfulPaint > 1500) {
    console.warn(
      'First Contentful Paint가 1.5초를 초과했습니다:',
      metrics.firstContentfulPaint + 'ms'
    );
  }

  return metrics;
};

// 성능 최적화 가이드라인
export const performanceGuidelines = {
  images: {
    maxWidth: 1920,
    maxFileSize: config.api.maxFileSize,
    recommendedFormats: ['webp', 'jpeg', 'png'],
    compressionQuality: 0.8,
  },

  lists: {
    virtualScrollThreshold: 100, // 100개 이상 항목시 가상 스크롤링 사용
    batchSize: 20, // 한 번에 로드할 항목 수
  },

  api: {
    timeout: config.api.timeout,
    retryAttempts: 3,
    cacheTimeout: 10 * 60 * 1000, // 10분
  },

  memory: {
    warningThreshold: 80, // 메모리 사용량 80% 경고
    criticalThreshold: 90, // 메모리 사용량 90% 위험
  },
};
