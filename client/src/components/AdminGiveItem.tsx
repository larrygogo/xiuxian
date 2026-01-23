import { useEffect, useState, FormEvent } from 'react';
import { gameAPI } from '../services/api';
import type { AxiosError } from 'axios';
import { SLOT_NAMES } from '../types/item';
import styles from './AdminGiveItem.module.css';

interface AdminGiveItemProps {
  onSuccess?: () => void;
}

interface ApiError {
  error?: string;
}

interface EquipmentTemplate {
  templateId: string;
  name: string;
  slot: keyof typeof SLOT_NAMES;
  requiredLevel?: number;
}

interface ItemTemplatesResponse {
  templates?: {
    equipment: EquipmentTemplate[];
  };
}

function getRequiredLevelFromTemplateId(templateId: string): number {
  const match = templateId.match(/_(\d{3})$/);
  if (!match) return 1;
  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed === 1 ? 0 : parsed;
}

export function AdminGiveItem({ onSuccess }: AdminGiveItemProps) {
  const [activeTab, setActiveTab] = useState<'item' | 'exp'>('item');
  
  // 物品相关状态
  const [targetId, setTargetId] = useState('');
  const [itemType, setItemType] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [equipmentTemplates, setEquipmentTemplates] = useState<EquipmentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isCrafted, setIsCrafted] = useState(false);
  
  // 经验相关状态
  const [expTargetId, setExpTargetId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (itemType !== 'equipment' || equipmentTemplates.length > 0 || templatesLoading) return;
    setTemplatesLoading(true);
    gameAPI.getItemTemplates()
      .then((response) => {
        const data = response.data as ItemTemplatesResponse;
        const templates = data.templates?.equipment || [];
        const normalized = templates.map((template) => ({
          ...template,
          requiredLevel: template.requiredLevel ?? getRequiredLevelFromTemplateId(template.templateId)
        }));
        normalized.sort((a, b) => {
          const levelDiff = (a.requiredLevel ?? 1) - (b.requiredLevel ?? 1);
          if (levelDiff !== 0) return levelDiff;
          return a.name.localeCompare(b.name, 'zh-Hans-CN');
        });
        setEquipmentTemplates(normalized);
      })
      .catch(() => {
        setEquipmentTemplates([]);
      })
      .finally(() => {
        setTemplatesLoading(false);
      });
  }, [equipmentTemplates.length, itemType, templatesLoading]);

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
        templateId?: string;
        crafted?: boolean;
      } = {
        targetCharacterId: idValue
      };

      if (itemType) payload.itemType = itemType;
      if (templateId) payload.templateId = templateId;
      if (itemType === 'equipment') payload.crafted = isCrafted;

      const response = await gameAPI.giveItem(payload);
      const data = response.data as { message?: string; item?: { name: string } };
      
      setSuccess(data.message || `成功赠送 ${data.item?.name || '物品'}`);
      
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
          type="text"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          required
          placeholder="输入角色ID"
        />
      </div>

      <div className={styles['form-group']}>
        <label htmlFor="itemType">物品类型</label>
        <select
          id="itemType"
          value={itemType}
          onChange={(e) => {
            setItemType(e.target.value);
            setTemplateId('');
            setIsCrafted(false);
          }}
        >
          <option value="">随机</option>
          <option value="equipment">装备</option>
          <option value="consumable">消耗品</option>
          <option value="material">材料</option>
        </select>
      </div>

      {itemType === 'equipment' && (
        <>
          <div className={styles['form-group']}>
            <label htmlFor="templateId">装备列表</label>
            <select
              id="templateId"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={templatesLoading}
            >
              <option value="">随机装备</option>
              {equipmentTemplates.map((template) => (
                <option key={template.templateId} value={template.templateId}>
                  {template.name}（{SLOT_NAMES[template.slot]} / 需求{template.requiredLevel ?? 1}级）
                </option>
              ))}
            </select>
          </div>
          <div className={styles['form-group']}>
            <label htmlFor="isCrafted" className={styles['checkbox-label']}>
              <input
                id="isCrafted"
                type="checkbox"
                checked={isCrafted}
                onChange={(e) => setIsCrafted(e.target.checked)}
                className={styles['checkbox-input']}
              />
              是否打造装备
            </label>
          </div>
        </>
      )}

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
              type="text"
              value={expTargetId}
              onChange={(e) => setExpTargetId(e.target.value)}
              required
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
