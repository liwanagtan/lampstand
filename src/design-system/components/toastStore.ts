import { create } from 'zustand';
import type { ReactNode } from 'react';
import { motionDetail } from '../tokens';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  title: ReactNode;
  description?: ReactNode;
  action?: ToastAction;
  duration: number;
  tone: 'neutral' | 'success' | 'warning';
}

interface ToastState {
  toasts: ToastItem[];
  push: (
    t: Omit<ToastItem, 'id' | 'duration' | 'tone'> & Partial<Pick<ToastItem, 'duration' | 'tone'>>,
  ) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    const duration =
      t.duration ?? (t.action ? motionDetail.undoWindow : motionDetail.toastDuration);
    const item: ToastItem = { tone: 'neutral', ...t, id, duration };
    set((s) => ({ toasts: [...s.toasts.slice(-3), item] }));
    timers.set(
      id,
      setTimeout(() => get().dismiss(id), duration),
    );
    return id;
  },
  dismiss: (id) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = (...args: Parameters<ToastState['push']>) =>
  useToasts.getState().push(...args);
