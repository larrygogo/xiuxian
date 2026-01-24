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

interface ConsumableTemplate {
  templateId: string;
  name: string;
  description?: string;
  maxStack: number;
}

interface MaterialTemplate {
  templateId: string;
  name: string;
  description?: string;
  level?: number;
}

interface ItemTemplatesResponse {
  templates?: {
    equipment: EquipmentTemplate[];
    consumables: ConsumableTemplate[];
    materials: MaterialTemplate[];
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
  const [activeTab, setActiveTab] = useState<'item' | 'exp' | 'level'>('item');
  
  // 物品相关状态
  const [targetId, setTargetId] = useState('');
  const [itemType, setItemType] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [equipmentTemplates, setEquipmentTemplates] = useState<EquipmentTemplate[]>([]);
  const [consumableTemplates, setConsumableTemplates] = useState<ConsumableTemplate[]>([]);
  const [materialTemplates, setMaterialTemplates] = useState<MaterialTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isCrafted, setIsCrafted] = useState(false);
  const [consumableList, setConsumableList] = useState<Array<{ templateId: string; quantity: string }>>([
    { templateId: '', quantity: '1' }
  ]);
  const [materialList, setMaterialList] = useState<Array<{ templateId: string; quantity: string }>>([
    { templateId: '', quantity: '1' }
  ]);
  const [lingshiAmount, setLingshiAmount] = useState('100');
  
  // 经验相关状态
  const [expTargetId, setExpTargetId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  
  // 等级相关状态
  const [levelTargetId, setLevelTargetId] = useState('');
  const [levelValue, setLevelValue] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const needsTemplates = itemType === 'equipment' || itemType === 'consumable' || itemType === 'material';
    if (!needsTemplates || templatesLoading || (equipmentTemplates.length > 0 && consumableTemplates.length > 0 && materialTemplates.length > 0)) {
      return;
    }
    setTemplatesLoading(true);
    gameAPI.getItemTemplates()
      .then((response) => {
        const data = response.data as ItemTemplatesResponse;
        const templates = data.templates?.equipment || [];
        const consumables = data.templates?.consumables || [];
        const materials = data.templates?.materials || [];
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
        const sortedConsumables = [...consumables].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        setConsumableTemplates(sortedConsumables);
        const sortedMaterials = [...materials].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        setMaterialTemplates(sortedMaterials);
      })
      .catch(() => {
        setEquipmentTemplates([]);
        setConsumableTemplates([]);
        setMaterialTemplates([]);
      })
      .finally(() => {
        setTemplatesLoading(false);
      });
  }, [consumableTemplates.length, equipmentTemplates.length, itemType, materialTemplates.length, templatesLoading]);

  const updateConsumableEntry = (index: number, field: 'templateId' | 'quantity', value: string) => {
    setConsumableList((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const addConsumableEntry = () => {
    setConsumableList((prev) => [...prev, { templateId: '', quantity: '1' }]);
  };

  const removeConsumableEntry = (index: number) => {
    setConsumableList((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
  };

  const updateMaterialEntry = (index: number, field: 'templateId' | 'quantity', value: string) => {
    setMaterialList((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const addMaterialEntry = () => {
    setMaterialList((prev) => [...prev, { templateId: '', quantity: '1' }]);
  };

  const removeMaterialEntry = (index: number) => {
    setMaterialList((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
  };

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
        consumables?: Array<{ templateId: string; quantity: number }>;
        amount?: number;
        materials?: Array<{ templateId: string; quantity: number }>;
      } = {
        targetCharacterId: idValue
      };

      if (itemType) payload.itemType = itemType;
      if (templateId && itemType === 'equipment') payload.templateId = templateId;
      if (itemType === 'equipment') payload.crafted = isCrafted;
      if (itemType === 'consumable') {
        const entries = consumableList
          .map((entry) => ({
            templateId: entry.templateId.trim(),
            quantity: Number.parseInt(entry.quantity, 10)
          }))
          .filter((entry) => entry.templateId.length > 0);

        if (entries.length === 0) {
          setError('请至少选择一个消耗品');
          setLoading(false);
          return;
        }

        const invalidIndex = entries.findIndex((entry) => !Number.isFinite(entry.quantity) || entry.quantity <= 0);
        if (invalidIndex !== -1) {
          setError(`第 ${invalidIndex + 1} 个消耗品数量无效`);
          setLoading(false);
          return;
        }

        payload.consumables = entries;
      }

      if (itemType === 'material') {
        const entries = materialList
          .map((entry) => ({
            templateId: entry.templateId.trim(),
            quantity: Number.parseInt(entry.quantity, 10)
          }))
          .filter((entry) => entry.templateId.length > 0);

        if (entries.length === 0) {
          setError('请至少选择一个材料');
          setLoading(false);
          return;
        }

        const invalidIndex = entries.findIndex((entry) => !Number.isFinite(entry.quantity) || entry.quantity <= 0);
        if (invalidIndex !== -1) {
          setError(`第 ${invalidIndex + 1} 个材料数量无效`);
          setLoading(false);
          return;
        }

        payload.materials = entries;
      }

      if (itemType === 'lingshi') {
        const amountValue = Number.parseInt(lingshiAmount, 10);
        if (!Number.isFinite(amountValue) || amountValue <= 0) {
          setError('请输入有效的灵石数量');
          setLoading(false);
          return;
        }
        payload.amount = amountValue;
      }

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

  const handleLevelSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const idValue = parseInt(levelTargetId, 10);
      if (isNaN(idValue) || idValue <= 0) {
        setError('请输入有效的ID');
        setLoading(false);
        return;
      }

      if (levelValue.trim() === '') {
        setError('请输入等级');
        setLoading(false);
        return;
      }

      const levelNum = parseInt(levelValue, 10);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 100 || !Number.isInteger(levelNum)) {
        setError('等级必须是 1 到 100 之间的整数');
        setLoading(false);
        return;
      }

      const payload: {
        targetCharacterId: number;
        level: number;
      } = {
        targetCharacterId: idValue,
        level: levelNum
      };

      const response = await gameAPI.setLevel(payload);
      const data = response.data as { message?: string; changes?: { level?: { old: number; new: number }; statPoints: { old: number; new: number } } };
      
      setSuccess(data.message || '设置成功');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (err: unknown) {
      const message = (err as AxiosError<ApiError>).response?.data?.error || '设置等级失败';
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
        <button
          type="button"
          className={`${styles['admin-tab']} ${activeTab === 'level' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('level')}
        >
          设置等级
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
          <option value="lingshi">灵石</option>
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

      {itemType === 'material' && (
        <div className={styles['consumable-list']}>
          <div className={styles['consumable-header']}>
            <span>材料列表</span>
            <button
              type="button"
              className={styles['inline-button']}
              onClick={addMaterialEntry}
              disabled={templatesLoading}
            >
              添加条目
            </button>
          </div>
          {materialList.map((entry, index) => (
            <div className={styles['consumable-row']} key={`material-${index}`}>
              <select
                value={entry.templateId}
                onChange={(e) => updateMaterialEntry(index, 'templateId', e.target.value)}
                disabled={templatesLoading}
              >
                <option value="">选择材料</option>
                {materialTemplates.map((template) => (
                  <option key={template.templateId} value={template.templateId}>
                    {template.level ? `${template.name}（${template.level}级）` : template.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                value={entry.quantity}
                onChange={(e) => updateMaterialEntry(index, 'quantity', e.target.value)}
                placeholder="数量"
              />
              {materialList.length > 1 && (
                <button
                  type="button"
                  className={styles['inline-button']}
                  onClick={() => removeMaterialEntry(index)}
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {itemType === 'lingshi' && (
        <div className={styles['form-group']}>
          <label htmlFor="lingshiAmount">灵石数量 *</label>
          <input
            id="lingshiAmount"
            type="number"
            min="1"
            step="1"
            value={lingshiAmount}
            onChange={(e) => setLingshiAmount(e.target.value)}
            placeholder="输入灵石数量"
          />
        </div>
      )}

      {itemType === 'consumable' && (
        <div className={styles['consumable-list']}>
          <div className={styles['consumable-header']}>
            <span>消耗品列表</span>
            <button
              type="button"
              className={styles['inline-button']}
              onClick={addConsumableEntry}
              disabled={templatesLoading}
            >
              添加条目
            </button>
          </div>
          {consumableList.map((entry, index) => (
            <div className={styles['consumable-row']} key={`consumable-${index}`}>
              <select
                value={entry.templateId}
                onChange={(e) => updateConsumableEntry(index, 'templateId', e.target.value)}
                disabled={templatesLoading}
              >
                <option value="">选择消耗品</option>
                {consumableTemplates.map((template) => (
                  <option key={template.templateId} value={template.templateId}>
                    {template.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                value={entry.quantity}
                onChange={(e) => updateConsumableEntry(index, 'quantity', e.target.value)}
                placeholder="数量"
              />
              {consumableList.length > 1 && (
                <button
                  type="button"
                  className={styles['inline-button']}
                  onClick={() => removeConsumableEntry(index)}
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className={styles['error-message']}>{error}</div>}
      {success && <div className={styles['success-message']}>{success}</div>}

          <button type="submit" disabled={loading} className={styles['submit-button']}>
            {loading ? '赠送中...' : '赠送物品'}
          </button>
        </form>
      ) : activeTab === 'exp' ? (
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
      ) : (
        <form onSubmit={handleLevelSubmit} className={styles['admin-give-item-form']}>
          <div className={styles['form-group']}>
            <label htmlFor="levelTargetId">目标角色ID *</label>
            <input
              id="levelTargetId"
              type="text"
              value={levelTargetId}
              onChange={(e) => setLevelTargetId(e.target.value)}
              required
              placeholder="输入角色ID"
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="levelValue">等级（1-100） *</label>
            <input
              id="levelValue"
              type="number"
              min="1"
              max="100"
              step="1"
              value={levelValue}
              onChange={(e) => setLevelValue(e.target.value)}
              required
              placeholder="输入等级"
            />
            <small style={{ color: 'var(--ink-text-muted)', fontSize: '12px' }}>
              设置等级后会自动计算属性点（每级5点）
            </small>
          </div>

          {error && <div className={styles['error-message']}>{error}</div>}
          {success && <div className={styles['success-message']}>{success}</div>}

          <button type="submit" disabled={loading} className={styles['submit-button']}>
            {loading ? '设置中...' : '设置等级'}
          </button>
        </form>
      )}
    </div>
  );
}
