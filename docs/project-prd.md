
# 📝 PRD (Product Requirements Document)

## 1\. 개요 (Overview)

### 1.1. 제품명

**클린IT(CleanIT)**

### 1.2. 목표

청소 업체 관리, 현장 작업, 건물 관리인의 요청 및 매칭 기능을 통합한 모바일/웹 플랫폼을 구축하여 **청소 업무의 비효율성을 해소**하고 **생산성을 극대화**합니다.

### 1.3. 배경

기존 청소 시장의 정보 비대칭 및 수기 관리의 비효율성을 해결하고, 디지털 전환을 통해 **업무 자동화 및 확장성**을 확보합니다.

### 1.4. 사용자 역할 정의 (User Roles)

#### **Worker (청소 작업자)**
- **역할**: 실제 청소 업무를 수행하는 현장 작업자
- **주요 기능**: 작업 시작/완료, 사진 촬영 및 업로드, 작업 보고
- **플랫폼**: 모바일 앱 (React Native Expo)

#### **Manager (청소 관리업체)**
- **역할**: 청소 업체 운영자, Worker와 Client를 총괄 관리하는 담당자
- **주요 기능**: 
  - **Client 관리**: 모든 Client의 건물 목록 및 세부정보 확인
  - **Worker 관리**: Worker에게 건물 배정 및 작업 진행과정 모니터링
  - **통계 분석**: 건물별/Worker별 작업 통계 및 성과 분석
  - **스케줄 관리**: 캘린더 기반 작업 일정 배정 및 관리
  - **인앱 메시징**: Client와 Worker 간 소통 중재 및 직접 소통
  - **건물 등록**: 새로운 건물 정보 등록 및 관리
- **플랫폼**: 웹 어드민 (React.js) + 모바일 앱
- **권한**: Client의 모든 기능 + 추가 관리 기능

#### **Client (고객)**
- **역할**: 청소를 의뢰하는 건물주 또는 건물 관리업체
- **주요 기능**:
  - 청소 진행상황 및 결과 확인
  - 청소 작업 요청 및 보완 요청
  - Manager와 인앱 메시징
  - 청소 품질 평가 및 피드백
- **플랫폼**: 모바일 앱 (React Native Expo)

-----

## 2\. 회원가입 및 사용자 온보딩 (User Registration & Onboarding)

### 2.1. 회원가입 프로세스

#### **단계 1: 역할 선택**
- **User Story**: **AS A** 신규 사용자 **I WANT TO** 회원가입 시 내 역할을 먼저 선택할 수 **SO THAT** 역할에 맞는 맞춤형 가입 절차를 진행할 수 있다.
- **역할 선택 옵션**:
  - **Client (고객)**: 건물주 또는 건물 관리자
  - **Worker (청소 작업자)**: 실제 청소 업무를 수행하는 작업자
  - **Manager (청소 관리업체)**: 청소 용역업체 운영자 또는 관리자
- **Technical Notes**:
  - Firebase Authentication 시작 전 역할 선택 화면
  - 선택된 역할에 따라 다음 단계 UI 동적 변경

#### **단계 2: 역할별 기본 정보 입력**

##### **Client (고객) 회원가입**
- **필수 입력 정보**:
  - **계정 정보**: ID, 비밀번호, 이메일
  - **연락처**: 전화번호, 비상전화번호
  - **주소**: 거주지 또는 사무실 주소
- **User Story**: **AS A** Client **I WANT TO** 내 연락처와 주소 정보를 등록할 수 **SO THAT** 청소 서비스 관련 연락을 받고 서비스 지역을 확인받을 수 있다.

##### **Worker (청소 작업자) 회원가입**
- **필수 입력 정보**:
  - **계정 정보**: ID, 비밀번호, 이메일
  - **연락처**: 전화번호, 비상전화번호
  - **급여 정보**: 청소 대금 지급용 은행명, 계좌번호
- **User Story**: **AS A** Worker **I WANT TO** 내 계좌 정보를 등록할 수 **SO THAT** 청소 작업 완료 후 정확한 급여를 받을 수 있다.

##### **Manager (청소 관리업체) 회원가입**
- **필수 입력 정보**:
  - **계정 정보**: ID, 비밀번호, 이메일
  - **개인 정보**: 이름 (대표자명 또는 담당자명)
  - **연락처**: 전화번호
  - **사업체 정보**: 주소 (사업장 주소), 청소 관리업체 이름
- **User Story**: **AS A** Manager **I WANT TO** 내 업체 정보와 담당자 정보를 등록할 수 **SO THAT** Client와 Worker에게 신뢰할 수 있는 업체임을 보여주고 연락을 받을 수 있다.

### 2.2. 데이터 검증 및 보안

#### **입력 데이터 검증**
- **이메일**: 유효한 이메일 형식 및 중복 확인
- **전화번호**: 국내 전화번호 형식 검증
- **계좌번호**: 은행별 계좌번호 형식 검증 (Worker)
- **비밀번호**: 최소 8자, 영문+숫자+특수문자 조합

#### **보안 처리**
- **민감 정보 암호화**: 계좌번호, 주소 등 AES-256 암호화
- **역할 기반 접근**: 가입 시 선택한 역할에 따른 Firestore Security Rules 적용
- **이메일 인증**: Firebase Authentication 이메일 인증 필수

### 2.3. 사용자 프로필 데이터 구조

#### **users 컬렉션 구조**
```json
{
  "userId": "firebase-auth-uid",
  "role": "client | worker | manager",
  "basicInfo": {
    "id": "string",                    // 사용자 ID
    "email": "string",                 // 이메일 (Firebase Auth와 동기화)
    "phone": "string",                 // 전화번호
    "emergencyPhone": "string"         // 비상전화번호
  },
  "roleSpecificInfo": {
    // Client인 경우
    "address": "string",               // 주소 (암호화)
    
    // Worker인 경우
    "bankInfo": {
      "bankName": "string",            // 은행명
      "accountNumber": "string"        // 계좌번호 (암호화)
    },
    
    // Manager인 경우
    "name": "string",                  // 이름 (대표자명/담당자명)
    "companyName": "string",           // 청소 관리업체 이름
    "companyAddress": "string"         // 사업장 주소 (암호화)
  },
  "isVerified": "boolean",             // 이메일 인증 상태
  "isActive": "boolean",               // 계정 활성 상태
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2.4. 온보딩 완료 후 처리

#### **역할별 초기 설정**
- **Client**: 첫 번째 건물 등록 안내
- **Worker**: 작업 가능 지역 및 시간 설정 안내
- **Manager**: 첫 번째 Worker 등록 및 건물 등록 안내

#### **Technical Notes**
- Firebase Authentication과 Firestore 사용자 문서 동기화
- 역할별 다른 앱 화면 및 네비게이션 구조 제공
- 회원가입 완료 시 환영 메시지 및 가이드 제공

-----

## 3\. 기술 스택 및 아키텍처 (Technical Stack & Architecture)

### 3.1. 모바일 앱 (Worker & Client)
- **대상 사용자**: Worker (청소 작업자), Client (고객)
- **플랫폼**: React Native with Expo
- **개발 환경**: Expo CLI
- **배포**: Expo Go (개발), App Store/Google Play (프로덕션)
- **지원 플랫폼**: iOS, Android

### 3.2. 웹 어드민 (Manager)
- **대상 사용자**: Manager (청소 관리업체)
- **플랫폼**: React.js Web Application
- **UI 프레임워크**: Material-UI 또는 Ant Design
- **배포**: Firebase Hosting 또는 Vercel
- **반응형**: 데스크톱 우선, 태블릿 지원

### 3.3. 백엔드 & 데이터베이스
- **Firebase 프로젝트명**: `cleanit`
- **데이터베이스**: Firebase Firestore (NoSQL)
- **인증**: Firebase Authentication
- **파일 저장소**: Firebase Storage (사진 파일)
- **실시간 동기화**: Firestore Real-time listeners
- **보안**: Firestore Security Rules

### 3.4. 데이터 모델링
- **설계 원칙**: Firestore NoSQL 구조에 최적화
- **컬렉션 구조**: 계층적 문서-컬렉션 관계
- **실시간 동기화**: 작업 상태, 사진 업로드 등 실시간 반영
- **상세 모델링**: 별도 문서에서 정의 예정

### 3.5. 파일 관리
- **사진 저장**: Firebase Storage
- **파일 형식**: JPEG, PNG, WebP (최적화)
- **사진 수량 제한**: 
  - 청소 전 사진: 최대 7장
  - 청소 후 사진: 최대 7장
  - 요청사항 관련 사진: 제한 없음
- **용량 제한**: 개별 파일 10MB, 총 150MB per job
- **CDN**: Firebase Storage 자동 CDN 제공

-----

## 4\. 사용자 기능 명세 (Feature Specifications)

### 4.1. Worker (청소 작업자) - Mobile App 

#### CW-01: 로그인 및 배정된 건물 목록 확인

  * **User Story**:
      * **AS A** Worker **I WANT TO** 로그인하면 내게 배정된 건물 목록이 자동으로 표시되기를 원한다 **SO THAT** 오늘 해야 할 청소 업무를 즉시 파악할 수 있다.
  * **Technical Notes**:
      * Firebase Authentication (이메일/비밀번호, Google, Apple)
      * 로그인 후 `cleaningJobs` 컬렉션에서 해당 Worker에게 배정된 건물 자동 조회
      * `where('workerId', '==', userId).where('status', 'in', ['scheduled', 'in_progress'])`

#### CW-02: 청소 작업 상세정보 및 체크리스트

  * **User Story**:
      * **AS A** Worker **I WANT TO** 청소할 건물을 클릭하면 상세한 청소 영역과 주의사항이 표시되기를 원한다 **SO THAT** 정확하고 체계적으로 청소 작업을 수행할 수 있다.
  * **세부 청소 영역**:
      * **현관 영역**: 유리문, 문, 현관 로비
      * **층별 영역**: 전체 청소 대상 층수 표시
      * **각 층 세부사항**: 난간 손잡이, 창문, 창문틀, 소화기, 복도, 계단
      * **특수 작업**: 거미줄 제거, 초인종, 문틀 위
      * **주의사항 및 팁**: 각 영역별 청소 방법 및 주의점 안내
  * **Technical Notes**:
      * Firestore `buildings` 컬렉션에서 상세 정보 조회
      * 청소 체크리스트 및 특별 지시사항 실시간 로드
      * 건물별 맞춤형 청소 가이드 제공

#### CW-03: 청소 시작/완료 시간 기록

  * **User Story**:
      * **AS A** Worker **I WANT TO** '청소 시작' 버튼을 누르면 시작 시간이 자동 저장되고, '청소 완료' 버튼을 누르면 완료 시간이 기록되기를 원한다 **SO THAT** 정확한 작업 시간이 자동으로 관리되고 Manager에게 실시간으로 공유된다.
  * **Technical Notes**:
      * 청소 시작: Firestore `cleaningJobs/{jobId}` 문서에 `startTime: Timestamp.now()` 저장
      * 청소 완료: `endTime: Timestamp.now()` 및 `status: 'completed'` 업데이트
      * 실시간 동기화로 Manager에게 즉시 상태 변경 알림

#### CW-04: 청소 전/후 사진 등록 (각 7장)

  * **User Story**:
      * **AS A** Worker **I WANT TO** 청소 시작 시 청소 전 사진을 최대 7장, 청소 완료 후 청소 후 사진을 최대 7장 등록할 수 있기를 원한다 **SO THAT** 청소 품질을 시각적으로 증명하고 Client에게 투명하게 보고할 수 있다.
  * **Technical Notes**:
      * Firebase Storage에 사진 업로드: `/photos/{companyId}/{jobId}/before/` 및 `/after/`
      * 각 단계별 최대 7장 제한
      * 사진 메타데이터는 Firestore `photos` 컬렉션에 저장
      * 실시간으로 Manager와 Client에게 사진 업로드 알림

#### CW-05: 작업 요청사항 처리

  * **User Story**:
      * **AS A** Worker **I WANT TO** Client와 Manager로부터 온 특별 요청사항을 '작업 요청 목록'에서 확인하고, 각 요청에 대해 완료/미완료를 선택하며 메모를 남길 수 있기를 원한다 **SO THAT** 추가 요청사항을 체계적으로 처리하고 피드백을 제공할 수 있다.
  * **Technical Notes**:
      * Firestore `requests` 컬렉션에서 해당 Worker에게 배정된 요청사항 조회
      * 요청 상태 업데이트: `status: 'completed' | 'incomplete'`
      * 처리 메모: `workerNotes: string` 필드에 저장
      * 완료 시 실시간으로 요청자(Client/Manager)에게 알림 전송

-----

### 4.2. Client (고객) - Mobile App

#### BM-04: 청소 보완 요청 등록

  * **User Story**:
      * **AS A** 건물 관리인 **I WANT TO** 청소에 대한 보완 요청을 사진과 함께 올릴 수 **SO THAT** 놓친 부분을 효율적으로 소통하고 개선을 요구할 수 있다.
  * **Technical Notes**:
      * `POST /api/v1/buildings/{buildingId}/requests`
      * **Request Body**: `{ "content": "...", "locationDetail": "...", "photos": [ "image_urls" ] }`

#### CL-01: 내 건물 목록 및 상세 모니터링

  * **User Story**:
      * **AS A** Client **I WANT TO** 내가 등록한 건물 목록을 확인하고, 각 건물을 클릭하면 상세한 청소 이력과 현황을 볼 수 **SO THAT** 모든 건물의 청소 상태를 체계적으로 관리하고 모니터링할 수 있다.
  * **건물 목록 표시 정보**:
      * 등록된 모든 건물 목록 (건물명, 주소, 최근 청소일)
      * 각 건물의 현재 청소 상태 (예정, 진행중, 완료)
      * 긴급 요청사항 알림 표시
  * **건물 상세 정보 (클릭 시)**:
      * **Worker 작업 내역**: 모든 청소 작업 기록 및 내용
      * **사진 갤러리**: 청소 전/후 사진 (각 최대 7장)
      * **시간 정보**: 청소 시작일시, 완료일시, 총 소요시간
      * **Worker 메시지**: 작업 중 남긴 메모 및 특이사항
      * **작업 이력**: 과거 청소 기록 및 패턴 분석
  * **Technical Notes**:
      * Firestore `buildings` 컬렉션에서 Client 등록 건물 조회
      * `cleaningJobs` 컬렉션과 조인하여 상세 작업 이력 표시
      * 실시간 리스너로 진행상황 즉시 업데이트
      * Firebase Storage에서 사진 데이터 로드

#### CL-02: Worker/Manager에게 요청사항 등록

  * **User Story**:
      * **AS A** Client **I WANT TO** 특정 건물에 대해 Worker 또는 Manager에게 청소 요청이나 보완 요청을 등록할 수 **SO THAT** 구체적인 요구사항을 전달하고 신속한 대응을 받을 수 있다.
  * **요청 등록 기능**:
      * **대상 선택**: Worker 또는 Manager 선택 가능
      * **건물 선택**: 내가 등록한 건물 중 선택
      * **요청 유형**: 일반 청소, 보완 청소, 긴급 청소, 특별 요청
      * **상세 내용**: 구체적인 요청사항 및 특별 지시사항
      * **사진 첨부**: 문제 부분 또는 요청 위치 사진 (제한 없음)
      * **우선순위**: 일반, 높음, 긴급 설정 가능
  * **알림 시스템**:
      * 지정된 Worker와 해당 건물 담당 Manager에게 동시 알림
      * 실시간 푸시 알림 및 인앱 메시지
      * 요청 상태 변경 시 Client에게 자동 알림
  * **Technical Notes**:
      * Firestore `requests` 컬렉션에 새 요청 문서 생성
      * `assignedWorker`, `assignedManager` 필드로 대상자 지정
      * Firebase Cloud Messaging으로 즉시 푸시 알림
      * 실시간 상태 추적 및 업데이트

#### CL-03: 인앱 메시징

  * **User Story**:
      * **AS A** Client **I WANT TO** Manager와 실시간으로 메시지를 주고받을 수 **SO THAT** 청소 관련 문의사항이나 피드백을 즉시 소통할 수 있다.
  * **Technical Notes**:
      * Firestore `messages` 컬렉션 활용
      * 실시간 메시지 동기화 및 푸시 알림

#### CL-04: 건물 등록 및 관리

  * **User Story**:
      * **AS A** Client **I WANT TO** 내가 관리하는 건물 정보를 등록하고 관리할 수 **SO THAT** 청소 서비스를 요청할 수 있는 건물 목록을 구축하고 정확한 정보를 제공할 수 있다.
  * **필수 등록 정보**:
      * **기본 정보**: 건물명, 주소
      * **담당자 정보**: 담당자 이름, 전화번호, 담당자 주소
      * **건물 구조**: 건물 층수 (지하층~지상층까지)
      * **부대시설**: 주차장 유무, 주차 가능 대수, 엘리베이터 유무
  * **Technical Notes**:
      * Firestore `buildings` 컬렉션에 새 건물 문서 생성
      * Client의 `userId`와 연결하여 소유권 관리
      * 나중에 추가 정보 업데이트 가능한 확장 가능한 구조

#### CL-05: 청소 품질 평가 및 피드백

  * **User Story**:
      * **AS A** Client **I WANT TO** 완료된 청소 작업에 대해 평가하고 피드백을 남길 수 **SO THAT** 서비스 품질 개선에 기여하고 향후 더 나은 서비스를 받을 수 있다.
  * **Technical Notes**:
      * Firestore `reviews` 컬렉션에 평가 데이터 저장
      * 별점, 코멘트, 개선사항 등 포함

-----

### 4.3. Manager (청소 관리업체) - Web Admin

#### CA-04: Client별 건물 및 세부정보 모니터링

  * **User Story**:
      * **AS A** Manager **I WANT TO** 모든 Client의 건물 목록과 각 건물의 상세정보를 확인할 수 **SO THAT** 전체 관리 대상을 파악하고 효율적인 서비스를 제공할 수 있다.
  * **Client별 건물 관리 기능**:
      * **Client 목록**: 계약된 모든 Client 및 담당 건물 수 표시
      * **건물 목록**: Client별 등록된 모든 건물 정보
      * **세부 정보**: Client가 볼 수 있는 모든 정보 (청소 이력, 사진, 시간, Worker 메모 등)
      * **요청 내역**: 각 Client가 등록한 모든 요청사항 및 처리 상태
      * **서비스 이력**: Client별 서비스 제공 내역 및 만족도
  * **Technical Notes**:
      * Firestore `buildings` 컬렉션에서 `managedBy` 필드로 관리 건물 조회
      * Client 권한과 동일한 데이터 접근 + 추가 관리 정보
      * 실시간 리스너로 모든 변경사항 즉시 반영

#### CA-05: Worker 작업 배정 및 관리

  * **User Story**:
      * **AS A** Manager **I WANT TO** Worker에게 청소할 건물을 배정하고 작업 진행과정을 모니터링할 수 **SO THAT** 효율적인 인력 관리와 품질 관리가 가능하다.
  * **작업 배정 기능**:
      * **건물-Worker 매칭**: 드래그 앤 드롭으로 직관적 배정
      * **일정 관리**: 캘린더 UI에서 Worker별/건물별 스케줄 관리
      * **작업량 분석**: Worker별 작업 부하 자동 계산 및 균등 배분
      * **스킬 매칭**: Worker의 전문 영역과 건물 특성 매칭
  * **진행과정 모니터링**:
      * **실시간 상태**: Worker별 현재 작업 상태 (대기, 진행중, 완료)
      * **위치 추적**: Worker가 배정된 건물 및 현재 위치
      * **작업 진도**: 각 건물별 청소 진행률 실시간 확인
      * **사진 모니터링**: 청소 전후 사진 즉시 확인 및 품질 검토
  * **Technical Notes**:
      * Firestore `cleaningJobs` 컬렉션에서 작업 배정 및 상태 관리
      * 실시간 리스너로 Worker 작업 상태 모니터링
      * 드래그 앤 드롭 UI를 위한 웹 기반 인터페이스

#### CA-06: 통계 및 분석 대시보드

  * **User Story**:
      * **AS A** Manager **I WANT TO** 건물들과 Worker의 작업에 대한 다양한 통계정보를 확인할 수 **SO THAT** 데이터 기반의 의사결정을 내리고 서비스 품질을 지속적으로 개선할 수 있다.
  * **건물 관련 통계**:
      * **건물별 청소 빈도**: 월별/주별 청소 횟수 및 패턴
      * **건물별 소요시간**: 평균 청소 시간 및 효율성 분석
      * **문제 발생률**: 건물별 보완 요청 및 문제 발생 빈도
      * **Client 만족도**: 건물별 평가 점수 및 피드백 분석
  * **Worker 관련 통계**:
      * **Worker별 생산성**: 작업 완료 시간, 품질 점수, 효율성
      * **작업 분배 현황**: Worker별 할당된 건물 수 및 작업량
      * **성과 분석**: 완료율, 재작업률, Client 만족도
      * **교육 필요도**: 문제 발생 패턴 기반 교육 영역 식별
  * **전체 운영 통계**:
      * **매출 분석**: 월별/분기별 매출 및 성장률
      * **운영 효율성**: 전체 작업 시간, 비용 효율성
      * **고객 유지율**: Client 이탈률 및 신규 고객 획득률
      * **예측 분석**: 향후 작업량 및 인력 필요도 예측
  * **Technical Notes**:
      * Firestore 집계 쿼리 및 Cloud Functions를 활용한 통계 계산
      * Chart.js 또는 D3.js를 활용한 시각화 대시보드
      * 실시간 데이터 업데이트 및 필터링 기능

#### CA-07: 스케줄 관리

  * **User Story**:
      * **AS A** Manager **I WANT TO** 캘린더 UI에서 직원별/건물별 청소 일정을 드래그 앤 드롭으로 배정할 수 **SO THAT** 스케줄을 직관적이고 효율적으로 관리할 수 있다.
  * **Technical Notes**:
      * Firestore `cleaningJobs` 컬렉션에서 일정 관리
      * 드래그 앤 드롭 기반 일정 변경 및 재배정

#### CA-08: 건물 등록 및 관리

  * **User Story**:
      * **AS A** Manager **I WANT TO** 청소 서비스를 제공할 건물 정보를 등록하고 관리할 수 **SO THAT** 체계적인 청소 업무 배정과 효율적인 서비스 제공이 가능하다.
  * **필수 등록 정보**:
      * **기본 정보**: 건물명, 주소
      * **담당자 정보**: 담당자 이름, 전화번호, 담당자 주소
      * **건물 구조**: 건물 층수 (지하층~지상층까지)
      * **부대시설**: 주차장 유무, 주차 가능 대수, 엘리베이터 유무
      * **서비스 정보**: 청소 빈도, 특별 요구사항, 계약 조건
  * **Technical Notes**:
      * Firestore `buildings` 컬렉션에 새 건물 문서 생성
      * Manager의 `companyId`와 연결하여 관리 권한 설정
      * 확장 가능한 스키마로 나중에 추가 정보 업데이트 지원
      * Client와 공유 가능한 건물 정보 동기화

#### CA-09: 인앱 메시징 시스템

  * **User Story**:
      * **AS A** Manager **I WANT TO** Client 및 Worker와 실시간으로 메시지를 주고받을 수 **SO THAT** 효율적인 소통과 업무 조율이 가능하다.
  * **Technical Notes**:
      * Firestore `messages` 컬렉션 활용
      * 실시간 메시지 동기화 (onSnapshot)
      * 푸시 알림 연동 (Firebase Cloud Messaging)

-----

## 5\. 비기능적 요구사항 (Non-functional Requirements)

### 5.1. 성능 (Performance)

  * **Responsiveness**: Firestore 쿼리 및 실시간 동기화 응답 시간 1초 이내를 목표로 합니다.
  * **Loading Speed**: 앱 로딩 및 화면 전환은 2초 이내로 합니다.
  * **Image Processing**: Firebase Storage 업로드/다운로드 시 최적화된 용량 및 포맷(WebP 등)을 사용합니다.
  * **Offline Support**: Firestore 오프라인 캐시를 활용한 네트워크 끊김 상황 대응

### 5.2. 사용성 (Usability)

  * **UX/UI**: 사용자 연령대를 고려한 **직관적인 UI**와 **큰 글씨, 쉬운 아이콘**을 적용합니다.
  * **Critical Path**: 작업자 앱의 핵심 기능(작업 시작/종료, 사진 등록)은 1\~2회의 터치로 접근 가능하도록 설계합니다.
  * **Real-time Updates**: Firestore 실시간 리스너를 통한 즉각적인 상태 업데이트
  * **Role-based UI**: 회원가입 시 선택한 역할에 따른 맞춤형 인터페이스 제공

### 5.3. 보안 (Security)

  * **Firebase Authentication**: 이메일/비밀번호, Google, Apple 소셜 로그인 지원
  * **회원가입 보안**: 역할별 맞춤형 가입 절차 및 데이터 검증
  * **민감 정보 보호**: 계좌번호, 주소 등 AES-256 암호화 저장
  * **Firestore Security Rules**: 3단계 사용자 역할 기반 데이터 접근 제어
    - **Worker**: 본인 배정 작업만 조회/수정 가능, 급여 정보 보호
    - **Manager**: 소속 업체 관련 모든 데이터 접근 가능, 건물 등록/수정 권한
    - **Client**: 본인 등록 건물 관련 데이터만 접근 가능, 건물 등록/수정 권한
  * **Firebase Storage Rules**: 역할별 사진 파일 업로드/다운로드 권한 관리
  * **메시징 보안**: 대화 참여자만 메시지 조회 가능
  * **데이터 격리**: 업체별, 고객별 데이터 완전 분리

-----

## 6\. 데이터 모델 (Data Model)

### 6.1. Firebase Firestore 데이터 모델링

#### 🎯 **설계 원칙**
- **간결성**: 최소한의 컬렉션으로 모든 요구사항 충족
- **효율성**: Firestore 쿼리 최적화 및 실시간 동기화 고려
- **확장성**: 향후 기능 추가 시 구조 변경 최소화
- **보안성**: 역할별 접근 제어 및 민감 정보 보호

#### 📊 **컬렉션 구조 개요**
```
cleanit (Firebase Project)
├── users/                    # 사용자 정보 (Worker, Manager, Client)
├── companies/                # 청소 업체 정보
├── buildings/                # 건물 정보
├── jobs/                     # 청소 작업
├── requests/                 # 요청사항
├── conversations/            # 대화방
│   └── messages/            # 메시지 (서브컬렉션)
└── reviews/                  # 평가 및 피드백
```

#### 🏢 **1. users 컬렉션**
**Document ID**: Firebase Auth UID
```typescript
{
  // 기본 정보 (공통)
  role: "client" | "worker" | "manager"
  email: string                        // Firebase Auth와 동기화
  phone: string                        // 전화번호
  emergencyPhone?: string              // 비상전화번호
  isActive: boolean                    // 계정 활성 상태
  isVerified: boolean                  // 이메일 인증 상태
  createdAt: timestamp
  updatedAt: timestamp

  // 역할별 정보
  clientInfo?: {                       // Client만
    address: string                    // 암호화된 주소
  }
  
  workerInfo?: {                       // Worker만
    bankName: string                   // 은행명
    accountNumber: string              // 암호화된 계좌번호
    companyId?: string                 // 소속 업체 ID
  }
  
  managerInfo?: {                      // Manager만
    name: string                       // 대표자/담당자명
    companyId: string                  // 소속 업체 ID
    companyAddress: string             // 암호화된 사업장 주소
  }
}
```

#### 🏢 **2. companies 컬렉션**
**Document ID**: 자동 생성
```typescript
{
  name: string                         // 업체명
  managerId: string                    // 대표 Manager ID
  address: string                      // 암호화된 사업장 주소
  phone: string                        // 업체 전화번호
  
  // 통계 정보 (자동 계산)
  workerCount: number                  // 소속 Worker 수
  buildingCount: number                // 관리 건물 수
  monthlyRevenue?: number              // 월 매출 (선택)
  
  isActive: boolean                    // 업체 활성 상태
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 🏠 **3. buildings 컬렉션**
**Document ID**: 자동 생성
```typescript
{
  name: string                         // 건물명
  address: string                      // 건물 주소
  
  // 담당자 정보
  contact: {
    name: string                       // 담당자 이름
    phone: string                      // 전화번호
    address: string                    // 암호화된 담당자 주소
  }
  
  // 건물 구조
  floors: {
    basement: number                   // 지하층 수 (양수)
    ground: number                     // 지상층 수
    total: number                      // 총 층수 (자동 계산)
    hasElevator: boolean               // 엘리베이터 유무
  }
  
  // 부대시설
  parking: {
    available: boolean                 // 주차장 유무
    spaces?: number                    // 주차 가능 대수
  }
  
  // 관리 정보
  ownerId: string                      // 등록자 (Client) ID
  companyId?: string                   // 관리 업체 ID
  
  // 청소 관련 정보
  cleaningAreas: string[]              // 청소 영역 목록
  specialNotes?: string                // 특별 지시사항
  
  isActive: boolean                    // 활성 상태
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 🧹 **4. jobs 컬렉션**
**Document ID**: 자동 생성
```typescript
{
  buildingId: string                   // 건물 ID
  workerId: string                     // 담당 Worker ID
  companyId: string                    // 업체 ID
  
  // 일정 정보
  scheduledAt: timestamp               // 예정 일시
  startedAt?: timestamp                // 실제 시작 시간
  completedAt?: timestamp              // 실제 완료 시간
  duration?: number                    // 소요시간 (분)
  
  // 상태 관리
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  
  // 청소 내용
  areas: string[]                      // 청소한 영역
  beforePhotos: string[]               // 청소 전 사진 (최대 7장)
  afterPhotos: string[]                // 청소 후 사진 (최대 7장)
  workerNotes?: string                 // Worker 메모
  
  // 품질 관리
  completionRate: number               // 완료율 (0-100)
  isVisible: boolean                   // Client 조회 가능 여부
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 📝 **5. requests 컬렉션**
**Document ID**: 자동 생성
```typescript
{
  buildingId: string                   // 건물 ID
  requesterId: string                  // 요청자 (Client) ID
  
  // 요청 내용
  type: "general" | "additional" | "urgent" | "special"  // 요청 유형
  priority: "normal" | "high" | "urgent"                 // 우선순위
  title: string                        // 요청 제목
  content: string                      // 상세 내용
  location?: string                    // 건물 내 위치
  photos: string[]                     // 첨부 사진
  
  // 배정 정보
  assignedTo: {
    workerId?: string                  // 지정된 Worker
    companyId?: string                 // 지정된 업체
  }
  
  // 처리 정보
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled"
  response?: {
    status: "completed" | "incomplete"
    notes: string                      // 처리 메모
    photos: string[]                   // 처리 결과 사진
    completedAt: timestamp
  }
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 💬 **6. conversations 컬렉션**
**Document ID**: 자동 생성 (참여자 ID 조합)
```typescript
{
  participants: string[]               // 참여자 ID 배열 (2명)
  participantRoles: string[]           // 참여자 역할 ["client", "manager"]
  
  // 최근 메시지 정보 (빠른 조회용)
  lastMessage: {
    content: string
    senderId: string
    timestamp: timestamp
    type: "text" | "image" | "system"
  }
  
  // 메타 정보
  buildingId?: string                  // 관련 건물 ID (선택)
  jobId?: string                       // 관련 작업 ID (선택)
  
  isActive: boolean                    // 대화 활성 상태
  createdAt: timestamp
  updatedAt: timestamp
}

// 서브컬렉션: conversations/{conversationId}/messages
{
  senderId: string                     // 발신자 ID
  content: string                      // 메시지 내용
  type: "text" | "image" | "system"   // 메시지 타입
  imageUrl?: string                    // 이미지 URL (type이 image인 경우)
  
  // 읽음 상태
  readBy: {
    [userId: string]: timestamp        // 사용자별 읽은 시간
  }
  
  createdAt: timestamp
}
```

#### ⭐ **7. reviews 컬렉션**
**Document ID**: 자동 생성
```typescript
{
  jobId: string                        // 관련 작업 ID
  buildingId: string                   // 건물 ID
  reviewerId: string                   // 평가자 (Client) ID
  workerId: string                     // 평가 대상 Worker ID
  companyId: string                    // 업체 ID
  
  // 평가 내용
  rating: number                       // 별점 (1-5)
  comment?: string                     // 코멘트
  categories: {                        // 세부 평가
    cleanliness: number                // 청결도
    punctuality: number                // 시간 준수
    communication: number              // 소통
    overall: number                    // 전체 만족도
  }
  
  // 개선사항
  improvements?: string[]              // 개선 요청사항
  
  isVisible: boolean                   // 공개 여부
  createdAt: timestamp
}
```

#### 📁 **Firebase Storage 구조**
```
cleanit-storage/
├── jobs/
│   └── {jobId}/
│       ├── before/                  # 청소 전 사진 (최대 7장)
│       │   ├── 1.jpg
│       │   ├── 2.jpg
│       │   └── ...
│       └── after/                   # 청소 후 사진 (최대 7장)
│           ├── 1.jpg
│           ├── 2.jpg
│           └── ...
├── requests/
│   └── {requestId}/
│       ├── issue/                   # 문제 사진
│       │   └── *.jpg
│       └── response/                # 처리 결과 사진
│           └── *.jpg
└── conversations/
    └── {conversationId}/
        └── {messageId}.jpg          # 메시지 첨부 이미지
```

#### 🔐 **Firestore Security Rules 예시**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // users 컬렉션: 본인 정보만 접근
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // buildings 컬렉션: 소유자 또는 관리업체만 접근
    match /buildings/{buildingId} {
      allow read: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        resource.data.companyId in getUserCompanies(request.auth.uid)
      );
      allow write: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        getUserRole(request.auth.uid) == "manager"
      );
    }
    
    // jobs 컬렉션: 관련자만 접근
    match /jobs/{jobId} {
      allow read: if request.auth != null && (
        resource.data.workerId == request.auth.uid ||
        resource.data.companyId in getUserCompanies(request.auth.uid) ||
        getBuildingOwner(resource.data.buildingId) == request.auth.uid
      );
      allow write: if request.auth != null && (
        resource.data.workerId == request.auth.uid ||
        getUserRole(request.auth.uid) == "manager"
      );
    }
    
    // requests 컬렉션: 요청자 또는 담당자만 접근
    match /requests/{requestId} {
      allow read, write: if request.auth != null && (
        resource.data.requesterId == request.auth.uid ||
        resource.data.assignedTo.workerId == request.auth.uid ||
        resource.data.assignedTo.companyId in getUserCompanies(request.auth.uid)
      );
    }
    
    // conversations 컬렉션: 참여자만 접근
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      }
    }
  }
}
```

#### 🔍 **주요 쿼리 패턴**

##### **Worker 앱 쿼리**
```typescript
// 배정된 작업 조회
jobs.where('workerId', '==', currentUserId)
    .where('status', 'in', ['scheduled', 'in_progress'])
    .orderBy('scheduledAt')

// 요청사항 조회
requests.where('assignedTo.workerId', '==', currentUserId)
        .where('status', '!=', 'completed')
        .orderBy('priority')
```

##### **Client 앱 쿼리**
```typescript
// 내 건물 목록
buildings.where('ownerId', '==', currentUserId)
         .where('isActive', '==', true)

// 건물별 청소 이력
jobs.where('buildingId', '==', buildingId)
    .where('isVisible', '==', true)
    .orderBy('completedAt', 'desc')
    .limit(20)
```

##### **Manager 웹 쿼리**
```typescript
// 업체 전체 작업 현황
jobs.where('companyId', '==', companyId)
    .where('scheduledAt', '>=', startOfDay)
    .where('scheduledAt', '<=', endOfDay)

// 통계용 집계 쿼리
jobs.where('companyId', '==', companyId)
    .where('completedAt', '>=', startOfMonth)
    .where('status', '==', 'completed')
```

#### ⚡ **실시간 동기화 대상**
- **작업 상태**: `jobs` 컬렉션의 `status`, `startedAt`, `completedAt` 필드
- **새로운 메시지**: `conversations/{id}/messages` 서브컬렉션
- **요청 상태**: `requests` 컬렉션의 `status`, `response` 필드  
- **사진 업로드**: `jobs` 컬렉션의 `beforePhotos`, `afterPhotos` 배열
- **알림 트리거**: Cloud Functions로 FCM 푸시 알림 자동 발송

#### 🚀 **성능 최적화**
- **복합 인덱스**: 자주 사용되는 쿼리 조합에 대한 인덱스 생성
- **페이지네이션**: `limit()` 및 `startAfter()` 사용으로 대용량 데이터 처리
- **캐싱**: 자주 조회되는 건물/사용자 정보는 로컬 캐시 활용
- **배치 작업**: 통계 데이터는 Cloud Functions의 스케줄러로 주기적 업데이트

-----

## 7\. 향후 발전 방향 (Future Enhancements)

  * **Payment Integration**: 청소 비용 정산 및 결제를 위한 전자 결제 시스템 연동.
  * **Chat System**: 작업자와 관리자, 건물주 간의 실시간 소통을 위한 인앱 채팅 기능.
  * **GPS Tracking**: 작업자의 현장 도착 및 이탈 여부를 확인하는 GPS 기반 출퇴근 인증 기능.
  * **IoT/Sensor Integration**: \`\` 건물 내 센서(예: 쓰레기통 상태, 화장실 청결도)와 연동하여 자동 청소 요청 생성.

-----

## 8\. 성공 지표 (Success Metrics)

  * **MAU/DAU**: 월/일 활성 사용자 수 (핵심 지표)
  * **Job Completion Rate**: 앱을 통한 작업 완료율 (서비스 효율성)
  * **CS Resolution Time**: 고객 요청 처리 완료까지의 평균 시간 (고객 만족도)
  * **Churn Rate**: 사용자 이탈률 (서비스 유지력)
  * **Matching Success Rate**: 신규 매칭 요청 대비 실제 계약 성사율 (사업 확장성)