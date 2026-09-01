import { App, PluginSettingTab, Setting } from "obsidian";
import type InnoDailyLogPlugin from "./main";
import {
  DEFAULT_PREVIOUS_WORK_SECTION,
  DEFAULT_TODAY_WORK_SECTION,
} from "./daily-log";
import { DEFAULT_BODY_TEMPLATE } from "./template";

export { DEFAULT_BODY_TEMPLATE };

export interface InnoDailyLogSettings {
  previousWorkSection: string;
  todayWorkSection: string;
  dailyNoteRoot: string;
  bodyTemplate: string;
}

export const DEFAULT_SETTINGS: InnoDailyLogSettings = {
  previousWorkSection: DEFAULT_PREVIOUS_WORK_SECTION,
  todayWorkSection: DEFAULT_TODAY_WORK_SECTION,
  dailyNoteRoot: "",
  bodyTemplate: DEFAULT_BODY_TEMPLATE,
};

export class InnoDailyLogSettingTab extends PluginSettingTab {
  private plugin: InnoDailyLogPlugin;

  constructor(app: App, plugin: InnoDailyLogPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("전일 섹션 이름")
      .setDesc(
        "전일 업무를 채워 넣을 섹션. 노트에는 **[이름]** 형태로 적혀 있어야 합니다."
      )
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_PREVIOUS_WORK_SECTION)
          .setValue(this.plugin.settings.previousWorkSection)
          .onChange(async (value) => {
            this.plugin.settings.previousWorkSection =
              value.trim() || DEFAULT_PREVIOUS_WORK_SECTION;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("금일 섹션 이름")
      .setDesc("이전 노트에서 읽어올 섹션.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_TODAY_WORK_SECTION)
          .setValue(this.plugin.settings.todayWorkSection)
          .onChange(async (value) => {
            this.plugin.settings.todayWorkSection =
              value.trim() || DEFAULT_TODAY_WORK_SECTION;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("데일리 노트 루트 폴더")
      .setDesc(
        "전일 노트를 찾을 범위. 비워두면 현재 노트의 부모 폴더를 쓰되, 부모가 YYYY-MM 형태의 월 폴더면 한 단계 위를 씁니다."
      )
      .addText((text) =>
        text
          .setPlaceholder("예: Work/Daily")
          .setValue(this.plugin.settings.dailyNoteRoot)
          .onChange(async (value) => {
            this.plugin.settings.dailyNoteRoot = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("본문 템플릿")
      .setDesc(
        "템플릿 삽입 커맨드가 넣을 본문. {{previousSection}}, {{todaySection}}, {{date}} 를 쓸 수 있습니다."
      )
      .addTextArea((textArea) => {
        textArea
          .setValue(this.plugin.settings.bodyTemplate)
          .onChange(async (value) => {
            this.plugin.settings.bodyTemplate = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.rows = 16;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("본문 템플릿 초기화")
      .setDesc("기본 inno 업무 양식으로 되돌립니다.")
      .addButton((button) =>
        button.setButtonText("초기화").onClick(async () => {
          this.plugin.settings.bodyTemplate = DEFAULT_BODY_TEMPLATE;
          await this.plugin.saveSettings();
          this.display();
        })
      );
  }
}
