# Daily Life Tracker – Architecture (Balanced MVP)

본 문서는 **PRD v1 (Step 0–7 완료본)**을 기준으로 한
**균형형(Balanced) 아키텍처 설계 문서**이다.

목표는 다음 세 가지를 동시에 만족하는 것이다.
- MVP를 빠르고 안정적으로 구현할 수 있을 것
- 운영 비용을 최소화할 것
- 이후 고도화(네이티브 앱, 위젯)를 막지 않을 것

---

## 1. Architecture Principles

1. **Thin Backend, Rich Client**
   - 서버는 저장과 검증만 담당
   - 계산과 표현은 클라이언트 중심

2. **Event-first Data Modeling**
   - 수면은 "상태"가 아니라 "이벤트"로 저장
   - 파생 값(수면 시간, 상태)은 조회 시 계산

3. **Explicit Non-Goals Protection**
   - 분석, 알림, 소셜, 과거 수정이
     구조적으로 끼어들 여지를 만들지 않음

---

## 2. High-level System Architecture

### Components

- **Web Client**
  - SPA (정적 배포)
  - Daily Board 상태 계산 및 렌더링

- **Auth Provider**
  - Google OAuth (Single provider)

- **API Layer (Serverless)**
  - 인증 검증
  - 기록 저장 / 조회
  - 최소 유효성 검증

- **Database (Managed)**
  - User / Day / Event 중심 구조

---

## 3. Data Model (Core)

### 3.1 users

- id (pk)
- google_user_id (unique)
- email
- created_at

---

### 3.2 user_settings

- user_id (pk, fk)
- mood_options (string[], max 5)
- created_at

---

### 3.3 day_entries

> 하루 단위 집계용 엔티티 (캐시 성격)

- user_id
- date (YYYY-MM-DD, local)
- mood (nullable)
- mood_date_source (today | yesterday)
- created_at

---

### 3.4 sleep_events

> 수면은 pair가 아니라 event로 저장

- id
- user_id
- type (bed | wake)
- timestamp_local (YYYY-MM-DD HH:mm)
- created_at

---

## 4. Sleep Calculation Logic

1. 모든 sleep_events는 시간 순으로 정렬
2. wake 이벤트가 들어오면:
   - 직전 bed 이벤트를 탐색
3. pair가 성립할 경우:
   - sleep_duration = wake.timestamp - bed.timestamp
   - 결과는 **wake 날짜 기준**으로 귀속

### Partial States

- bed만 있음 → "취침만 있음"
- wake만 있음 → "기상만 있음"
- 둘 다 없음 → 미기록

> 상태 컬럼은 저장하지 않고, 조회 시 계산

---

## 5. Daily Board State Derivation

각 날짜는 다음 정보를 기준으로 계산된다.

- mood 존재 여부
- sleep_duration 존재 여부

### Day State

- empty: mood 없음 + sleep 없음
- partial: mood 또는 sleep 중 하나만 있음
- full: mood + sleep 모두 있음

---

## 6. API Contract (Minimal)

### Auth
- GET /auth/google/callback
- GET /me

### Settings
- GET /settings
- PUT /settings

### Day Board
- GET /days?from=YYYY-MM-DD&to=YYYY-MM-DD

### Mood
- PUT /days/{date}/mood

### Sleep
- POST /sleep-events

---

## 7. Validation Responsibilities

### Client
- hh:mm 형식 입력 보정
- ±30m UI 제공
- 부분 상태 시각화

### Server
- OAuth 토큰 검증
- timestamp 유효성 검증
- 사용자 소유권 검증

---

## 8. Cost & Scalability Notes

- 정적 호스팅 + 서버리스 API
- 트래픽 증가 시:
  - DB read-heavy 구조에 대비한 인덱스 필요
- 배치/크론/알림 없음 → 운영 단순

---

## 9. Future (Low Priority)

- Flutter 앱은 동일 API 사용
- 위젯은 /days API의 부분 응답 활용
- 데이터 구조 변경 없이 확장 가능

---

> 본 문서는 Architect 기준의 실행 설계 문서이며,
> Dev 단계에서는 본 문서를 구현 체크리스트로 사용한다.

