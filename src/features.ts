/**
 * 이 플러그인의 기능 목록. **정본은 여기 하나다.**
 *
 * 커맨드 등록(`main.ts`)과 설정의 기능 탭(`settings.ts`)이 모두 이 목록을 읽는다. 둘이
 * 이름을 따로 가지면 한쪽만 고치는 날 명령 팔레트와 화면이 어긋난다.
 *
 * 기능은 두 종류다 (→ docs/glossary: 기능).
 * - `command`  명령 팔레트에 뜨는 커맨드
 * - `included` 커맨드가 없고, 다른 커맨드가 돌 때 함께 도는 동작
 */

export type Feature =
  | {
      kind: "command";
      commandId: string;
      name: string;
      description: string;
    }
  | {
      kind: "included";
      name: string;
      description: string;
      /** 이 동작을 함께 돌리는 커맨드의 id */
      runsWith: string;
    };

export interface ToolGroup {
  id: string;
  name: string;
  features: Feature[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "daily-log",
    name: "데일리 로그",
    features: [
      {
        kind: "command",
        commandId: "load-previous-work",
        name: "전일 진행 업무 로드",
        description:
          "직전 데일리 노트의 금일 예정 업무를 현재 노트의 전일 진행 업무로 가져옵니다.",
      },
      {
        kind: "included",
        name: "내일 이어서 할 것 이월",
        description:
          "전일 업무를 가져온 그 노트의 이월 섹션을 오늘 노트의 같은 섹션으로 옮깁니다. 오늘 섹션이 비어 있을 때만 채우고, 전날에 없으면 가져오지 않습니다.",
        runsWith: "load-previous-work",
      },
      {
        kind: "command",
        commandId: "insert-daily-template",
        name: "데일리 노트 템플릿 삽입",
        description: "커서 위치에 업무 양식 본문을 삽입합니다.",
      },
    ],
  },
  {
    id: "scrum",
    name: "스크럼(scrum)",
    features: [
      {
        kind: "command",
        commandId: "copy-scrum",
        name: "스크럼(scrum) 내용 복사",
        description:
          "스크럼 영역 안의 내용만 클립보드에 복사합니다. 서식(HTML)과 마크다운 원문을 함께 담습니다.",
      },
      {
        kind: "command",
        commandId: "insert-scrum-region",
        name: "스크럼(scrum) 영역 넣기",
        description: "커서 위치에 빈 스크럼 영역(마커 한 쌍)을 넣습니다.",
      },
    ],
  },
];

export function allFeatures(): Feature[] {
  return TOOL_GROUPS.flatMap((group) => group.features);
}

/** 커맨드 이름. 목록에 없는 id 는 오타이므로 던진다 — 조용히 빈 이름으로 등록하지 않는다. */
export function commandName(commandId: string): string {
  const feature = allFeatures().find(
    (f) => f.kind === "command" && f.commandId === commandId
  );
  if (!feature) throw new Error(`기능 목록에 없는 커맨드입니다: ${commandId}`);
  return feature.name;
}
