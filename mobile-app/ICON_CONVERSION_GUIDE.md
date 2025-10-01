# CleanIT 아이콘 변환 가이드

## 📱 생성된 아이콘 파일들

### ✅ 완료된 SVG 파일들
1. **icon.svg** - 메인 앱 아이콘 (1024x1024)
2. **adaptive-icon.svg** - Android 적응형 아이콘 (432x432)
3. **splash.svg** - 스플래시 스크린 (1242x2688)
4. **favicon.svg** - 웹 파비콘 (512x512)

## 🔄 PNG 변환 방법

### 방법 1: 온라인 변환기 (추천)
**CloudConvert (cloudconvert.com/svg-to-png)**
1. SVG 파일 업로드
2. 출력 크기 설정
3. PNG로 변환 다운로드

**Vector Magic (vectormagic.com)**
1. SVG 업로드
2. PNG 출력 선택
3. 고품질로 다운로드

### 방법 2: Figma 사용
1. Figma에서 SVG 파일 열기
2. Export → PNG 선택
3. 원하는 크기로 내보내기

### 방법 3: Adobe Illustrator/Photoshop
1. SVG 파일 열기
2. Export As → PNG
3. 해상도 및 크기 설정

## 📐 필요한 크기별 파일

### iOS App Store 제출용
```
icon-1024.png  (1024x1024) - App Store 아이콘
icon-180.png   (180x180)   - iPhone 앱 아이콘
icon-152.png   (152x152)   - iPad 앱 아이콘
icon-120.png   (120x120)   - iPhone 앱 아이콘 (작은 크기)
```

### Android Play Store 제출용
```
icon-android-1024.png (1024x1024) - Play Store 아이콘
adaptive-icon.png     (432x432)   - 적응형 아이콘 전경
```

### 웹용
```
favicon-512.png  (512x512) - 대형 파비콘
favicon-192.png  (192x192) - Chrome Android
favicon-32.png   (32x32)   - 브라우저 탭
favicon-16.png   (16x16)   - 브라우저 탭 (소형)
```

## 🎨 디자인 특징

### 메인 아이콘 (icon.svg)
- **배경**: 원형 블루 그라데이션 (#2196F3 → #1976D2)
- **메인 요소**: 흰색 청소 브러시 (중앙 배치)
- **품질 표시**: 황금색 별 3개 (브러시 주변)
- **효과**: 청소 거품, 드롭 섀도우
- **스타일**: 모던 미니멀, 플랫 디자인

### 적응형 아이콘 (adaptive-icon.svg)
- **전경**: 청소 브러시 + 별 심볼만
- **배경**: 투명 (시스템에서 배경 제공)
- **세이프 존**: 108dp 내에 모든 중요 요소 배치
- **크기**: 432x432px (Android 표준)

### 스플래시 스크린 (splash.svg)
- **배경**: 세로 그라데이션 (블루 → 라이트 블루 → 그레이)
- **로고**: 중앙 배치, 흰색 원형 배경
- **텍스트**: "CleanIT" + "프로페셔널 청소 관리"
- **효과**: 떠다니는 거품, 은은한 그림자

### 파비콘 (favicon.svg)
- **디자인**: 메인 아이콘의 단순화 버전
- **배경**: 원형 블루 그라데이션
- **심볼**: 단순화된 브러시 + 별 1개
- **최적화**: 작은 크기에서도 명확한 인식

## 📱 앱에서 사용법

### app.json 설정
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2196F3"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2196F3"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## ✅ 체크리스트

### 변환 완료 확인
- [ ] icon.png (1024x1024) - 메인 아이콘
- [ ] adaptive-icon.png (432x432) - Android 적응형
- [ ] splash.png (1242x2688) - 스플래시 스크린
- [ ] favicon.png (512x512) - 웹 파비콘

### 품질 확인
- [ ] 선명도 (작은 크기에서도 인식 가능)
- [ ] 색상 정확도 (브랜드 컬러 유지)
- [ ] 투명도 (필요한 부분만)
- [ ] 파일 크기 (너무 크지 않게)

### 플랫폼별 테스트
- [ ] iOS 디바이스에서 확인
- [ ] Android 디바이스에서 확인
- [ ] 웹 브라우저에서 확인
- [ ] 다양한 배경색에서 확인

## 🔧 트러블슈팅

### 아이콘이 흐릿하게 보일 때
- 더 높은 해상도로 변환
- SVG의 벡터 품질 확인
- 안티앨리어싱 설정 조정

### 색상이 다르게 보일 때
- 색상 프로파일 확인 (sRGB 권장)
- 브라우저/디바이스별 색상 테스트
- PNG 저장 시 색상 설정 확인

### 파일 크기가 너무 클 때
- 압축 품질 조정
- 불필요한 메타데이터 제거
- 온라인 압축 도구 사용 (TinyPNG 등)

이제 SVG 파일들을 PNG로 변환하여 앱에 적용하면 완성됩니다! 🎉