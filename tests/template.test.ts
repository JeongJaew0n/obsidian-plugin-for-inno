import {
  DEFAULT_BODY_TEMPLATE,
  formatDate,
  getTodayDate,
  renderDailyTemplate,
} from "../src/template";
import {
  DEFAULT_PREVIOUS_WORK_SECTION,
  DEFAULT_TODAY_WORK_SECTION,
  extractSection,
} from "../src/daily-log";

describe("날짜 포맷", () => {
  test("YYYY-MM-DD 를 채운다", () => {
    expect(formatDate("YYYY-MM-DD", new Date(2026, 8, 1))).toBe("2026-09-01");
  });

  test("다른 구분자도 지원한다", () => {
    expect(formatDate("YYYY/MM/DD", new Date(2026, 0, 5))).toBe("2026/01/05");
  });

  test("기본 포맷은 YYYY-MM-DD", () => {
    expect(getTodayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("데일리 템플릿 렌더", () => {
  const rendered = renderDailyTemplate(DEFAULT_BODY_TEMPLATE, {
    previousSection: DEFAULT_PREVIOUS_WORK_SECTION,
    todaySection: DEFAULT_TODAY_WORK_SECTION,
    date: "2026-09-01",
  });

  test("치환 변수가 남지 않는다", () => {
    expect(rendered).not.toContain("{{");
  });

  test("렌더 결과를 daily-log 가 다시 읽을 수 있다", () => {
    expect(extractSection(rendered, DEFAULT_PREVIOUS_WORK_SECTION)).toBe(
      ["- 업무 계획 :", "- 이슈 사항 : x", "- 협업 및 기타: x"].join("\n")
    );
    expect(extractSection(rendered, DEFAULT_TODAY_WORK_SECTION)).toBe(
      ["- 업무 계획 :", "- 이슈 사항 : x", "- 협업 및 기타: x"].join("\n")
    );
  });

  test("{{date}} 를 채운다", () => {
    expect(
      renderDailyTemplate("# {{date}} 일지", {
        previousSection: "A",
        todaySection: "B",
        date: "2026-09-01",
      })
    ).toBe("# 2026-09-01 일지");
  });
});
