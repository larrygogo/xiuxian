/**
 * 场景确认弹窗组件
 * 用于确认进入场景前的二次确认
 * 继承 BaseModal 实现模态弹窗功能
 */

import { BaseModal, BaseModalConfig } from '@/ui/core/BaseModal';
import { UIText } from '@/ui/core/UIText';
import { UIButton } from '@/ui/core/UIButton';
import { COLORS } from '@/config/constants';

export interface SceneConfirmModalConfig {
  scene: Phaser.Scene;
  sceneName: string;
  levelRange: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export class SceneConfirmModal extends BaseModal {
  private businessConfig: SceneConfirmModalConfig;

  // UI 元素
  private titleText!: UIText;
  private contentText!: UIText;
  private confirmBtn!: UIButton;
  private cancelBtn!: UIButton;

  constructor(config: SceneConfirmModalConfig) {
    const modalConfig: BaseModalConfig = {
      scene: config.scene,
      width: 600,
      height: 750,
      maskColor: 0x000000,
      maskAlpha: 0.7,
      closeOnMaskClick: true,
      depth: 2000,
      backgroundImage: 'modalScrollBg'
    };

    // 先保存业务配置，供 createContent 使用
    // 注意：此时还不能使用 this，所以用临时变量
    (config.scene as any).__tempSceneConfirmConfig = config;

    super(modalConfig);

    this.businessConfig = config;

    // 清理临时变量
    delete (config.scene as any).__tempSceneConfirmConfig;
  }

  /**
   * 创建弹窗内容（BaseModal 抽象方法实现）
   */
  protected createContent(): void {
    // 从临时变量获取配置（因为此时 this.businessConfig 还未赋值）
    const config = (this.scene as any).__tempSceneConfirmConfig as SceneConfirmModalConfig;

    const container = this.getModalContainer();

    // 创建标题
    this.titleText = new UIText(
      this.scene,
      0,
      -120,
      '确认进入',
      {
        fontSize: '28px',
        color: '#5d4e37',
        fontStyle: 'bold'
      }
    );
    this.titleText.setOrigin(0.5);
    container.add(this.titleText);

    // 创建内容
    this.contentText = new UIText(
      this.scene,
      0,
      -20,
      `确定要进入【${config.sceneName}】吗？\n\n推荐等级: ${config.levelRange}`,
      {
        fontSize: '24px',
        color: '#6b5c4a',
        align: 'center'
      }
    );
    this.contentText.setOrigin(0.5);
    container.add(this.contentText);

    // 创建确认按钮
    this.confirmBtn = new UIButton({
      scene: this.scene,
      x: -80,
      y: 100,
      width: 120,
      height: 45,
      text: '确认',
      textStyle: { fontSize: '18px' },
      onClick: () => this.handleConfirm()
    });
    this.confirmBtn.setColor(COLORS.success);
    container.add(this.confirmBtn);

    // 创建取消按钮
    this.cancelBtn = new UIButton({
      scene: this.scene,
      x: 80,
      y: 100,
      width: 120,
      height: 45,
      text: '取消',
      textStyle: { fontSize: '18px' },
      onClick: () => this.handleCancel()
    });
    this.cancelBtn.setColor(COLORS.dark);
    container.add(this.cancelBtn);
  }

  /**
   * 处理确认
   */
  private handleConfirm(): void {
    this.hide();
    this.businessConfig.onConfirm();
  }

  /**
   * 处理取消
   */
  private handleCancel(): void {
    this.hide();
    this.businessConfig.onCancel?.();
  }

  /**
   * 隐藏后的钩子（自动销毁）
   */
  protected onAfterHide(): void {
    this.destroy();
  }
}
