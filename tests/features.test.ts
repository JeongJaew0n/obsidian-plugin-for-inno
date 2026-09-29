import { TOOL_GROUPS, allFeatures, commandName } from "../src/features";

const commandIds = allFeatures().flatMap((f) =>
  f.kind === "command" ? [f.commandId] : []
);

describe("기능 목록", () => {
  test("등록하는 커맨드 4개가 목록과 일치한다", () => {
    // main.ts 가 addCommand 하는 id. 늘리거나 줄이면 여기도 같이 고친다.
    expect(commandIds.sort()).toEqual(
      ["copy-scrum", "insert-daily-template", "insert-scrum-region", "load-previous-work"].sort()
    );
  });

  test("커맨드 id 와 기능 이름이 겹치지 않는다", () => {
    expect(new Set(commandIds).size).toBe(commandIds.length);
    const names = allFeatures().map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("딸린 동작은 실제로 있는 커맨드에 딸린다", () => {
    for (const f of allFeatures()) {
      if (f.kind === "included") expect(commandIds).toContain(f.runsWith);
    }
  });

  test("이월은 전일 진행 업무 로드에 딸린 동작이다", () => {
    const carry = allFeatures().find((f) => f.name === "내일 이어서 할 것 이월");
    expect(carry).toMatchObject({ kind: "included", runsWith: "load-previous-work" });
  });

  test("ToolGroup 은 데일리 로그와 스크럼 두 개다", () => {
    expect(TOOL_GROUPS.map((g) => g.name)).toEqual(["데일리 로그", "스크럼(scrum)"]);
  });

  test("비어 있는 이름·설명이 없다", () => {
    for (const f of allFeatures()) {
      expect(f.name.trim()).not.toBe("");
      expect(f.description.trim()).not.toBe("");
    }
  });

  test("commandName 은 목록의 이름을 주고, 없는 id 는 던진다", () => {
    expect(commandName("copy-scrum")).toBe("스크럼(scrum) 내용 복사");
    expect(() => commandName("copy-scrm")).toThrow(/목록에 없는 커맨드/);
  });
});
