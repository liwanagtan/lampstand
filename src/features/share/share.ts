// Sharing (docs/SHARING-AND-DAILY-VERSE.md): the verse of the day, and Lampstand itself. The
// phone's own share sheet where there is one; otherwise the same words are copied. Nothing is
// tracked: a shared link carries no sender.
import { toast } from '@/design-system/components';

/** Translations whose text may be passed on freely. Anything else is shared in the BSB. */
export const SHAREABLE = ['BSB', 'KJV', 'WEB'] as const;

export function shareTranslation(code: string): string {
  return (SHAREABLE as readonly string[]).includes(code) ? code : 'BSB';
}

/** The link to a passage: opens it in the reader, through Welcome for someone new. */
export function verseLink(osis: string, origin = location.origin): string {
  return `${origin}/v/${osis}`;
}

export function verseShareText(text: string, reference: string, translation: string): string {
  return `“${text}”\n${reference} (${translation})`;
}

export const APP_SHARE = {
  title: 'Lampstand',
  text: 'A quiet place to read the Bible each day. Free, no ads, and it works offline.',
};

/**
 * Open the share sheet, or copy when there is none. A cancelled share is not an error. Returns
 * how it went, for the caller's words.
 */
export async function shareOrCopy(
  data: { title?: string; text: string; url: string },
  copied: string,
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator.share === 'function' && (navigator.canShare?.(data) ?? true)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Some browsers refuse share() outside a tap or for this content: copy instead.
    }
  }
  try {
    await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
    toast({ title: copied, tone: 'success' });
    return 'copied';
  } catch {
    toast({ title: "Couldn't share or copy from this browser.", tone: 'warning' });
    return 'failed';
  }
}

const AFTER_WELCOME = 'lampstand.afterWelcome';

/** A shared link opened by someone new: Welcome first, then straight to what was shared. */
export function rememberAfterWelcome(path: string): void {
  try {
    if (path.startsWith('/v/')) sessionStorage.setItem(AFTER_WELCOME, path);
  } catch {
    // Without storage they land on Today instead, which is fine.
  }
}

export function takeAfterWelcome(): string | null {
  try {
    const path = sessionStorage.getItem(AFTER_WELCOME);
    sessionStorage.removeItem(AFTER_WELCOME);
    return path?.startsWith('/v/') ? path : null;
  } catch {
    return null;
  }
}
