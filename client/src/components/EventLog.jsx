import { useState, useEffect, useRef } from 'react';
import './EventLog.css';
import { Card } from './Card';

export function EventLog({ state }) {
  const [events, setEvents] = useState([]);
  const logContentRef = useRef(null);
  const prevEventCountRef = useRef(0);

  useEffect(() => {
    if (state && Array.isArray(state.eventLog)) {
      setEvents(state.eventLog);
      
      // 如果事件数量增加，自动滚动到底部
      if (state.eventLog.length > prevEventCountRef.current) {
        setTimeout(() => {
          if (logContentRef.current) {
            logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
          }
        }, 100);
      }
      prevEventCountRef.current = state.eventLog.length;
    } else {
      setEvents([]);
      prevEventCountRef.current = 0;
    }
  }, [state]);

  return (
    <Card title="事件日志" className="event-log">
      <div className="log-content" ref={logContentRef}>
        {events.length === 0 ? (
          <div className="log-empty">暂无事件</div>
        ) : (
          <ul className="log-list">
            {events.map((event, index) => (
              <li key={index}>{event}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
