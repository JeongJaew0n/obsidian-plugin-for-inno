import {
  SCRUM_MARKERS,
  assertNoScrumMarkers,
  extractScrum,
  newScrumRegion,
} from "../src/scrum";
import { extractRegion, type MarkerPair } from "../src/markers";

const wrap = (body: string): string =>
  `${SCRUM_MARKERS.start}\n${body}${SCRUM_MARKERS.end}\n`;

describe("스크럼(scrum) 영역", () => {
  test("영역 안만 원문 그대로 복사한다", () => {
    const body = [
      "- 어제: 전일 업무 정리",
      "\t- 하위: 섹션 파싱 확인",
      "",
      "- 오늘: 스크럼 복사 기능",
      "",
    ].join("\n");
    const note = `# 데일리\n개인 메모는 복사되면 안 된다\n\n${wrap(body)}\n## 그 뒤 내용\n`;

    const copied = extractScrum(note);

    expect(copied).toBe(body);
    expect(copied).not.toContain("개인 메모");
    expect(copied).not.toContain("그 뒤 내용");
    expect(copied).not.toContain(SCRUM_MARKERS.start);
  });

  test("들여쓰기·빈 줄·마크다운을 손대지 않는다", () => {
    const body = [
      "\t- 탭 들여쓰기",
      "",
      "```js",
      "const a = 1;",
      "```",
      "",
      "| 표 | 값 |",
      "|---|---|",
      "",
    ].join("\n");

    expect(extractScrum(wrap(body))).toBe(body);
  });

  test("표식이 없으면 영역 넣기를 안내한다", () => {
    expect(() => extractScrum("# 그냥 노트\n내용\n")).toThrow(
      /스크럼\(scrum\) 영역 넣기/
    );
  });

  test("표식이 한쪽만 있거나 순서가 뒤바뀌면 거부한다", () => {
    expect(() => extractScrum(`${SCRUM_MARKERS.start}\n내용\n`)).toThrow(
      /한 쌍이어야/
    );
    expect(() =>
      extractScrum(`${SCRUM_MARKERS.end}\n내용\n${SCRUM_MARKERS.start}\n`)
    ).toThrow(/한 쌍이어야/);
    expect(() => extractScrum(wrap("a\n") + wrap("b\n"))).toThrow(
      /한 쌍이어야/
    );
  });

  test("영역이 비어 있으면 빈 클립보드를 만들지 않는다", () => {
    expect(() => extractScrum(wrap(""))).toThrow(/비어 있습니다/);
    expect(() => extractScrum(wrap("   \n\n"))).toThrow(/비어 있습니다/);
  });

  test("코드 블록 안의 표식은 표식으로 보지 않는다", () => {
    const note = [
      "```md",
      SCRUM_MARKERS.start,
      "예시",
      SCRUM_MARKERS.end,
      "```",
      "",
    ].join("\n");

    expect(() => extractScrum(note)).toThrow(/표식이 없습니다/);
    expect(() => assertNoScrumMarkers(note)).not.toThrow();
  });

  test("frontmatter 안의 표식도 표식으로 보지 않는다", () => {
    const note = [
      "---",
      `note: ${SCRUM_MARKERS.start}`,
      "---",
      "본문",
      "",
    ].join("\n");

    expect(() => extractScrum(note)).toThrow(/표식이 없습니다/);
  });

  test("영역 넣기는 이미 표식이 있으면 거부한다", () => {
    expect(() => assertNoScrumMarkers(wrap("내용\n"))).toThrow(
      /하나만 만듭니다/
    );
    expect(() => assertNoScrumMarkers("# 빈 노트\n")).not.toThrow();
  });

  test("새 영역은 표식 사이를 비워 두고 줄바꿈을 따른다", () => {
    expect(newScrumRegion()).toBe(
      `${SCRUM_MARKERS.start}\n\n${SCRUM_MARKERS.end}\n`
    );
    expect(newScrumRegion("\r\n")).toBe(
      `${SCRUM_MARKERS.start}\r\n\r\n${SCRUM_MARKERS.end}\r\n`
    );
    expect(extractScrum(newScrumRegion().replace("\n\n", "\n내용\n"))).toBe(
      "내용\n"
    );
  });

  test("다른 마커 쌍의 영역을 침범하지 않는다", () => {
    const other: MarkerPair = {
      start: "%% inno-memo:start %%",
      end: "%% inno-memo:end %%",
      label: "메모 영역",
    };
    const note = [
      other.start,
      "개인 메모",
      other.end,
      SCRUM_MARKERS.start,
      "스크럼 본문",
      SCRUM_MARKERS.end,
      "",
    ].join("\n");

    expect(extractScrum(note)).toBe("스크럼 본문\n");
    expect(extractRegion(note, other)).toBe("개인 메모\n");
  });
});
