import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
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
