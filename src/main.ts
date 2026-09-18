import {
  Editor,
  MarkdownRenderer,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  InnoDailyLogSettingTab,
  type InnoDailyLogSettings,
} from "./settings";
import {
  extractSection,
  getDailyNoteDate,
  getPreviousDailyNotePaths,
  hasWorkContent,
  replaceSection,
} from "./daily-log";
import { getTodayDate, renderDailyTemplate } from "./template";
import {
  SCRUM_MARKERS,
  assertNoScrumMarkers,
  extractScrum,
  newScrumRegion,
} from "./scrum";

type UpdateResult = "missing" | "unchanged" | "updated";

export default class InnoDailyLogPlugin extends Plugin {
  settings: InnoDailyLogSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "load-previous-work",
      name: "전일 진행 업무 로드",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.file) return false;
        if (!checking) {
          void this.loadPreviousWork(view);
        }
        return true;
      },
    });

    this.addCommand({
      id: "insert-daily-template",
      name: "데일리 노트 템플릿 삽입",
      editorCallback: (editor: Editor) => {
        editor.replaceSelection(
          renderDailyTemplate(this.settings.bodyTemplate, {
            previousSection: this.settings.previousWorkSection,
            todaySection: this.settings.todayWorkSection,
            date: getTodayDate(),
          })
        );
      },
    });

    this.addCommand({
      id: "copy-scrum",
      name: "스크럼(scrum) 내용 복사",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.file) return false;
        if (!checking) {
          void this.copyScrum(view);
        }
        return true;
      },
    });

    this.addCommand({
      id: "insert-scrum-region",
      name: "스크럼(scrum) 영역 넣기",
      editorCallback: (editor: Editor) => {
        this.insertScrumRegion(editor);
      },
    });

    this.addSettingTab(new InnoDailyLogSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<InnoDailyLogSettings>
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * 읽기 모드에서도 복사되어야 한다. 소스 모드는 에디터에서, 읽기 모드는 파일에서 읽는다.
   */
  private async copyScrum(view: MarkdownView) {
    const file = view.file;
    if (!file) {
      new Notice("열린 파일이 없습니다.");
      return;
    }

    let body: string;
    try {
      const content =
        view.getMode() === "source"
          ? view.editor.getValue()
          : await this.app.vault.read(file);
      body = extractScrum(content);
    } catch (error) {
      new Notice((error as Error).message);
      return;
    }

    let withFormatting: boolean;
    try {
      withFormatting = await this.writeRichText(body, file.path);
    } catch {
      new Notice(
        "클립보드 쓰기에 실패했습니다. Obsidian을 활성화한 뒤 다시 실행하세요."
      );
      return;
    }

    // 서식이 빠진 걸 조용히 넘기지 않는다. 붙여넣고 나서야 아는 것이 제일 나쁘다.
    new Notice(
      withFormatting
        ? "스크럼 내용을 복사했습니다. (서식 포함)"
        : "스크럼 내용을 복사했습니다. 서식 없이 마크다운 원문만 담았습니다."
    );
  }

  /**
   * 마크다운 원문과 렌더된 HTML 을 **함께** 클립보드에 올린다.
   *
   * `navigator.clipboard.writeText` 는 `text/plain` 하나만 싣는다. 그래서 Teams·
   * Confluence 처럼 서식을 받는 앱에 붙이면 `- **굵게**` 가 글자 그대로 나온다.
   * Obsidian 에서 마우스로 끌어 복사할 때 서식이 살아 있는 건, 브라우저가 선택 영역의
   * DOM 을 `text/html` 로도 실어 주기 때문이다. 그걸 우리도 한다.
   *
   * 두 flavor 를 같이 싣는 게 요점이다 — 받는 앱이 고른다. 서식을 받는 앱은 HTML 을,
   * 코드 편집기·터미널은 마크다운 원문을 가져간다.
   *
   * @returns 서식(HTML)까지 실었으면 true, 원문만 실었으면 false.
   */
  private async writeRichText(
    markdown: string,
    sourcePath: string
  ): Promise<boolean> {
    const html = await this.renderToHtml(markdown, sourcePath);

    // ClipboardItem 이 없는 환경(구버전 웹뷰·일부 모바일)은 원문만이라도 싣는다.
    if (html === null || typeof ClipboardItem === "undefined") {
      await navigator.clipboard.writeText(markdown);
      return false;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch {
      // write() 는 writeText 와 달리 문서 포커스를 요구한다. 창이 활성화돼 있지
      // 않으면 여기로 온다 — 원문만이라도 싣는다. 빈 클립보드보다 낫다.
      await navigator.clipboard.writeText(markdown);
      return false;
    }
  }

  /** 렌더에 실패하면 null 을 준다 — 그때는 원문만 싣는다. */
  private async renderToHtml(
    markdown: string,
    sourcePath: string
  ): Promise<string | null> {
    // 화면 밖에 붙여 렌더한다. 완전히 떼어 둔 엘리먼트는 일부 렌더러가 처리하지 않는다.
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-9999px";
    document.body.appendChild(host);
    try {
      await MarkdownRenderer.render(this.app, markdown, host, sourcePath, this);
      const html = host.innerHTML;
      return html.trim() ? html : null;
    } catch {
      return null;
    } finally {
      host.remove();
    }
  }

  private insertScrumRegion(editor: Editor) {
    const content = editor.getValue();
    try {
      assertNoScrumMarkers(content);
    } catch (error) {
      new Notice((error as Error).message);
      return;
    }

    const cursor = editor.getCursor();
    const offset = editor.posToOffset(cursor);
    const eol = content.includes("\r\n") ? "\r\n" : "\n";
    // 줄 한가운데면 줄을 먼저 바꾼다. 마커는 자기 줄에 혼자 있어야 인식된다.
    const prefix =
      offset > 0 && !/[\r\n]/.test(content[offset - 1]!) ? eol : "";

    editor.replaceRange(prefix + newScrumRegion(eol), cursor, cursor);
    new Notice(
      `커서 위치에 스크럼 영역을 넣었습니다. ${SCRUM_MARKERS.start} 와 ${SCRUM_MARKERS.end} 사이에 적으세요.`
    );
  }

  private async findPreviousWork(
    file: TFile
  ): Promise<{ body: string; date: string } | null> {
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const filesByPath = new Map(markdownFiles.map((note) => [note.path, note]));
    const candidatePaths = getPreviousDailyNotePaths(
      file.path,
      markdownFiles.map((note) => note.path),
      this.settings.dailyNoteRoot
    );

    for (const candidatePath of candidatePaths) {
      const candidateFile = filesByPath.get(candidatePath);
      if (!candidateFile) continue;

      const candidateContent = await this.app.vault.read(candidateFile);
      const extracted = extractSection(
        candidateContent,
        this.settings.todayWorkSection
      );
      if (!hasWorkContent(extracted)) continue;

      const date = getDailyNoteDate(candidatePath);
      if (!date) continue;

      return { body: extracted, date };
    }

    return null;
  }

  private async loadPreviousWork(view: MarkdownView) {
    const file = view.file;
    if (!file) {
      new Notice("열린 파일이 없습니다.");
      return;
    }

    if (!getDailyNoteDate(file.path)) {
      new Notice("현재 노트 파일명에서 YYYY-MM-DD 날짜를 찾을 수 없습니다.");
      return;
    }

    const source = await this.findPreviousWork(file);
    if (!source) {
      new Notice(
        `이전 데일리 노트에서 '${this.settings.todayWorkSection}'를 찾을 수 없습니다.`
      );
      return;
    }

    let updateResult: UpdateResult = "missing";
    const updateCurrentContent = (currentContent: string): string => {
      const updatedContent = replaceSection(
        currentContent,
        this.settings.previousWorkSection,
        source.body
      );

      if (updatedContent === null) return currentContent;
      if (updatedContent === currentContent) {
        updateResult = "unchanged";
        return currentContent;
      }

      updateResult = "updated";
      return updatedContent;
    };

    if (typeof this.app.vault.process === "function") {
      await this.app.vault.process(file, updateCurrentContent);
    } else {
      const currentContent = await this.app.vault.read(file);
      const updatedContent = updateCurrentContent(currentContent);
      if (updatedContent !== currentContent) {
        await this.app.vault.modify(file, updatedContent);
      }
    }

    if (updateResult === "missing") {
      new Notice(
        `현재 노트에서 '${this.settings.previousWorkSection}' 섹션을 찾을 수 없습니다.`
      );
      return;
    }

    if (updateResult === "unchanged") {
      new Notice(
        `이미 ${source.date}의 '${this.settings.todayWorkSection}'가 반영되어 있습니다.`
      );
      return;
    }

    new Notice(`${source.date}의 업무를 불러왔습니다.`);
  }
}
