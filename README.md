# 🧹 CleanIT - 청소 관리 플랫폼

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](./docs/production-readiness-report.md)
[![Development Progress](https://img.shields.io/badge/Progress-100%25-success)](./docs/mytask.md)
[![Beta Testing](https://img.shields.io/badge/Beta%20Testing-Complete-blue)](./docs/beta-test-plan.md)

## 📋 프로젝트 개요
- **프로젝트명**: CleanIT (클린IT)
- **Firebase 프로젝트**: `cleanit`
- **기술스택**: React Native (Expo) + React.js + Custom Auth + Firebase
- **사용자 역할**: Admin, Manager, Client, Worker (4개 역할)
- **개발 완료율**: 100% (2025년 9월 30일 기준)
- **상태**: 🚀 **커스텀 인증 시스템 구현 완료**

## ✨ 주요 특징

### 🎯 핵심 기능
- **실시간 작업 관리**: Worker 작업 배정 및 실시간 상태 추적
- **사진 기반 품질 관리**: 청소 전후 사진으로 품질 검증
- **통합 메시징 시스템**: 역할 간 실시간 소통
- **종합 분석 대시보드**: 매출, 성과, 만족도 분석
- **모바일 최적화**: Worker/Client용 모바일 앱
- **커스텀 인증 시스템**: Firebase Auth 대신 자체 인증 구현

### 🛡️ 보안 & 성능
- **4단계 역할 기반 접근 제어**: Admin, Manager, Client, Worker별 권한 관리
- **커스텀 인증 시스템**: AsyncStorage + Firestore 하이브리드 인증
- **실시간 데이터 동기화**: Firebase 기반 실시간 업데이트
- **성능 최적화**: 코드 분할, 이미지 최적화, 효율적 렌더링
- **포괄적 보안 규칙**: Firestore 보안 규칙 구현

### 🧪 베타 테스트 시스템
- **3단계 테스트 프로그램**: 내부 → 제한적 베타 → 확장 베타
- **실시간 피드백 수집**: 사용자 경험 개선을 위한 즉시 피드백
- **고급 분석 추적**: 사용자 행동, 성능, 만족도 분석
- **AI 기반 개선 제안**: 데이터 기반 자동 개선 권장사항

## 🗂️ 프로젝트 구조
```
cleanit-project/
├── docs/                           # 📚 문서
│   ├── project-prd.md             # 제품 요구사항 문서
│   ├── mytask.md                  # 개발 태스크 목록 (100% 완료)
│   ├── dev-guide.md               # 개발 가이드
│   ├── beta-test-plan.md          # 베타 테스트 계획서
│   └── production-readiness-report.md # 프로덕션 준비 현황
├── mobile-app/                     # 📱 React Native Expo 앱
│   ├── src/screens/               # Worker & Client 화면
│   ├── src/components/            # 공통 컴포넌트
│   ├── src/contexts/              # AuthContext (커스텀 인증)
│   ├── src/utils/                 # 권한 관리 유틸리티
│   └── src/services/              # Firebase 연동
├── web-admin/                      # 💻 Manager용 React.js 웹
│   ├── src/screens/               # 관리자 대시보드
│   ├── src/components/            # 웹 컴포넌트
│   ├── src/utils/                 # 유틸리티 (분석, 최적화)
│   └── src/monitoring/            # 모니터링 시스템
├── firebase/                       # 🔥 Firebase 설정
│   ├── firestore.rules           # 보안 규칙
│   ├── storage.rules             # 스토리지 규칙
│   └── firestore.indexes.json    # 인덱스 설정
├── shared/                         # 🔄 공통 코드
│   └── types.ts                   # TypeScript 타입 정의
└── scripts/                        # ⚙️ 개발 스크립트
    ├── setup.sh                   # 환경 설정
    └── seed.ts                    # 테스트 데이터
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 프로젝트 클론
git clone [repository-url]
cd cleanit-project

# 환경 설정 스크립트 실행
chmod +x scripts/setup.sh
./scripts/setup.sh

# Firebase 프로젝트 설정
firebase login
firebase use cleanit
```

### 2. 웹 어드민 실행 (Manager용)
```bash
cd web-admin
npm install
npm start
# http://localhost:3000 에서 접속
```

### 3. 모바일 앱 실행 (Worker/Client용)
```bash
cd mobile-app
npm install
npx expo start
# Expo Go 앱으로 QR 코드 스캔
```

## 📊 개발 현황

### ✅ 완료된 Phase (100%)
- **Phase 1**: 프로젝트 초기 설정 및 기반 구축
- **Phase 2**: 인증 및 회원가입 시스템
- **Phase 3**: 건물 관리 시스템
- **Phase 4**: Worker 앱 핵심 기능
- **Phase 5**: Client 앱 핵심 기능
- **Phase 6**: Manager 웹 어드민
- **Phase 7**: 메시징 시스템
- **Phase 8**: 알림 시스템
- **Phase 9**: 테스트 및 품질 관리 ✨ **완료**
- **Phase 10**: 배포 및 운영

### 🎯 주요 마일스톤
- ✅ **2025.09.21**: 모든 핵심 기능 구현 완료
- ✅ **2025.09.21**: 베타 테스트 시스템 구축 완료
- ✅ **2025.09.21**: 프로덕션 배포 준비 완료
- ✅ **2025.09.30**: 커스텀 인증 시스템 완료 (Firebase Auth 마이그레이션)
- ✅ **2025.10.01**: Admin 전용 고급 관리 시스템 완료
  - 👥 **사용자 관리 시스템**: 완전한 CRUD 및 권한 관리
  - 📊 **고급 리포트 시스템**: 실시간 분석 및 시각화
  - ⚙️ **시스템 설정 관리**: 종합적인 시스템 제어
  - 💾 **백업/복원 시스템**: 엔터프라이즈급 데이터 관리
- 🚀 **Ready**: 엔터프라이즈 프로덕션 런칭 준비 완료

## 🧪 베타 테스트 프로그램

### 테스트 단계
1. **1단계 (내부 테스트)**: 3일 - 기본 기능 검증
2. **2단계 (제한적 베타)**: 1주 - 10명 사용자 테스트
3. **3단계 (확장 베타)**: 2주 - 30명 사용자 테스트

### 테스트 도구
- **실시간 피드백 시스템**: 사용자 경험 즉시 수집
- **세션 추적**: 완전한 사용자 여정 분석
- **성능 모니터링**: 실시간 성능 메트릭
- **만족도 분석**: AI 기반 만족도 추적

## 📱 사용자별 기능

### 🔑 Admin (시스템 관리자)
#### 🏗️ 기본 관리 기능
- 모든 사용자 및 시스템 관리 권한
- 고객 요청 승인 및 거부
- Worker 배정 및 재배정
- 전체 데이터 분석 및 모니터링

#### 👥 사용자 관리 시스템
- **사용자 CRUD**: 계정 생성, 수정, 삭제, 상태 관리
- **역할 기반 권한**: Admin, Manager, Client, Worker 권한 할당
- **검색 및 필터링**: 이름/이메일 검색, 역할별 필터
- **활성 상태 관리**: 사용자 계정 활성화/비활성화
- **상세 정보 관리**: 프로필 정보, 연락처, 가입일 추적

#### 📊 고급 리포트 시스템
- **실시간 대시보드**: 작업/사용자/건물/매출 현황
- **성과 분석**: 완료율, 평균 작업시간, 고객 만족도
- **기간별 분석**: 주/월/분기/연간 데이터 비교
- **시각적 차트**: 일별 작업 완료 추이, 매출 트렌드
- **우수 직원 랭킹**: 성과 기반 TOP 5 직원 분석
- **내보내기 기능**: 리포트 데이터 내보내기 준비

#### ⚙️ 시스템 설정 관리
- **앱 기본 설정**: 앱 이름, 버전, 유지보수/디버그 모드
- **알림 시스템**: 푸시/이메일/SMS 알림 통합 제어
- **작업 설정**: 기본 작업시간, 자동 할당, 사진 확인 필수
- **보안 정책**: 세션 타임아웃, 비밀번호 정책, 2단계 인증
- **데이터 관리**: 보관 기간, 백업 주기, 로그 레벨 설정
- **시스템 모니터링**: 메모리/CPU 사용률, 성능 지표 실시간 확인
- **시스템 작업**: 캐시 삭제, 진단, 설정 초기화

#### 💾 백업/복원 시스템
- **즉시 백업**: 전체/부분 백업 선택 실행
- **자동 백업**: 일/주/월 단위 예약 백업 설정
- **백업 파일 관리**: 생성된 백업 목록, 상세 정보, 삭제
- **안전한 복원**: 데이터 복원 시 다중 확인 절차
- **진행률 모니터링**: 백업/복원 실시간 진행상황 표시
- **고급 옵션**: 압축, 암호화, 이미지/로그 포함 여부
- **알림 설정**: 백업 완료/실패 시 이메일 알림

### 👷 Worker (작업자)
- 배정된 작업 목록 확인
- 작업 시작/완료 체크인/체크아웃
- 청소 전후 사진 촬영 (최대 7장)
- 실시간 메시지 송수신
- 고객 요청사항 처리 및 상태 업데이트

### 🏢 Client (고객)
- 건물 등록 및 관리
- 실시간 작업 현황 모니터링
- 청소 전후 사진 확인
- 요청사항 등록 (Admin 승인 필요)
- 작업 평가 및 피드백
- 요청 추적 및 상태 확인

### 💼 Manager (관리자)
- 종합 대시보드
- Worker 배정 및 스케줄 관리
- 고객 관계 관리
- 매출 및 성과 분석
- 실시간 알림 관리
- 회사 정보 관리

## 🔧 기술 스택

### Frontend
- **Web**: React.js 19.1.1 + TypeScript
- **Mobile**: React Native + Expo
- **UI**: 커스텀 컴포넌트 + 반응형 디자인
- **Charts**: Chart.js + react-chartjs-2

### Backend & Infrastructure
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Custom Auth System (AsyncStorage + Firestore)
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting
- **Real-time**: Firebase Real-time listeners
- **Session Management**: AsyncStorage

### Development & Quality
- **Language**: TypeScript
- **Linting**: ESLint + Prettier
- **Testing**: Jest + React Testing Library
- **Build**: React Scripts + Expo CLI
- **Monitoring**: 커스텀 분석 시스템

## 📚 문서

### 기본 문서
- [📋 프로젝트 요구사항 (PRD)](./docs/project-prd.md)
- [📝 개발 태스크 목록](./docs/mytask.md)
- [👨‍💻 개발 가이드](./docs/dev-guide.md)

### 테스트 & 배포
- [🧪 베타 테스트 계획서](./docs/beta-test-plan.md)
- [🚀 프로덕션 준비 현황](./docs/production-readiness-report.md)

## ✨ 최신 업데이트 (2025년 9월 30일)

### 🔐 커스텀 인증 시스템 구현 완료
- **Firebase Auth 완전 제거**: 자체 인증 시스템으로 교체
- **4단계 사용자 역할**: Admin, Manager, Client, Worker
- **AsyncStorage 세션 관리**: 자동 로그인 상태 복원
- **권한 기반 UI 제어**: 역할별 맞춤 화면 및 기능
- **테스트 계정 시스템**: 원클릭 로그인 (admin/admin123, manager1/manager123, client1/client123, worker1/worker123)

### 🎨 UI/UX 현대화 완료
- **클라이언트 요청 추적 시스템**: 실시간 상태 업데이트, 필터링, 상세 모달
- **건물 목록 화면 재설계**: 현대적 카드 레이아웃, 아이콘 통합, 정보 시각화
- **클라이언트 대시보드 개편**: 개인화된 헤더, 빠른 액션, 통계 개선
- **요청 상세정보 화면**: 완전 재디자인, 상태별 색상, 터치 친화적 UI
- **모바일 앱 전체 디자인 통일**: 일관된 브랜드 컬러, 타이포그래피

### 🔄 실시간 기능 강화
- **Firebase onSnapshot**: 모든 목록 화면 실시간 동기화
- **Pull-to-refresh**: 사용자 친화적 새로고침 기능
- **타입 안전성 개선**: Building 타입 확장, 런타임 에러 방지

### 🛡️ 보안 및 권한 시스템
- **역할별 데이터 접근 제어**: Admin만 요청 승인, Client만 요청 생성
- **Firestore 보안 규칙 업데이트**: Admin 역할 포함, 세분화된 권한
- **요청 승인 워크플로우**: Client 요청 → Admin 승인 → Worker 배정

## 🎯 성능 및 품질

### 빌드 상태
- ✅ **TypeScript**: 타입 안전성 보장
- ✅ **ESLint**: 코드 품질 검증
- ✅ **Production Build**: 최적화된 빌드 성공
- ✅ **Security Rules**: 포괄적 보안 규칙 적용 (Admin 역할 포함)
- ✅ **Custom Auth System**: Firebase Auth 완전 대체
- ✅ **UI/UX 현대화**: 모바일 앱 사용자 경험 완전 개선
- ✅ **권한 기반 접근 제어**: 4단계 역할별 UI/데이터 제어

### 성능 지표
- **페이지 로드 시간**: < 3초
- **이미지 업로드**: 5MB < 30초
- **앱 응답 시간**: < 1초
- **메모리 사용량**: < 100MB
- **실시간 업데이트**: < 500ms

## 🚀 배포 명령어

### 개발 환경
```bash
# 웹 어드민 개발 서버
cd web-admin && npm start

# 모바일 앱 개발
cd mobile-app && npx expo start
```

### 프로덕션 배포
```bash
# 웹 어드민 빌드 & 배포
cd web-admin
npm run build
firebase deploy --only hosting

# 모바일 앱 빌드
cd mobile-app
npx expo build:ios
npx expo build:android
```

## 📞 지원 및 연락처

### 개발팀 연락처
- **프로젝트 매니저**: [담당자 정보]
- **개발팀 리드**: [담당자 정보]
- **기술 지원**: [담당자 정보]

### 관련 링크
- [Firebase Console](https://console.firebase.google.com/project/cleanit)
- [Expo Dashboard](https://expo.dev/)
- [프로젝트 이슈 트래커](./issues/)

---

**📄 문서 버전**: 3.0  
**🗓️ 최종 업데이트**: 2025년 9월 30일  
**🏆 프로젝트 상태**: 커스텀 인증 시스템 구현 완료, UI/UX 현대화 완료 🔐🚀✨

## 🔑 **테스트 계정 정보**
```
Admin:    admin     / admin123     (시스템 관리자)
Manager:  manager1  / manager123   (매니저)
Client:   client1   / client123    (고객)
Worker:   worker1   / worker123    (작업자)
```
