// Environment Configuration Management
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  app: {
    debugMode: boolean;
    analyticsEnabled: boolean;
    performanceMonitoring: boolean;
    crashReporting: boolean;
  };
  api: {
    timeout: number;
    maxFileSize: number;
    maxPhotosPerJob: number;
    maxPhotosPerRequest: number;
  };
  features: {
    pushNotifications: boolean;
    offlineMode: boolean;
    advancedAnalytics: boolean;
    debugTools: boolean;
  };
}

const getEnvironmentConfig = (): AppConfig => {
  const env = process.env.REACT_APP_ENVIRONMENT || 'development';

  const baseConfig: AppConfig = {
    environment: env as 'development' | 'staging' | 'production',
    firebase: {
      apiKey: process.env.REACT_APP_API_KEY || '',
      authDomain: process.env.REACT_APP_AUTH_DOMAIN || '',
      projectId: process.env.REACT_APP_PROJECT_ID || '',
      storageBucket: process.env.REACT_APP_STORAGE_BUCKET || '',
      messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID || '',
      appId: process.env.REACT_APP_APP_ID || '',
      measurementId: process.env.REACT_APP_MEASUREMENT_ID || '',
    },
    app: {
      debugMode: process.env.REACT_APP_DEBUG_MODE === 'true',
      analyticsEnabled: process.env.REACT_APP_ANALYTICS_ENABLED === 'true',
      performanceMonitoring:
        process.env.REACT_APP_PERFORMANCE_MONITORING === 'true',
      crashReporting: process.env.REACT_APP_CRASH_REPORTING === 'true',
    },
    api: {
      timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
      maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '5242880'),
      maxPhotosPerJob: parseInt(
        process.env.REACT_APP_MAX_PHOTOS_PER_JOB || '7'
      ),
      maxPhotosPerRequest: parseInt(
        process.env.REACT_APP_MAX_PHOTOS_PER_REQUEST || '5'
      ),
    },
    features: {
      pushNotifications:
        process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true',
      offlineMode: process.env.REACT_APP_ENABLE_OFFLINE_MODE === 'true',
      advancedAnalytics:
        process.env.REACT_APP_ENABLE_ADVANCED_ANALYTICS === 'true',
      debugTools: process.env.REACT_APP_ENABLE_DEBUG_TOOLS === 'true',
    },
  };

  return baseConfig;
};

export const config = getEnvironmentConfig();

// Environment specific validations
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Firebase configuration validation
  if (!config.firebase.apiKey) errors.push('Firebase API Key is missing');
  if (!config.firebase.projectId) errors.push('Firebase Project ID is missing');
  if (!config.firebase.authDomain)
    errors.push('Firebase Auth Domain is missing');

  // API configuration validation
  if (config.api.timeout < 5000)
    errors.push('API timeout too low (minimum 5 seconds)');
  if (config.api.maxFileSize < 1048576)
    errors.push('Max file size too low (minimum 1MB)');

  // Production specific validations
  if (config.environment === 'production') {
    if (config.app.debugMode) {
      errors.push('Debug mode should be disabled in production');
    }
    if (!config.app.crashReporting) {
      errors.push('Crash reporting should be enabled in production');
    }
    if (!config.app.performanceMonitoring) {
      errors.push('Performance monitoring should be enabled in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Environment helper functions
export const isDevelopment = () => config.environment === 'development';
export const isStaging = () => config.environment === 'staging';
export const isProduction = () => config.environment === 'production';

// Debug logging helper
export const debugLog = (...args: any[]) => {
  if (config.app.debugMode) {
    console.log('[CleanIT Debug]', ...args);
  }
};

// Performance monitoring helper
export const trackPerformance = (operationName: string, duration: number) => {
  if (config.app.performanceMonitoring) {
    console.log(`[Performance] ${operationName}: ${duration}ms`);

    // In production, this would send to Firebase Performance Monitoring
    if (isProduction()) {
      // Firebase Performance Monitoring integration would go here
    }
  }
};

// Error reporting helper
export const reportError = (error: Error, context?: Record<string, any>) => {
  if (config.app.crashReporting) {
    console.error('[Error Report]', error, context);

    // In production, this would send to Firebase Crashlytics
    if (isProduction()) {
      // Firebase Crashlytics integration would go here
    }
  }
};

// Feature flag helper
export const isFeatureEnabled = (
  feature: keyof AppConfig['features']
): boolean => {
  return config.features[feature];
};

// Configuration summary for debugging
export const getConfigSummary = () => {
  return {
    environment: config.environment,
    debugMode: config.app.debugMode,
    projectId: config.firebase.projectId,
    featuresEnabled: Object.entries(config.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature),
  };
};
