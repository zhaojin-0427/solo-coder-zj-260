import Phaser from 'phaser';
import { ORE_TYPES, QUALITY_LEVELS, FURNACE_CONFIG } from '../config/GameData';
import { setTutorialComplete } from '../utils/Storage';

const TUTORIAL_PAGES = [
  {
    title: '冶炼之道',
    content: '欢迎来到传统冶炼工坊！作为一名冶炼工匠，你需要掌握矿石配比与炉温控制的精湛技艺，铸造出高品质的铁料。'
  },
  {
    title: '矿石配比',
    content: '冶炼需要三种原料：矿石、木炭和助熔剂。\n\n• 矿石：提供铁元素，品位越高冶炼越容易\n• 木炭：提供热量和还原气氛，比例过低则炉温不足\n• 助熔剂：帮助去除杂质，低品位矿石需要更多\n\n合理的配比是成功的第一步！'
  },
  {
    title: '炉温控制',
    content: `炉温是冶炼的关键：\n\n• 最低安全温度：${FURNACE_CONFIG.minTemp}°C\n• 最高安全温度：${FURNACE_CONFIG.maxSafeTemp}°C\n• 超过${FURNACE_CONFIG.maxSafeTemp}°C会损坏炉膛\n• 点击鼓风可以提高炉温，炉温会自然下降\n\n不同矿石需要不同的冶炼温度，请仔细观察！`
  },
  {
    title: '冶炼时间',
    content: '每种矿石都有最佳冶炼时间：\n\n• 时间过短：铁料生涩，品质低下\n• 时间过长：浪费燃料，甚至氧化\n• 高品质矿石冶炼快，低品质矿石需要耐心\n\n注意观察冶炼进度，适时出炉！'
  },
  {
    title: '品质评级',
    content: `冶炼完成后会根据以下因素评分：\n\n${QUALITY_LEVELS.map(q => `• ${q.name}：${q.minScore}分以上 - ${q.description}`).join('\n')}\n\n力求达到极品，成为传世工匠！`
  },
  {
    title: '突发事件',
    content: '真实冶炼中会遇到各种状况：\n\n• 矿石短缺：原料供应不足\n• 阴雨天气：炉温难以维持\n• 酷暑天气：炉温容易过高\n• 大风天气：鼓风效果增强\n• 紧急订单：时间减半但奖励翻倍\n• 优质矿料：品质判定加成\n\n灵活应对，方显大师本色！'
  },
  {
    title: '关卡挑战',
    content: '三个难度关卡等你挑战：\n\n• 第1关 学徒试炼：基础冶炼，完成简单订单\n• 第2关 工匠进阶：更多矿石种类，天气影响\n• 第3关 大师挑战：全矿石可用，批量生产与各种突发事件\n\n准备好了吗？开始你的冶炼之旅吧！'
  }
];

export class TutorialScene extends Phaser.Scene {
  private currentPage: number = 0;
  private contentText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private pageIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super('TutorialScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f0a);

    this.add.rectangle(width / 2, height / 2, width - 40, height - 40).setStrokeStyle(4, 0x8b6914);
    this.add.rectangle(width / 2, height / 2, width - 60, height - 60).setStrokeStyle(2, 0x5c3a1e);

    this.titleText = this.add.text(width / 2, 80, TUTORIAL_PAGES[0].title, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '40px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#3c2a1e',
      strokeThickness: 3
    }).setOrigin(0.5);

    const contentBg = this.add.rectangle(width / 2, height / 2 + 20, width - 160, height - 280, 0x2a1a10, 0.8)
      .setStrokeStyle(2, 0x5c3a1e);

    this.contentText = this.add.text(width / 2 - (width - 200) / 2, 160, TUTORIAL_PAGES[0].content, {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '22px',
      color: '#e8c080',
      align: 'left',
      wordWrap: { width: width - 200 }
    }).setLineSpacing(12);

    this.createOreLegend(width - 180, 200);

    this.pageIndicator = this.add.text(width / 2, height - 130,
      `第 ${this.currentPage + 1} / ${TUTORIAL_PAGES.length} 页`, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '20px',
        color: '#a08060'
      }).setOrigin(0.5);

    this.createNavigationButtons(width / 2, height - 80);
  }

  private createOreLegend(x: number, y: number): void {
    this.add.text(x, y - 30, '矿石图例', {
      fontFamily: '"KaiTi", "STKaiti", serif',
      fontSize: '18px',
      color: '#e8c080',
      fontStyle: 'bold'
    });

    const ores = Object.values(ORE_TYPES).slice(0, 4);
    ores.forEach((ore, i) => {
      const oy = y + i * 35;
      this.add.circle(x - 15, oy, 8, ore.color).setStrokeStyle(2, 0x8b6914);
      this.add.text(x + 5, oy - 10, `${ore.name}`, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '14px',
        color: '#d0b090'
      });
      this.add.text(x + 5, oy + 6, `品位:${Math.round(ore.grade * 100)}%`, {
        fontFamily: '"KaiTi", "STKaiti", serif',
        fontSize: '12px',
        color: '#907050'
      });
    });
  }

  private createNavigationButtons(x: number, y: number): void {
    const prevBtn = this.createButton(x - 180, y, 120, 50, '上一页', '#b08060');
    prevBtn.on('pointerdown', () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.updatePage();
      }
    });

    const nextBtn = this.createButton(x, y, 120, 50, '下一页', '#e8c080');
    nextBtn.on('pointerdown', () => {
      if (this.currentPage < TUTORIAL_PAGES.length - 1) {
        this.currentPage++;
        this.updatePage();
      }
    });

    const backBtn = this.createButton(x + 180, y, 120, 50, '返回主菜单', '#ffd700');
    backBtn.on('pointerdown', () => {
      setTutorialComplete();
      this.scene.start('MainMenuScene');
    });
  }

  private createButton(x: number, y: number, w: number, h: number, text: string, color: string): Phaser.GameObjects.Rectangle {
    const bg = this.add.rectangle(x, y, w, h, 0x4a3020)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, text, {
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

    return bg;
  }

  private updatePage(): void {
    this.titleText.setText(TUTORIAL_PAGES[this.currentPage].title);
    this.contentText.setText(TUTORIAL_PAGES[this.currentPage].content);
    this.pageIndicator.setText(`第 ${this.currentPage + 1} / ${TUTORIAL_PAGES.length} 页`);
    if (this.currentPage >= TUTORIAL_PAGES.length - 1) {
      setTutorialComplete();
    }
  }
}
