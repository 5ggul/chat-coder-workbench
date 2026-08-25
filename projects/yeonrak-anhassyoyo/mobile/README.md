# 연락안했어요 mobile

Expo SDK 57 / React Native 0.86 기반 출시용 앱입니다.

## 환경 변수

- `EXPO_PUBLIC_API_BASE_URL`: Cloudflare Worker API base URL. 비어 있으면 개인 기록 모드로 동작하며 랭킹만 비활성화됩니다.

## 데이터 경계

- AsyncStorage: 상대 별명, 활동 기록, 봉인 메시지 원문, 설정
- SecureStore: 익명 랭킹 서버 install token과 user id
- D1: 익명 user id, 닉네임, 이벤트, 봉인 시간 메타데이터, 기간별 점수

메시지 body는 API 요청에 포함하지 않습니다.

## 출시 전 교체 항목

- `app.json` bundle/package id 최종 확인
- 앱 아이콘 / adaptive icon / splash asset
- 개인정보처리방침 실제 URL
- Cloudflare Worker URL
- 마지막 단계에서 AdMob 테스트 광고 연결
