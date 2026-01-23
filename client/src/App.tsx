import { useEffect, useRef, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useGameState } from './hooks/useGameState';
import { Login } from './components/Login';
import { CharacterCreation } from './components/CharacterCreation';
import { MainStatus } from './components/MainStatus';
import { GameActions } from './components/GameActions';
import { EventLog } from './components/EventLog';
import { ControlModal } from './components/ControlModal';
import { Inventory } from './components/Inventory';
import { AdminGiveItem } from './components/AdminGiveItem';
import bagIcon from './assets/bag-icon.png';
import styles from './App.module.css';
import { needQi } from './utils/gameUtils';
import { ModalManager } from './utils/modalManager';
import type { Panel, PanelType } from './types/panel';
import { MessageProvider } from './components/MessageProvider';

function App() {
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const { state, loading: gameLoading, error, createCharacter, equipItem, unequipItem, useItem, levelUp, allocateStats, refresh } = useGameState(user?.id);
  const [openPanels, setOpenPanels] = useState<Panel[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const modalManagerRef = useRef(new ModalManager());
  const modalCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const requiredQi = state ? needQi(state) : 0;
  const hpPercent = state && state.maxHp ? Math.min(100, (state.hp / state.maxHp) * 100) : 0;
  const mpPercent = state && state.maxMp ? Math.min(100, ((state.mp ?? 0) / state.maxMp) * 100) : 0;
  const qiPercent = state && requiredQi ? Math.min(100, (state.qi / requiredQi) * 100) : 0;

  const handleOpenPanel = (panel: PanelType) => {
    setOpenPanels(modalManagerRef.current.openPanel(panel));
  };

  const bringToFront = (panelId: string) => {
    setOpenPanels(modalManagerRef.current.bringToFront(panelId));
  };

  const closePanel = (panelId: string) => {
    setOpenPanels(modalManagerRef.current.closePanel(panelId));
  };

  const handleStartDrag = (panel: Panel, event: React.MouseEvent<HTMLDivElement>) => {
    if (!event) return;
    setDraggingId(panel.id);
    bringToFront(panel.id);
    dragIdRef.current = panel.id;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragOffsetRef.current = { x: panel.x, y: panel.y };
    dragPositionRef.current = { x: panel.x, y: panel.y };
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;
      const nextPosition = {
        x: dragOffsetRef.current.x + deltaX,
        y: dragOffsetRef.current.y + deltaY
      };
      dragPositionRef.current = nextPosition;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const currentId = dragIdRef.current;
          const currentRef = currentId ? modalCardRefs.current[currentId] : null;
          if (currentRef) {
            currentRef.style.transform = `translate(${dragPositionRef.current.x}px, ${dragPositionRef.current.y}px)`;
          }
          rafRef.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      const currentId = dragIdRef.current;
      setDraggingId(null);
      if (currentId) {
        setOpenPanels(
          modalManagerRef.current.updatePosition(
            currentId,
            dragPositionRef.current.x,
            dragPositionRef.current.y,
          ),
        );
      }
      dragIdRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draggingId]);

  useEffect(() => {
    modalManagerRef.current.reset();
    setOpenPanels([]);
    setDraggingId(null);
    modalCardRefs.current = {};
    dragOffsetRef.current = { x: 0, y: 0 };
    dragStartRef.current = { x: 0, y: 0 };
    dragPositionRef.current = { x: 0, y: 0 };
    dragIdRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [user?.id]);

  useEffect(() => {
    if (error && error.includes('用户不存在')) {
      logout();
    }
  }, [error, logout]);

  const panelTitleMap: Record<PanelType, string> = {
    bag: '背包',
    equipment: '装备',
    stats: '人物属性',
    settings: '设置',
    admin: '管理员',
  };

  if (authLoading) {
    return (
      <div className={styles['game-frame']}>
        <div className={styles['app-loading']}>
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles['game-frame']}>
        <div className={styles['app-container']}>
          <Login onLogin={login} onRegister={register} />
        </div>
      </div>
    );
  }

  return (
    <MessageProvider>
      <div className={styles['game-frame']}>
        <div className={styles['app-container']}>
          <div className={styles['top-left-status']}>
            <div className={styles['avatar-placeholder']} aria-hidden="true" />
            <div className={styles['header-bars']}>
              <div className={styles['header-bar']}>
                <span className={styles['bar-label']}>生命</span>
                <div className={styles['bar-track']}>
                  <div className={`${styles['bar-fill']} ${styles['bar-hp']}`} style={{ width: `${hpPercent}%` }} />
                </div>
              </div>
              <div className={styles['header-bar']}>
                <span className={styles['bar-label']}>法力</span>
                <div className={styles['bar-track']}>
                  <div className={`${styles['bar-fill']} ${styles['bar-mp']}`} style={{ width: `${mpPercent}%` }} />
                </div>
              </div>
              <div className={styles['header-bar']}>
                <span className={styles['bar-label']}>灵气</span>
                <div className={styles['bar-track']}>
                  <div className={`${styles['bar-fill']} ${styles['bar-qi']}`} style={{ width: `${qiPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className={styles['app-content']}>
            {gameLoading ? (
              <div className={styles['loading-message']}>加载游戏状态...</div>
            ) : error ? (
              <div className={styles['error-message']}>
                <p>错误：{error}</p>
                <button onClick={() => window.location.reload()}>刷新页面</button>
              </div>
            ) : !state ? (
              <div className={styles['loading-message']}>游戏状态为空，请刷新页面</div>
            ) : state.name === '无名修士' ? (
              <CharacterCreation onCreateCharacter={async (name) => {
                const result = await createCharacter(name);
                if (!result.success && result.error && result.error.includes('用户不存在')) {
                  logout();
                }
                if (result.success) {
                  await refresh();
                }
                return result;
              }} />
            ) : (
              <>
                <EventLog state={state} variant="system-chat" title="系统频道" />
                <GameActions state={state} />
                <div className={styles['control-zone']}>
                  <div className={styles['control-title']}>控制区域</div>
                  <div className={styles['control-buttons']}>
                    <button type="button" onClick={() => handleOpenPanel('bag')} className={styles['control-button-with-icon']}>
                      <img src={bagIcon} alt="背包" className={styles['control-icon']} />
                      <span>背包</span>
                    </button>
                    <button type="button" onClick={() => handleOpenPanel('stats')} className={styles['control-button-with-icon']}>
                      <span className={styles['control-icon-placeholder']}>👤</span>
                      <span>人物属性</span>
                    </button>
                    <button type="button" onClick={() => handleOpenPanel('settings')} className={styles['control-button-with-icon']}>
                      <span className={styles['control-icon-placeholder']}>⚙️</span>
                      <span>设置</span>
                    </button>
                    {user.isAdmin && (
                      <button type="button" onClick={() => handleOpenPanel('admin')} className={styles['control-button-with-icon']}>
                        <span className={styles['control-icon-placeholder']}>👑</span>
                        <span>管理员</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {openPanels.map((panel) => (
            <ControlModal
              key={panel.id}
              panel={panel}
              title={panelTitleMap[panel.type]}
              draggingId={draggingId}
              onBringToFront={bringToFront}
              onStartDrag={handleStartDrag}
              onClose={closePanel}
              onCardRef={(node) => {
                if (node) {
                  modalCardRefs.current[panel.id] = node;
                }
              }}
              size={panel.type === 'bag' ? 'large' : 'normal'}
            >
              {panel.type === 'bag' ? (
                <Inventory items={state?.inventory || Array(20).fill(null)} lingshi={state?.lingshi} equipment={state?.equipment} playerLevel={state?.level} onEquip={equipItem} onUse={useItem} onUnequip={unequipItem} onUpdate={refresh} />
              ) : panel.type === 'stats' ? (
                <MainStatus state={state} onLevelUp={levelUp} onAllocateStats={allocateStats} />
              ) : panel.type === 'settings' ? (
                <div className={styles['settings-panel']}>
                  <p>功能开发中，占位展示。</p>
                  <button type="button" className={styles['logout-button']} onClick={logout}>
                    退出游戏
                  </button>
                </div>
              ) : panel.type === 'admin' ? (
                <AdminGiveItem onSuccess={refresh} />
              ) : (
                <>功能开发中，占位展示。</>
              )}
            </ControlModal>
          ))}
        </div>
      </div>
    </MessageProvider>
  );
}

export default App;
