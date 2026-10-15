// Control ⇄ output sync over BroadcastChannel (PRD §4 Windows).
import type { LiveSnapshot } from './types';

export const CHANNEL_NAME = 'lampstand-live';

export type ControlMessage = { type: 'snapshot'; snapshot: LiveSnapshot } | { type: 'closing' };
export type OutputMessage = { type: 'hello' } | { type: 'alive' } | { type: 'bye' };

export type Message = ControlMessage | OutputMessage;

export function openChannel(onMessage: (m: Message) => void): {
  post: (m: Message) => void;
  close: () => void;
} {
  if (typeof BroadcastChannel === 'undefined') return { post: () => {}, close: () => {} };
  const ch = new BroadcastChannel(CHANNEL_NAME);
  ch.onmessage = (e: MessageEvent<Message>) => onMessage(e.data);
  return {
    post: (m) => ch.postMessage(m),
    close: () => ch.close(),
  };
}
