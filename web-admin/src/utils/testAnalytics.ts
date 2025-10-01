// User Testing Analytics and Data Collection
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../monitoring/logger';

export interface UserSession {
  id?: string;
  userId: string;
  userRole: 'manager' | 'worker' | 'client';
  sessionStart: Timestamp;
  sessionEnd?: Timestamp;
  duration?: number; // seconds
  pageViews: PageView[];
  actions: UserAction[];
  errors: SessionError[];
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    browser: string;
    platform: string;
    isMobile: boolean;
  };
  performanceMetrics: PerformanceMetric[];
  exitReason?: 'normal' | 'error' | 'timeout' | 'navigation';
}

export interface PageView {
  page: string;
  timestamp: Timestamp;
  timeSpent?: number; // seconds
  scrollDepth?: number; // percentage
  interactions: number;
}

export interface UserAction {
  action: string;
  target: string;
  timestamp: Timestamp;
  data?: Record<string, any>;
  duration?: number;
  success: boolean;
}

export interface SessionError {
  error: string;
  stack?: string;
  timestamp: Timestamp;
  page: string;
  userAction?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  timestamp: Timestamp;
  page: string;
}

export interface TestScenario {
  id?: string;
  name: string;
  description: string;
  userRole: 'manager' | 'worker' | 'client';
  steps: TestStep[];
  expectedDuration: number; // minutes
  priority: 'low' | 'medium' | 'high';
  category: 'core' | 'advanced' | 'edge_case';
}

export interface TestStep {
  stepNumber: number;
  description: string;
  expectedResult: string;
  page: string;
  action: string;
  isOptional: boolean;
}

export interface TestExecution {
  id?: string;
  scenarioId: string;
  userId: string;
  userRole: 'manager' | 'worker' | 'client';
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number; // minutes
  completedSteps: number;
  totalSteps: number;
  completionRate: number; // percentage
  status: 'in_progress' | 'completed' | 'failed' | 'abandoned';
  stepResults: StepResult[];
  overallRating?: number; // 1-5
  feedback?: string;
  errors: string[];
}

export interface StepResult {
  stepNumber: number;
  success: boolean;
  timeSpent: number; // seconds
  attempts: number;
  errorMessage?: string;
  userFeedback?: string;
}

// Test Analytics Manager
class TestAnalyticsManager {
  private currentSession: UserSession | null = null;
  private currentPageView: PageView | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  // 세션 시작
  startSession(
    userId: string,
    userRole: 'manager' | 'worker' | 'client'
  ): void {
    this.currentSession = {
      userId,
      userRole,
      sessionStart: Timestamp.now(),
      pageViews: [],
      actions: [],
      errors: [],
      deviceInfo: this.getDeviceInfo(),
      performanceMetrics: [],
    };

    this.setupPerformanceMonitoring();
    this.trackPageView(window.location.pathname);

    logger.info('TestAnalytics', 'Session started', { userId, userRole });
  }

  // 세션 종료
  async endSession(
    exitReason: UserSession['exitReason'] = 'normal'
  ): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.sessionEnd = Timestamp.now();
    this.currentSession.duration = this.calculateDuration(
      this.currentSession.sessionStart,
      this.currentSession.sessionEnd
    );
    this.currentSession.exitReason = exitReason;

    // 마지막 페이지뷰 완료
    this.endCurrentPageView();

    try {
      await addDoc(collection(db, 'userSessions'), this.currentSession);
      logger.info('TestAnalytics', 'Session ended and saved', {
        duration: this.currentSession.duration,
        exitReason,
      });
    } catch (error) {
      logger.error('TestAnalytics', 'Failed to save session', error as Error);
    }

    this.currentSession = null;
    this.cleanup();
  }

  // 페이지 조회 추적
  trackPageView(page: string): void {
    if (!this.currentSession) return;

    // 이전 페이지뷰 종료
    this.endCurrentPageView();

    // 새 페이지뷰 시작
    this.currentPageView = {
      page,
      timestamp: Timestamp.now(),
      interactions: 0,
    };

    this.currentSession.pageViews.push(this.currentPageView);

    logger.debug('TestAnalytics', 'Page view tracked', { page });
  }

  // 사용자 액션 추적
  trackAction(
    action: string,
    target: string,
    data?: Record<string, any>,
    success: boolean = true
  ): void {
    if (!this.currentSession) return;

    const userAction: UserAction = {
      action,
      target,
      timestamp: Timestamp.now(),
      data,
      success,
    };

    this.currentSession.actions.push(userAction);

    // 현재 페이지의 상호작용 수 증가
    if (this.currentPageView) {
      this.currentPageView.interactions++;
    }

    logger.debug('TestAnalytics', 'User action tracked', {
      action,
      target,
      success,
    });
  }

  // 에러 추적
  trackError(
    error: string,
    severity: SessionError['severity'],
    stack?: string,
    userAction?: string
  ): void {
    if (!this.currentSession) return;

    const sessionError: SessionError = {
      error,
      stack,
      timestamp: Timestamp.now(),
      page: window.location.pathname,
      userAction,
      severity,
    };

    this.currentSession.errors.push(sessionError);

    logger.error(
      'TestAnalytics',
      'Error tracked',
      new Error(sessionError.error)
    );
  }

  // 성능 메트릭 추적
  trackPerformance(metric: string, value: number): void {
    if (!this.currentSession) return;

    const performanceMetric: PerformanceMetric = {
      metric,
      value,
      timestamp: Timestamp.now(),
      page: window.location.pathname,
    };

    this.currentSession.performanceMetrics.push(performanceMetric);

    logger.debug('TestAnalytics', 'Performance metric tracked', {
      metric,
      value,
    });
  }

  // 스크롤 깊이 추적
  trackScrollDepth(percentage: number): void {
    if (this.currentPageView) {
      this.currentPageView.scrollDepth = Math.max(
        this.currentPageView.scrollDepth || 0,
        percentage
      );
    }
  }

  private endCurrentPageView(): void {
    if (this.currentPageView) {
      const now = Timestamp.now();
      this.currentPageView.timeSpent = this.calculateDuration(
        this.currentPageView.timestamp,
        now
      );
    }
  }

  private calculateDuration(start: Timestamp, end: Timestamp): number {
    return Math.round((end.toMillis() - start.toMillis()) / 1000);
  }

  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      browser: this.getBrowser(),
      platform: navigator.platform,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
    };
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.trackPerformance(entry.name, entry.duration);
          }
        });
      });

      this.performanceObserver.observe({
        entryTypes: ['measure', 'navigation'],
      });
    }
  }

  private cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

// 싱글톤 인스턴스
export const testAnalytics = new TestAnalyticsManager();

// 테스트 시나리오 관리
export class TestScenarioManager {
  // 기본 테스트 시나리오 생성
  static async createDefaultScenarios(): Promise<void> {
    const scenarios: Omit<TestScenario, 'id'>[] = [
      // Manager 시나리오
      {
        name: '관리자 초기 설정',
        description: '회사 등록부터 첫 번째 작업 배정까지',
        userRole: 'manager',
        expectedDuration: 15,
        priority: 'high',
        category: 'core',
        steps: [
          {
            stepNumber: 1,
            description: '회사 정보 등록',
            expectedResult: '회사 정보가 성공적으로 저장됨',
            page: '/company-registration',
            action: 'submit_form',
            isOptional: false,
          },
          {
            stepNumber: 2,
            description: 'Worker 계정 생성',
            expectedResult: 'Worker 계정이 생성되고 이메일 발송됨',
            page: '/worker-management',
            action: 'create_worker',
            isOptional: false,
          },
          {
            stepNumber: 3,
            description: '건물 정보 등록',
            expectedResult: '건물이 시스템에 등록됨',
            page: '/building-registration',
            action: 'register_building',
            isOptional: false,
          },
          {
            stepNumber: 4,
            description: '첫 번째 작업 배정',
            expectedResult: 'Worker에게 작업이 배정됨',
            page: '/worker-assignment',
            action: 'assign_job',
            isOptional: false,
          },
        ],
      },

      // Worker 시나리오
      {
        name: '작업자 일일 업무',
        description: '로그인부터 작업 완료까지 전체 프로세스',
        userRole: 'worker',
        expectedDuration: 10,
        priority: 'high',
        category: 'core',
        steps: [
          {
            stepNumber: 1,
            description: '앱 로그인',
            expectedResult: '정상적으로 로그인됨',
            page: '/login',
            action: 'login',
            isOptional: false,
          },
          {
            stepNumber: 2,
            description: '오늘의 작업 확인',
            expectedResult: '배정된 작업 목록이 표시됨',
            page: '/jobs',
            action: 'view_jobs',
            isOptional: false,
          },
          {
            stepNumber: 3,
            description: '작업 시작',
            expectedResult: '작업 상태가 "진행중"으로 변경됨',
            page: '/job-detail',
            action: 'start_job',
            isOptional: false,
          },
          {
            stepNumber: 4,
            description: '청소 전 사진 촬영',
            expectedResult: '최대 7장의 사진이 업로드됨',
            page: '/job-detail',
            action: 'upload_before_photos',
            isOptional: false,
          },
          {
            stepNumber: 5,
            description: '청소 후 사진 촬영',
            expectedResult: '최대 7장의 사진이 업로드됨',
            page: '/job-detail',
            action: 'upload_after_photos',
            isOptional: false,
          },
          {
            stepNumber: 6,
            description: '작업 완료',
            expectedResult: '작업이 완료 처리됨',
            page: '/job-detail',
            action: 'complete_job',
            isOptional: false,
          },
        ],
      },

      // Client 시나리오
      {
        name: '고객 서비스 이용',
        description: '건물 등록부터 작업 평가까지',
        userRole: 'client',
        expectedDuration: 8,
        priority: 'high',
        category: 'core',
        steps: [
          {
            stepNumber: 1,
            description: '건물 등록',
            expectedResult: '건물 정보가 등록됨',
            page: '/building-registration',
            action: 'register_building',
            isOptional: false,
          },
          {
            stepNumber: 2,
            description: '청소업체 연결',
            expectedResult: '청소업체와 연결됨',
            page: '/company-connection',
            action: 'connect_company',
            isOptional: false,
          },
          {
            stepNumber: 3,
            description: '작업 현황 모니터링',
            expectedResult: '실시간 작업 상태 확인 가능',
            page: '/job-monitoring',
            action: 'monitor_job',
            isOptional: false,
          },
          {
            stepNumber: 4,
            description: '요청사항 등록',
            expectedResult: '특별 요청이 등록됨',
            page: '/requests',
            action: 'create_request',
            isOptional: true,
          },
          {
            stepNumber: 5,
            description: '작업 완료 후 평가',
            expectedResult: '평가가 저장되고 Worker에게 전달됨',
            page: '/job-review',
            action: 'submit_review',
            isOptional: false,
          },
        ],
      },
    ];

    try {
      for (const scenario of scenarios) {
        await addDoc(collection(db, 'testScenarios'), scenario);
      }
      logger.info('TestScenario', 'Default scenarios created', {
        count: scenarios.length,
      });
    } catch (error) {
      logger.error(
        'TestScenario',
        'Failed to create scenarios',
        error as Error
      );
    }
  }

  // 테스트 실행 시작
  static async startTestExecution(
    scenarioId: string,
    userId: string,
    userRole: 'manager' | 'worker' | 'client'
  ): Promise<string> {
    const execution: Omit<TestExecution, 'id'> = {
      scenarioId,
      userId,
      userRole,
      startTime: Timestamp.now(),
      completedSteps: 0,
      totalSteps: 0, // Will be updated when scenario is loaded
      completionRate: 0,
      status: 'in_progress',
      stepResults: [],
      errors: [],
    };

    try {
      const docRef = await addDoc(collection(db, 'testExecutions'), execution);
      logger.info('TestExecution', 'Test execution started', {
        scenarioId,
        userId,
      });
      return docRef.id;
    } catch (error) {
      logger.error(
        'TestExecution',
        'Failed to start test execution',
        error as Error
      );
      throw error;
    }
  }

  // 테스트 분석 리포트 생성
  static async generateAnalyticsReport(): Promise<{
    summary: TestSummary;
    scenarios: ScenarioAnalysis[];
    userBehavior: UserBehaviorAnalysis;
    performance: PerformanceAnalysis;
    feedback: FeedbackAnalysis;
  }> {
    // 구현 로직...
    return {
      summary: {
        totalSessions: 0,
        totalUsers: 0,
        averageSessionDuration: 0,
        completionRate: 0,
        errorRate: 0,
        satisfactionScore: 0,
      },
      scenarios: [],
      userBehavior: {
        mostUsedFeatures: [],
        commonUserPaths: [],
        dropOffPoints: [],
        timeSpentByPage: {},
      },
      performance: {
        averagePageLoadTime: 0,
        slowestPages: [],
        errorFrequency: {},
        memoryUsage: 0,
      },
      feedback: {
        totalFeedback: 0,
        satisfactionDistribution: {},
        commonIssues: [],
        featureRequests: [],
      },
    };
  }
}

// 타입 정의
export interface TestSummary {
  totalSessions: number;
  totalUsers: number;
  averageSessionDuration: number;
  completionRate: number;
  errorRate: number;
  satisfactionScore: number;
}

export interface ScenarioAnalysis {
  scenarioId: string;
  name: string;
  completionRate: number;
  averageDuration: number;
  commonFailurePoints: string[];
  userSatisfaction: number;
}

export interface UserBehaviorAnalysis {
  mostUsedFeatures: Array<{ feature: string; usage: number }>;
  commonUserPaths: Array<{ path: string[]; frequency: number }>;
  dropOffPoints: Array<{ page: string; dropOffRate: number }>;
  timeSpentByPage: Record<string, number>;
}

export interface PerformanceAnalysis {
  averagePageLoadTime: number;
  slowestPages: Array<{ page: string; loadTime: number }>;
  errorFrequency: Record<string, number>;
  memoryUsage: number;
}

export interface FeedbackAnalysis {
  totalFeedback: number;
  satisfactionDistribution: Record<number, number>;
  commonIssues: Array<{ issue: string; frequency: number }>;
  featureRequests: Array<{ request: string; votes: number }>;
}

// 자동 추적 설정
export const setupAutoTracking = () => {
  // 페이지 네비게이션 추적
  window.addEventListener('popstate', () => {
    testAnalytics.trackPageView(window.location.pathname);
  });

  // 스크롤 추적
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollDepth = Math.round(
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
            100
        );
        testAnalytics.trackScrollDepth(scrollDepth);
        ticking = false;
      });
      ticking = true;
    }
  });

  // 클릭 이벤트 추적
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const className = target.className;
    const id = target.id;

    testAnalytics.trackAction(
      'click',
      `${tagName}${id ? '#' + id : ''}${className ? '.' + className : ''}`
    );
  });

  // 에러 추적
  window.addEventListener('error', (event) => {
    testAnalytics.trackError(event.message, 'high', event.error?.stack);
  });

  // 언로드 시 세션 종료
  window.addEventListener('beforeunload', () => {
    testAnalytics.endSession('navigation');
  });
};
