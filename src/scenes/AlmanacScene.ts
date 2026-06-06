import Phaser from 'phaser';
import { ORE_TYPES, QUALITY_LEVELS } from '../config/GameData';
import { getAlmanac } from '../utils/Storage';
import type { AlmanacEntry, SmeltingRecord } from '../types';

export class AlmanacScene extends Phaser.Scene {
  private selectedOreId: string | null = null;
  private oreButtons: Map<string, Phaser.GameObjects.Container> = new Map();
  private detailContainer!: Phaser.GameObjects.Container;
  private dynamicContent: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('AlmanacScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f0a);
    this.add.rectangle(width / 2, height / 2, width - 40, height - 40).setStrokeStyle(4, 0x8b6914);
    this.add.rectangle(width / 2, height / 2, width - 60, height - 60).setStrokeStyle(2, 0x5c3a1e);

    this.add.text(width / 2, 60, '📖 工艺图鉴', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '40px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#3c2a1e',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(width / 2, 105, '冶炼技艺传承录 — 成功冶炼矿石即可解锁对应图鉴', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '16px',
      color: '#a08060'
    }).setOrigin(0.5);

    this.createOreList(150, height / 2 + 20);
    this.createDetailPanel(740, height / 2 + 30);
    this.createBackButton(width - 80, 60);

    const oreIds = Object.keys(ORE_TYPES);
    if (oreIds.length > 0) {
      this.selectOre(oreIds[0]);
    }
  }

  private createOreList(x: number, y: number): void {
    this.add.text(x, y - 240, '矿石名录', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const almanac = getAlmanac();
    const oreIds = Object.keys(ORE_TYPES);

    oreIds.forEach((oreId, idx) => {
      const ore = ORE_TYPES[oreId];
      const entry = almanac[oreId];
      const oy = y - 190 + idx * 68;

      const container = this.add.container(x, oy);
      const bg = this.add.rectangle(0, 0, 260, 58, 0x2a1a10)
        .setStrokeStyle(2, 0x5c3a1e).setInteractive({ useHandCursor: true });

      const dot = this.add.circle(-100, 0, 18, entry?.unlocked ? ore.color : 0x404040)
        .setStrokeStyle(2, entry?.unlocked ? 0x8b6914 : 0x505050);

      const nameColor = entry?.unlocked ? '#e8c080' : '#606060';
      const name = this.add.text(-60, -12, entry?.unlocked ? ore.name : '???', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '18px',
        color: nameColor
      });

      const statusText = entry?.unlocked
        ? (entry.bestRecord ? `最佳: ${entry.bestRecord.qualityName} ${entry.bestRecord.score}分` : '已解锁')
        : '未解锁';
      const statusColor = entry?.bestRecord ? '#ffd700' : (entry?.unlocked ? '#a08060' : '#606060');
      const status = this.add.text(-60, 10, statusText, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '13px',
        color: statusColor
      });

      container.add([bg, dot, name, status]);
      this.oreButtons.set(oreId, container);

      bg.on('pointerdown', () => this.selectOre(oreId));
    });
  }

  private createDetailPanel(x: number, y: number): void {
    this.detailContainer = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 760, 520, 0x2a1a10).setStrokeStyle(3, 0x5c3a1e);

    const title = this.add.text(-350, -240, '矿石详情', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    this.detailContainer.add([bg, title]);
  }

  private selectOre(oreId: string): void {
    this.selectedOreId = oreId;

    this.oreButtons.forEach((container, id) => {
      const bg = container.first as Phaser.GameObjects.Rectangle;
      const isSelected = id === oreId;
      bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xffd700 : 0x5c3a1e);
      bg.setFillStyle(isSelected ? 0x4a3020 : 0x2a1a10);
    });

    this.updateDetailPanel();
  }

  private clearDynamicContent(): void {
    this.dynamicContent.forEach(obj => obj.destroy());
    this.dynamicContent = [];
  }

  private addDynamic(obj: Phaser.GameObjects.GameObject): void {
    this.dynamicContent.push(obj);
    this.detailContainer.add(obj);
  }

  private updateDetailPanel(): void {
    if (!this.selectedOreId) return;

    const ore = ORE_TYPES[this.selectedOreId];
    const almanac = getAlmanac();
    const entry: AlmanacEntry | undefined = almanac[this.selectedOreId];

    this.clearDynamicContent();

    if (!entry || !entry.unlocked) {
      const locked = this.add.text(0, 0, '🔒 尚未解锁\n\n成功冶炼并达成订单后即可解锁此图鉴', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '24px',
        color: '#808080',
        align: 'center'
      }).setOrigin(0.5);
      this.addDynamic(locked);
      return;
    }

    const oreDot = this.add.circle(-330, -180, 28, ore.color).setStrokeStyle(3, 0xffd700);
    const oreName = this.add.text(-270, -200, ore.name, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '28px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    const oreGrade = this.add.text(-270, -165, `品位 ${Math.round(ore.grade * 100)}%`, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '16px',
      color: '#e8c080'
    });
    const oreDesc = this.add.text(-330, -125, ore.description, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '15px',
      color: '#a08060',
      wordWrap: { width: 700 }
    });
    this.addDynamic(oreDot);
    this.addDynamic(oreName);
    this.addDynamic(oreGrade);
    this.addDynamic(oreDesc);

    const infoText = `理想炉温: ${ore.baseTempRequired}°C  |  冶炼时间: ${ore.baseSmeltTime}秒`;
    const info = this.add.text(-330, -85, infoText, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '16px',
      color: '#c0a080'
    });
    this.addDynamic(info);

    const divider1 = this.add.rectangle(0, -55, 720, 2, 0x5c3a1e);
    this.addDynamic(divider1);

    if (entry.bestRecord) {
      const bestTitle = this.add.text(-330, -30, '🏆 最佳冶炼记录', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '20px',
        color: '#ffd700',
        fontStyle: 'bold'
      });
      this.addDynamic(bestTitle);
      this.renderRecord(entry.bestRecord, -330, 0);
    } else {
      const noBest = this.add.text(-330, -15, '暂无最佳记录', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '16px',
        color: '#808080'
      });
      this.addDynamic(noBest);
    }

    const divider2 = this.add.rectangle(0, 100, 720, 2, 0x5c3a1e);
    this.addDynamic(divider2);

    const historyTitle = this.add.text(-330, 125, '📜 历史记录（最近10次）', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '18px',
      color: '#e8c080',
      fontStyle: 'bold'
    });
    this.addDynamic(historyTitle);

    if (entry.history.length === 0) {
      const noHistory = this.add.text(-330, 160, '暂无历史记录', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '15px',
        color: '#808080'
      });
      this.addDynamic(noHistory);
    } else {
      entry.history.slice(0, 10).forEach((record, idx) => {
        this.renderCompactRecord(record, -330, 160 + idx * 26);
      });
    }
  }

  private renderRecord(record: SmeltingRecord, x: number, y: number): void {
    const qLevel = QUALITY_LEVELS.find(q => q.name === record.qualityName);
    const qColor = qLevel ? '#' + qLevel.color.toString(16).padStart(6, '0') : '#ffffff';

    const qualityText = this.add.text(x, y, `${record.qualityName}`, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '22px',
      color: qColor,
      fontStyle: 'bold'
    });
    const scoreText = this.add.text(x + 120, y + 3, `${record.score}分`, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    const dateText = this.add.text(x + 250, y + 5, `${record.date}  第${record.level}关`, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '14px',
      color: '#a08060'
    });

    const ratioText = `配比: 矿石${record.ratio.ore} / 木炭${record.ratio.charcoal} / 助熔剂${record.ratio.flux}`;
    const ratio = this.add.text(x, y + 35, ratioText, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '15px',
      color: '#c0a080'
    });
    const tempText = this.add.text(x + 380, y + 35, `平均炉温: ${Math.round(record.avgTemp)}°C`, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '15px',
      color: '#ffaa66'
    });

    this.addDynamic(qualityText);
    this.addDynamic(scoreText);
    this.addDynamic(dateText);
    this.addDynamic(ratio);
    this.addDynamic(tempText);
  }

  private renderCompactRecord(record: SmeltingRecord, x: number, y: number): void {
    const qLevel = QUALITY_LEVELS.find(q => q.name === record.qualityName);
    const qColor = qLevel ? '#' + qLevel.color.toString(16).padStart(6, '0') : '#ffffff';

    const text = `[${record.date}] ${record.qualityName}  ${record.score}分  ` +
      `矿${record.ratio.ore}/炭${record.ratio.charcoal}/熔${record.ratio.flux}  ${Math.round(record.avgTemp)}°C`;
    const label = this.add.text(x, y, text, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '13px',
      color: qColor
    });
    this.addDynamic(label);
  }

  private createBackButton(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 100, 40, 0x4a3020)
      .setStrokeStyle(2, 0x8b6914).setInteractive({ useHandCursor: true });
    this.add.text(x, y, '返回主菜单', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '17px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => {
      btn.setFillStyle(0x5c4030);
      btn.setStrokeStyle(2, 0xffd700);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(0x4a3020);
      btn.setStrokeStyle(2, 0x8b6914);
    });
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}
