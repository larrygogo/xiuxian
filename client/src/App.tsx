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
import bagIcon from './assets/bag-icon.png';
import './App.css';
import { needQi } from './utils/gameUtils';
import { ModalManager } from './utils/modalManager';
import type { Panel, PanelType } from './types/panel';

function App() {
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const { state, loading: gameLoading, error, tick, toggleTuna, createCharacter, equipItem, unequipItem, useItem, levelUp, allocateStats, refresh } = useGameState(user?.id);
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

  const panelTitleMap: Record<PanelType, string> = {
    bag: '背包',
    equipment: '装备',
    stats: '人物属性',
    settings: '设置',
  };

  if (authLoading) {
    return (
      <div className="game-frame">
        <div className="app-loading">
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="game-frame">
        <div className="app-container">
          <Login onLogin={login} onRegister={register} />
        </div>
      </div>
    );
  }

  return (
    <div className="game-frame">
      <div className="app-container">
        <div className="top-left-status">
          <div className="avatar-placeholder" aria-hidden="true" />
          <div className="header-bars">
            <div className="header-bar">
              <span className="bar-label">生命</span>
              <div className="bar-track">
                <div className="bar-fill bar-hp" style={{ width: `${hpPercent}%` }} />
              </div>
            </div>
            <div className="header-bar">
              <span className="bar-label">法力</span>
              <div className="bar-track">
                <div className="bar-fill bar-mp" style={{ width: `${mpPercent}%` }} />
              </div>
            </div>
            <div className="header-bar">
              <span className="bar-label">灵气</span>
              <div className="bar-track">
                <div className="bar-fill bar-qi" style={{ width: `${qiPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className="app-content">
          {gameLoading ? (
            <div className="loading-message">加载游戏状态...</div>
          ) : error ? (
            <div className="error-message">
              <p>错误：{error}</p>
              <button onClick={() => window.location.reload()}>刷新页面</button>
            </div>
          ) : !state ? (
            <div className="loading-message">游戏状态为空，请刷新页面</div>
          ) : state.name === '无名修士' ? (
            <CharacterCreation onCreateCharacter={async (name) => {
              const result = await createCharacter(name);
              if (result.success) {
                await refresh();
              }
              return result;
            }} />
          ) : (
            <>
              <EventLog state={state} variant="system-chat" title="系统频道" />
              <GameActions state={state} onTick={tick} onToggleTuna={toggleTuna} />
              <div className="control-zone">
                <div className="control-title">控制区域</div>
                <div className="control-buttons">
                  <button type="button" onClick={() => handleOpenPanel('bag')} className="control-button-with-icon">
                    <img src={bagIcon} alt="背包" className="control-icon" />
                    <span>背包</span>
                  </button>
                  <button type="button" onClick={() => handleOpenPanel('stats')} className="control-button-with-icon">
                    <span className="control-icon-placeholder">👤</span>
                    <span>人物属性</span>
                  </button>
                  <button type="button" onClick={() => handleOpenPanel('settings')} className="control-button-with-icon">
                    <span className="control-icon-placeholder">⚙️</span>
                    <span>设置</span>
                  </button>
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
              <Inventory items={state?.inventory || Array(20).fill(null)} lingshi={state?.lingshi} equipment={state?.equipment} onEquip={equipItem} onUse={useItem} onUnequip={unequipItem} onUpdate={refresh} />
            ) : panel.type === 'stats' ? (
              <MainStatus state={state} onLevelUp={levelUp} onAllocateStats={allocateStats} />
            ) : panel.type === 'settings' ? (
              <div className="settings-panel">
                <p>功能开发中，占位展示。</p>
                <button type="button" className="logout-button" onClick={logout}>
                  退出游戏
                </button>
              </div>
            ) : (
              <>功能开发中，占位展示。</>
            )}
          </ControlModal>
        ))}
      </div>
    </div>
  );
}

export default App;
