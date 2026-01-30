/**
 * Toast/消息通知管理器
 * 提供 toast、confirm、alert 功能
 */

import Phaser from 'phaser';
import { COLORS } from '@/config/constants';

export type ToastLevel = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  level?: ToastLevel;
  durationMs?: number;
}

export interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface AlertOptions {
  title?: string;
  okText?: string;
}

interface ToastItem {
  id: string;
  text: string;
  level: ToastLevel;
  container: Phaser.GameObjects.Container;
  timer: Phaser.Time.TimerEvent;
}

/**
 * ToastManager 单例
 */
class ToastManagerClass {
  private scene: Phaser.Scene | null = null;
  private toasts: ToastItem[] = [];
  private toastContainer: Phaser.GameObjects.Container | null = null;
  private modalContainer: Phaser.GameObjects.Container | null = null;

  // 模态框状态
  private confirmResolver: ((value: boolean) => void) | null = null;
  private alertResolver: (() => void) | null = null;
  private isConfirmOpen: boolean = false;
  private isAlertOpen: boolean = false;

  /**
   * 初始化
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.createContainers();
  }

  /**
   * 创建容器
   */
  private createContainers(): void {
    if (!this.scene) return;

    // Toast 容器（顶部居中）
    this.toastContainer = this.scene.add.container(
      this.scene.scale.gameSize.width / 2,
      50
    );
    this.toastContainer.setDepth(10000);

    // 模态框容器
    this.modalContainer = this.scene.add.container(0, 0);
    this.modalContainer.setDepth(10001);
    this.modalContainer.setVisible(false);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /**
   * 获取 Toast 颜色
   */
  private getToastColor(level: ToastLevel): { bg: number; border: number } {
    switch (level) {
      case 'success':
        return { bg: 0x1b5e20, border: 0x2e7d32 };
      case 'warning':
        return { bg: 0xe65100, border: 0xf57c00 };
      case 'error':
        return { bg: 0xb71c1c, border: 0xd32f2f };
      default:
        return { bg: 0x1565c0, border: 0x1976d2 };
    }
  }

  /**
   * 显示 Toast
   */
  toast(text: string, options?: ToastOptions): void {
    if (!this.scene || !this.toastContainer) return;

    const level = options?.level ?? 'info';
    const durationMs = options?.durationMs ?? 2200;
    const id = this.generateId();

    // 创建 Toast 容器
    const container = this.scene.add.container(0, 0);
    const colors = this.getToastColor(level);

    // 创建文本先计算宽度
    const textObj = this.scene.add.text(0, 0, text, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      wordWrap: { width: 350 }
    });
    textObj.setOrigin(0.5);

    // 背景
    const padding = 16;
    const width = Math.max(180, textObj.width + padding * 2);
    const height = textObj.height + padding;

    const bg = this.scene.add.rectangle(0, 0, width, height, colors.bg, 0.95);
    bg.setStrokeStyle(2, colors.border, 1);

    container.add([bg, textObj]);

    // 添加到容器
    this.toastContainer.add(container);

    // 动画入场
    container.setAlpha(0);
    container.setY(-30);

    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      y: this.toasts.length * 50,
      duration: 200,
      ease: 'Back.easeOut'
    });

    // 创建定时器
    const timer = this.scene.time.delayedCall(durationMs, () => {
      this.removeToast(id);
    });

    // 保存 Toast
    const toast: ToastItem = { id, text, level, container, timer };
    this.toasts.push(toast);

    // 更新其他 Toast 位置
    this.updateToastPositions();
  }

  /**
   * 移除 Toast
   */
  private removeToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index === -1 || !this.scene) return;

    const toast = this.toasts[index];

    // 动画退出
    this.scene.tweens.add({
      targets: toast.container,
      alpha: 0,
      y: toast.container.y - 20,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        toast.container.destroy();
        toast.timer.destroy();
      }
    });

    this.toasts.splice(index, 1);
    this.updateToastPositions();
  }

  /**
   * 更新 Toast 位置
   */
  private updateToastPositions(): void {
    if (!this.scene) return;

    this.toasts.forEach((toast, index) => {
      this.scene!.tweens.add({
        targets: toast.container,
        y: index * 50,
        duration: 150,
        ease: 'Power2'
      });
    });
  }

  /**
   * 显示确认框
   */
  confirm(body: string, options?: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConfirmOpen || !this.scene || !this.modalContainer) {
        resolve(false);
        return;
      }

      this.isConfirmOpen = true;
      this.confirmResolver = resolve;

      const title = options?.title ?? '确认';
      const okText = options?.okText ?? '确定';
      const cancelText = options?.cancelText ?? '取消';
      const danger = options?.danger ?? false;

      this.showModal(title, body, [
        {
          text: cancelText,
          primary: false,
          onClick: () => this.closeConfirm(false)
        },
        {
          text: okText,
          primary: true,
          danger,
          onClick: () => this.closeConfirm(true)
        }
      ]);
    });
  }

  /**
   * 关闭确认框
   */
  private closeConfirm(result: boolean): void {
    this.hideModal();
    this.isConfirmOpen = false;
    this.confirmResolver?.(result);
    this.confirmResolver = null;
  }

  /**
   * 显示警告框
   */
  alert(body: string, options?: AlertOptions): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAlertOpen || !this.scene || !this.modalContainer) {
        resolve();
        return;
      }

      this.isAlertOpen = true;
      this.alertResolver = resolve;

      const title = options?.title ?? '提示';
      const okText = options?.okText ?? '知道了';

      this.showModal(title, body, [
        {
          text: okText,
          primary: true,
          onClick: () => this.closeAlert()
        }
      ]);
    });
  }

  /**
   * 关闭警告框
   */
  private closeAlert(): void {
    this.hideModal();
    this.isAlertOpen = false;
    this.alertResolver?.();
    this.alertResolver = null;
  }

  /**
   * 显示模态框
   */
  private showModal(
    title: string,
    body: string,
    buttons: Array<{
      text: string;
      primary: boolean;
      danger?: boolean;
      onClick: () => void;
    }>
  ): void {
    if (!this.scene || !this.modalContainer) return;

    this.modalContainer.removeAll(true);

    const screenWidth = this.scene.scale.gameSize.width;
    const screenHeight = this.scene.scale.gameSize.height;

    // 遮罩
    const mask = this.scene.add.rectangle(
      screenWidth / 2,
      screenHeight / 2,
      screenWidth,
      screenHeight,
      0x000000,
      0.5
    );
    mask.setInteractive();
    this.modalContainer.add(mask);

    // 模态框背景
    const modalWidth = 320;
    const modalHeight = 180;
    const modalX = screenWidth / 2;
    const modalY = screenHeight / 2;

    const modalBg = this.scene.add.rectangle(
      modalX,
      modalY,
      modalWidth,
      modalHeight,
      COLORS.dark,
      0.98
    );
    modalBg.setStrokeStyle(2, COLORS.light, 0.3);
    this.modalContainer.add(modalBg);

    // 标题
    const titleText = this.scene.add.text(
      modalX,
      modalY - modalHeight / 2 + 25,
      title,
      {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }
    );
    titleText.setOrigin(0.5);
    this.modalContainer.add(titleText);

    // 内容
    const bodyText = this.scene.add.text(
      modalX,
      modalY - 10,
      body,
      {
        fontSize: '22px',
        color: '#cccccc',
        fontFamily: 'Arial, sans-serif',
        wordWrap: { width: modalWidth - 40 },
        align: 'center'
      }
    );
    bodyText.setOrigin(0.5);
    this.modalContainer.add(bodyText);

    // 按钮
    const buttonY = modalY + modalHeight / 2 - 35;
    const buttonWidth = 80;
    const buttonHeight = 35;
    const buttonGap = 15;
    const totalButtonWidth = buttons.length * buttonWidth + (buttons.length - 1) * buttonGap;
    const buttonStartX = modalX - totalButtonWidth / 2 + buttonWidth / 2;

    buttons.forEach((btn, index) => {
      const x = buttonStartX + index * (buttonWidth + buttonGap);

      const buttonBg = this.scene!.add.rectangle(
        x,
        buttonY,
        buttonWidth,
        buttonHeight,
        btn.danger ? COLORS.danger : btn.primary ? COLORS.primary : 0x555555,
        1
      );
      buttonBg.setStrokeStyle(1, 0xffffff, 0.2);
      buttonBg.setInteractive({ useHandCursor: true });

      buttonBg.on('pointerover', () => {
        buttonBg.setAlpha(0.8);
      });

      buttonBg.on('pointerout', () => {
        buttonBg.setAlpha(1);
      });

      buttonBg.on('pointerdown', () => {
        btn.onClick();
      });

      this.modalContainer!.add(buttonBg);

      const buttonText = this.scene!.add.text(x, buttonY, btn.text, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: btn.primary ? 'bold' : 'normal'
      });
      buttonText.setOrigin(0.5);
      this.modalContainer!.add(buttonText);
    });

    // 显示模态框
    this.modalContainer.setVisible(true);
    this.modalContainer.setAlpha(0);

    this.scene.tweens.add({
      targets: this.modalContainer,
      alpha: 1,
      duration: 150,
      ease: 'Power2'
    });
  }

  /**
   * 隐藏模态框
   */
  private hideModal(): void {
    if (!this.scene || !this.modalContainer) return;

    this.scene.tweens.add({
      targets: this.modalContainer,
      alpha: 0,
      duration: 100,
      ease: 'Power2',
      onComplete: () => {
        this.modalContainer?.setVisible(false);
        this.modalContainer?.removeAll(true);
      }
    });
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.toasts.forEach(toast => {
      toast.container.destroy();
      toast.timer.destroy();
    });
    this.toasts = [];

    this.toastContainer?.destroy();
    this.modalContainer?.destroy();

    this.toastContainer = null;
    this.modalContainer = null;
    this.scene = null;
  }
}

// 导出单例
export const toastManager = new ToastManagerClass();
