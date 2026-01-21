import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Item, Equipment, Consumable } from '../types/item';
import { isEquipment, isConsumable, SLOT_NAMES } from '../types/item';
import styles from './ItemCard.module.css';

interface ItemCardProps {
  item: Item;
  onEquip?: (itemId: string) => void;
  onUse?: (itemId: string) => void;
  onUnequip?: (slot: string) => void;
  isEquipped?: boolean;
  slot?: string;
  onClick?: (e?: React.MouseEvent) => void;
  onRightClick?: (e?: React.MouseEvent) => void;
  className?: string;
  playerLevel?: number; // 玩家当前等级，用于判断是否可以装备
}

// 获取物品图标字符（基于类型）
function getItemIcon(item: Item): string {
  if (isEquipment(item)) {
    const slot = item.slot;
    const icons: Record<string, string> = {
      weapon: '⚔️',
      helmet: '⛑️',
      armor: '🛡️',
      leggings: '👖',
      boots: '👢',
      accessory: '💍'
    };
    return icons[slot] || '📦';
  }
  if (isConsumable(item)) {
    return '🧪';
  }
  return '💎';
}

export function ItemCard({ item, onEquip, onUse, onUnequip, isEquipped, slot, onClick, onRightClick, className, playerLevel }: ItemCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleClick = (e: React.MouseEvent) => {
    console.log('ItemCard handleClick 被调用, item:', item.name, 'onClick存在:', !!onClick);
    e.stopPropagation();
    if (onClick) {
      console.log('调用 onClick');
      onClick(e);
      return;
    }
    // 如果没有onClick，使用默认行为
    if (isEquipment(item) && onEquip) {
      onEquip(item.id);
    } else if (isConsumable(item) && onUse) {
      onUse(item.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    console.log('ItemCard handleContextMenu 被调用, item:', item.name, 'onRightClick存在:', !!onRightClick);
    e.preventDefault();
    e.stopPropagation();
    if (onRightClick) {
      console.log('调用 onRightClick');
      onRightClick(e);
      return;
    }
    // 如果没有onRightClick，使用默认行为（用于装备栏）
    if (isEquipped && onUnequip && slot) {
      onUnequip(slot);
    } else if (isConsumable(item) && onUse) {
      onUse(item.id);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    setShowTooltip(true);
    updateTooltipPosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showTooltip) {
      updateTooltipPosition(e);
    }
  };

  const updateTooltipPosition = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 250; // 预估工具提示宽度
    const tooltipHeight = 200; // 预估工具提示高度
    const spacing = 10;
    
    let x = rect.right + spacing;
    let y = rect.top;
    
    // 如果右侧空间不足，显示在左侧
    if (x + tooltipWidth > window.innerWidth) {
      x = rect.left - tooltipWidth - spacing;
    }
    
    // 如果下方空间不足，向上调整
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - spacing;
    }
    
    // 确保不超出左边界和上边界
    x = Math.max(spacing, x);
    y = Math.max(spacing, y);
    
    setTooltipPosition({ x, y });
  };

  const renderStats = () => {
    if (!isEquipment(item)) return null;

    const equipment = item as Equipment;
    const stats: string[] = [];

    if (equipment.baseStats) {
      Object.entries(equipment.baseStats).forEach(([key, value]) => {
        if (value && value > 0) {
          const statNames: Record<string, string> = {
            str: '力道',
            agi: '身法',
            vit: '体魄',
            int: '灵识',
            spi: '根骨'
          };
          stats.push(`${statNames[key] || key} +${value}`);
        }
      });
    }

    if (equipment.combatStats) {
      Object.entries(equipment.combatStats).forEach(([key, value]) => {
        // 跳过无效值
        if (!value || value <= 0) return;
        const statNames: Record<string, string> = {
          hit: '命中',
          pdmg: '物伤',
          pdef: '物防',
          spd: '速度',
          mdmg: '法伤',
          mdef: '法防',
          maxHp: '生命上限',
          maxMp: '法力上限'
        };
        stats.push(`${statNames[key] || key} +${value}`);
      });
    }

    return stats.length > 0 ? (
      <div className={styles['item-stats']}>
        {stats.map((stat, idx) => (
          <div key={idx} className={styles['item-stat']}>{stat}</div>
        ))}
      </div>
    ) : null;
  };

  const renderEffect = () => {
    if (!isConsumable(item)) return null;

    const consumable = item as Consumable;
    const effect = consumable.effect;

    if (effect.type === 'heal' && effect.value) {
      return <div className={styles['item-effect']}>恢复生命 +{effect.value}</div>;
    }
    if (effect.type === 'mana' && effect.value) {
      return <div className={styles['item-effect']}>恢复法力 +{effect.value}</div>;
    }
    if (effect.type === 'buff') {
      return <div className={styles['item-effect']}>临时增益效果</div>;
    }

    return null;
  };

  const tooltipContent = showTooltip ? (
    <div
      className={styles['item-tooltip']}
      style={{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`
      }}
    >
      <div className={styles['tooltip-header']}>
        <span className={styles['tooltip-name']}>
          {item.name}
        </span>
      </div>
      <div className={styles['tooltip-level']}>等级 {item.level}</div>
      {isEquipment(item) && (
        <>
          <div className={styles['tooltip-slot']}>槽位: {SLOT_NAMES[item.slot]}</div>
          <div className={styles['tooltip-required-level']}>
            需求等级: {item.requiredLevel}
            {playerLevel !== undefined && playerLevel < item.requiredLevel && (
              <span className={styles['tooltip-level-warning']}> (等级不足)</span>
            )}
          </div>
        </>
      )}
      {isConsumable(item) && item.stackSize > 1 && (
        <div className={styles['tooltip-stack']}>堆叠: {item.stackSize}</div>
      )}
      {renderStats()}
      {renderEffect()}
      {item.description && (
        <div className={styles['tooltip-description']}>{item.description}</div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div
        className={`${styles['item-card']} ${isEquipped ? styles['equipped'] : ''} ${className || ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={styles['item-icon']}>{getItemIcon(item)}</div>
        {isConsumable(item) && item.stackSize > 1 && (
          <div className={styles['item-stack']}>x{item.stackSize}</div>
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
}
