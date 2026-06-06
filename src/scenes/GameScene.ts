import Phaser from 'phaser';
import type { OreType, Ratio, LevelConfig, GameEvent, Order, SmeltResult, SmeltingRecord } from '../types';
import { ORE_TYPES, LEVEL_CONFIGS, GAME_EVENTS, FURNACE_CONFIG, QUALITY_LEVELS, COMBO_CONFIG } from '../config/GameData';
import { calculateSmeltResult, getQualityLevel, formatTime, clamp } from '../utils/SmeltingLogic';
import { saveHighScore, saveSmeltingRecord, saveComboState, getComboState, saveGlobalMaxCombo } from '../utils/Storage';

type GamePhase = 'preparing' | 'smelting' | 'result';

export class GameScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private level: number = 1;
  private phase: GamePhase = 'preparing';
  private temperature: number = 300;
  private avgTemperature: number = 0;
  private tempSum: number = 0;
  private tempSamples: number = 0;
  private furnaceHealth: number = 1.0;
  private smeltTime: number = 0;
  private levelTime: number = 0;
  private totalScore: number = 0;
  private completedOrders: number = 0;
  private totalOrders: number = 0;
  private currentOre!: OreType;
  private ratio: Ratio = { ore: 6, charcoal: 4, flux: 2 };
  private activeEvent: GameEvent | null = null;
  private eventTimer: number = 0;
  private eventCooldown: number = 0;
  private currentOrder: Order | null = null;
  private currentCombo: number = 0;
  private maxCombo: number = 0;
  private lastSmeltRecord: SmeltingRecord | null = null;

  private furnaceGlow!: Phaser.GameObjects.Graphics;
  private fireParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireManager!: any;
  private tempNeedle!: Phaser.GameObjects.Line;
  private tempText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private ratioTexts: any = null;
  private resultPanel!: Phaser.GameObjects.Container;
  private eventBanner!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private orderCounterText!: Phaser.GameObjects.Text;
  private blowButton!: Phaser.GameObjects.Rectangle;
  private startButton!: Phaser.GameObjects.Container;
  private startButtonLabel!: Phaser.GameObjects.Text;
  private tapButton!: Phaser.GameObjects.Rectangle;
  private oreInfoText!: Phaser.GameObjects.Text;
  private orderText!: Phaser.GameObjects.Text;
  private eventBannerText!: Phaser.GameObjects.Text;
  private eventBannerTimer!: Phaser.GameObjects.Text;
  private oreButtonContainers: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super('GameScene');
  }

  init(data: { level: number }): void {
    this.level = data.level || 1;
    this.levelConfig = LEVEL_CONFIGS[this.level - 1];
    this.temperature = 300;
    this.avgTemperature = 0;
    this.tempSum = 0;
    this.tempSamples = 0;
    this.furnaceHealth = 1.0;
    this.smeltTime = 0;
    this.levelTime = this.levelConfig.timeLimit;
    this.totalScore = 0;
    this.completedOrders = 0;
    this.totalOrders = Phaser.Math.Between(this.levelConfig.minOrders, this.levelConfig.maxOrders);
    this.phase = 'preparing';
    this.activeEvent = null;
    this.eventTimer = 0;
    this.eventCooldown = 10;
    this.currentOre = ORE_TYPES[this.levelConfig.availableOres[0]];
    this.ratio = { ore: 6, charcoal: 4, flux: 2 };
    const comboState = getComboState();
    this.currentCombo = comboState.currentCombo;
    this.maxCombo = comboState.maxCombo;
    this.lastSmeltRecord = null;
    this.generateOrder();
  }

  generateOrder(): void {
    const qualities = ['凡品', '良品', '精品', '上品'];
    const qualityIdx = Math.min(this.level, qualities.length - 1);
    const minQ = Math.max(0, qualityIdx - 1);
    const targetQuality = qualities[Phaser.Math.Between(minQ, qualityIdx)];
    const isEmerg = this.activeEvent?.type === 'emergency' || Math.random() < 0.15 * this.level;
    this.currentOrder = {
      id: `order_${Date.now()}`,
      targetQuality: targetQuality,
      quantity: Phaser.Math.Between(1, this.levelConfig.batchProduction ? 3 : 1),
      timeLimit: this.levelConfig.timeLimit,
      bonus: (this.level * 50) * (isEmerg ? 2 : 1),
      isEmergency: isEmerg
    };
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f0a);
    this.add.rectangle(width / 2, height / 2, width - 20, height - 20).setStrokeStyle(3, 0x5c3a1e);

    this.createTopHUD(width);
    this.createFurnace(220, 360);
    this.createTemperatureGauge(220, 580);
    this.createHealthBar(220, 650);
    this.createProgressBar(220, 510);
    this.createRatioPanel(560, 180);
    this.createOreSelector(560, 430);
    this.createControlButtons(560, 620);
    this.createOrderPanel(990, 150);
    this.createResultPanel(width / 2, height / 2);
    this.createEventBanner(width / 2, 60);
    this.createBackButton(width - 60, 60);
    this.updateAllUI();
  }

  private createTopHUD(width: number): void {
    this.add.rectangle(width / 2, 30, width - 60, 40, 0x2a1a10, 0.9).setStrokeStyle(2, 0x5c3a1e);
    this.add.text(80, 30, `第${this.level}关 - ${this.levelConfig.name}`, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.timeText = this.add.text(250, 30, '时间: 03:00', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#e8c080'
    }).setOrigin(0, 0.5);
    this.scoreText = this.add.text(430, 30, '得分: 0', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#ffd700'
    }).setOrigin(0, 0.5);
    this.comboText = this.add.text(590, 30, '连击: x1.0', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#ffaa66', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.orderCounterText = this.add.text(width - 200, 30, `订单: 0/${this.totalOrders}`, {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#e8c080'
    }).setOrigin(0, 0.5);
  }

  private createFurnace(x: number, y: number): void {
    this.add.rectangle(x, y - 80, 120, 50, 0x3a2010).setStrokeStyle(2, 0x8b6914);
    this.add.rectangle(x, y - 95, 80, 25, 0x2a1810).setStrokeStyle(2, 0x8b6914);
    this.add.rectangle(x, y, 180, 220, 0x4a3020).setStrokeStyle(4, 0x8b6914);
    this.add.rectangle(x, y + 60, 140, 30, 0x3a2010).setStrokeStyle(2, 0x5c3a1e);
    this.add.rectangle(x - 70, y, 20, 80, 0x3a2010).setStrokeStyle(2, 0x5c3a1e);
    this.add.rectangle(x + 70, y, 20, 80, 0x3a2010).setStrokeStyle(2, 0x5c3a1e);
    this.furnaceGlow = this.add.graphics();
    this.updateFurnaceGlow(x, y);
    this.fireManager = this.add.particles(x, y + 20, null as any);
    this.fireParticles = this.fireManager.createEmitter({
      speed: { min: -30, max: 30 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 2,
      tint: [0xff6600, 0xffaa00, 0xff3300],
      on: false
    });
    for (let i = 0; i < 5; i++) {
      this.add.circle(x - 50 + i * 25, y + 30, 8 + Math.random() * 4, 0x3a2515).setStrokeStyle(1, 0x2a1810);
    }
  }

  private updateFurnaceGlow(x: number, y: number): void {
    this.furnaceGlow.clear();
    const intensity = clamp((this.temperature - 300) / 1200, 0, 1);
    const glowSize = 50 + intensity * 40;
    if (intensity > 0.1) {
      const r = 255, g = Math.floor(100 + intensity * 100), b = Math.floor(intensity * 50);
      const color = (r << 16) | (g << 8) | b;
      this.furnaceGlow.fillStyle(color, intensity * 0.8);
      this.furnaceGlow.fillEllipse(x, y + 20, glowSize, glowSize * 1.3);
      this.furnaceGlow.fillStyle(color, intensity * 0.4);
      this.furnaceGlow.fillEllipse(x, y + 20, glowSize + 30, glowSize * 1.3 + 30);
    }
  }

  private createTemperatureGauge(x: number, y: number): void {
    this.add.text(x, y - 50, '炉温表', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#e8c080', fontStyle: 'bold'
    }).setOrigin(0.5);
    const gw = 280, gh = 24;
    this.add.rectangle(x, y, gw + 10, gh + 10, 0x3a2010).setStrokeStyle(3, 0x8b6914);
    const segs = [
      { from: 0, to: 0.25, color: 0x4080ff },
      { from: 0.25, to: 0.55, color: 0x80ff40 },
      { from: 0.55, to: 0.78, color: 0xffaa00 },
      { from: 0.78, to: 1.0, color: 0xff3030 }
    ];
    segs.forEach(s => {
      const sw = gw * (s.to - s.from);
      const sx = x - gw / 2 + gw * s.from + sw / 2;
      this.add.rectangle(sx, y, sw, gh, s.color, 0.6);
    });
    this.tempNeedle = this.add.line(x - gw / 2, y, 0, -15, 0, 15, 0xffffff).setLineWidth(3).setOrigin(0, 0.5);
    this.tempText = this.add.text(x, y + 28, '300°C', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(x - gw / 2, y - 14, '200°', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '12px', color: '#a08060'
    }).setOrigin(1, 0.5);
    this.add.text(x + gw / 2, y - 14, '1800°', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '12px', color: '#a08060'
    });
  }

  private createHealthBar(x: number, y: number): void {
    this.add.text(x, y - 18, '炉膛耐久', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '14px', color: '#e8c080'
    }).setOrigin(0.5);
    this.add.rectangle(x, y, 200, 16, 0x3a2010).setStrokeStyle(2, 0x5c3a1e);
    this.healthBar = this.add.graphics();
  }

  private createProgressBar(x: number, y: number): void {
    this.add.text(x, y - 18, '冶炼进度', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '14px', color: '#e8c080'
    }).setOrigin(0.5);
    this.add.rectangle(x, y, 200, 16, 0x3a2010).setStrokeStyle(2, 0x5c3a1e);
    this.progressBar = this.add.graphics();
  }

  private createRatioPanel(x: number, y: number): void {
    this.add.text(x, y, '原料配比（总计12份）', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);

    const items: Array<{ key: keyof Ratio; label: string; color: number; icon: string }> = [
      { key: 'ore', label: '矿石', color: this.currentOre.color, icon: '⛏' },
      { key: 'charcoal', label: '木炭', color: 0x404040, icon: '🔥' },
      { key: 'flux', label: '助熔剂', color: 0xc0c0e0, icon: '◇' }
    ];

    items.forEach((item, idx) => {
      const iy = y + 50 + idx * 70;
      this.add.rectangle(x, iy, 380, 55, 0x2a1a10).setStrokeStyle(2, 0x5c3a1e);
      this.add.circle(x - 160, iy, 18, item.color).setStrokeStyle(2, 0x8b6914);

      const minus = this.add.rectangle(x - 80, iy, 36, 36, 0x4a3020)
        .setStrokeStyle(2, 0x8b6914).setInteractive({ useHandCursor: true });
      this.add.text(x - 80, iy, '−', {
        fontFamily: 'Arial', fontSize: '28px', color: '#ffd700'
      }).setOrigin(0.5);

      const valText = this.add.text(x, iy, `${this.ratio[item.key]}`, {
        fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '28px', color: '#ffd700', fontStyle: 'bold'
      }).setOrigin(0.5);

      const plus = this.add.rectangle(x + 80, iy, 36, 36, 0x4a3020)
        .setStrokeStyle(2, 0x8b6914).setInteractive({ useHandCursor: true });
      this.add.text(x + 80, iy, '+', {
        fontFamily: 'Arial', fontSize: '28px', color: '#ffd700'
      }).setOrigin(0.5);

      this.add.text(x + 140, iy, item.label, {
        fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#e8c080'
      }).setOrigin(0.5);

      minus.on('pointerdown', () => this.adjustRatio(item.key, -1));
      plus.on('pointerdown', () => this.adjustRatio(item.key, 1));

      if (!this.ratioTexts) this.ratioTexts = {} as any;
      this.ratioTexts[item.key] = valText;
    });

    this.oreInfoText = this.add.text(x, y + 260, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '14px', color: '#a08060',
      align: 'center', wordWrap: { width: 380 }
    }).setOrigin(0.5);
  }

  private adjustRatio(key: keyof Ratio, delta: number): void {
    if (this.phase !== 'preparing') return;
    const total = this.ratio.ore + this.ratio.charcoal + this.ratio.flux;
    const newVal = this.ratio[key] + delta;
    if (newVal < 1) return;
    if (delta > 0 && total >= 12) return;
    this.ratio[key] = newVal;
    this.updateAllUI();
  }

  private createOreSelector(x: number, y: number): void {
    this.add.text(x, y - 20, '选择矿石', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.levelConfig.availableOres.forEach((oreId, idx) => {
      const ore = ORE_TYPES[oreId];
      const ox = x - 170 + (idx % 3) * 170;
      const oy = y + 30 + Math.floor(idx / 3) * 80;

      const container = this.add.container(ox, oy);
      const bg = this.add.rectangle(0, 0, 150, 65, 0x2a1a10)
        .setStrokeStyle(2, 0x5c3a1e).setInteractive({ useHandCursor: true });
      const dot = this.add.circle(-50, 0, 16, ore.color).setStrokeStyle(2, 0x8b6914);
      const name = this.add.text(5, -12, ore.name, {
        fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#e8c080'
      });
      const info = this.add.text(5, 10, `品位${Math.round(ore.grade * 100)}%`, {
        fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '13px', color: '#a08060'
      });
      container.add([bg, dot, name, info]);

      bg.on('pointerdown', () => {
        if (this.phase !== 'preparing') return;
        this.currentOre = ore;
        this.updateOreSelection();
        this.updateAllUI();
      });

      this.oreButtonContainers.set(oreId, container);
    });
    this.updateOreSelection();
  }

  private updateOreSelection(): void {
    this.oreButtonContainers.forEach((c, id) => {
      const bg = c.first as Phaser.GameObjects.Rectangle;
      const isSel = this.currentOre.id === id;
      bg.setStrokeStyle(isSel ? 3 : 2, isSel ? 0xffd700 : 0x5c3a1e);
      bg.setFillStyle(isSel ? 0x4a3020 : 0x2a1a10);
    });
  }

  private createControlButtons(x: number, y: number): void {
    this.blowButton = this.add.rectangle(x - 90, y, 160, 60, 0x6a3020)
      .setStrokeStyle(3, 0x8b6914).setInteractive({ useHandCursor: true });
    this.add.text(x - 90, y, '💨 鼓风', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '24px', color: '#ffaa66', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.blowButton.on('pointerdown', () => this.doBlow());

    this.startButton = this.add.container(x + 90, y);
    const startBg = this.add.rectangle(0, 0, 160, 60, 0x4a6030)
      .setStrokeStyle(3, 0x8b6914).setInteractive({ useHandCursor: true });
    this.startButtonLabel = this.add.text(0, 0, '🔥 点火开炉', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '22px', color: '#aaff66', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.startButton.add([startBg, this.startButtonLabel]);

    startBg.on('pointerdown', () => {
      if (this.phase === 'preparing') this.startSmelting();
      else if (this.phase === 'smelting') this.tapFurnace();
    });

    this.tapButton = this.add.rectangle(x, y + 80, 340, 50, 0x3a2a4a)
      .setStrokeStyle(2, 0x5c3a6e).setInteractive({ useHandCursor: true });
    this.add.text(x, y + 80, '⚒ 出炉检验', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#c0a0ff'
    }).setOrigin(0.5);
    this.tapButton.on('pointerdown', () => {
      if (this.phase === 'smelting') this.finishSmelting();
    });
  }

  private doBlow(): void {
    if (this.phase !== 'smelting') return;
    const baseInc = FURNACE_CONFIG.blowTempIncrease;
    const eventMod = this.activeEvent?.effect.tempModifier || 0;
    const inc = baseInc * (1 + eventMod);
    this.temperature = clamp(this.temperature + inc, FURNACE_CONFIG.minTemp, FURNACE_CONFIG.maxTemp);
    this.fireParticles.explode(8);
    this.cameras.main.shake(80, 0.005);
    this.updateAllUI();
  }

  private tapFurnace(): void {
    // visual feedback only
  }

  private startSmelting(): void {
    this.phase = 'smelting';
    this.smeltTime = 0;
    this.tempSum = 0;
    this.tempSamples = 0;
    this.fireParticles.start();
    if (this.startButtonLabel) this.startButtonLabel.setText('冶炼中...');
    this.updateAllUI();
  }

  private finishSmelting(): void {
    if (this.phase !== 'smelting') return;
    this.phase = 'result';
    this.fireParticles.stop();
    this.avgTemperature = this.tempSamples > 0 ? this.tempSum / this.tempSamples : this.temperature;

    const qualMod = this.activeEvent?.effect.qualityModifier || 1.0;
    const result = calculateSmeltResult(
      this.currentOre, this.ratio, this.avgTemperature,
      this.smeltTime, 1 - this.furnaceHealth, qualMod
    );
    this.processResult(result);
  }

  private processResult(result: SmeltResult): void {
    let orderMatch = false;
    if (this.currentOrder) {
      const ql = getQualityLevel(result.quality);
      const targetQ = QUALITY_LEVELS.findIndex(q => q.name === this.currentOrder!.targetQuality);
      const actualQ = QUALITY_LEVELS.findIndex(q => q.name === result.qualityName);
      orderMatch = actualQ >= targetQ;
      if (orderMatch) {
        this.completedOrders++;
        this.currentCombo++;
        if (this.currentCombo > this.maxCombo) {
          this.maxCombo = this.currentCombo;
        }
        const comboMult = Math.min(
          COMBO_CONFIG.baseMultiplier + (this.currentCombo - 1) * COMBO_CONFIG.multiplierPerCombo,
          COMBO_CONFIG.maxMultiplier
        );
        const bonus = this.currentOrder.isEmergency ? 2 : 1;
        const baseGain = result.score * bonus + this.currentOrder.bonus;
        this.totalScore += Math.floor(baseGain * comboMult);
      } else {
        if (COMBO_CONFIG.breakOnFailure) {
          this.currentCombo = 0;
        }
        this.totalScore += Math.floor(result.score * 0.3);
      }
    }

    saveComboState({
      currentCombo: this.currentCombo,
      maxCombo: this.maxCombo,
      lastOrderSuccess: orderMatch
    });

    const record: SmeltingRecord = {
      oreId: this.currentOre.id,
      oreName: this.currentOre.name,
      ratio: { ...this.ratio },
      avgTemp: this.avgTemperature,
      quality: result.quality,
      qualityName: result.qualityName,
      score: result.score,
      date: new Date().toLocaleDateString('zh-CN'),
      level: this.level
    };
    this.lastSmeltRecord = record;
    saveSmeltingRecord(record);

    this.showResultPanel(result, orderMatch, record);

    saveHighScore({
      level: this.level,
      score: this.totalScore,
      date: new Date().toLocaleDateString('zh-CN'),
      quality: result.qualityName,
      maxCombo: this.maxCombo
    });
  }

  private createOrderPanel(x: number, y: number): void {
    this.add.rectangle(x, y, 260, 120, 0x2a1a10).setStrokeStyle(3, 0x8b6914);
    this.add.text(x, y - 45, '📜 当前订单', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.orderText = this.add.text(x, y + 10, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#e8c080',
      align: 'center', wordWrap: { width: 240 }
    }).setOrigin(0.5);
  }

  private createResultPanel(x: number, y: number): void {
    this.resultPanel = this.add.container(x, y);
    this.resultPanel.setVisible(false);
    const bg = this.add.rectangle(0, 0, 560, 520, 0x1a0f0a).setStrokeStyle(4, 0xffd700);
    const title = this.add.text(0, -235, '冶炼结果', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '32px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);
    const qLabel = this.add.text(0, -185, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '40px', fontStyle: 'bold'
    }).setOrigin(0.5).setName('resultQuality');

    const detailBox = this.add.rectangle(0, -85, 500, 160, 0x2a1a10).setStrokeStyle(2, 0x5c3a1e);

    const oreLabel = this.add.text(-230, -150, '矿石:', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#a08060'
    }).setName('resultOreLabel');
    const oreVal = this.add.text(-170, -150, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#e8c080'
    }).setName('resultOre');

    const ratioLabel = this.add.text(-230, -120, '配比:', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#a08060'
    }).setName('resultRatioLabel');
    const ratioVal = this.add.text(-170, -120, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#e8c080'
    }).setName('resultRatio');

    const tempLabel = this.add.text(-230, -90, '平均炉温:', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#a08060'
    }).setName('resultTempLabel');
    const tempVal = this.add.text(-140, -90, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#ffaa66'
    }).setName('resultTemp');

    const comboLabel = this.add.text(-230, -60, '连击:', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#a08060'
    }).setName('resultComboLabel');
    const comboVal = this.add.text(-170, -60, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#ffcc44', fontStyle: 'bold'
    }).setName('resultCombo');

    const scoreLabel = this.add.text(20, -150, '品质得分:', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#a08060'
    }).setName('resultScoreLabel');
    const scoreVal = this.add.text(110, -150, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#ffd700', fontStyle: 'bold'
    }).setName('resultScore');

    const timeLabel = this.add.text(20, -120, '耗时:', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#a08060'
    }).setName('resultTimeLabel');
    const timeVal = this.add.text(80, -120, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#e8c080'
    }).setName('resultTime');

    const details = this.add.text(0, 30, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '14px', color: '#c0a080',
      align: 'center', wordWrap: { width: 500 }
    }).setOrigin(0.5, 0).setName('resultDetails');
    const orderStatus = this.add.text(0, 175, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px'
    }).setOrigin(0.5).setName('orderStatus');

    const contBtn = this.add.rectangle(0, 225, 180, 45, 0x4a6030)
      .setStrokeStyle(3, 0x8b6914).setInteractive({ useHandCursor: true });
    this.add.text(0, 225, '继续冶炼', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '20px', color: '#aaff66', fontStyle: 'bold'
    }).setOrigin(0.5);
    contBtn.on('pointerdown', () => this.nextSmelt());

    this.resultPanel.add([
      bg, title, qLabel, detailBox,
      oreLabel, oreVal, ratioLabel, ratioVal, tempLabel, tempVal, comboLabel, comboVal,
      scoreLabel, scoreVal, timeLabel, timeVal,
      details, orderStatus, contBtn
    ]);
  }

  private showResultPanel(result: SmeltResult, orderMatch: boolean, record: SmeltingRecord): void {
    this.resultPanel.setVisible(true);
    const q = getQualityLevel(result.quality);
    const ql = this.resultPanel.getByName('resultQuality') as Phaser.GameObjects.Text;
    ql.setText(result.qualityName).setColor('#' + q.color.toString(16).padStart(6, '0'));

    const oreText = this.resultPanel.getByName('resultOre') as Phaser.GameObjects.Text;
    oreText.setText(`${record.oreName}`);

    const ratioText = this.resultPanel.getByName('resultRatio') as Phaser.GameObjects.Text;
    ratioText.setText(`矿${record.ratio.ore} / 炭${record.ratio.charcoal} / 熔${record.ratio.flux}`);

    const tempText = this.resultPanel.getByName('resultTemp') as Phaser.GameObjects.Text;
    tempText.setText(`${Math.round(record.avgTemp)}°C`);

    const comboMult = Math.min(
      COMBO_CONFIG.baseMultiplier + Math.max(0, this.currentCombo - 1) * COMBO_CONFIG.multiplierPerCombo,
      COMBO_CONFIG.maxMultiplier
    );
    const comboText = this.resultPanel.getByName('resultCombo') as Phaser.GameObjects.Text;
    if (this.currentCombo > 0 && orderMatch) {
      comboText.setText(`${this.currentCombo}连击 (x${comboMult.toFixed(1)})`);
    } else if (!orderMatch) {
      comboText.setText('已中断');
    } else {
      comboText.setText('0');
    }

    const sc = this.resultPanel.getByName('resultScore') as Phaser.GameObjects.Text;
    sc.setText(`${result.quality}分`);

    const tm = this.resultPanel.getByName('resultTime') as Phaser.GameObjects.Text;
    tm.setText(`${result.timeSpent.toFixed(1)}秒`);

    const dt = this.resultPanel.getByName('resultDetails') as Phaser.GameObjects.Text;
    dt.setText(result.messages.join('\n'));

    const os = this.resultPanel.getByName('orderStatus') as Phaser.GameObjects.Text;
    if (orderMatch) {
      const extraText = this.currentCombo > 1 ? ` (连击奖励 x${comboMult.toFixed(1)})` : '';
      os.setText(`✅ 订单达标！${extraText}`).setColor('#80ff80');
    } else {
      os.setText('❌ 未达订单要求（连击已中断）').setColor('#ff8080');
    }
  }

  private nextSmelt(): void {
    this.resultPanel.setVisible(false);
    if (this.completedOrders >= this.totalOrders || this.levelTime <= 0 || this.furnaceHealth <= 0) {
      saveGlobalMaxCombo(this.maxCombo);
      this.scene.start('ResultScene', {
        level: this.level,
        score: this.totalScore,
        completed: this.completedOrders,
        total: this.totalOrders,
        success: this.completedOrders >= Math.ceil(this.totalOrders * 0.6),
        maxCombo: this.maxCombo
      });
      return;
    }
    this.phase = 'preparing';
    this.smeltTime = 0;
    this.temperature = 300;
    this.avgTemperature = 0;
    this.tempSum = 0;
    this.tempSamples = 0;
    this.generateOrder();
    if (this.startButtonLabel) this.startButtonLabel.setText('🔥 点火开炉');
    this.updateAllUI();
  }

  private createEventBanner(x: number, y: number): void {
    this.eventBanner = this.add.container(x, y);
    this.eventBanner.setVisible(false);
    const bg = this.add.rectangle(0, 0, 500, 45, 0x4a2020, 0.95).setStrokeStyle(3, 0xff6060);
    this.eventBannerText = this.add.text(-230, 0, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '18px', color: '#ffaa66', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.eventBannerTimer = this.add.text(220, 0, '', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#ffcc88'
    }).setOrigin(1, 0.5);
    this.eventBanner.add([bg, this.eventBannerText, this.eventBannerTimer]);
  }

  private createBackButton(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 80, 35, 0x4a3020)
      .setStrokeStyle(2, 0x8b6914).setInteractive({ useHandCursor: true });
    this.add.text(x, y, '返回', {
      fontFamily: '"KaiTi", "STKaiti", serif', fontSize: '16px', color: '#e8c080'
    }).setOrigin(0.5);
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }

  private triggerRandomEvent(): void {
    if (this.activeEvent || Math.random() > this.levelConfig.eventChance) return;
    const candidates = GAME_EVENTS.filter(e => e.type !== 'emergency' || this.level >= 2);
    const ev = Phaser.Utils.Array.GetRandom(candidates);
    if (!ev) return;
    this.activeEvent = ev;
    this.eventTimer = ev.duration > 0 ? ev.duration : 5;
    this.eventBannerText.setText(`⚠ ${ev.name}：${ev.description}`);
    this.eventBanner.setVisible(true);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.phase !== 'result') {
      this.levelTime = Math.max(0, this.levelTime - dt);
      if (this.levelTime <= 0) {
        this.phase = 'result';
        this.nextSmelt();
        return;
      }
    }

    if (this.phase === 'smelting') {
      const decay = FURNACE_CONFIG.tempDecayRate * (1 + (this.activeEvent?.effect.tempModifier || 0) * 0.3);
      this.temperature = clamp(this.temperature - decay * dt, FURNACE_CONFIG.minTemp, FURNACE_CONFIG.maxTemp);

      if (this.temperature > FURNACE_CONFIG.maxSafeTemp) {
        const dmg = (this.temperature - FURNACE_CONFIG.maxSafeTemp) * FURNACE_CONFIG.damagePerDegOver * dt;
        this.furnaceHealth = clamp(this.furnaceHealth - dmg / 100, 0, 1);
        if (this.furnaceHealth <= 0) {
          this.phase = 'result';
          this.nextSmelt();
          return;
        }
      }

      this.smeltTime += dt;
      this.tempSum += this.temperature;
      this.tempSamples++;

      this.eventCooldown -= dt;
      if (this.eventCooldown <= 0) {
        this.triggerRandomEvent();
        this.eventCooldown = 20 + Math.random() * 20;
      }
    }

    if (this.activeEvent && this.activeEvent.duration > 0) {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        this.activeEvent = null;
        this.eventBanner.setVisible(false);
      }
    }

    this.updateAllUI();
  }

  private updateAllUI(): void {
    this.timeText.setText(`时间: ${formatTime(this.levelTime)}`);
    this.scoreText.setText(`得分: ${this.totalScore}`);
    this.orderCounterText.setText(`订单: ${this.completedOrders}/${this.totalOrders}`);

    const comboMult = Math.min(
      COMBO_CONFIG.baseMultiplier + Math.max(0, this.currentCombo - 1) * COMBO_CONFIG.multiplierPerCombo,
      COMBO_CONFIG.maxMultiplier
    );
    if (this.comboText) {
      if (this.currentCombo > 0) {
        this.comboText.setText(`🔥 ${this.currentCombo}连击 x${comboMult.toFixed(1)}`);
        this.comboText.setColor(this.currentCombo >= 5 ? '#ffd700' : '#ffaa66');
      } else {
        this.comboText.setText(`连击: x${comboMult.toFixed(1)}`);
        this.comboText.setColor('#a08060');
      }
    }

    const gw = 280;
    const norm = clamp((this.temperature - 200) / 1600, 0, 1);
    this.tempNeedle.x = 220 - gw / 2 + gw * norm;
    this.tempText.setText(`${Math.round(this.temperature)}°C`);
    const tempColor = this.temperature > FURNACE_CONFIG.maxSafeTemp ? '#ff4040'
      : this.temperature > 1100 ? '#ffaa40' : '#ffd700';
    this.tempText.setColor(tempColor);

    this.updateFurnaceGlow(220, 360);

    this.healthBar.clear();
    const hbW = 200 * this.furnaceHealth;
    const hColor = this.furnaceHealth > 0.6 ? 0x60c060 : this.furnaceHealth > 0.3 ? 0xffaa40 : 0xff4040;
    this.healthBar.fillStyle(hColor, 1);
    this.healthBar.fillRect(220 - 100, 650 - 8, hbW, 16);

    this.progressBar.clear();
    if (this.phase === 'smelting') {
      const prog = clamp(this.smeltTime / this.currentOre.baseSmeltTime, 0, 1.5);
      const pbW = 200 * Math.min(prog, 1);
      this.progressBar.fillStyle(0xffaa40, 1);
      this.progressBar.fillRect(220 - 100, 510 - 8, pbW, 16);
    }

    if (this.ratioTexts) {
      this.ratioTexts.ore.setText(`${this.ratio.ore}`);
      this.ratioTexts.charcoal.setText(`${this.ratio.charcoal}`);
      this.ratioTexts.flux.setText(`${this.ratio.flux}`);
    }

    const total = this.ratio.ore + this.ratio.charcoal + this.ratio.flux;
    if (this.oreInfoText) {
      this.oreInfoText.setText(
        `${this.currentOre.name}：${this.currentOre.description}\n` +
        `理想炉温: ${this.currentOre.baseTempRequired}°C  |  冶炼时间: ${this.currentOre.baseSmeltTime}秒\n` +
        `当前配比合计: ${total}/12 份`
      );
    }

    if (this.currentOrder && this.orderText) {
      const emer = this.currentOrder.isEmergency ? '🚨 紧急！\n' : '';
      this.orderText.setText(
        `${emer}目标品质：${this.currentOrder.targetQuality}\n` +
        `数量：${this.currentOrder.quantity}  |  奖励：${this.currentOrder.bonus}分`
      );
      this.orderText.setColor(this.currentOrder.isEmergency ? '#ff8060' : '#e8c080');
    }

    if (this.activeEvent && this.eventBannerTimer) {
      this.eventBannerTimer.setText(`${Math.ceil(this.eventTimer)}s`);
    }
  }
}
