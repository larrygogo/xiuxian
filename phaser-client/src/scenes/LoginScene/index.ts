/**
 * 登录场景
 * 使用画布渲染登录/注册按钮，点击后弹出Web模态框进行表单操作
 */

import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@/config/constants';
import { BaseScene } from '@/scenes/BaseScene';
import { LoginModalIframe } from '@/ui/modals/LoginModalIframe';

// 粒子配置
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: number;
}

// 响应式尺寸配置
interface ResponsiveSize {
  scale: number;
  titleFontSize: number;
  subtitleFontSize: number;
  buttonFontSize: number;
  buttonWidth: number;
  buttonHeight: number;
  buttonSpacing: number;
}

export default class LoginScene extends BaseScene {
  // 状态
  private isLoggedIn: boolean = false;
  private gameState: any = null;

  // 装饰元素
  private particles: Particle[] = [];
  private particleGraphics?: Phaser.GameObjects.Graphics;

  // UI元素
  private titleText?: Phaser.GameObjects.Text;
  private titleGlow?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private loginButton?: Phaser.GameObjects.Container;
  private registerButton?: Phaser.GameObjects.Container;
  private clickToStartText?: Phaser.GameObjects.Text;
  private clickToStartGlow?: Phaser.GameObjects.Text;
  private logoContainer?: Phaser.GameObjects.Container;
  private floatingSymbols: Phaser.GameObjects.Text[] = [];

  // 弹窗
  private loginModal?: LoginModalIframe;

  // 响应式尺寸
  private sizes!: ResponsiveSize;

  constructor() {
    super({ key: SCENE_KEYS.LOGIN });
  }

  create() {
    console.log('LoginScene: create');
    this.isLoggedIn = false;
    this.gameState = null;

    this.initSafeAreaSystem();
    this.createUI();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 计算响应式尺寸
    this.calculateResponsiveSizes(width, height);

    // 背景
    this.createBackground(width, height);

    // 装饰粒子
    this.createParticles(width, height);

    // 浮动符号装饰
    this.createFloatingSymbols(width, height);

    // Logo区域
    this.createLogo(width, height);

    // 标题
    this.createTitle(width, height);

    // 按钮（画布渲染）
    this.createCanvasButtons(width, height);

    // 版本信息
    this.createVersionInfo(width, height);

    // 入场动画
    this.playEntranceAnimation();
  }

  protected createUI(): void {
    // LoginScene 直接在 create 中创建UI
  }

  /**
   * 计算响应式尺寸
   */
  private calculateResponsiveSizes(width: number, height: number): void {
    const safeRect = this.safeAreaManager?.getFinalSafeRect() ?? {
      x: 0, y: 0, width, height
    };

    const scaleX = safeRect.width / GAME_WIDTH;
    const scaleY = safeRect.height / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const minScale = 0.5;
    const effectiveScale = Math.max(scale, minScale);

    const clampFontSize = (baseSize: number) => Math.max(14, Math.round(baseSize * effectiveScale));

    // 按钮尺寸：屏幕两端各空出16px，最大280px
    const BUTTON_MARGIN = 16;
    const MAX_BUTTON_WIDTH = 280;
    const buttonWidth = Math.min(MAX_BUTTON_WIDTH, (safeRect.width - BUTTON_MARGIN * 3) / 2);

    this.sizes = {
      scale: effectiveScale,
      titleFontSize: Math.max(36, Math.round(72 * effectiveScale)),
      subtitleFontSize: clampFontSize(24),
      buttonFontSize: clampFontSize(22),
      buttonWidth: buttonWidth,
      buttonHeight: Math.max(50, Math.round(60 * effectiveScale)),
      buttonSpacing: Math.max(16, Math.round(24 * effectiveScale))
    };

    console.log('LoginScene: responsive sizes calculated', {
      screenSize: { width, height },
      safeArea: safeRect,
      scale: effectiveScale,
      sizes: this.sizes
    });
  }

  /**
   * 获取安全区中心点
   */
  private getSafeAreaCenter(): { x: number; y: number } {
    const safeRect = this.safeAreaManager?.getFinalSafeRect();
    if (safeRect) {
      return {
        x: safeRect.x + safeRect.width / 2,
        y: safeRect.y + safeRect.height / 2
      };
    }
    return {
      x: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2
    };
  }

  /**
   * 创建渐变背景
   */
  private createBackground(width: number, height: number): void {
    const bgGraphics = this.add.graphics();

    // 从深蓝到深紫的渐变
    const colors = [
      { stop: 0, color: 0x0a0a1a },
      { stop: 0.3, color: 0x0d1025 },
      { stop: 0.6, color: 0x15102a },
      { stop: 1, color: 0x1a0a20 }
    ];

    for (let y = 0; y < height; y++) {
      const progress = y / height;
      let color: number = colors[0].color;

      for (let i = 0; i < colors.length - 1; i++) {
        if (progress >= colors[i].stop && progress <= colors[i + 1].stop) {
          const localProgress = (progress - colors[i].stop) / (colors[i + 1].stop - colors[i].stop);
          color = this.lerpColor(colors[i].color, colors[i + 1].color, localProgress);
          break;
        }
      }

      bgGraphics.fillStyle(color, 1);
      bgGraphics.fillRect(0, y, width, 1);
    }

    // 顶部光晕
    const topGlow = this.add.ellipse(width / 2, -100, width * 1.2, 400, 0x4a3a8a, 0.15);
    topGlow.setDepth(1);

    // 底部光晕
    const bottomGlow = this.add.ellipse(width / 2, height + 100, width * 1.2, 400, 0x2a4a6a, 0.1);
    bottomGlow.setDepth(1);

    // 中心光晕
    const centerGlow = this.add.ellipse(width / 2, height * 0.6, 600, 400, 0x3a2a6a, 0.08);
    centerGlow.setDepth(1);
  }

  /**
   * 颜色插值
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * 创建漂浮粒子效果
   */
  private createParticles(width: number, height: number): void {
    this.particleGraphics = this.add.graphics();
    this.particleGraphics.setDepth(2);

    const particleCount = Math.max(20, Math.min(50, Math.floor((width * height) / 40000)));
    const particleColors = [0x6a5acd, 0x9370db, 0x8a2be2, 0x4169e1, 0x00ced1];

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.3 - 0.1,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.1,
        color: particleColors[Math.floor(Math.random() * particleColors.length)]
      });
    }

    this.time.addEvent({
      delay: 16,
      callback: () => this.updateParticles(width, height),
      loop: true
    });
  }

  /**
   * 更新粒子位置
   */
  private updateParticles(width: number, height: number): void {
    if (!this.particleGraphics) return;

    this.particleGraphics.clear();

    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.y < -10) {
        particle.y = height + 10;
        particle.x = Math.random() * width;
      }
      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;

      this.particleGraphics.fillStyle(particle.color, particle.alpha * 0.3);
      this.particleGraphics.fillCircle(particle.x, particle.y, particle.size * 3);

      this.particleGraphics.fillStyle(particle.color, particle.alpha);
      this.particleGraphics.fillCircle(particle.x, particle.y, particle.size);
    }
  }

  /**
   * 创建浮动符号装饰
   */
  private createFloatingSymbols(width: number, height: number): void {
    const symbols = ['☯', '✧', '✦', '◇', '○', '☆', '❋', '✴'];
    const symbolCount = Math.max(6, Math.min(12, Math.floor((width * height) / 80000)));

    for (let i = 0; i < symbolCount; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.max(16, Math.round((Math.random() * 24 + 16) * this.sizes.scale));

      const text = this.add.text(x, y, symbol, {
        fontSize: `${size}px`,
        color: '#6a5acd'
      });
      text.setOrigin(0.5);
      text.setAlpha(Math.random() * 0.15 + 0.05);
      text.setDepth(3);

      // 缓慢浮动动画
      const floatDuration = 4000 + Math.random() * 4000;
      const floatDistance = 20 + Math.random() * 30;

      this.tweens.add({
        targets: text,
        y: y - floatDistance,
        duration: floatDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // 缓慢旋转
      this.tweens.add({
        targets: text,
        angle: Math.random() > 0.5 ? 360 : -360,
        duration: 10000 + Math.random() * 10000,
        repeat: -1,
        ease: 'Linear'
      });

      // 透明度呼吸
      this.tweens.add({
        targets: text,
        alpha: { from: text.alpha, to: text.alpha + 0.1 },
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.floatingSymbols.push(text);
    }
  }

  /**
   * 创建Logo区域
   */
  private createLogo(width: number, height: number): void {
    const center = this.getSafeAreaCenter();
    const safeRect = this.safeAreaManager?.getFinalSafeRect() ?? { y: 0, height };

    // Logo位置在安全区顶部
    const logoY = safeRect.y + 60 * this.sizes.scale;

    this.logoContainer = this.add.container(center.x, logoY);
    this.logoContainer.setDepth(8);

    // 外圈发光
    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(0x9370db, 0.1);
    outerGlow.fillCircle(0, 0, 55 * this.sizes.scale);

    // 中圈
    const middleRing = this.add.graphics();
    middleRing.lineStyle(2, 0x6a5acd, 0.4);
    middleRing.strokeCircle(0, 0, 45 * this.sizes.scale);

    // 内圈
    const innerRing = this.add.graphics();
    innerRing.fillStyle(0x1a1a2e, 0.9);
    innerRing.fillCircle(0, 0, 40 * this.sizes.scale);
    innerRing.lineStyle(2, 0x9370db, 0.6);
    innerRing.strokeCircle(0, 0, 40 * this.sizes.scale);

    // 太极符号
    const taijiSize = Math.max(28, Math.round(36 * this.sizes.scale));
    const taiji = this.add.text(0, 0, '☯', {
      fontSize: `${taijiSize}px`,
      color: '#d0c0f0'
    });
    taiji.setOrigin(0.5);

    this.logoContainer.add([outerGlow, middleRing, innerRing, taiji]);

    // 太极旋转
    this.tweens.add({
      targets: taiji,
      angle: 360,
      duration: 20000,
      repeat: -1,
      ease: 'Linear'
    });

    // 整体呼吸
    this.tweens.add({
      targets: this.logoContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 外圈发光脉冲
    this.tweens.add({
      targets: outerGlow,
      alpha: { from: 1, to: 0.5 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * 创建标题
   */
  private createTitle(width: number, height: number): void {
    const center = this.getSafeAreaCenter();
    const safeRect = this.safeAreaManager?.getFinalSafeRect() ?? { y: 0, height };

    // 标题位置（在Logo下方）
    const titleY = safeRect.y + 150 * this.sizes.scale + this.sizes.titleFontSize;

    // 标题发光效果
    this.titleGlow = this.add.text(center.x, titleY, '问道长生', {
      fontSize: `${this.sizes.titleFontSize}px`,
      color: '#9370db',
      fontFamily: 'serif',
      fontStyle: 'bold'
    });
    this.titleGlow.setOrigin(0.5);
    this.titleGlow.setAlpha(0.3);
    this.titleGlow.setDepth(5);

    // 主标题
    this.titleText = this.add.text(center.x, titleY, '问道长生', {
      fontSize: `${this.sizes.titleFontSize}px`,
      color: '#f0e6ff',
      fontFamily: 'serif',
      fontStyle: 'bold',
      stroke: '#2a1a4a',
      strokeThickness: Math.max(2, Math.round(4 * this.sizes.scale)),
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 8,
        stroke: true,
        fill: true
      }
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(6);

    // 标题呼吸动画
    this.tweens.add({
      targets: [this.titleText, this.titleGlow],
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 副标题
    const subtitleY = titleY + this.sizes.titleFontSize * 0.7;
    this.subtitleText = this.add.text(center.x, subtitleY, '- 修仙之路 从此开始 -', {
      fontSize: `${this.sizes.subtitleFontSize}px`,
      color: '#8a7aaa',
      fontFamily: 'serif',
      fontStyle: 'italic'
    });
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setDepth(6);

    // 装饰符号
    const symbolOffset = Math.min(200, this.sizes.buttonWidth + 60);
    const leftSymbol = this.add.text(center.x - symbolOffset, subtitleY, '✧', {
      fontSize: `${this.sizes.subtitleFontSize}px`,
      color: '#6a5acd'
    });
    leftSymbol.setOrigin(0.5);
    leftSymbol.setDepth(6);

    const rightSymbol = this.add.text(center.x + symbolOffset, subtitleY, '✧', {
      fontSize: `${this.sizes.subtitleFontSize}px`,
      color: '#6a5acd'
    });
    rightSymbol.setOrigin(0.5);
    rightSymbol.setDepth(6);

    // 符号旋转动画
    this.tweens.add({
      targets: [leftSymbol, rightSymbol],
      angle: 360,
      duration: 8000,
      repeat: -1,
      ease: 'Linear'
    });
  }

  /**
   * 创建画布渲染的按钮
   */
  private createCanvasButtons(width: number, height: number): void {
    const center = this.getSafeAreaCenter();
    const { buttonWidth, buttonHeight, buttonSpacing, buttonFontSize } = this.sizes;

    // 按钮区域Y位置
    const buttonAreaY = center.y + 60 * this.sizes.scale;

    // 登录按钮
    const loginX = center.x - buttonWidth / 2 - buttonSpacing / 2;
    this.loginButton = this.createStylishButton(
      loginX, buttonAreaY,
      buttonWidth, buttonHeight,
      '登 录',
      buttonFontSize,
      0x6a5acd, // 紫色
      () => this.openLoginModal(true)
    );
    this.loginButton.setDepth(10);

    // 注册按钮
    const registerX = center.x + buttonWidth / 2 + buttonSpacing / 2;
    this.registerButton = this.createStylishButton(
      registerX, buttonAreaY,
      buttonWidth, buttonHeight,
      '注 册',
      buttonFontSize,
      0x4a8a6a, // 绿色
      () => this.openLoginModal(false)
    );
    this.registerButton.setDepth(10);

    // "点击任意处开始游戏" 文字（初始隐藏）
    this.createClickToStartText(center.x, buttonAreaY);
  }

  /**
   * 创建精美按钮
   */
  private createStylishButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fontSize: number,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 外发光
    const glow = this.add.graphics();
    glow.fillStyle(color, 0.2);
    glow.fillRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 16);

    // 主背景
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);

    // 顶部高光
    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.15);
    highlight.fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height / 3, 8);

    // 边框
    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.3);
    border.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    // 文字
    const label = this.add.text(0, 0, text, {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    });
    label.setOrigin(0.5);

    container.add([glow, bg, highlight, border, label]);

    // 交互区域
    const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // 交互效果
    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2'
      });
      glow.clear();
      glow.fillStyle(color, 0.4);
      glow.fillRoundedRect(-width / 2 - 6, -height / 2 - 6, width + 12, height + 12, 18);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2'
      });
      glow.clear();
      glow.fillStyle(color, 0.2);
      glow.fillRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 16);
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        ease: 'Power2'
      });
    });

    hitArea.on('pointerup', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Back.easeOut',
        onComplete: () => onClick()
      });
    });

    return container;
  }

  /**
   * 创建"点击任意处开始游戏"文字
   */
  private createClickToStartText(x: number, y: number): void {
    const fontSize = Math.max(20, Math.round(28 * this.sizes.scale));

    // 发光效果
    this.clickToStartGlow = this.add.text(x, y, '点击任意处开始游戏', {
      fontSize: `${fontSize}px`,
      color: '#9370db',
      fontFamily: 'PingFang SC, Microsoft YaHei, serif',
      fontStyle: 'bold'
    });
    this.clickToStartGlow.setOrigin(0.5);
    this.clickToStartGlow.setDepth(10);
    this.clickToStartGlow.setAlpha(0);

    // 主文字
    this.clickToStartText = this.add.text(x, y, '点击任意处开始游戏', {
      fontSize: `${fontSize}px`,
      color: '#f0e6ff',
      fontFamily: 'PingFang SC, Microsoft YaHei, serif',
      fontStyle: 'bold',
      stroke: '#2a1a4a',
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#9370db',
        blur: 15,
        stroke: true,
        fill: true
      }
    });
    this.clickToStartText.setOrigin(0.5);
    this.clickToStartText.setDepth(10);
    this.clickToStartText.setAlpha(0);
  }

  /**
   * 显示"点击任意处开始游戏"
   */
  private showClickToStart(): void {
    // 隐藏按钮
    if (this.loginButton) {
      this.tweens.add({
        targets: this.loginButton,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 300,
        ease: 'Power2',
        onComplete: () => this.loginButton?.setVisible(false)
      });
    }
    if (this.registerButton) {
      this.tweens.add({
        targets: this.registerButton,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 300,
        ease: 'Power2',
        onComplete: () => this.registerButton?.setVisible(false)
      });
    }

    // 显示点击开始文字
    if (this.clickToStartText && this.clickToStartGlow) {
      this.clickToStartText.setAlpha(0);
      this.clickToStartGlow.setAlpha(0);

      // 淡入动画
      this.tweens.add({
        targets: this.clickToStartText,
        alpha: 1,
        duration: 500,
        delay: 300,
        ease: 'Power2'
      });

      // 呼吸动画
      this.tweens.add({
        targets: [this.clickToStartText, this.clickToStartGlow],
        alpha: { from: 0.6, to: 1 },
        scaleX: { from: 1, to: 1.02 },
        scaleY: { from: 1, to: 1.02 },
        duration: 1200,
        delay: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // 发光脉冲
      this.tweens.add({
        targets: this.clickToStartGlow,
        alpha: { from: 0, to: 0.4 },
        duration: 1200,
        delay: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 设置全屏点击
    this.input.once('pointerdown', () => {
      this.startGame();
    });

    // 键盘支持
    this.input.keyboard?.once('keydown', () => {
      this.startGame();
    });
  }

  /**
   * 开始游戏
   */
  private startGame(): void {
    // 播放退出动画
    this.tweens.add({
      targets: [this.logoContainer, this.titleText, this.titleGlow, this.subtitleText, this.clickToStartText, this.clickToStartGlow],
      alpha: 0,
      y: `-=${30 * this.sizes.scale}`,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.navigateToNextScene();
      }
    });
  }

  /**
   * 打开登录弹窗（使用后端返回的完整HTML页面）
   */
  private async openLoginModal(isLogin: boolean): Promise<void> {
    if (this.loginModal) return;

    this.loginModal = new LoginModalIframe({
      onLoginSuccess: (gameState) => {
        console.log('Login success, gameState:', gameState);
        this.isLoggedIn = true;
        this.gameState = gameState;
        this.loginModal = undefined;
        this.showClickToStart();
      },
      onRegisterSuccess: () => {
        console.log('Register success');
        this.isLoggedIn = true;
        this.gameState = null; // 新注册用户无角色
        this.loginModal = undefined;
        this.showClickToStart();
      },
      onClose: () => {
        this.loginModal = undefined;
      }
    });

    try {
      await this.loginModal.show(isLogin);
    } catch (error) {
      console.error('Failed to show login modal:', error);
      this.loginModal = undefined;
    }
  }

  /**
   * 创建版本信息
   */
  private createVersionInfo(width: number, height: number): void {
    const safeRect = this.safeAreaManager?.getFinalSafeRect() ?? { y: 0, height };
    const bottomY = safeRect.y + safeRect.height - 30 * this.sizes.scale;

    const versionText = this.add.text(width / 2, bottomY, 'Phaser 3 Client v1.0.0', {
      fontSize: `${Math.max(14, Math.round(16 * this.sizes.scale))}px`,
      color: '#505070'
    });
    versionText.setOrigin(0.5);
    versionText.setDepth(5);

    // 底部装饰线
    const lineWidth = Math.min(200, this.sizes.buttonWidth * 1.5);
    const bottomLine = this.add.graphics();
    bottomLine.lineStyle(1, 0x4a3a6a, 0.3);
    bottomLine.lineBetween(width / 2 - lineWidth / 2, bottomY - 20, width / 2 + lineWidth / 2, bottomY - 20);
    bottomLine.setDepth(5);
  }

  /**
   * 入场动画
   */
  private playEntranceAnimation(): void {
    // Logo从上方落入
    if (this.logoContainer) {
      const originalY = this.logoContainer.y;
      this.logoContainer.setY(originalY - 80 * this.sizes.scale);
      this.logoContainer.setAlpha(0);
      this.logoContainer.setScale(0.5);
      this.tweens.add({
        targets: this.logoContainer,
        y: originalY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 600,
        ease: 'Back.easeOut'
      });
    }

    if (this.titleText) {
      const originalY = this.titleText.y;
      this.titleText.setY(originalY - 100 * this.sizes.scale);
      this.titleText.setAlpha(0);
      this.tweens.add({
        targets: this.titleText,
        y: originalY,
        alpha: 1,
        duration: 800,
        delay: 200,
        ease: 'Back.easeOut'
      });
    }

    if (this.titleGlow) {
      const originalY = this.titleGlow.y;
      this.titleGlow.setY(originalY - 100 * this.sizes.scale);
      this.titleGlow.setAlpha(0);
      this.tweens.add({
        targets: this.titleGlow,
        y: originalY,
        alpha: 0.3,
        duration: 800,
        delay: 200,
        ease: 'Back.easeOut'
      });
    }

    if (this.subtitleText) {
      this.subtitleText.setAlpha(0);
      this.tweens.add({
        targets: this.subtitleText,
        alpha: 1,
        duration: 600,
        delay: 500,
        ease: 'Power2'
      });
    }

    // 按钮从下方滑入
    const buttons = [this.loginButton, this.registerButton];
    buttons.forEach((button, index) => {
      if (button) {
        const originalY = button.y;
        button.setY(originalY + 50 * this.sizes.scale);
        button.setAlpha(0);
        this.tweens.add({
          targets: button,
          y: originalY,
          alpha: 1,
          duration: 500,
          delay: 600 + index * 100,
          ease: 'Back.easeOut'
        });
      }
    });
  }

  /**
   * 导航到下一个场景
   */
  private navigateToNextScene(): void {
    if (!this.gameState || !this.gameState.name) {
      this.scene.start(SCENE_KEYS.CHARACTER_CREATE);
    } else {
      this.scene.start(SCENE_KEYS.MAIN);
    }
  }

  /**
   * 场景销毁时清理
   */
  shutdown(): void {
    this.particles = [];
    this.floatingSymbols = [];
    this.loginModal?.destroy();
    this.loginModal = undefined;
    super.shutdown();
  }
}
