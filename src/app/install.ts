// The browser owns the installation prompt. Keep its one-use event until the user asks to install.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let promptEvent: InstallPromptEvent | null = null;
let installedThisSession = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function canPromptInstall(): boolean {
  return promptEvent !== null;
}

export function isInstalled(): boolean {
  return (
    installedThisSession ||
    (window.matchMedia?.('(display-mode: standalone)').matches ?? false) ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function subscribeToInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<boolean> {
  const event = promptEvent;
  if (!event) return false;
  promptEvent = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}

export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    installedThisSession = true;
    notify();
  });
}
