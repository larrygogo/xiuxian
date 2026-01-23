import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastLevel = "info" | "success" | "warning" | "error";

type ToastItem = {
  id: string;
  text: string;
  level: ToastLevel;
  durationMs: number;
};

type ConfirmOptions = {
  title?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};

type AlertOptions = {
  title?: string;
  okText?: string;
};

type ConfirmState = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  okText: string;
  cancelText: string;
  danger: boolean;
  resolve?: (value: boolean) => void;
};

type AlertState = {
  open: boolean;
  title: string;
  body: string;
  okText: string;
  resolve?: () => void;
};

type MessageApi = {
  toast: (text: string, opts?: { level?: ToastLevel; durationMs?: number }) => void;
  confirm: (body: React.ReactNode, opts?: ConfirmOptions) => Promise<boolean>;
  alert: (body: string, opts?: AlertOptions) => Promise<void>;
};

const MessageContext = createContext<MessageApi | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "确认",
    body: "",
    okText: "确定",
    cancelText: "取消",
    danger: false,
  });
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    title: "提示",
    body: "",
    okText: "知道了",
  });

  // 用 ref 避免并发 confirm/alert 造成 resolve 丢失
  const confirmBusyRef = useRef(false);
  const alertBusyRef = useRef(false);

  const toast = useCallback((text: string, opts?: { level?: ToastLevel; durationMs?: number }) => {
    const item: ToastItem = {
      id: uid(),
      text,
      level: opts?.level ?? "info",
      durationMs: opts?.durationMs ?? 2200,
    };

    setToasts((prev) => [...prev, item]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
    }, item.durationMs);
  }, []);

  const confirm = useCallback((body: React.ReactNode, opts?: ConfirmOptions) => {
    if (confirmBusyRef.current) {
      // 如果你想支持队列，可改成排队；这里先用最简单可靠策略
      return Promise.resolve(false);
    }
    confirmBusyRef.current = true;

    return new Promise<boolean>((resolve) => {
      setConfirmState({
        open: true,
        title: opts?.title ?? "确认",
        body,
        okText: opts?.okText ?? "确定",
        cancelText: opts?.cancelText ?? "取消",
        danger: !!opts?.danger,
        resolve: (v: boolean) => {
          confirmBusyRef.current = false;
          resolve(v);
        },
      });
    });
  }, []);

  const alert = useCallback((body: string, opts?: AlertOptions) => {
    if (alertBusyRef.current) {
      return Promise.resolve();
    }
    alertBusyRef.current = true;

    return new Promise<void>((resolve) => {
      setAlertState({
        open: true,
        title: opts?.title ?? "提示",
        body,
        okText: opts?.okText ?? "知道了",
        resolve: () => {
          alertBusyRef.current = false;
          resolve();
        },
      });
    });
  }, []);

  const api = useMemo<MessageApi>(() => ({ toast, confirm, alert }), [toast, confirm, alert]);

  const closeConfirm = (result: boolean) => {
    const resolver = confirmState.resolve;
    setConfirmState((s) => ({ ...s, open: false }));
    resolver?.(result);
  };

  const closeAlert = () => {
    const resolver = alertState.resolve;
    setAlertState((s) => ({ ...s, open: false }));
    resolver?.();
  };

  return (
    <MessageContext.Provider value={api}>
      {children}

      {typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Toasts */}
            <div style={toastStackStyle}>
              {toasts.map((t) => (
                <div key={t.id} style={{ ...toastStyle, ...toastLevelStyle(t.level) }}>
                  {t.text}
                </div>
              ))}
            </div>

            {/* Confirm */}
            {confirmState.open && (
              <div style={maskStyle} onMouseDown={(e) => e.stopPropagation()}>
                <div style={modalStyle} role="dialog" aria-modal="true">
                  <div style={modalTitleStyle}>{confirmState.title}</div>
                  <div style={modalBodyStyle}>{confirmState.body}</div>
                  <div style={modalActionsStyle}>
                    <button style={btnStyle} onClick={() => closeConfirm(false)}>
                      {confirmState.cancelText}
                    </button>
                    <button
                      style={{ ...btnStyle, ...(confirmState.danger ? dangerBtnStyle : primaryBtnStyle) }}
                      onClick={() => closeConfirm(true)}
                    >
                      {confirmState.okText}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Alert */}
            {alertState.open && (
              <div style={maskStyle} onMouseDown={(e) => e.stopPropagation()}>
                <div style={modalStyle} role="dialog" aria-modal="true">
                  <div style={modalTitleStyle}>{alertState.title}</div>
                  <div style={modalBodyStyle}>{alertState.body}</div>
                  <div style={modalActionsStyle}>
                    <button style={{ ...btnStyle, ...primaryBtnStyle }} onClick={closeAlert}>
                      {alertState.okText}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </MessageContext.Provider>
  );
}

export function useMessage(): MessageApi {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessage must be used within MessageProvider");
  return ctx;
}

// 下面是内联样式：你可以替换成 CSS module
const toastStackStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 30000,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  pointerEvents: "none",
};

const toastStyle: React.CSSProperties = {
  minWidth: 180,
  maxWidth: 420,
  padding: "10px 12px",
  borderRadius: 10,
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  fontSize: 13,
  pointerEvents: "auto",
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(6px)",
};

function toastLevelStyle(level: ToastLevel): React.CSSProperties {
  switch (level) {
    case "success":
      return { borderColor: "rgba(46, 125, 50, 0.25)" };
    case "warning":
      return { borderColor: "rgba(245, 124, 0, 0.25)" };
    case "error":
      return { borderColor: "rgba(211, 47, 47, 0.25)" };
    default:
      return { borderColor: "rgba(25, 118, 210, 0.20)" };
  }
}

const maskStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  zIndex: 40000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: React.CSSProperties = {
  width: 320,
  borderRadius: 12,
  padding: 14,
  background: "#f6f0e6",
  border: "1px solid rgba(0,0,0,0.12)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 8,
  color: "rgba(0,0,0,0.78)",
};

const modalBodyStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  marginBottom: 12,
  color: "rgba(0,0,0,0.72)",
};

const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const btnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(255,255,255,0.65)",
  cursor: "pointer",
  fontSize: 13,
};

const primaryBtnStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.14)",
  background: "rgba(255,255,255,0.88)",
  fontWeight: 700,
};

const dangerBtnStyle: React.CSSProperties = {
  border: "1px solid rgba(180, 40, 40, 0.35)",
  background: "rgba(255, 235, 238, 0.95)",
  fontWeight: 700,
};
