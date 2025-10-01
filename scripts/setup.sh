#!/bin/bash

echo "🚀 CleanIT 프로젝트 설정을 시작합니다..."

# Node.js 버전 확인
echo "📋 Node.js 버전 확인 중..."
node --version

# Firebase CLI 설치 확인
if ! command -v firebase &> /dev/null; then
    echo "🔥 Firebase CLI 설치 중..."
    npm install -g firebase-tools
fi

# Expo CLI 설치 확인
if ! command -v expo &> /dev/null; then
    echo "📱 Expo CLI 설치 중..."
    npm install -g @expo/cli
fi

echo "✅ 기본 도구 설치 완료!"
echo "📋 다음 단계:"
echo "1. Firebase 프로젝트 생성"
echo "2. 모바일 앱 설정 (cd mobile-app)"
echo "3. 웹 어드민 설정 (cd web-admin)"

