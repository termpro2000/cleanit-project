# EAS Update 설정 가이드

## 개요
CleanIT 모바일 앱에 EAS Update를 설정하여 Over-The-Air (OTA) 업데이트를 지원합니다.

## 설정 완료 항목

### 1. 패키지 설치
- ✅ `eas-cli` - EAS CLI 도구
- ✅ `expo-updates` - OTA 업데이트 라이브러리
- ✅ `expo-constants` - 앱 설정 접근

### 2. 설정 파일

#### eas.json
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal", 
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "update": {
    "development": {
      "channel": "development"
    },
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

#### app.json
```json
{
  "expo": {
    "name": "CleanIT",
    "slug": "cleanit-mobile-app",
    "version": "1.0.0",
    "updates": {
      "url": "https://u.expo.dev/72d16dd7-c89e-4dc7-8e6f-d8f7b2a9c0e1"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "extra": {
      "eas": {
        "projectId": "72d16dd7-c89e-4dc7-8e6f-d8f7b2a9c0e1"
      }
    }
  }
}
```

### 3. 앱 코드 통합

#### App.tsx
- 앱 시작 시 자동 업데이트 확인
- 업데이트 발견 시 사용자에게 알림 및 선택권 제공

#### AppInfoScreen.tsx
- 수동 업데이트 확인 기능
- 개발/프로덕션 모드 구분
- 실제 EAS Update API 사용

## 사용법

### 개발 중 업데이트 배포

```bash
# 개발 채널로 업데이트 배포
npm run update:dev "버그 수정 및 기능 개선"

# 프리뷰 채널로 업데이트 배포  
npm run update:preview "베타 테스트용 업데이트"

# 프로덕션 채널로 업데이트 배포
npm run update:production "정식 업데이트 v1.0.1"
```

### 빌드 명령어

```bash
# Android 빌드
npm run build:android

# iOS 빌드  
npm run build:ios

# 모든 플랫폼 빌드
npm run build:all
```

## 업데이트 프로세스

### 1. 코드 변경 후 업데이트 배포
```bash
# 코드 수정 후
npm run update:production "새로운 기능 추가"
```

### 2. 앱에서 업데이트 확인
- 앱 시작 시 자동 확인 (프로덕션 모드만)
- 앱 정보 화면에서 수동 확인

### 3. 사용자 업데이트 진행
- 업데이트 알림 표시
- 사용자 승인 후 다운로드 및 재시작

## 주의사항

### 개발 모드 vs 프로덕션 모드
- **개발 모드**: 업데이트 시뮬레이션만 수행
- **프로덕션 모드**: 실제 EAS Update 수행

### 채널 관리
- `development`: 개발자 테스트용
- `preview`: 내부 베타 테스트용  
- `production`: 일반 사용자용

### 버전 관리
- `app.json`의 `version` 필드가 앱 버전 결정
- `runtimeVersion.policy: "appVersion"`으로 설정

## 트러블슈팅

### 업데이트가 적용되지 않는 경우
1. 채널 설정 확인
2. 프로젝트 ID 확인
3. 네트워크 연결 상태 확인
4. 개발/프로덕션 모드 확인

### 빌드 실패 시
1. EAS CLI 로그인 상태 확인
2. 프로젝트 설정 파일 검증
3. 종속성 패키지 버전 확인

## 추가 정보

- [Expo Updates 공식 문서](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Build 가이드](https://docs.expo.dev/build/introduction/)
- [EAS Update 가이드](https://docs.expo.dev/eas-update/introduction/)