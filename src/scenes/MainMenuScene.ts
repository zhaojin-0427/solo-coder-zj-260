import Phaser from 'phaser';
import { LEVEL_CONFIGS } from '../config/GameData';
import { getHighScores, getTutorialComplete, setTutorialComplete } from '../utils/Storage';

export class MainMenuScene extends Phaser.Scene {
  private selectedLevel: number = 1;
  private tutorialButton!: Phaser.GameObjects.Rectangle;
  private tutorialButtonLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x2a1a10);
    this.addAncientBorder(width, height);

    this.add.text(width / 2, 70, '传统冶炼炉温控制', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#5c3a1e',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(width / 2, 120, '与矿石配比挑战', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '32px',
      color: '#e8c080',
      stroke: '#3c2a1e',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.createFurnaceDecoration(width / 2, 300);

    this.createLevelSelector(width / 2 - 320, 430);
    this.createMenuButtons(width / 2 + 200, 430);
    this.createHighScoreDisplay(width / 2, 670);
  }

  private addAncientBorder(w: number, h: number): void {
    const borderColor = 0x8b6914;
    const innerColor = 0x5c3a1e;

    this.add.rectangle(w / 2, h / 2, w - 20, h - 20).setStrokeStyle(4, borderColor);
    this.add.rectangle(w / 2, h / 2, w - 40, h - 40).setStrokeStyle(2, innerColor);

    const cornerSize = 28;
    const corners = [
      { x: 40, y: 40 },
      { x: w - 40, y: 40 },
      { x: 40, y: h - 40 },
      { x: w - 40, y: h - 40 }
    ];

    corners.forEach(c => {
      this.add.rectangle(c.x, c.y, cornerSize, cornerSize, borderColor);
      this.add.rectangle(c.x, c.y, cornerSize - 10, cornerSize - 10, innerColor);
    });
  }

  private createFurnaceDecoration(x: number, y: number): void {
    this.add.rectangle(x, y, 120, 150, 0x4a3020).setStrokeStyle(3, 0x8b6914);
    this.add.rectangle(x, y - 55, 90, 35, 0x3a2010).setStrokeStyle(2, 0x8b6914);

    const glow = this.add.graphics();
    glow.fillGradientStyle(0xff6600, 0xff3300, 0xffaa00, 0xff4400, 1);
    glow.fillEllipse(x, y + 15, 55, 60);

    const ember = this.add.circle(x - 12, y + 25, 4, 0xffdd00);
    const ember2 = this.add.circle(x + 8, y + 5, 3, 0xffee00);

    this.tweens.add({
      targets: [ember, ember2],
      alpha: { from: 0.4, to: 1 },
      scale: { from: 0.8, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.add.rectangle(x - 48, y + 8, 12, 40, 0x5a4030).setStrokeStyle(2, 0x8b6914);
  }

  private createLevelSelector(x: number, y: number): void {
    this.add.text(x, y - 25, '选择关卡：', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '22px',
      color: '#e8c080',
      fontStyle: 'bold'
    });

    LEVEL_CONFIGS.forEach((level, index) => {
      const btnY = y + index * 52;
      const isSelected = this.selectedLevel === level.level;

      const bg = this.add.rectangle(x + 130, btnY, 260, 44, isSelected ? 0x8b6914 : 0x3a2a1a)
        .setStrokeStyle(2, isSelected ? 0xffd700 : 0x5c3a1e)
        .setInteractive({ useHandCursor: true });

      const levelText = this.add.text(x + 15, btnY - 2, `第${level.level}关`, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '18px',
        color: isSelected ? '#ffd700' : '#e8c080',
        fontStyle: isSelected ? 'bold' : 'normal'
      });

      const nameText = this.add.text(x + 85, btnY - 2, level.name, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '17px',
        color: isSelected ? '#ffeeaa' : '#d0b090'
      });

      const clickHandler = () => {
        this.selectedLevel = level.level;
        this.scene.restart();
      };

      bg.on('pointerdown', clickHandler);
      levelText.setInteractive({ useHandCursor: true }).on('pointerdown', clickHandler);
      nameText.setInteractive({ useHandCursor: true }).on('pointerdown', clickHandler);
    });
  }

  private createMenuButtons(x: number, y: number): void {
    const tutorialDone = getTutorialComplete();

    this.createAncientButton(x, y, 180, 48, '开始冶炼', '#ffd700', () => {
      this.scene.start('GameScene', { level: this.selectedLevel });
    });

    const tutorialText = tutorialDone ? '复习工艺' : '学习工艺';
    const { bg: tutBg, label: tutLabel } = this.createAncientButton(
      x, y + 65, 180, 48, tutorialText, '#e8c080', () => {
        this.scene.start('TutorialScene');
      }
    );
    this.tutorialButton = tutBg;
    this.tutorialButtonLabel = tutLabel;

    this.createAncientButton(x, y + 130, 180, 48, '重置进度', '#b08060', () => {
      localStorage.removeItem('smelting_furnace_high_scores');
      localStorage.removeItem('smelting_tutorial_complete');
      this.scene.restart();
    });
  }

  private createAncientButton(
    x: number, y: number, w: number, h: number, text: string, color: string, onClick: () => void
  ): { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const bg = this.add.rectangle(x, y, w, h, 0x4a3020)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(x, y, text, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '20px',
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
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x3a2010);
    });
    bg.on('pointerup', () => {
      bg.setFillStyle(0x5c4030);
    });
    bg.on('pointerdown', onClick);

    label.setInteractive({ useHandCursor: true });
    label.on('pointerdown', onClick);

    return { bg, label };
  }

  private createHighScoreDisplay(x: number, y: number): void {
    const scores = getHighScores().slice(0, 5);

    this.add.text(x - 580, y, '🏆 排行榜', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    if (scores.length === 0) {
      this.add.text(x - 460, y, '暂无记录，成为首位冶炼大师吧！', {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '17px',
        color: '#a08060'
      });
      return;
    }

    scores.forEach((record, i) => {
      const text = `#${i + 1} 第${record.level}关 ${record.quality} - ${record.score}分`;
      this.add.text(x - 460 + i * 190, y, text, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '15px',
        color: i === 0 ? '#ffd700' : '#d0b090'
      });
    });
  }
}
