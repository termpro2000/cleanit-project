# 🛠️ CleanIT 개발 가이드

## 🎯 개발 환경 요구사항

### 필수 도구
- Node.js (v18 이상)
- npm 또는 yarn
- Expo CLI
- Firebase CLI
- Git

### 권장 도구
- Cursor IDE
- React Native Debugger
- Firebase Emulator Suite

## 📋 개발 시작 단계

### 1단계: 환경 설정
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Expo CLI 설치
npm install -g @expo/cli

# Firebase 로그인
firebase login
```

### 2단계: Firebase 프로젝트 설정
1. Firebase Console에서 새 프로젝트 생성
2. Authentication, Firestore, Storage 활성화
3. Firebase 설정 파일 다운로드

### 3단계: 모바일 앱 설정
```bash
cd mobile-app
npx create-expo-app . --template typescript
npm install firebase
```

### 4단계: 웹 어드민 설정
```bash
cd web-admin
npx create-react-app . --template typescript
npm install firebase
```

## 🔧 개발 규칙

### 코딩 컨벤션
- TypeScript 사용 필수
- ESLint + Prettier 적용
- 컴포넌트명: PascalCase
- 함수명: camelCase
- 파일명: kebab-case

### Git 브랜치 전략
- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/TASK-ID`: 기능 개발 브랜치

### 커밋 메시지 형식
```
[TASK-ID] 타입: 간단한 설명

상세 설명 (선택사항)
```

## 🚀 개발 워크플로우

1. 태스크 선택 (mytask.md 참조)
2. 기능 브랜치 생성
3. 개발 진행
4. 테스트 실행
5. PR 생성 및 리뷰
6. 메인 브랜치 병합

## 📱 테스트 가이드

### 모바일 앱 테스트
- Expo Go 앱 사용
- iOS/Android 시뮬레이터
- 실제 디바이스 테스트

### 웹 어드민 테스트
- Chrome DevTools
- 반응형 디자인 테스트
- Firebase 연동 테스트

## 🔥 Firebase 설정

### Firestore 규칙
```javascript
// firestore.rules 파일 참조
```

### Storage 규칙
```javascript
// storage.rules 파일 참조
```

## 🎉 배포 가이드

### 모바일 앱 배포
1. Expo Build
2. App Store/Google Play 업로드

### 웹 어드민 배포
1. Firebase Hosting 빌드
2. 도메인 연결
