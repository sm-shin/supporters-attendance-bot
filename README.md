# 서포터즈 출석 체크 챗봇 MVP

구조:

카카오톡 채널 챗봇 → Vercel API → Notion DB

## 동작 규칙

- 운영일: 월요일~토요일
- 하루 2회: 오전 / 오후
- 동일 참여자가 같은 날 오전+오후 모두 참여 가능
- 같은 날짜 + 같은 세션의 중복 출석은 차단
- 활동 횟수는 채팅방에 표시하지 않음
- 출석 성공 시 아래 형식의 멘트를 반환

```text
✅ 10/1 오전 서포터즈 활동 출석합니다.
신승민
```

## 1. Notion 데이터베이스

### 참여자 DB

아래 속성명을 정확히 사용하세요.

| 속성 | 타입 |
|---|---|
| Name | Title |
| KakaoUserKey | Rich text |
| RegisteredAt | Date |
| Active | Checkbox |

### 출석 DB

| 속성 | 타입 |
|---|---|
| Name | Title |
| KakaoUserKey | Rich text |
| Date | Date |
| Session | Select (`오전`, `오후`) |
| CheckedAt | Date |
| AttendanceKey | Rich text |

Notion Integration에 두 DB(데이터 소스)를 연결/공유합니다.

## 2. 환경변수

Vercel 프로젝트에 아래 값을 등록합니다.

```env
NOTION_TOKEN=secret_xxx
NOTION_PARTICIPANTS_DATA_SOURCE_ID=...
NOTION_ATTENDANCE_DATA_SOURCE_ID=...
NOTION_VERSION=2025-09-03
```

## 3. 배포

Vercel에 이 폴더를 프로젝트로 배포합니다.

배포 후 엔드포인트 예시:

- `https://YOUR-DOMAIN.vercel.app/api/health`
- `https://YOUR-DOMAIN.vercel.app/api/register`
- `https://YOUR-DOMAIN.vercel.app/api/attendance-am`
- `https://YOUR-DOMAIN.vercel.app/api/attendance-pm`

## 4. 카카오 챗봇 관리자센터 구성

스킬 서버는 HTTP POST + JSON 방식입니다.

권장 블록:

1. `이름 등록`
   - 사용자에게 이름/오픈채팅 닉네임 입력
   - 파라미터명: `name`
   - 스킬 URL: `/api/register`

2. `오전 출석`
   - 스킬 URL: `/api/attendance-am`

3. `오후 출석`
   - 스킬 URL: `/api/attendance-pm`

웰컴/메인 블록에는 바로가기:
- 이름 등록
- 오전 출석
- 오후 출석

## 5. 출석 판정

논리적인 고유키는 아래와 같습니다.

`날짜 + 세션 + KakaoUserKey`

따라서:
- 월요일 오전 1회 + 월요일 오후 1회 = 정상 2회
- 월요일 오전 버튼을 두 번 누름 = 두 번째는 차단
- 일요일 = 출석 불가

## 6. 다음 개선 권장사항

- 출석 가능 시간대 제한
- 특정 활동일 휴무/예외일 관리
- 운영자용 월별 집계 View
- 참여자 비활성화
- 이름 변경 기능
- 관리자 승인 방식
