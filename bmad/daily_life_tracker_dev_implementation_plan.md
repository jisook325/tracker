# Dev Implementation Plan (MVP)

본 문서는 **PRD + Architecture(Balanced)**를 기반으로 한
실제 구현을 위한 실행 계획 문서이다.

---

## Milestone 0. Project Setup

- GitHub Repository 생성
- 기본 README 추가
- 환경 변수 구조 정의
- Google OAuth 설정

---

## Milestone 1. Auth & Skeleton UI

### Tasks

- Google OAuth 로그인 구현
- 로그인 상태 유지
- 기본 레이아웃 구성
  - 상단: 월/연도
  - 본문: 세로형 Daily Board

### DoD

- 로그인 후 빈 Board가 정상 노출된다.
- 날짜 셀은 서버/프론트에서 정확히 날짜로 인식된다.

---

## Milestone 2. Daily Board 렌더링

### Tasks

- 월 단위 날짜 생성 로직
- 날짜 ↔ 셀 매핑
- 상태별 UI 스타일 정의
  - empty / partial / full

### DoD

- 모든 날짜가 정확히 렌더링된다.
- 모바일 스크롤 환경에서 사용 가능하다.

---

## Milestone 3. Mood Tracking

### Tasks

- mood 옵션 설정 UI
- mood 입력 UI
- day_entries 저장/조회

### DoD

- 하루 1회 mood 기록 가능
- 부분 완성 상태가 반영된다.

---

## Milestone 4. Sleep Tracking

### Tasks

- 기상/취침 버튼 UI
- 현재 시간 자동 입력
- ±30m 조정
- sleep_events 저장
- 수면 시간 계산 로직

### DoD

- 취침+기상 pair 정상 계산
- 부분 상태(기상만/취침만) 구분 표시

---

## Milestone 5. Polish & Validation

### Tasks

- 시간 유효성 검증
- 00–06 mood 날짜 확인 UX
- 상태 계산 안정화

### DoD

- 주요 에러 케이스 없이 사용 가능
- PRD 기준 플로우 충족

---

## Out of Scope (MVP)

- 알림
- 통계
- 소셜
- 과거 수정

---

> 본 문서는 Dev 단계에서 체크리스트로 사용하며,
> 완료 여부는 각 Milestone 단위로 판단한다.

