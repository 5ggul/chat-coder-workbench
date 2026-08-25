# 연락안했어요 Worker + D1

랭킹과 익명 이벤트 검증만 담당하는 Cloudflare Workers API입니다. 메시지 원문, 상대 별명, 감정 메모는 이 서버에 저장하지 않습니다.

## 최초 배포

```bash
npm install
npx wrangler d1 create yeonrak-anhassyoyo --location apac
```

출력된 D1 UUID를 `wrangler.jsonc`의 `database_id`에 넣습니다. 이후:

```bash
npm run db:migrate:remote
npm run check
npm run deploy
```

배포된 Worker URL을 모바일 빌드의 `EXPO_PUBLIC_API_BASE_URL`에 설정합니다.

## 점수 정책

- 가짜 전송: 하루 첫 1회만 3점
- 위기모드 완료: 하루 최대 2회, 각 5점
- 봉인 시간 정상 경과 후 확인: 하루 최대 3회, 각 20점
- 클라이언트는 점수를 직접 제출하지 않습니다.
- 이벤트 ID는 중복 처리되어 재전송으로 점수가 중복되지 않습니다.

## 비용 절감 구조

랭킹 조회 때 전체 이벤트를 다시 합산하지 않고 `score_periods`에 주간/월간/누적 점수를 증분 저장합니다. 조회는 해당 기간 인덱스를 사용합니다.
