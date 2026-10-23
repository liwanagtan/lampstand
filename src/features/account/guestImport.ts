import { DB_NAME, LampstandDB, db } from '@/db/db';
import type { PlanProgressRecord } from '@/db/types';
import { captureGuestReading, restoreLocalReading } from '@/features/settings/localReadingBackup';
import { safeBackupSetting } from '@/features/settings/backupSettings';
import { useSettings } from '@/features/settings/settingsStore';
import { markOnboarded, wasGuestOnboarded } from '@/app/onboarding';
import { copyId } from './duplicates';

export interface GuestImportSummary {
  plans: number;
  entries: number;
  marks: number;
  settings: number;
  reading: number;
}

async function readGuest() {
  const guest = new LampstandDB(DB_NAME);
  try {
    const [plans, entries, marks, settings] = await Promise.all([
      guest.plans.toArray(),
      guest.entries.toArray(),
      guest.marks.toArray(),
      guest.settings.toArray(),
    ]);
    return { plans, entries, marks, settings, reading: captureGuestReading() };
  } finally {
    guest.close();
  }
}

export const guestDataCount = (s: GuestImportSummary) =>
  s.plans + s.entries + s.marks + s.settings + s.reading;

export async function guestImportPreview(): Promise<GuestImportSummary> {
  const guest = await readGuest();
  return {
    plans: guest.plans.length,
    entries: guest.entries.length,
    marks: guest.marks.length,
    settings: guest.settings.filter((s) => safeBackupSetting(s)).length,
    reading: Object.keys(guest.reading).length,
  };
}

/** A completion on either side is kept; explicit undos remain local until cloud sync handles them. */
export function mergeGuestPlan(
  account: PlanProgressRecord,
  guest: PlanProgressRecord,
): PlanProgressRecord {
  const newest = account.updatedAt >= guest.updatedAt ? account : guest;
  return {
    ...newest,
    startedAt: Math.min(account.startedAt, guest.startedAt),
    done: [...new Set([...account.done, ...guest.done])].sort((a, b) => a - b),
    doneAt: { ...guest.doneAt, ...account.doneAt },
    updatedAt: Math.max(account.updatedAt, guest.updatedAt),
  };
}

/** Called only after the person explicitly chooses to bring guest data into their account. */
export async function importGuestData(): Promise<GuestImportSummary> {
  if (db.name === DB_NAME) throw new Error('Sign in before importing guest data.');
  const guest = await readGuest();
  const changed: GuestImportSummary = { plans: 0, entries: 0, marks: 0, settings: 0, reading: 0 };
  await db.transaction('rw', db.plans, db.entries, db.marks, db.settings, async () => {
    for (const plan of guest.plans) {
      const account = await db.plans.get(plan.planId);
      const merged = account ? mergeGuestPlan(account, plan) : plan;
      if (!account || JSON.stringify(account) !== JSON.stringify(merged)) {
        await db.plans.put(merged);
        changed.plans++;
      }
    }
    for (const entry of guest.entries) {
      const account = await db.entries.get(entry.id);
      const id =
        account && JSON.stringify(account) !== JSON.stringify(entry)
          ? copyId('guest', entry.id)
          : entry.id;
      if (!(await db.entries.get(id))) {
        await db.entries.put({ ...entry, id });
        changed.entries++;
      }
    }
    for (const mark of guest.marks) {
      const account = await db.marks.get(mark.id);
      if (account && JSON.stringify(account) === JSON.stringify(mark)) continue;
      if (account && mark.kind !== 'note') {
        // Highlights and bookmarks carry no writing: the most recent choice wins.
        if (mark.updatedAt > account.updatedAt) {
          await db.marks.put(mark);
          changed.marks++;
        }
        continue;
      }
      const id = account ? copyId('guest', mark.id) : mark.id;
      if (!(await db.marks.get(id))) {
        await db.marks.put({ ...mark, id });
        changed.marks++;
      }
    }
    for (const setting of guest.settings) {
      const safe = safeBackupSetting(setting);
      if (!safe || (await db.settings.get(safe.key))) continue;
      await db.settings.put(safe);
      changed.settings++;
    }
  });
  await useSettings.getState().load();
  if (wasGuestOnboarded()) markOnboarded();
  changed.reading = restoreLocalReading(guest.reading);
  return changed;
}
