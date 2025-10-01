// Comprehensive Logging and Monitoring System
import React from 'react';
import { config, isProduction, isDevelopment } from '../config/environment';
import { securityConfig } from '../security/securityConfig';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
  performance?: {
    duration?: number;
    memory?: any;
  };
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private logBuffer: LogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 30000; // 30초마다 플러시

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  private shouldLog(level: LogLevel): boolean {
    const minLevel = isProduction() ? LogLevel.INFO : LogLevel.DEBUG;
    return level >= minLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    category: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      userId: this.userId,
      sessionId: this.sessionId,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if (error) {
      entry.stack = error.stack;
    }

    // 성능 정보 추가
    if ((performance as any).memory) {
      entry.performance = {
        memory: {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        },
      };
    }

    return entry;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // 콘솔 출력
    const consoleMethod = this.getConsoleMethod(entry.level);
    if (isDevelopment() || entry.level >= LogLevel.WARN) {
      consoleMethod(
        `[${LogLevel[entry.level]}] ${entry.category}: ${entry.message}`,
        entry
      );
    }

    // 버퍼 크기 관리
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.bufferSize);
    }

    // 긴급 로그는 즉시 플러시
    if (entry.level >= LogLevel.CRITICAL) {
      this.flush();
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  // 공개 로깅 메서드들
  debug(
    category: string,
    message: string,
    context?: Record<string, any>
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.addToBuffer(
      this.createLogEntry(LogLevel.DEBUG, message, category, context)
    );
  }

  info(category: string, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.addToBuffer(
      this.createLogEntry(LogLevel.INFO, message, category, context)
    );
  }

  warn(category: string, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.addToBuffer(
      this.createLogEntry(LogLevel.WARN, message, category, context)
    );
  }

  error(
    category: string,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.addToBuffer(
      this.createLogEntry(LogLevel.ERROR, message, category, context, error)
    );
  }

  critical(
    category: string,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): void {
    this.addToBuffer(
      this.createLogEntry(LogLevel.CRITICAL, message, category, context, error)
    );
  }

  // 성능 로깅
  performance(
    category: string,
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.info('Performance', `${operation} completed in ${duration}ms`, {
      operation,
      duration,
      category,
      ...context,
    });
  }

  // 사용자 행동 로깅
  userAction(action: string, context?: Record<string, any>): void {
    this.info('UserAction', action, {
      action,
      timestamp: Date.now(),
      ...context,
    });
  }

  // API 호출 로깅
  apiCall(
    method: string,
    url: string,
    duration: number,
    status: number,
    context?: Record<string, any>
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `${method} ${url} - ${status} (${duration}ms)`;

    const entry = this.createLogEntry(level, message, 'API', {
      method,
      url,
      duration,
      status,
      ...context,
    });

    entry.performance = { duration };
    this.addToBuffer(entry);
  }

  // 에러 경계에서 사용할 에러 로깅
  componentError(componentName: string, error: Error, errorInfo: any): void {
    this.error('React', `Error in component ${componentName}`, error, {
      componentName,
      errorInfo,
    });
  }

  // 글로벌 에러 핸들러 설정
  private setupGlobalErrorHandlers(): void {
    // JavaScript 에러
    window.addEventListener('error', (event) => {
      this.error('GlobalError', event.message, event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Promise rejection 에러
    window.addEventListener('unhandledrejection', (event) => {
      this.error('UnhandledPromise', 'Unhandled promise rejection', undefined, {
        reason: event.reason,
      });
    });

    // 페이지 이탈 시 로그 플러시
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // 페이지 숨김 시 로그 플러시 (모바일 대응)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }

  // 주기적 플러시 시작
  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // 로그 플러시 (실제 전송)
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (isProduction()) {
        // 프로덕션에서는 실제 로깅 서비스로 전송
        await this.sendToLoggingService(logsToSend);
      } else {
        // 개발 환경에서는 로컬 스토리지에 저장
        this.saveToLocalStorage(logsToSend);
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // 실패한 로그를 다시 버퍼에 추가 (일부만)
      this.logBuffer = logsToSend.slice(-10).concat(this.logBuffer);
    }
  }

  // 실제 로깅 서비스로 전송 (Firebase Functions 등)
  private async sendToLoggingService(logs: LogEntry[]): Promise<void> {
    // Firebase Functions나 다른 로깅 서비스 API 호출
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs,
        metadata: {
          sessionId: this.sessionId,
          userId: this.userId,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Logging service responded with ${response.status}`);
    }
  }

  // 로컬 스토리지에 저장 (개발용)
  private saveToLocalStorage(logs: LogEntry[]): void {
    try {
      const existingLogs = JSON.parse(
        localStorage.getItem('cleanit_logs') || '[]'
      );
      const allLogs = existingLogs.concat(logs);

      // 최대 1000개 로그만 유지
      const trimmedLogs = allLogs.slice(-1000);

      localStorage.setItem('cleanit_logs', JSON.stringify(trimmedLogs));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  // 로그 다운로드 (개발/디버깅용)
  downloadLogs(): void {
    const logs = localStorage.getItem('cleanit_logs') || '[]';
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanit_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // 통계 정보
  getStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    recentErrors: LogEntry[];
    sessionDuration: number;
  } {
    const logs = JSON.parse(
      localStorage.getItem('cleanit_logs') || '[]'
    ) as LogEntry[];

    const logsByLevel = logs.reduce(
      (acc, log) => {
        const levelName = LogLevel[log.level];
        acc[levelName] = (acc[levelName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const recentErrors = logs
      .filter((log) => log.level >= LogLevel.ERROR)
      .slice(-10);

    const sessionStart = logs.find(
      (log) => log.sessionId === this.sessionId
    )?.timestamp;
    const sessionDuration = sessionStart
      ? Date.now() - new Date(sessionStart).getTime()
      : 0;

    return {
      totalLogs: logs.length,
      logsByLevel,
      recentErrors,
      sessionDuration,
    };
  }
}

// 싱글톤 인스턴스 생성
export const logger = new Logger();

// React Error Boundary용 헬퍼
export const withErrorLogging = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> => {
  return class extends React.Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
      logger.componentError(
        WrappedComponent.name || 'Unknown',
        error,
        errorInfo
      );
    }

    render() {
      if (this.state.hasError) {
        return React.createElement(
          'div',
          {
            style: {
              padding: '20px',
              textAlign: 'center',
              color: '#ff4444',
              border: '1px solid #ff4444',
              borderRadius: '4px',
              margin: '20px',
            },
          },
          '오류가 발생했습니다. 페이지를 새로고침해 주세요.'
        );
      }

      return React.createElement(WrappedComponent, this.props);
    }
  };
};

// 개발자 도구
if (isDevelopment()) {
  (window as any).cleanitLogger = {
    logs: () => JSON.parse(localStorage.getItem('cleanit_logs') || '[]'),
    download: () => logger.downloadLogs(),
    stats: () => logger.getStats(),
    clear: () => localStorage.removeItem('cleanit_logs'),
  };
}
