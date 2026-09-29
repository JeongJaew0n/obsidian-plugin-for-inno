import {
  DEFAULT_CARRY_OVER_SECTION,
  DEFAULT_PREVIOUS_WORK_SECTION,
  carryOverSection,
  extractHeadingSection,
  formatLoadNotice,
  MAX_LOOKBACK_DAYS,
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

  test("365일보다 오래된 노트는 후보에서 뺀다", () => {
    const currentPath = "Work/Daily/2026-09/2026-09-01 Abraxas.md";
    const paths = [
      currentPath,
      "Work/Daily/2025-09/2025-09-02 Abraxas.md", // 364일 전 — 포함
      "Work/Daily/2025-09/2025-09-01 Abraxas.md", // 365일 전 — 경계, 포함
      "Work/Daily/2025-08/2025-08-31 Abraxas.md", // 366일 전 — 제외
      "Work/Daily/2024-09/2024-09-01 Abraxas.md", // 2년 전 — 제외
    ];

    expect(getPreviousDailyNotePaths(currentPath, paths)).toEqual([
      "Work/Daily/2025-09/2025-09-02 Abraxas.md",
      "Work/Daily/2025-09/2025-09-01 Abraxas.md",
    ]);
  });

  test("윤년을 건너뛰어도 경계가 밀리지 않는다", () => {
    // 2024-02-29 를 사이에 둔 구간. 단순히 365를 빼면 하루가 어긋난다.
    const currentPath = "Work/Daily/2024-06/2024-06-01 Abraxas.md";
    const paths = [
      currentPath,
      "Work/Daily/2023-06/2023-06-03 Abraxas.md", // 364일 전 — 포함
      "Work/Daily/2023-06/2023-06-02 Abraxas.md", // 365일 전 — 경계, 포함
      "Work/Daily/2023-06/2023-06-01 Abraxas.md", // 366일 전 — 제외
    ];

    expect(getPreviousDailyNotePaths(currentPath, paths)).toEqual([
      "Work/Daily/2023-06/2023-06-03 Abraxas.md",
      "Work/Daily/2023-06/2023-06-02 Abraxas.md",
    ]);
  });

  test("제한 값은 365일이다", () => {
    expect(MAX_LOOKBACK_DAYS).toBe(365);
  });

  describe("스크럼 마커가 섹션 안에 걸쳐 있을 때", () => {
    // 실제 노트 배치: 영역이 전일 섹션 '위'에서 시작해 금일 섹션 '안'에서 끝난다.
    // 그래서 start 는 어느 섹션에도 안 속하고, end 만 금일 본문에 들어간다.
    const yesterday = [
      "%% inno-scrum:start %%",
      "**[전일 진행 업무]**",
      "- 업무 계획 :",
      "",
      "**[금일 예정 업무]**",
      "- 업무 계획 :",
      "\t- 캐시 API 개발",
      "- 이슈 사항 : x",
      "%% inno-scrum:end %%",
      "",
      "---",
      "# 일 순서",
    ].join("\n");

    const today = [
      "%% inno-scrum:start %%",
      "**[전일 진행 업무]**",
      "- 업무 계획 :",
      "",
      "**[금일 예정 업무]**",
      "- 업무 계획 :",
      "%% inno-scrum:end %%",
      "",
      "---",
    ].join("\n");

    test("섹션 추출에 마커가 딸려오지 않는다", () => {
      const body = extractSection(yesterday, "금일 예정 업무");

      expect(body).not.toContain("inno-scrum");
      expect(body).toBe("- 업무 계획 :\n\t- 캐시 API 개발\n- 이슈 사항 : x");
    });

    test("옮겨도 받는 노트의 마커 쌍이 그대로 하나다", () => {
      const body = extractSection(yesterday, "금일 예정 업무")!;
      const updated = replaceSection(today, "전일 진행 업무", body)!;

      expect((updated.match(/inno-scrum:start/g) ?? []).length).toBe(1);
      expect((updated.match(/inno-scrum:end/g) ?? []).length).toBe(1);
    });

    test("마커뿐인 섹션은 내용 없음으로 본다", () => {
      const note = [
        "**[금일 예정 업무]**",
        "%% inno-scrum:end %%",
        "",
        "---",
      ].join("\n");

      expect(hasWorkContent(extractSection(note, "금일 예정 업무"))).toBe(false);
    });

    test("줄 중간의 주석은 건드리지 않는다", () => {
      const note = [
        "**[금일 예정 업무]**",
        "- 업무 계획 : 캐시 API %% 확인 필요 %%",
        "",
        "---",
      ].join("\n");

      expect(extractSection(note, "금일 예정 업무")).toBe(
        "- 업무 계획 : 캐시 API %% 확인 필요 %%"
      );
    });
  });

  describe("섹션 뒤에 마크다운 heading 이 붙은 배치", () => {
    // 새 템플릿 배치: 금일 섹션과 --- 사이에 ### 섹션이 낀다.
    const note = [
      "%% inno-scrum:start %%",
      "**[전일 진행 업무]**",
      "- 업무 계획 :",
      "",
      "**[금일 예정 업무]**",
      "- 업무 계획 :",
      "\t- 캐시 API 개발",
      "%% inno-scrum:end %%",
      "",
      "### 내일 이어서 할 것",
      "- 리뷰 반영",
      "",
      "---",
      "# 일 순서",
    ].join("\n");

    test("금일 섹션이 heading 에서 끝난다", () => {
      expect(extractSection(note, "금일 예정 업무")).toBe(
        "- 업무 계획 :\n\t- 캐시 API 개발"
      );
    });

    test("전일 섹션에 heading 이 딸려가지 않는다", () => {
      const body = extractSection(note, "금일 예정 업무")!;
      const updated = replaceSection(note, "전일 진행 업무", body)!;

      expect(updated.match(/내일 이어서 할 것/g)).toHaveLength(1);
    });

    test("#태그 로 시작하는 줄은 heading 이 아니다", () => {
      const tagged = [
        "**[금일 예정 업무]**",
        "- 업무 계획 :",
        "#회의 준비",
        "",
        "---",
      ].join("\n");

      expect(extractSection(tagged, "금일 예정 업무")).toBe(
        "- 업무 계획 :\n#회의 준비"
      );
    });
  });

  describe("heading 섹션 추출", () => {
    test("레벨을 가리지 않고 제목으로 찾는다", () => {
      for (const h of ["#", "##", "###", "######"]) {
        const note = `${h} 내일 이어서 할 것\n- a\n\n---`;
        expect(extractHeadingSection(note, "내일 이어서 할 것")).toBe("- a");
      }
    });

    test("하위 heading 은 본문에 포함하고, 같은 레벨에서 끊는다", () => {
      const note = [
        "### 내일 이어서 할 것",
        "- a",
        "#### 세부",
        "- b",
        "### 다른 주제",
        "- c",
      ].join("\n");

      expect(extractHeadingSection(note, "내일 이어서 할 것")).toBe(
        "- a\n#### 세부\n- b"
      );
    });

    test("상위 heading, **[제목]**, --- 에서 끊는다", () => {
      const tail = ["# 일 순서", "**[금일 예정 업무]**", "---"];
      for (const end of tail) {
        const note = `### 내일 이어서 할 것\n- a\n${end}\n- z`;
        expect(extractHeadingSection(note, "내일 이어서 할 것")).toBe("- a");
      }
    });

    test("NBSP 가 붙은 제목도 찾고, 주석 전용 줄은 뺀다", () => {
      const note = "### 내일 이어서 할 것\u00a0\n%% 메모 %%\n- a\n\n---";
      expect(extractHeadingSection(note, "내일 이어서 할 것")).toBe("- a");
    });

    test("없으면 null", () => {
      expect(extractHeadingSection("# 일 순서\n- a", "내일 이어서 할 것")).toBeNull();
    });
  });

  describe("내일 이어서 할 것 이월", () => {
    const section = DEFAULT_CARRY_OVER_SECTION;
    const yesterday = [
      "**[금일 예정 업무]**",
      "- 업무 계획 :",
      "",
      `### ${section}`,
      "- 리뷰 반영",
      "\t- 코멘트 3건",
      "",
      "---",
      "# 일 순서",
    ].join("\n");
    const emptyToday = [
      "**[금일 예정 업무]**",
      "- 업무 계획 :",
      "",
      `### ${section}`,
      "",
      "",
      "---",
      "# 일 순서",
    ].join("\n");

    test("오늘 섹션이 비어 있으면 채운다 — 템플릿 빈 줄은 --- 앞 간격으로 남긴다", () => {
      const out = carryOverSection(yesterday, emptyToday);

      expect(out.result).toBe("carried");
      expect(out.lines).toBe(2);
      expect(out.content).toBe(
        [
          "**[금일 예정 업무]**",
          "- 업무 계획 :",
          "",
          `### ${section}`,
          "- 리뷰 반영",
          "\t- 코멘트 3건",
          "",
          "",
          "---",
          "# 일 순서",
        ].join("\n")
      );
    });

    test("전날에 섹션이 없으면 가져오지 않는다", () => {
      const out = carryOverSection("**[금일 예정 업무]**\n- a\n---", emptyToday);
      expect(out).toEqual({ content: emptyToday, result: "no-source", lines: 0 });
    });

    test("전날 섹션이 비었으면 가져오지 않는다", () => {
      const out = carryOverSection(emptyToday, emptyToday);
      expect(out.result).toBe("no-source");
      expect(out.content).toBe(emptyToday);
    });

    test("오늘 노트에 섹션이 없으면 만들지 않는다", () => {
      const noSection = "**[금일 예정 업무]**\n- a\n---\n# 일 순서";
      const out = carryOverSection(yesterday, noSection);
      expect(out).toEqual({ content: noSection, result: "no-target", lines: 0 });
    });

    test("오늘 섹션에 이미 내용이 있으면 덮지 않는다", () => {
      const written = emptyToday.replace(`### ${section}\n`, `### ${section}\n- 오늘 직접 쓴 것\n`);
      const out = carryOverSection(yesterday, written);
      expect(out).toEqual({ content: written, result: "occupied", lines: 0 });
    });

    test("다시 돌려도 결과가 같다 — 두 번째는 occupied", () => {
      const first = carryOverSection(yesterday, emptyToday);
      const second = carryOverSection(yesterday, first.content);

      expect(second.result).toBe("occupied");
      expect(second.content).toBe(first.content);
    });

    test("스크럼 마커가 섞여 있어도 옮기지 않는다", () => {
      const withMarker = yesterday.replace("- 리뷰 반영", "%% inno-scrum:end %%\n- 리뷰 반영");
      const out = carryOverSection(withMarker, emptyToday);
      expect(out.content).not.toContain("inno-scrum");
    });
  });

  describe("로드 알림", () => {
    const f = (load: "updated" | "unchanged", carry: Parameters<typeof formatLoadNotice>[3], n = 0) =>
      formatLoadNotice(load, "2026-09-28", "금일 예정 업무", carry, n);

    test("이월 결과를 한 줄로 합친다", () => {
      expect(f("updated", "carried", 5)).toBe(
        "2026-09-28의 업무를 불러왔습니다. 내일 이어서 할 것 5줄도 가져왔습니다."
      );
      expect(f("updated", "occupied")).toContain("이미 적혀 있어 그대로 뒀습니다");
      expect(f("updated", "no-target")).toContain("섹션이 없어 가져오지 않았습니다");
      expect(f("unchanged", "occupied")).toMatch(/^이미 2026-09-28의 '금일 예정 업무'가 반영되어 있습니다\./);
    });

    test("전날에 없으면 조용히 둔다", () => {
      expect(f("updated", "no-source")).toBe("2026-09-28의 업무를 불러왔습니다.");
    });
  });

  describe("이월 섹션 이름 설정", () => {
    const src = "### 이어서 할 일\n- a\n\n---";
    const dst = "### 이어서 할 일\n\n---";

    test("바꾼 이름으로 찾아 옮긴다", () => {
      expect(carryOverSection(src, dst, "이어서 할 일").result).toBe("carried");
    });

    test("기본 이름으로는 못 찾는다 — 이름이 곧 기준이다", () => {
      expect(carryOverSection(src, dst).result).toBe("no-source");
    });

    test("이름이 비면 아무것도 안 한다 — 제목 없는 ### 에 걸리지 않게", () => {
      const bare = "###\n- a\n\n---";
      expect(carryOverSection(bare, "###\n\n---", "  ")).toEqual({
        content: "###\n\n---",
        result: "no-source",
        lines: 0,
      });
    });

    test("알림에 바꾼 이름이 들어간다", () => {
      expect(
        formatLoadNotice("updated", "2026-09-28", "금일 예정 업무", "carried", 2, "이어서 할 일")
      ).toBe("2026-09-28의 업무를 불러왔습니다. 이어서 할 일 2줄도 가져왔습니다.");
    });
  });
});
