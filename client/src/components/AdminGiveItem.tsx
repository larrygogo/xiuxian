import { useState, FormEvent } from 'react';
import { gameAPI } from '../services/api';
import type { AxiosError } from 'axios';
import styles from './AdminGiveItem.module.css';

interface AdminGiveItemProps {
  onSuccess?: () => void;
}

interface ApiError {
  error?: string;
}

export function AdminGiveItem({ onSuccess }: AdminGiveItemProps) {
  const [activeTab, setActiveTab] = useState<'item' | 'exp'>('item');
  
  // 物品相关状态
  const [targetId, setTargetId] = useState('');
  const [itemType, setItemType] = useState<string>('');
  const [slot, setSlot] = useState<string>('');
  const [level, setLevel] = useState('');
  
  // 经验相关状态
  const [expTargetId, setExpTargetId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleItemSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const idValue = parseInt(targetId, 10);
      if (isNaN(idValue) || idValue <= 0) {
        setError('请输入有效的ID');
        setLoading(false);
        return;
      }

      const payload: {
        targetCharacterId: number;
        itemType?: string;
        slot?: string;
        level?: number;
      } = {
        targetCharacterId: idValue
      };

      if (itemType) payload.itemType = itemType;
      if (slot) payload.slot = slot;
      if (level) payload.level = parseInt(level, 10);

      const response = await gameAPI.giveItem(payload);
      const data = response.data as { message?: string; item?: { name: string } };
      
      setSuccess(data.message || `成功赠送 ${data.item?.name || '物品'}`);
      setTargetId('');
      setItemType('');
      setSlot('');
      setLevel('');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '赠送物品失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const idValue = parseInt(expTargetId, 10);
      if (isNaN(idValue) || idValue <= 0) {
        setError('请输入有效的ID');
        setLoading(false);
        return;
      }

      const amountValue = parseInt(expAmount, 10);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('请输入有效的经验数量');
        setLoading(false);
        return;
      }

      const payload: {
        targetCharacterId: number;
        amount: number;
      } = {
        targetCharacterId: idValue,
        amount: amountValue
      };

      const response = await gameAPI.giveExp(payload);
      const data = response.data as { message?: string; exp?: { old: number; new: number; added: number } };
      
      setSuccess(data.message || `成功赠送 ${amountValue} 点经验`);
      setExpTargetId('');
      setExpAmount('');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '赠送经验失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['admin-panel']}>
      <div className={styles['admin-tabs']}>
        <button
          type="button"
          className={`${styles['admin-tab']} ${activeTab === 'item' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('item')}
        >
          赠送物品
        </button>
        <button
          type="button"
          className={`${styles['admin-tab']} ${activeTab === 'exp' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('exp')}
        >
          赠送经验
        </button>
      </div>

      {activeTab === 'item' ? (
        <form onSubmit={handleItemSubmit} className={styles['admin-give-item-form']}>
      <div className={styles['form-group']}>
        <label htmlFor="targetId">目标角色ID *</label>
        <input
          id="targetId"
          type="number"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          required
          min="1"
          placeholder="输入角色ID"
        />
      </div>

      <div className={styles['form-group']}>
        <label htmlFor="itemType">物品类型</label>
        <select
          id="itemType"
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
        >
          <option value="">随机</option>
          <option value="equipment">装备</option>
          <option value="consumable">消耗品</option>
          <option value="material">材料</option>
        </select>
      </div>

      {itemType === 'equipment' && (
        <div className={styles['form-group']}>
          <label htmlFor="slot">装备槽位</label>
          <select
            id="slot"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
          >
            <option value="">随机</option>
            <option value="weapon">武器</option>
            <option value="helmet">头盔</option>
            <option value="armor">护甲</option>
            <option value="leggings">护腿</option>
            <option value="boots">靴子</option>
            <option value="accessory">饰品</option>
          </select>
        </div>
      )}

      <div className={styles['form-group']}>
        <label htmlFor="level">装备等级段</label>
        <select
          id="level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">使用目标用户等级</option>
          <option value="1">1级</option>
          <option value="5">5级</option>
          <option value="10">10级</option>
          <option value="15">15级</option>
          <option value="20">20级</option>
          <option value="25">25级</option>
          <option value="30">30级</option>
          <option value="35">35级</option>
          <option value="40">40级</option>
          <option value="45">45级</option>
          <option value="50">50级</option>
          <option value="55">55级</option>
          <option value="60">60级</option>
          <option value="65">65级</option>
          <option value="70">70级</option>
          <option value="75">75级</option>
          <option value="80">80级</option>
          <option value="85">85级</option>
          <option value="90">90级</option>
          <option value="95">95级</option>
          <option value="100">100级</option>
        </select>
      </div>

      {error && <div className={styles['error-message']}>{error}</div>}
      {success && <div className={styles['success-message']}>{success}</div>}

          <button type="submit" disabled={loading} className={styles['submit-button']}>
            {loading ? '赠送中...' : '赠送物品'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleExpSubmit} className={styles['admin-give-item-form']}>
          <div className={styles['form-group']}>
            <label htmlFor="expTargetId">目标角色ID *</label>
            <input
              id="expTargetId"
              type="number"
              value={expTargetId}
              onChange={(e) => setExpTargetId(e.target.value)}
              required
              min="1"
              placeholder="输入角色ID"
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="expAmount">经验数量（灵气） *</label>
            <input
              id="expAmount"
              type="number"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              required
              min="1"
              placeholder="输入要赠送的经验数量"
            />
          </div>

          {error && <div className={styles['error-message']}>{error}</div>}
          {success && <div className={styles['success-message']}>{success}</div>}

          <button type="submit" disabled={loading} className={styles['submit-button']}>
            {loading ? '赠送中...' : '赠送经验'}
          </button>
        </form>
      )}
    </div>
  );
}
