# CLAUDE.md

Obsidian 플러그인 `inno-daily-log` 저장소의 작업 지침.
전역 지침(`~/.claude/CLAUDE.md`)에 더해, **이 저장소 고유의 것만** 적는다.

---

## 무엇인가

데일리 노트의 `금일 예정 업무` 섹션을 다음 날 노트의 `전일 진행 업무` 로 옮기고,
업무 양식 템플릿을 삽입하는 플러그인. **외부 API를 쓰지 않는다** — Vault 안에서만 동작한다.

전신은 `~/my/Dev/inje-obsidian-plugin-for-dooray` (Dooray Daily Log) 이고 **그 저장소는 폐기됐다.**
Dooray 관련 코드는 한 줄도 가져오지 않았다. 참고할 일이 있어도 거기 구현을 그대로 믿지 말 것 —
전일 노트 탐색 버그가 있는 상태로 남아 있다.

## 스택

TypeScript 5.8 / esbuild 0.25 (cjs 번들 → `main.js`) / jest + ts-jest.
**런타임 의존성 없음.** `obsidian` 은 타입 전용 패키지다.

| 명령어 | 하는 일 |
|---|---|
| `npm run dev` | watch 빌드 |
| `npm run build` | `tsc` 타입 체크 + 프로덕션 번들 |
| `npm test` | jest |
| `npm version <patch\|minor\|major>` | `manifest.json` / `versions.json` 동기화 (`version-bump.mjs`) |

## 구조

| 파일 | 역할 | obsidian 의존 |
|---|---|---|
| `src/daily-log.ts` | 섹션 파싱·치환, 이전 노트 탐색 | **없음** |
| `src/template.ts` | 기본 양식 상수, 날짜 포맷, 변수 치환 | **없음** |
| `src/settings.ts` | 설정 타입·기본값·설정 탭 | 있음 |
| `src/main.ts` | 플러그인 진입, 커맨드 등록, Vault 입출력 | 있음 |

이 경계가 곧 테스트 가능 범위다. 아래를 반드시 읽을 것.

---

## 반드시 지킬 것

### obsidian 을 import 하는 모듈은 테스트할 수 없다

npm 의 `obsidian` 패키지는 **타입 선언만** 들어 있다 (`"main": ""`, `obsidian.d.ts` 뿐).
런타임 구현이 없어 jest 가 모듈 해석에 실패한다:

```
Cannot find module 'obsidian' from 'src/settings.ts'
```

따라서 **테스트하고 싶은 값과 로직은 obsidian 을 import 하지 않는 모듈에 둔다.**
`DEFAULT_BODY_TEMPLATE` 이 `settings.ts` 가 아니라 `template.ts` 에 있는 이유가 이것이다.
`settings.ts` 는 그 값을 re-export 만 한다.

새 로직은 `main.ts` 에 바로 쓰지 말고 `daily-log.ts` / `template.ts` 로 뺀 뒤
`main.ts` 는 호출만 하게 한다.

### 섹션 파싱 규칙

- 섹션 제목은 `**[이름]**` 형태(볼드 대괄호)다. **마크다운 heading 이 아니다.**
- 제목 줄 끝에 NBSP(` `)가 붙은 실제 노트가 있다. 정규화해서 비교한다.
- 섹션 본문은 다음 섹션 제목 또는 `---` 를 만나면 끝난다.
- 본문 교체 시 **앞뒤 빈 줄은 보존하고 내용만** 바꾼다.

### 날짜와 폴더 규칙

- 날짜는 파일명에서 읽는다: `2026-09-01 Abraxas.md`
- 실제 Vault 는 노트를 **월별 폴더**(`Work/Daily/2026-09/`)로 나눠 담는다.
  같은 부모 폴더만 훑으면 **매월 1일에 전월 노트를 놓친다.** 전신 플러그인의 버그가 이것이다.
  `resolveSearchRoot` 가 부모 폴더 이름이 `YYYY-MM` 형태면 한 단계 위를 쓰는 이유다.
- 이 동작을 건드릴 때는 월 경계 테스트를 반드시 함께 확인한다.

### Vault 쓰기

`vault.process` 가 있으면 그걸 쓰고, 없으면 `read` → `modify` 로 폴백한다.
모바일·구버전 대응이므로 **분기를 지우지 않는다.**

---

## 테스트 경계

자동 테스트는 `daily-log.ts` / `template.ts` 순수 함수만 덮는다 (18개).
**커맨드 등록, 설정 탭, 실제 Vault 쓰기는 자동 검증 대상이 아니다** — Obsidian API 목이 없다.

이 영역을 고쳤으면 "동작합니다"라고 쓰지 말고, 실제 Vault 에서 확인했는지 여부를 명시한다.

## 배포

로컬 Vault 배포는 개인 스킬 `obsidian-local-deploy` 를 쓴다.
**반드시 소스 저장소를 인자로 넘긴다** — 생략하면 기본값이 폐기된 dooray 저장소다.

```bash
~/.claude/skills/obsidian-local-deploy/scripts/deploy.sh /Users/jjw/my/Dev/obsidian-plugin-for-inno
```

대상은 `manifest.json` 의 `id` 에서 정해진다 → `<vault>/.obsidian/plugins/inno-daily-log/`
대상 폴더의 `data.json`(사용자 설정값)은 건드리지 않는다.

## 저장소

- **origin 은 공개 GitHub 다** (`github.com/JeongJaew0n/obsidian-plugin-for-inno`).
  사내 도메인·계정·업무 내용을 코드·테스트 픽스처·문서에 넣지 않는다.
  실제 Vault 노트 내용을 그대로 테스트에 붙여넣지 말 것.
- 커밋 타입: `feat` / `fix` / `chore` / `docs` + 한글 요약.
