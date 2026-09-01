import {
  DEFAULT_PREVIOUS_WORK_SECTION,
  DEFAULT_TODAY_WORK_SECTION,
  extractSection,
  getDailyNoteDate,
  getPreviousDailyNotePaths,
  hasWorkContent,
  replaceSection,
  resolveSearchRoot,
} from "../src/daily-log";

describe("inno daily log", () => {
  const previousBody = [
    "- 업무 계획 :",
    "\t- 목요일 업무",
    "- 이슈 사항 : x",
    "- 협업 및 기타: x",
  ].join("\n");

  const currentNote = [
    "---",
    "category: work",
    "---",
    "",
    "**[전일 진행 업무]** ",
    "- 업무 계획 : 기존 내용",
    "- 이슈 사항 : x",
    "- 협업 및 기타: x",
    "",
    "**[금일 예정 업무]**",
    "- 업무 계획 :",
    "\t- 월요일 업무",
    "- 이슈 사항 : x",
    "- 협업 및 기타: x",
    "",
    "---",
    "# 일 순서",
  ].join("\n");

  test("bold 제목과 NBSP를 허용해 금일 예정 업무를 추출한다", () => {
    const source = [
      "**[금일 예정 업무]** ",
      previousBody,
      "",
      "---",
      "# 일 순서",
    ].join("\n");

    expect(extractSection(source, DEFAULT_TODAY_WORK_SECTION)).toBe(
      previousBody
    );
  });

  test("전일 진행 업무 본문만 덮어쓴다", () => {
    const updated = replaceSection(
      currentNote,
      DEFAULT_PREVIOUS_WORK_SECTION,
      previousBody
    );

    expect(updated).not.toBeNull();
    expect(extractSection(updated!, DEFAULT_PREVIOUS_WORK_SECTION)).toBe(
      previousBody
    );
    expect(extractSection(updated!, DEFAULT_TODAY_WORK_SECTION)).toContain(
      "월요일 업무"
    );
    expect(updated).toContain("- 협업 및 기타: x\n\n**[금일 예정 업무]**");
    expect(updated).toContain("# 일 순서");
  });

  test("섹션이 없으면 수정하지 않는다", () => {
    expect(
      replaceSection("# 다른 형식", DEFAULT_PREVIOUS_WORK_SECTION, previousBody)
    ).toBeNull();
  });

  test("내용이 빈 금일 예정 업무는 이전 업무 후보에서 제외한다", () => {
    expect(hasWorkContent(null)).toBe(false);
    expect(hasWorkContent("")).toBe(false);
    expect(hasWorkContent(" \n ")).toBe(false);
    expect(hasWorkContent(previousBody)).toBe(true);
  });

  test("파일명에서 날짜 접두사를 읽는다", () => {
    expect(getDailyNoteDate("Work/Daily/2026-07-20 Abraxas.md")).toBe(
      "2026-07-20"
    );
    expect(getDailyNoteDate("Work/Daily/2026-07-20.md")).toBe("2026-07-20");
    expect(getDailyNoteDate("Work/Daily/템플릿 inno.md")).toBeNull();
  });
});

describe("탐색 루트 결정", () => {
  test("설정값이 있으면 그대로 쓰고 앞뒤 슬래시를 정리한다", () => {
    expect(
      resolveSearchRoot("Work/Daily/2026-09/2026-09-01 Abraxas.md", "/Work/Daily/")
    ).toBe("Work/Daily");
  });

  test("부모가 YYYY-MM 월 폴더면 한 단계 위를 쓴다", () => {
    expect(resolveSearchRoot("Work/Daily/2026-09/2026-09-01 Abraxas.md")).toBe(
      "Work/Daily"
    );
  });

  test("부모가 월 폴더가 아니면 부모를 그대로 쓴다", () => {
    expect(resolveSearchRoot("Work/Daily/2026-09-01 Abraxas.md")).toBe(
      "Work/Daily"
    );
  });
});

describe("이전 데일리 노트 탐색", () => {
  test("평평한 폴더에서 이전 날짜 노트를 최신순으로 정렬한다", () => {
    const currentPath = "Work/Daily/2026-07-20 Monday.md";
    const paths = [
      currentPath,
      "Work/Daily/2026-07-16 Thursday.md",
      "Work/Daily/2026-07-18 Saturday.md",
      "Work/Daily/2026-07-10 Friday.md",
      "Work/Daily/템플릿 inno.md",
      "Personal/Daily/2026-07-19 Sunday.md",
      "Work/Daily/2026-07-21 Tuesday.md",
    ];

    expect(getPreviousDailyNotePaths(currentPath, paths)).toEqual([
      "Work/Daily/2026-07-18 Saturday.md",
      "Work/Daily/2026-07-16 Thursday.md",
      "Work/Daily/2026-07-10 Friday.md",
    ]);
  });

  test("월 폴더 경계를 넘어 전월 노트를 찾는다", () => {
    const currentPath = "Work/Daily/2026-09/2026-09-01 Abraxas.md";
    const paths = [
      currentPath,
      "Work/Daily/2026-08/2026-08-31 Abraxas.md",
      "Work/Daily/2026-08/2026-08-28 Abraxas.md",
      "Work/Daily/2026-07/2026-07-31 Abraxas.md",
      "Work/Daily/템플릿 inno.md",
      "Personal/Daily/2026-08/2026-08-30 Sunday.md",
    ];

    expect(getPreviousDailyNotePaths(currentPath, paths)).toEqual([
      "Work/Daily/2026-08/2026-08-31 Abraxas.md",
      "Work/Daily/2026-08/2026-08-28 Abraxas.md",
      "Work/Daily/2026-07/2026-07-31 Abraxas.md",
    ]);
  });

  test("루트 폴더를 지정하면 그 하위만 훑는다", () => {
    const currentPath = "Work/Daily/2026-09/2026-09-01 Abraxas.md";
    const paths = [
      currentPath,
      "Work/Daily/2026-08/2026-08-31 Abraxas.md",
      "Personal/Daily/2026-08/2026-08-30 Sunday.md",
    ];

    expect(
      getPreviousDailyNotePaths(currentPath, paths, "Personal/Daily")
    ).toEqual(["Personal/Daily/2026-08/2026-08-30 Sunday.md"]);
  });

  test("현재 노트 파일명에 날짜가 없으면 빈 배열", () => {
    expect(
      getPreviousDailyNotePaths("Work/Daily/템플릿 inno.md", [
        "Work/Daily/2026-08/2026-08-31 Abraxas.md",
      ])
    ).toEqual([]);
  });
});
