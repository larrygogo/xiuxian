import { useRef, type ReactNode, type MouseEvent } from 'react';
import './ControlModal.css';
import type { Panel } from '../types/panel';

interface ControlModalProps {
  panel: Panel;
  title: string;
  draggingId: string | null;
  onBringToFront: (panelId: string) => void;
  onStartDrag: (panel: Panel, event: MouseEvent<HTMLDivElement>) => void;
  onClose: (panelId: string) => void;
  onCardRef: (node: HTMLDivElement | null) => void;
  children: ReactNode;
  size?: 'normal' | 'large';
}

export function ControlModal({
  panel,
  title,
  draggingId,
  onBringToFront,
  onStartDrag,
  onClose,
  onCardRef,
  children,
  size = 'normal',
}: ControlModalProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const handleCardMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Node | null;
    if (target && bodyRef.current?.contains(target)) {
      return;
    }
    onBringToFront(panel.id); 
    onStartDrag(panel, event);
  };

  return (
    <div className="control-modal" style={{ zIndex: panel.z }}>
      <div
        className={`control-modal-card ${size === 'large' ? 'large' : ''} ${draggingId === panel.id ? 'is-dragging' : ''}`}
        role="dialog"
        style={{ transform: `translate(${panel.x}px, ${panel.y}px)` }}
        ref={onCardRef}
        onMouseDown={handleCardMouseDown}
      >
        <div
          className="control-modal-header"
        >
          <span>{title}</span>
          <button type="button" onClick={() => onClose(panel.id)}>
            关闭
          </button>
        </div>
        <div className="control-modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
