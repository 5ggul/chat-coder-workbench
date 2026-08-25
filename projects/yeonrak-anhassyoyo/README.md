# 연락안했어요

보내고 싶은 메시지를 실제로 전송하지 않고 앱 안에서 끝내는 행동 대체 앱의 모바일 PWA 프로토타입입니다.

## 현재 구현
- 연락 안 한 D-day + 실시간 시계
- 오늘/주간 방어 기록과 방어점수
- 최근 7일 연락 충동 그래프
- 상대별 연속 기록
- 가짜 메시지 작성과 전송 완료 연출
- 감정 태그
- 개인 기록 화면
- 주간 랭킹 화면
- 레벨/배지 프로필
- 보상형 광고 해금 시뮬레이터(심층 분석)
- LocalStorage 기반 상태 유지
- PWA manifest/service worker

## 실행

```bash
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173` 접속.

## 다음 연결
1. React Native/Expo 포팅
2. Cloudflare Workers + D1 랭킹 API
3. AdMob rewarded ads 실제 SDK 연결
4. 봉인함/위기모드/주간 리포트
5. 앱 아이콘/스토어 자산/개인정보처리방침
