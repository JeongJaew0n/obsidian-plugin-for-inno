import { App, PluginSettingTab, Setting } from "obsidian";
import type InnoDailyLogPlugin from "./main";
import {
  DEFAULT_CARRY_OVER_SECTION,
  DEFAULT_PREVIOUS_WORK_SECTION,
  DEFAULT_TODAY_WORK_SECTION,
} from "./daily-log";
import { DEFAULT_BODY_TEMPLATE } from "./template";
import { TOOL_GROUPS, commandName, type Feature } from "./features";

export { DEFAULT_BODY_TEMPLATE };

export interface InnoDailyLogSettings {
  previousWorkSection: string;
  todayWorkSection: string;
  carryOverSection: string;
  dailyNoteRoot: string;
  bodyTemplate: string;
}

export const DEFAULT_SETTINGS: InnoDailyLogSettings = {
  previousWorkSection: DEFAULT_PREVIOUS_WORK_SECTION,
  todayWorkSection: DEFAULT_TODAY_WORK_SECTION,
  carryOverSection: DEFAULT_CARRY_OVER_SECTION,
  dailyNoteRoot: "",
  bodyTemplate: DEFAULT_BODY_TEMPLATE,
};

type TabId = "settings" | "features";

const TABS: { id: TabId; label: string }[] = [
  { id: "settings", label: "설정" },
  { id: "features", label: "기능" },
];

export class InnoDailyLogSettingTab extends PluginSettingTab {
  private plugin: InnoDailyLogPlugin;
  /** 설정 창을 닫았다 다시 열어도 보던 탭을 유지한다. 플러그인이 살아 있는 동안만. */
  private activeTab: TabId = "settings";

  constructor(app: App, plugin: InnoDailyLogPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 탭 바. 우리 설정 컨테이너 안에서만 그리고, 누를 때마다 전체를 다시 그린다.
    // 감시자·타이머가 없어 Obsidian 이 소유한 DOM 과 엮이지 않는다.
    const bar = containerEl.createDiv();
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.marginBottom = "16px";
    for (const tab of TABS) {
      const button = bar.createEl("button", { text: tab.label });
      if (tab.id === this.activeTab) button.addClass("mod-cta");
      button.onclick = () => {
        if (this.activeTab === tab.id) return;
        this.activeTab = tab.id;
        this.display();
      };
    }

    if (this.activeTab === "features") {
      this.renderFeatures(containerEl);
    } else {
      this.renderSettings(containerEl);
    }
  }

  private renderFeatures(containerEl: HTMLElement): void {
    containerEl.createEl("p", {
      text: "명령 팔레트(Cmd/Ctrl+P)에서 'Inno Daily Log:' 로 찾을 수 있습니다. 딸린 동작은 표시된 커맨드를 실행할 때 함께 돕니다.",
      cls: "setting-item-description",
    });

    for (const group of TOOL_GROUPS) {
      new Setting(containerEl).setName(group.name).setHeading();
      for (const feature of group.features) {
        new Setting(containerEl)
          .setName(feature.kind === "included" ? `└ ${feature.name}` : feature.name)
          .setDesc(this.describeFeature(feature));
      }
    }
  }

  private describeFeature(feature: Feature): string {
    if (feature.kind === "command") {
      return `${feature.description} · 커맨드: Inno Daily Log: ${feature.name}`;
    }
    // 이월은 설정된 섹션 이름을 보여준다. 제목이 이것과 정확히 같아야 넘어온다.
    const detail =
      feature.runsWith === "load-previous-work"
        ? ` · 대상 섹션: ### ${this.plugin.settings.carryOverSection}`
        : "";
    return `${feature.description} · '${commandName(feature.runsWith)}' 실행 시 함께 동작${detail}`;
  }

  private renderSettings(containerEl: HTMLElement): void {
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
      .setName("이월 섹션 이름")
      .setDesc(
        "전날 노트에서 오늘 노트의 같은 섹션으로 옮길 heading 섹션. 노트에는 ### 이름 처럼 heading 으로 적혀 있어야 합니다 (레벨 무관). 이름을 바꾸면 Vault 템플릿의 제목도 같이 바꿔야 합니다."
      )
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_CARRY_OVER_SECTION)
          .setValue(this.plugin.settings.carryOverSection)
          .onChange(async (value) => {
            this.plugin.settings.carryOverSection =
              value.trim() || DEFAULT_CARRY_OVER_SECTION;
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
        "템플릿 삽입 커맨드가 넣을 본문. {{previousSection}}, {{todaySection}}, {{carryOverSection}}, {{date}} 를 쓸 수 있습니다."
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
