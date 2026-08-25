# 연락안했어요

실제 연락하지 않고도 보내고 싶은 말을 앱 안에서 끝내는 모바일 앱입니다. 현재 저장소에는 기존 PWA 프로토타입과 출시용 React Native/Expo 앱, Cloudflare Workers + D1 랭킹 API가 함께 있습니다.

## 현재 구조

- `mobile/`: Expo SDK 57 기반 Android/iOS 앱
- `worker/`: Cloudflare Workers + D1 익명 랭킹 API
- 루트 `index.html`, `app.js`, `styles.css`: 초기 PWA 프로토타입

## 네이티브 앱 기능

- 첫 실행 온보딩
- 별명 기반 상대 추가/삭제/선택, D-DAY 초기화
- 가짜 메시지 전송
- 전송 후 삭제 / 24시간 봉인 / 7일 봉인
- 봉인 종료 로컬 알림과 봉인함
- 90초 위기모드 (광고 금지 구간)
- 30일/90일 연락 충동 그래프
- 감정별 패턴과 주간 리포트
- 주간/월간 시즌 실제 서버 랭킹
- 랭킹 닉네임과 저녁 로컬 알림 설정

## 개인정보 원칙

- 실제 연락처 권한을 요청하지 않음
- 상대는 기기에서 별명으로만 관리
- 메시지 원문과 봉인 메시지는 기기에만 저장
- 서버에는 익명 설치 ID, 랭킹 닉네임, 이벤트 종류, 서버 계산 점수만 저장
- 클라이언트는 랭킹 점수를 직접 제출하지 못함

## 랭킹 점수

서버가 이벤트를 검증해 점수를 계산합니다. 반복 조작을 줄이기 위해 일일 상한이 있습니다.

- 가짜 전송: 하루 첫 1회 3점
- 위기모드 완료: 하루 최대 2회, 각 5점
- 실제 봉인 시간이 지난 뒤 확인: 하루 최대 3회, 각 20점

## 모바일 실행

Expo 공식 SDK 57 구성을 사용합니다.

```bash
cd mobile
npm install
npm run typecheck
npx expo start
```

랭킹 서버를 연결하려면 빌드 환경에 다음 값을 넣습니다.

```bash
EXPO_PUBLIC_API_BASE_URL=https://<worker>.workers.dev
```

## 서버 배포

`worker/README.md` 참고. D1 생성 후 `wrangler.jsonc`의 placeholder UUID를 실제 database id로 교체하고 migration과 deploy를 실행합니다.

## 광고

광고는 출시 직전 네이티브 빌드 단계에서 실제 AdMob 테스트 광고를 연결합니다. 핵심 가짜 전송, D-DAY, 위기모드는 광고 없이 유지합니다. 기존 PWA의 광고 시뮬레이터는 제품 흐름 참고용입니다.
