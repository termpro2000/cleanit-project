// Security Configuration and Hardening
import { config, isProduction } from '../config/environment';

export interface SecurityConfig {
  auth: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    passwordMinLength: number;
    requireMFA: boolean;
  };
  data: {
    encryptSensitiveData: boolean;
    auditLogLevel: 'basic' | 'detailed' | 'verbose';
    dataRetentionDays: number;
  };
  network: {
    enableCSP: boolean;
    allowedOrigins: string[];
    rateLimit: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
  files: {
    allowedMimeTypes: string[];
    maxFileSize: number;
    scanForMalware: boolean;
    quarantineSuspiciousFiles: boolean;
  };
}

const getSecurityConfig = (): SecurityConfig => {
  const baseConfig: SecurityConfig = {
    auth: {
      sessionTimeout: isProduction() ? 60 * 60 * 1000 : 8 * 60 * 60 * 1000, // 1시간 vs 8시간
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15분
      passwordMinLength: 8,
      requireMFA: isProduction(),
    },
    data: {
      encryptSensitiveData: true,
      auditLogLevel: isProduction() ? 'detailed' : 'basic',
      dataRetentionDays: isProduction() ? 365 : 30,
    },
    network: {
      enableCSP: true,
      allowedOrigins: isProduction()
        ? [
            'https://cleanit-9c968.web.app',
            'https://cleanit-9c968.firebaseapp.com',
          ]
        : ['http://localhost:3000', 'https://localhost:3000'],
      rateLimit: {
        enabled: isProduction(),
        maxRequests: 100,
        windowMs: 15 * 60 * 1000, // 15분
      },
    },
    files: {
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxFileSize: config.api.maxFileSize,
      scanForMalware: isProduction(),
      quarantineSuspiciousFiles: isProduction(),
    },
  };

  return baseConfig;
};

export const securityConfig = getSecurityConfig();

// Content Security Policy 설정
export const getCSPDirectives = (): string => {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebase.com wss://*.firebase.com",
    "frame-src 'self' https://*.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
};

// 입력 검증 및 새니타이징
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>\"']/g, '') // XSS 방지
    .replace(/javascript:/gi, '') // JavaScript injection 방지
    .replace(/on\w+=/gi, '') // Event handler 방지
    .substring(0, 1000); // 길이 제한
};

// 이메일 주소 검증
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

// 전화번호 검증 (한국)
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^010-\d{4}-\d{4}$/;
  return phoneRegex.test(phone);
};

// 비밀번호 강도 검증
export const validatePasswordStrength = (
  password: string
): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < securityConfig.auth.passwordMinLength) {
    feedback.push(
      `최소 ${securityConfig.auth.passwordMinLength}자 이상이어야 합니다`
    );
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('소문자를 포함해야 합니다');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('대문자를 포함해야 합니다');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    feedback.push('숫자를 포함해야 합니다');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('특수문자를 포함해야 합니다');
  } else {
    score += 1;
  }

  // 연속된 문자나 반복 문자 체크
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('동일한 문자를 3번 이상 연속으로 사용할 수 없습니다');
    score -= 1;
  }

  // 순차적인 문자 체크
  const sequential = [
    '123',
    '234',
    '345',
    '456',
    '567',
    '678',
    '789',
    '890',
    'abc',
    'bcd',
    'cde',
  ];
  if (sequential.some((seq) => password.toLowerCase().includes(seq))) {
    feedback.push('순차적인 문자는 사용할 수 없습니다');
    score -= 1;
  }

  return {
    isValid: score >= 4 && feedback.length === 0,
    score: Math.max(0, Math.min(5, score)),
    feedback,
  };
};

// 파일 보안 검증
export const validateFileUpload = (
  file: File
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // MIME 타입 검증
  if (!securityConfig.files.allowedMimeTypes.includes(file.type)) {
    errors.push(
      `지원되지 않는 파일 형식입니다. 허용된 형식: ${securityConfig.files.allowedMimeTypes.join(', ')}`
    );
  }

  // 파일 크기 검증
  if (file.size > securityConfig.files.maxFileSize) {
    const maxSizeMB = securityConfig.files.maxFileSize / (1024 * 1024);
    errors.push(`파일 크기가 ${maxSizeMB}MB를 초과합니다`);
  }

  // 파일 확장자 검증
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(
      `지원되지 않는 파일 확장자입니다. 허용된 확장자: ${allowedExtensions.join(', ')}`
    );
  }

  // 파일명 보안 검증
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.js$/i,
    /\.vbs$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.html$/i,
    /\.htm$/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
    errors.push('의심스러운 파일명입니다');
  }

  // NULL 바이트 검증
  if (file.name.includes('\0')) {
    errors.push('유효하지 않은 파일명입니다');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Rate Limiting 체커
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  check(
    identifier: string,
    maxAttempts: number = securityConfig.network.rateLimit.maxRequests
  ): boolean {
    if (!securityConfig.network.rateLimit.enabled) return true;

    const now = Date.now();
    const windowStart = now - securityConfig.network.rateLimit.windowMs;

    const userAttempts = this.attempts.get(identifier) || [];
    const recentAttempts = userAttempts.filter((time) => time > windowStart);

    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);

    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

// 보안 헤더 설정
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': getCSPDirectives(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
};

// 감사 로깅
export const auditLog = (
  action: string,
  userId: string,
  details?: Record<string, any>
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    userAgent: navigator.userAgent,
    ip: 'client-side', // 실제로는 서버에서 IP를 로깅
    environment: config.environment,
  };

  if (securityConfig.data.auditLogLevel !== 'basic') {
    console.log('[Audit Log]', logEntry);
  }

  // 프로덕션에서는 Firebase나 다른 로깅 서비스로 전송
  if (isProduction()) {
    // 로깅 서비스 연동 코드
  }
};

// 세션 관리
export const sessionManager = {
  getSessionTimeout: () => securityConfig.auth.sessionTimeout,

  isSessionExpired: (lastActivity: number): boolean => {
    return Date.now() - lastActivity > securityConfig.auth.sessionTimeout;
  },

  updateLastActivity: (): void => {
    localStorage.setItem('lastActivity', Date.now().toString());
  },

  getLastActivity: (): number => {
    const stored = localStorage.getItem('lastActivity');
    return stored ? parseInt(stored) : Date.now();
  },

  clearSession: (): void => {
    localStorage.removeItem('lastActivity');
    sessionStorage.clear();
  },
};
