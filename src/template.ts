export const DEFAULT_BODY_TEMPLATE = [
  "**[{{previousSection}}]**",
  "- 업무 계획 :",
  "- 이슈 사항 : x",
  "- 협업 및 기타: x",
  "",
  "**[{{todaySection}}]**",
  "- 업무 계획 :",
  "- 이슈 사항 : x",
  "- 협업 및 기타: x",
  "",
  "---",
  "# 일 순서",
  "",
  "",
  "---",
  "# 모르는 것",
  "",
  "---",
].join("\n");

export function formatDate(format: string, date?: Date): string {
  const d = date ?? new Date();
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return format
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day);
}

export function getTodayDate(format?: string): string {
  return formatDate(format ?? "YYYY-MM-DD");
}

export interface DailyTemplateContext {
  previousSection: string;
  todaySection: string;
  date: string;
}

/**
 * 템플릿 본문의 치환 변수를 채운다.
 * - {{previousSection}} / {{todaySection}} : 설정된 섹션 이름
 * - {{date}} : 오늘 날짜
 */
export function renderDailyTemplate(
  template: string,
  context: DailyTemplateContext
): string {
  return template
    .replace(/\{\{previousSection\}\}/g, context.previousSection)
    .replace(/\{\{todaySection\}\}/g, context.todaySection)
    .replace(/\{\{date\}\}/g, context.date);
}
