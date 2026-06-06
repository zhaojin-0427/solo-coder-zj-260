import Phaser from 'phaser';
import { LEVEL_CONFIGS } from '../config/GameData';
import { getHighScoreForLevel } from '../utils/Storage';

export class ResultScene extends Phaser.Scene {
  private resultData: any = null;

  constructor() {
    super('ResultScene');
  }

  init(data: any): void {
    this.resultData = data || { level: 1, score: 0, completed: 0, total: 0, success: false };
  }

  create(): void {
    const { width, height } = this.scale;
    const { level, score, completed, total, success } = this.resultData;
    const config = LEVEL_CONFIGS[level - 1];
    const best = getHighScoreForLevel(level);
    const isNewRecord = score > best;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f0a);
    this.add.rectangle(width / 2, height / 2, width - 40, height - 40).setStrokeStyle(4, 0x8b6914);
    this.add.rectangle(width / 2, height / 2, width - 60, height - 60).setStrokeStyle(2, 0x5c3a1e);

    const titleColor = success ? '#ffd700' : '#c08060';
    const titleText = success ? (level >= 3 ? '🏆 冶炼大师！' : '🎉 挑战成功！') : '💨 挑战失败';
    this.add.text(width / 2, 120, titleText, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '52px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#3c2a1e',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(width / 2, 185, `第${level}关 - ${config.name}`, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '24px',
      color: '#e8c080'
    }).setOrigin(0.5);

    if (isNewRecord && score > 0) {
      this.add.text(width / 2, 230, '🌟 新纪录！', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '28px',
        color: '#ffaa00',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    const panelY = 330;
    this.add.rectangle(width / 2, panelY, 500, 200, 0x2a1a10, 0.9).setStrokeStyle(3, 0x5c3a1e);

    this.add.text(width / 2 - 200, panelY - 70, '本次得分', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#a08060'
    });
    this.add.text(width / 2 + 200, panelY - 70, `${score}`, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '28px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    this.add.text(width / 2 - 200, panelY - 20, '完成订单', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#a08060'
    });
    this.add.text(width / 2 + 200, panelY - 20, `${completed} / ${total}`, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '24px',
      color: completed >= total * 0.6 ? '#80ff80' : '#ff8080'
    }).setOrigin(1, 0.5);

    this.add.text(width / 2 - 200, panelY + 30, '最高纪录', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#a08060'
    });
    this.add.text(width / 2 + 200, panelY + 30, `${Math.max(score, best)}`, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '24px', color: '#ffaa00', fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    const grade = score >= 400 ? 'S' : score >= 250 ? 'A' : score >= 150 ? 'B' : score >= 80 ? 'C' : 'D';
    const gradeColors: Record<string, string> = { S: '#ffd700', A: '#c0a0ff', B: '#80c0ff', C: '#80ff80', D: '#a08060' };
    this.add.text(width / 2, panelY + 70, `评级：${grade}`, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '30px', color: gradeColors[grade], fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createDecorations(width / 2, panelY);

    const btnY = 570;
    if (success && level < 3) {
      const nextBtn = this.createButton(width / 2 - 170, btnY, 200, 55, '下一关', '#ffd700');
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { level: level + 1 });
      });
    } else if (!success) {
      const retryBtn = this.createButton(width / 2 - 170, btnY, 200, 55, '再试一次', '#e8c080');
      retryBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { level: level });
      });
    }

    const menuBtn = this.createButton(width / 2 + (success && level < 3 ? 0 : -170), btnY, 200, 55, '返回主菜单', '#b08060');
    menuBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });

    if (success && level < 3) {
      const menu2 = this.createButton(width / 2 + 170, btnY, 200, 55, '返回主菜单', '#b08060');
      menu2.on('pointerdown', () => {
        this.scene.start('MainMenuScene');
      });
      menuBtn.x = width / 2;
    }

    this.add.text(width / 2, height - 50, config.description, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#806050',
      align: 'center', wordWrap: { width: width - 200 }
    }).setOrigin(0.5);
  }

  private createDecorations(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const dx = -220 + i * 88;
      this.add.circle(x + dx, y - 110, 4, 0x8b6914);
    }
    for (let i = 0; i < 6; i++) {
      const dx = -220 + i * 88;
      this.add.circle(x + dx, y + 110, 4, 0x8b6914);
    }
  }

  private createButton(x: number, y: number, w: number, h: number, text: string, color: string): Phaser.GameObjects.Rectangle {
    const bg = this.add.rectangle(x, y, w, h, 0x4a3020)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '22px',
      color: color,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5c4030);
      bg.setStrokeStyle(3, 0xffd700);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x4a3020);
      bg.setStrokeStyle(3, 0x8b6914);
    });
    return bg;
  }
}
