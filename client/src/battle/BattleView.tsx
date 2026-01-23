import type { ReactNode } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CountdownBar } from './CountdownBar';
import { BattlefieldGrid } from './BattlefieldGrid';
import { CommandPanel } from './CommandPanel';
import { BattleLogPanel } from './BattleLogPanel';
import { connectBattleSocket, disconnectBattleSocket } from './battleWs';
import { battleAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Socket } from 'socket.io-client';
import type { BattleSnapshotDTO, BattleEventDTO, BattleStartPayload, TurnBeginPayload, TurnAutoFillPayload, TurnResolvePayload, BattleEndPayload } from '../types/battle';
import type { Item } from '../types/item';
import { isConsumable } from '../types/item';
import styles from './BattleView.module.css';

interface BattleViewProps {
  roomId: string;
  inventory?: (Item | null)[];
  headerRight?: ReactNode | ((context: { battleEnded: boolean }) => ReactNode);
  onRoomMissing?: () => void;
  onBattleEnd?: () => void;
}

export function BattleView({ roomId, inventory = [], headerRight, onRoomMissing, onBattleEnd }: BattleViewProps) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<BattleSnapshotDTO | null>(null);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [commandSubmitted, setCommandSubmitted] = useState<boolean>(false);
  const [submittedPlayerIds, setSubmittedPlayerIds] = useState<string[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<'attack' | 'defend' | 'escape' | 'item' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const consumables = inventory.filter((item): item is Item => !!item).filter(isConsumable);
  const selectedItem = consumables.find((item) => item.id === selectedItemId) || null;
  const selectedItemTargetScope = selectedItem
    ? (selectedItem.battleTarget ?? (selectedItem.effect.type === 'buff' ? 'self' : 'ally'))
    : null;

  const selfCombatantId = snapshot?.players.find((player) => player.userId === user?.id)?.id ?? null;
  const submittedCombatantIds = snapshot?.players
    ? snapshot.players
        .filter((player) => typeof player.userId === 'number' && submittedPlayerIds.includes(`player_${player.userId}`))
        .map((player) => player.id)
    : [];

  useEffect(() => {
    if (selectedCommand !== 'item') {
      setSelectedItemId(null);
    }
  }, [selectedCommand]);

  useEffect(() => {
    if (!selectedItem || selectedItemTargetScope !== 'self' || !selfCombatantId) {
      return;
    }
    setSelectedTarget(selfCombatantId);
  }, [selectedItem, selectedItemTargetScope, selfCombatantId]);
  const refreshTimeoutRef = useRef<number | null>(null);
  const refreshAttemptsRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const refreshGiveUpRef = useRef(false);
  const refreshKeyRef = useRef<string | null>(null);
  const autoExitTimeoutRef = useRef<number | null>(null);

  // 加载战斗状态（断线刷新）
  const loadBattleState = useCallback(async () => {
    try {
      const response = await battleAPI.getRoomState(roomId);
      const { snapshot: stateSnapshot } = response.data as { snapshot: BattleSnapshotDTO };
      setSnapshot(stateSnapshot);
      
      // 计算倒计时
      if (stateSnapshot.deadlineAt) {
        const remaining = Math.max(0, Math.floor((stateSnapshot.deadlineAt - Date.now()) / 1000));
        setCountdown(remaining);
      }

      // 计算已提交指令数
      setSubmittedCount(stateSnapshot.commands.length);
      setSubmittedPlayerIds(stateSnapshot.commands.map((cmd) => cmd.playerId));

      // 检查当前用户是否已提交指令
      if (user?.id) {
        const playerId = `player_${user.id}`;
        const hasSubmitted = stateSnapshot.commands.some(cmd => cmd.playerId === playerId);
        setCommandSubmitted(hasSubmitted);
      }

      return stateSnapshot;
    } catch (error: any) {
      console.error('加载战斗状态失败:', error);
      setBattleLogs(prev => [...prev, '加载战斗状态失败']);
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error as string | undefined;
      if (status === 404 || errorMessage === '战斗房间不存在') {
        onRoomMissing?.();
      }
      return null;
    }
  }, [roomId, user?.id, onRoomMissing]);

  const stopRefreshPolling = useCallback((opts?: { resetGiveUp?: boolean }) => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    refreshAttemptsRef.current = 0;
    refreshInFlightRef.current = false;
    refreshKeyRef.current = null;
    if (opts?.resetGiveUp) {
      refreshGiveUpRef.current = false;
    }
  }, []);

  const clearAutoExitTimeout = useCallback(() => {
    if (autoExitTimeoutRef.current !== null) {
      window.clearTimeout(autoExitTimeoutRef.current);
      autoExitTimeoutRef.current = null;
    }
  }, []);

  // 初始化：加载状态并连接 WebSocket
  useEffect(() => {
    if (!roomId) return;

    // 先加载状态
    loadBattleState();

    // 连接 WebSocket
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('未找到认证令牌');
      return;
    }

    const battleSocket = connectBattleSocket(token);
    socketRef.current = battleSocket;
    setSocket(battleSocket);

    battleSocket.on('battle:connected', () => {
      setConnected(true);
      setBattleLogs(prev => [...prev, '已连接到战斗服务器']);
    });

    battleSocket.on('battle:joined', () => {
      setBattleLogs(prev => [...prev, `已加入战斗房间 ${roomId}`]);
    });

    // 处理战斗事件
    battleSocket.on('battle:event', (event: BattleEventDTO) => {
      console.log('收到战斗事件:', event);

      switch (event.type) {
        case 'BATTLE_START': {
          const payload = event.payload as BattleStartPayload;
          setSnapshot(payload.snapshot);
          setBattleLogs(prev => [...prev, '战斗开始！']);
          stopRefreshPolling({ resetGiveUp: true });
          break;
        }

        case 'TURN_BEGIN': {
          const payload = event.payload as TurnBeginPayload;
          const newSubmittedCount = payload.submittedCommands.length;
          setSubmittedCount(newSubmittedCount);
          setSubmittedPlayerIds(payload.submittedCommands);
          
          // 检查当前用户是否已提交指令
          if (user?.id) {
            const playerId = `player_${user.id}`;
            const hasSubmitted = payload.submittedCommands.includes(playerId);
            setCommandSubmitted(hasSubmitted);
          } else {
            setCommandSubmitted(false);
          }
          
          // 计算倒计时
          const remaining = Math.max(0, Math.floor((payload.deadlineAt - Date.now()) / 1000));
          setCountdown(remaining);
          
          setBattleLogs(prev => [...prev, `第 ${payload.turnNumber} 回合开始`]);
          stopRefreshPolling({ resetGiveUp: true });
          break;
        }

        case 'TURN_AUTO_FILL': {
          const payload = event.payload as TurnAutoFillPayload;
          setBattleLogs(prev => [...prev, `自动补齐 ${payload.autoFilledPlayers.length} 名玩家的指令`]);
          break;
        }

        case 'TURN_RESOLVE': {
          const payload = event.payload as TurnResolvePayload;
          setSnapshot(payload.snapshot);
          setBattleLogs(prev => [...prev, ...payload.logs]);
          setSubmittedPlayerIds(payload.snapshot.commands.map((cmd) => cmd.playerId));
          stopRefreshPolling({ resetGiveUp: true });
          break;
        }

        case 'BATTLE_END': {
          const payload = event.payload as BattleEndPayload;
          const endLine = `战斗结束！获胜方：${payload.winner === 'players' ? '玩家' : payload.winner === 'monsters' ? '怪物' : '平局'}`;
          setBattleLogs(prev => [...prev, ...payload.logs, endLine]);
          stopRefreshPolling({ resetGiveUp: true });
          setCountdown(0);
          setCommandSubmitted(false);
          setSnapshot(prev => (prev ? { ...prev, phase: 'ENDED' } : prev));
          setConnected(false);
          if (socketRef.current?.io) {
            socketRef.current.io.opts.reconnection = false;
          }
          disconnectBattleSocket();
          setSocket(null);
          socketRef.current = null;
          clearAutoExitTimeout();
          break;
        }
      }
    });

    // 加入房间
    battleSocket.emit('battle:join', { roomId });

    return () => {
      stopRefreshPolling();
      clearAutoExitTimeout();
      disconnectBattleSocket();
      socketRef.current = null;
    };
  }, [roomId, loadBattleState, stopRefreshPolling, onBattleEnd, clearAutoExitTimeout]);

  // 倒计时更新
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  // 组件卸载时，确保清理轮询
  useEffect(() => {
    return () => {
      stopRefreshPolling();
    };
  }, [stopRefreshPolling]);

  // 倒计时结束但没有收到新回合事件时，主动拉取最新状态（有限次数，避免无限轮询）
  useEffect(() => {
    if (!snapshot) return;
    if (countdown === null) return;

    const shouldPoll = countdown <= 0 && snapshot.phase === 'TURN_INPUT';
    const currentKey = `${snapshot.turnNumber}:${snapshot.deadlineAt}:${snapshot.phase}`;

    if (!shouldPoll) {
      stopRefreshPolling({ resetGiveUp: true });
      return;
    }

    if (refreshGiveUpRef.current && refreshKeyRef.current === currentKey) {
      return;
    }

    if (refreshKeyRef.current !== currentKey) {
      refreshKeyRef.current = currentKey;
      refreshAttemptsRef.current = 0;
      refreshGiveUpRef.current = false;
    }

    if (refreshTimeoutRef.current !== null || refreshInFlightRef.current) return;

    const maxAttempts = 6;
    const baseDelayMs = 800;

    const schedule = (delayMs: number) => {
      refreshTimeoutRef.current = window.setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const tick = async () => {
      refreshTimeoutRef.current = null;
      if (refreshInFlightRef.current) return;

      if (refreshAttemptsRef.current >= maxAttempts) {
        refreshGiveUpRef.current = true;
        setBattleLogs(prev => {
          const msg = '倒计时已结束，但服务器尚未推进回合，已停止自动轮询（等待服务器事件）';
          return prev[prev.length - 1] === msg ? prev : [...prev, msg];
        });
        return;
      }

      refreshAttemptsRef.current += 1;
      const beforeTurn = snapshot.turnNumber;
      const beforeDeadlineAt = snapshot.deadlineAt;
      const beforePhase = snapshot.phase;

      refreshInFlightRef.current = true;
      const next = await loadBattleState();
      refreshInFlightRef.current = false;
      if (!next) {
        schedule(baseDelayMs + refreshAttemptsRef.current * 250);
        return;
      }

      const advanced =
        next.phase !== beforePhase ||
        next.turnNumber !== beforeTurn ||
        next.deadlineAt !== beforeDeadlineAt;

      if (advanced) {
        refreshGiveUpRef.current = false;
        return;
      }

      schedule(baseDelayMs + refreshAttemptsRef.current * 250);
    };

    void tick();
  }, [countdown, snapshot?.turnNumber, snapshot?.deadlineAt, snapshot?.phase, loadBattleState, stopRefreshPolling]);

  // 处理指令提交成功
  const handleCommandSubmitted = useCallback((allSubmitted?: boolean) => {
    setCommandSubmitted(true);
    setSubmittedCount(prev => prev + 1);
    setBattleLogs(prev => [...prev, '指令已提交']);
    
    // 如果所有人都已提交，停止倒计时
    if (allSubmitted && snapshot) {
      setCountdown(0);
      setBattleLogs(prev => [...prev, '所有玩家已提交，立即结算']);
    }
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className={styles.battleView}>
        <div className={styles.loading}>加载战斗状态中...</div>
      </div>
    );
  }

  const battleEnded = snapshot.phase === 'ENDED';
  const resolvedHeaderRight =
    typeof headerRight === 'function' ? headerRight({ battleEnded }) : headerRight;

  return (
    <div className={styles.battleView}>
      <div className={styles.header}>
        <h2>战斗界面</h2>
        <div className={styles.headerRight}>
          <div className={styles.status}>
            {connected ? '已连接' : '连接中...'}
          </div>
          {resolvedHeaderRight}
        </div>
      </div>

      <div className={styles.mainArea}>
        <div className={styles.battlefield}>
          <BattlefieldGrid
            players={snapshot.players}
            monsters={snapshot.monsters}
            selectedCommand={selectedCommand}
            selectedTarget={selectedTarget}
            targetingEnabled={!commandSubmitted}
            targetScope={selectedCommand === 'item' ? selectedItemTargetScope : selectedCommand === 'attack' ? 'enemy' : null}
            selfId={selfCombatantId}
            submittedPlayerIds={submittedCombatantIds}
            middleContent={(
              <CountdownBar
                turnNumber={snapshot.turnNumber}
                countdown={countdown}
                submittedCount={submittedCount}
                totalPlayers={snapshot.players.length}
              />
            )}
            onTargetClick={(targetId) => {
              if (!commandSubmitted) {
                setSelectedTarget(targetId);
              }
            }}
          />
        </div>

        <div className={styles.sidebar}>
          <CommandPanel
            socket={socket}
            roomId={roomId}
            turnNumber={snapshot.turnNumber}
            phase={snapshot.phase}
            players={snapshot.players}
            monsters={snapshot.monsters}
            commandSubmitted={commandSubmitted}
            selectedCommand={selectedCommand}
            selectedTarget={selectedTarget}
            consumables={consumables}
            selectedItemId={selectedItemId}
            itemTargetScope={selectedItemTargetScope}
            onCommandSelect={(cmd) => {
              setSelectedCommand(cmd);
              if (cmd === 'item') {
                setSelectedTarget(null);
              } else if (cmd !== 'attack') {
                setSelectedTarget(null);
              }
            }}
            onItemSelect={(itemId) => {
              setSelectedItemId(itemId);
              if (!itemId) {
                setSelectedTarget(null);
              }
            }}
            onCommandSubmitted={(allSubmitted) => {
              handleCommandSubmitted(allSubmitted);
              // 提交后清除选择
              setSelectedCommand(null);
              setSelectedTarget(null);
              setSelectedItemId(null);
            }}
          />
        </div>
      </div>

      <div className={styles.logArea}>
        <BattleLogPanel logs={battleLogs} />
      </div>
    </div>
  );
}
