import { useState, useEffect, useRef } from 'react';
import styles from './EventLog.module.css';
import { Card } from './Card';
import type { GameState } from '../types/game';

interface EventLogProps {
  state: GameState | null;
  title?: string;
  variant?: string;
}

export function EventLog({ state, title = '事件日志', variant = '' }: EventLogProps) {
  const [events, setEvents] = useState<string[]>([]);
  const logContentRef = useRef<HTMLDivElement | null>(null);
  const prevEventCountRef = useRef(0);
  const [newStartIndex, setNewStartIndex] = useState<number | null>(null);

  useEffect(() => {
    if (state && Array.isArray(state.eventLog)) {
      setEvents(state.eventLog);
      
      // 如果事件数量增加，自动滚动到底部
      if (state.eventLog.length > prevEventCountRef.current) {
        setNewStartIndex(prevEventCountRef.current);
        setTimeout(() => {
          if (logContentRef.current) {
            logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
          }
        }, 100);
      } else {
        setNewStartIndex(null);
      }
      prevEventCountRef.current = state.eventLog.length;
    } else {
      setEvents([]);
      prevEventCountRef.current = 0;
      setNewStartIndex(null);
    }
  }, [state]);

  return (
    <div className={`${styles['event-log-wrapper']} ${variant ? styles[variant] : ''}`}>
      <Card title={title} className="event-log-card">
        <div className={styles['log-content']} ref={logContentRef}>
          {events.length === 0 ? (
            <div className={styles['log-empty']}>暂无事件</div>
          ) : (
            <ul className={styles['log-list']}>
              {events.map((event, index) => (
                <li
                  key={index}
                  className={newStartIndex !== null && index >= newStartIndex ? styles['is-new'] : ''}
                >
                  {event}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
