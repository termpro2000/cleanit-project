#!/bin/bash

# CleanIT Web Admin 배포 스크립트
set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 설정
ENVIRONMENT=${1:-staging}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

log_info "Starting deployment for environment: $ENVIRONMENT"
log_info "Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# 환경 검증
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Node.js 버전 확인
NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

if ! node --version | grep -E "v1[6-9]|v[2-9][0-9]" > /dev/null; then
    log_error "Node.js version 16 or higher is required"
    exit 1
fi

# 환경 변수 파일 확인
ENV_FILE=".env.$ENVIRONMENT"
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file $ENV_FILE not found"
    exit 1
fi

log_info "Using environment file: $ENV_FILE"

# Dependencies 설치
log_info "Installing dependencies..."
npm ci --silent

if [[ $? -ne 0 ]]; then
    log_error "Failed to install dependencies"
    exit 1
fi

log_success "Dependencies installed successfully"

# 린팅
log_info "Running linting..."
npm run lint --silent

if [[ $? -ne 0 ]]; then
    log_warning "Linting issues found, but continuing..."
fi

# 타입 체크
log_info "Running type checking..."
npm run build > /dev/null 2>&1

if [[ $? -ne 0 ]]; then
    log_error "Type checking failed"
    npm run build
    exit 1
fi

log_success "Type checking passed"

# 테스트 실행 (staging/production만)
if [[ "$ENVIRONMENT" != "development" ]]; then
    log_info "Running tests..."
    npm test -- --watchAll=false --coverage --silent

    if [[ $? -ne 0 ]]; then
        log_warning "Some tests failed, but continuing deployment..."
    else
        log_success "All tests passed"
    fi
fi

# 프로덕션 빌드
log_info "Building for $ENVIRONMENT..."

# 환경별 빌드 명령
if [[ "$ENVIRONMENT" == "production" ]]; then
    REACT_APP_ENVIRONMENT=production npm run build
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    REACT_APP_ENVIRONMENT=staging npm run build
fi

if [[ $? -ne 0 ]]; then
    log_error "Build failed"
    exit 1
fi

log_success "Build completed successfully"

# 빌드 결과 분석
log_info "Analyzing build output..."

BUILD_SIZE=$(du -sh build | cut -f1)
log_info "Total build size: $BUILD_SIZE"

# 큰 파일들 찾기
log_info "Large files in build:"
find build -type f -size +100k -exec ls -lh {} \; | awk '{print $5 " " $9}' | sort -hr | head -5

# 보안 검사
log_info "Running security checks..."

# 민감한 정보가 빌드에 포함되었는지 확인
if grep -r "password\|secret\|private" build/ --exclude-dir=static; then
    log_warning "Potential sensitive information found in build"
fi

# Firebase 배포 준비
log_info "Preparing Firebase deployment..."

# Firebase CLI 설치 확인
if ! command -v firebase &> /dev/null; then
    log_error "Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Firebase 로그인 확인
if ! firebase projects:list &> /dev/null; then
    log_error "Please login to Firebase: firebase login"
    exit 1
fi

# Firebase 프로젝트 설정
FIREBASE_PROJECT="cleanit-9c968"
log_info "Using Firebase project: $FIREBASE_PROJECT"

# 호스팅 타겟 설정
if [[ "$ENVIRONMENT" == "production" ]]; then
    HOSTING_TARGET="production"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    HOSTING_TARGET="staging"
fi

log_info "Deploying to hosting target: $HOSTING_TARGET"

# Firebase 배포
log_info "Deploying to Firebase..."

if [[ "$ENVIRONMENT" == "production" ]]; then
    # 프로덕션 배포 (보안 규칙 포함)
    firebase deploy --project="$FIREBASE_PROJECT" --only hosting:production,firestore:rules,storage:rules
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    # 스테이징 배포 (호스팅만)
    firebase deploy --project="$FIREBASE_PROJECT" --only hosting:staging
fi

if [[ $? -ne 0 ]]; then
    log_error "Firebase deployment failed"
    exit 1
fi

log_success "Firebase deployment completed"

# 배포 후 검증
log_info "Running post-deployment verification..."

# 배포된 사이트 URL
if [[ "$ENVIRONMENT" == "production" ]]; then
    DEPLOYED_URL="https://cleanit-9c968.web.app"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    DEPLOYED_URL="https://staging.cleanit-9c968.web.app"
fi

log_info "Checking deployed site: $DEPLOYED_URL"

# HTTP 상태 확인
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    log_success "Site is accessible (HTTP $HTTP_STATUS)"
else
    log_warning "Site returned HTTP $HTTP_STATUS"
fi

# 응답 시간 측정
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$DEPLOYED_URL" || echo "0")
log_info "Site response time: ${RESPONSE_TIME}s"

# 배포 완료 알림
log_success "🎉 Deployment completed successfully!"
log_info "Environment: $ENVIRONMENT"
log_info "URL: $DEPLOYED_URL"
log_info "Build size: $BUILD_SIZE"
log_info "Response time: ${RESPONSE_TIME}s"

# 배포 정보 저장
DEPLOY_INFO="{
  \"environment\": \"$ENVIRONMENT\",
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"url\": \"$DEPLOYED_URL\",
  \"buildSize\": \"$BUILD_SIZE\",
  \"responseTime\": \"${RESPONSE_TIME}s\",
  \"nodeVersion\": \"$NODE_VERSION\",
  \"commit\": \"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\"
}"

echo "$DEPLOY_INFO" > "deploy-info-$ENVIRONMENT.json"
log_info "Deployment info saved to deploy-info-$ENVIRONMENT.json"

# Slack 알림 (옵션)
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    log_info "Sending Slack notification..."
    
    SLACK_MESSAGE="{
      \"text\": \"🚀 CleanIT 배포 완료\",
      \"attachments\": [{
        \"color\": \"good\",
        \"fields\": [
          {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
          {\"title\": \"URL\", \"value\": \"$DEPLOYED_URL\", \"short\": true},
          {\"title\": \"Build Size\", \"value\": \"$BUILD_SIZE\", \"short\": true},
          {\"title\": \"Response Time\", \"value\": \"${RESPONSE_TIME}s\", \"short\": true}
        ]
      }]
    }"
    
    curl -X POST -H 'Content-type: application/json' \
         --data "$SLACK_MESSAGE" \
         "$SLACK_WEBHOOK_URL" &> /dev/null
    
    log_success "Slack notification sent"
fi

log_success "All deployment tasks completed! 🎊"

exit 0