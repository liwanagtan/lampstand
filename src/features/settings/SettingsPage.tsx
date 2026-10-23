import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookPlus, Download, ImagePlus, Trash2, Upload, ChevronRight } from 'lucide-react';
import { Button, Chip, Dialog, Select, Toggle, cx, toast } from '@/design-system/components';
import { useIsPhone } from '@/app/useIsPhone';
import { LampLockup } from '@/design-system/LampMark';
import { useBible } from '@/features/bible/bibleStore';
import { invalidateSearch } from '@/features/bible/search';
import { storeMediaFile } from '@/features/library/media';
import { loadBackgrounds, type BackgroundEntry } from '@/features/library/backgrounds';
import { useAsset } from '@/slides/useAsset';
import { OVERLAY_MODES, TEMPLATE_IDS, type OverlayMode, type UiMode } from '@/schema/common';
import { getTemplate } from '@/templates/templates';
import { downloadBackup, restoreBackup } from './backup';
import { useSettings } from './settingsStore';
import { ReadingSection, TipsSection } from './MeSections';
import { RemindersSection } from '@/features/reminders/RemindersSection';
import { Section } from './Section';
import { InstallSection } from './InstallSection';
import { AccountSection } from '@/features/account/AccountSection';
import { PrivacySection } from '@/features/insights/PrivacySection';
import { LAMPSTAND_PLANS, OPEN_CONTENT } from './credits';
import styles from './SettingsPage.module.css';

const OVERLAY_LABELS: Record<OverlayMode, string> = {
  lowerThird: 'Lower third',
  sidePanel: 'Side panel',
  fullScreen: 'Full screen',
  popup: 'Popup',
};

/** Profile › Settings: how Lampstand reads, looks and presents, and your data. */
export function SettingsPage() {
  const screen = useSettings((s) => s.features.screen);
  const phone = useIsPhone();
  const [detail, setDetail] = useState<'translations' | 'credits' | null>(null);
  return (
    <div className={styles.sections}>
      <AccountSection />
      <ReadingSection />
      <RemindersSection />
      <InstallSection />
      <AppearanceSection />
      {/* TV settings belong to the laptop that runs the screen, not to the phone. */}
      {screen && (
        <div className="laptop-only">
          <PresentingSection />
        </div>
      )}
      {screen && (
        <div className="laptop-only">
          <LogoSection />
        </div>
      )}
      <TipsSection />
      <PrivacySection />
      {phone ? (
        <>
          <Section title="Translations and data">
            <button className={styles.detailRow} onClick={() => setDetail('translations')}>
              <span>
                <strong>Translations</strong>
                <small>Three offline translations, plus NLT when connected</small>
              </span>
              <ChevronRight size={18} aria-hidden />
            </button>
            <DataSection embedded />
          </Section>
          <Section title="About">
            <Link className={styles.detailRow} to="/privacy">
              <span>Privacy, data and support</span>
              <ChevronRight size={18} aria-hidden />
            </Link>
            <button className={styles.detailRow} onClick={() => setDetail('credits')}>
              <span>Credits and licences</span>
              <ChevronRight size={18} aria-hidden />
            </button>
          </Section>
          <Dialog
            open={detail !== null}
            onOpenChange={(open) => {
              if (!open) setDetail(null);
            }}
            title={detail === 'translations' ? 'Translations' : 'Credits and licences'}
          >
            {detail === 'translations' ? (
              <TranslationsSection />
            ) : (
              <>
                <CreditsSection />
                <AboutSection />
              </>
            )}
          </Dialog>
        </>
      ) : (
        <>
          <TranslationsSection />
          <DataSection />
          <CreditsSection />
          <AboutSection />
        </>
      )}
    </div>
  );
}

function PresentingSection() {
  const s = useSettings();
  const translations = useBible((b) => b.translations);
  return (
    <Section
      title="Presenting"
      description="Defaults for Screen, used when slides don’t choose their own."
    >
      <div className={styles.grid3}>
        <Select
          label="Default translation"
          value={s.defaultTranslation}
          onChange={(v) => void s.set('defaultTranslation', v)}
          options={translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }))}
        />
        <Select
          label="Default template"
          value={s.defaultTheme}
          onChange={(v) => void s.set('defaultTheme', v)}
          options={TEMPLATE_IDS.map((t) => ({
            value: t,
            label: getTemplate(t).name,
            description: getTemplate(t).mood,
          }))}
        />
        <Select
          label="Default verse overlay"
          value={s.defaultOverlayMode}
          onChange={(v) => void s.set('defaultOverlayMode', v)}
          options={OVERLAY_MODES.map((m) => ({ value: m, label: OVERLAY_LABELS[m] }))}
        />
      </div>
    </Section>
  );
}

function AppearanceSection() {
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const set = useSettings((s) => s.set);
  return (
    <Section
      title="Appearance"
      description="Light mode is enabled. Dark and System modes are temporarily unavailable."
    >
      <div className={styles.segmented} role="radiogroup" aria-label="App appearance">
        {(['light', 'dark', 'system'] as UiMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={m === 'light'}
            disabled={m !== 'light'}
            className={styles.segment}
            onClick={() => void set('uiMode', m)}
          >
            {m === 'light' ? 'Light' : m === 'dark' ? 'Dark' : 'System'}
          </button>
        ))}
      </div>
      <Toggle
        checked={reduceMotion}
        onChange={(v) => void set('reduceMotion', v)}
        label="Reduce motion"
        description="Replace movement with short crossfades everywhere, including the TV. Lampstand also follows your computer’s setting."
      />
    </Section>
  );
}

function LogoSection() {
  const logoAssetId = useSettings((s) => s.logoAssetId);
  const set = useSettings((s) => s.set);
  const asset = useAsset(logoAssetId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Choose an image file for the logo.', tone: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await set('logoAssetId', await storeMediaFile(file));
      toast({ title: 'Logo updated', tone: 'success' });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Could not use that image.',
        tone: 'warning',
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Section
      title="Logo screen"
      description="Shown on the TV when you press L. A transparent PNG works best."
    >
      <div className={styles.logoRow}>
        <div className={styles.logoPreview} aria-label="Logo screen preview" role="img">
          {logoAssetId && asset ? (
            <img src={asset.url} alt="" />
          ) : (
            <LampLockup layout="stacked" size={72} className={styles.logoMark} title="Lampstand" />
          )}
        </div>
        <div className={styles.row}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            aria-label="Choose a logo image"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
          <Button
            icon={<ImagePlus size={16} />}
            loading={busy}
            onClick={() => fileRef.current?.click()}
          >
            {logoAssetId ? 'Replace logo…' : 'Upload logo…'}
          </Button>
          {logoAssetId && (
            <Button
              variant="ghost"
              icon={<Trash2 size={16} />}
              onClick={() => void set('logoAssetId', null)}
            >
              Use the Lampstand mark
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}

function TranslationsSection() {
  const translations = useBible((s) => s.translations);
  const importFile = useBible((s) => s.importFile);
  const remove = useBible((s) => s.remove);
  const defaultTranslation = useSettings((s) => s.defaultTranslation);
  const set = useSettings((s) => s.set);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const t = await importFile(file);
      void invalidateSearch(t.code);
      toast({ title: `Added ${t.name} (${t.code})`, tone: 'success' });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Could not import that file.',
        tone: 'warning',
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemove = async (code: string) => {
    await remove(code);
    void invalidateSearch(code);
    if (defaultTranslation === code) await set('defaultTranslation', 'KJV');
    toast({ title: `Removed ${code}` });
  };

  return (
    <Section
      title="Translations"
      description="BSB, KJV and WEB are built in for offline reading. NLT is licensed through API.Bible and needs a connection to refresh cached chapters."
    >
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Installed Bible translations"
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>License</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {translations.map((t) => (
              <tr key={t.code}>
                <td>
                  <strong>{t.code}</strong>
                </td>
                <td>
                  {t.name}{' '}
                  {t.code === defaultTranslation && (
                    <Chip tone="accent" className={styles.inlineChip}>
                      Default
                    </Chip>
                  )}
                </td>
                <td className={styles.muted}>{t.license}</td>
                <td className={styles.right}>
                  {t.bundled ? (
                    <span className={styles.muted}>Built in</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => void onRemove(t.code)}
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.row}>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          aria-label="Choose a translation file"
          onChange={(e) => void onImport(e.target.files?.[0])}
        />
        <Button
          icon={<BookPlus size={16} />}
          loading={busy}
          onClick={() => fileRef.current?.click()}
        >
          Import translation…
        </Button>
      </div>
    </Section>
  );
}

function DataSection({ embedded = false }: { embedded?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined)
        setUsage(`${(e.usage / 1024 / 1024).toFixed(0)} MB used on this device`);
    });
  }, []);

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadBackup();
      toast({
        title: 'Backup saved',
        description:
          'Includes your journal, notes, highlights, bookmarks, plan progress, reading positions, preferences and slides.',
        tone: 'success',
      });
    } finally {
      setExporting(false);
    }
  };

  const onRestore = async (file: File | undefined) => {
    if (!file) return;
    setRestoring(true);
    try {
      const s = await restoreBackup(file);
      toast({
        title: 'Backup restored',
        description: `${s.added} added, ${s.updated} updated, ${s.skipped} unchanged.${s.study ? ` ${s.study} Bible notes, plans and journal entries restored.` : ''}`,
        tone: 'success',
      });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Could not restore that file.',
        tone: 'warning',
      });
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const controls = (
    <div className={embedded ? styles.mobileData : undefined}>
      <div className={styles.row}>
        <Button icon={<Download size={16} />} loading={exporting} onClick={() => void onExport()}>
          Export backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          aria-label="Choose a backup file"
          onChange={(e) => void onRestore(e.target.files?.[0])}
        />
        <Button
          variant="ghost"
          icon={<Upload size={16} />}
          loading={restoring}
          onClick={() => fileRef.current?.click()}
        >
          Import backup…
        </Button>
        {usage && <span className={cx(styles.muted, styles.usage)}>{usage}</span>}
      </div>
      <p className={styles.small}>
        Your backup includes journal entries, notes, highlights, bookmarks, plan progress, reading
        positions, preferences and slides. Keep a copy before changing devices. Import merges
        saved content, restores backed-up preferences and fills missing reading positions without
        deleting existing entries.
      </p>
    </div>
  );
  return embedded ? (
    controls
  ) : (
    <Section
      title="Data"
      description="Everything stays on this device. Export a backup before changing computers, and keep it somewhere safe."
    >
      {controls}
    </Section>
  );
}

function AboutSection() {
  return (
    <Section
      title="About Lampstand"
      description={`Version ${__APP_VERSION__}. “Thy word is a lamp unto my feet” (Psalm 119:105).`}
    >
      <p className={styles.small}>
        Lampstand keeps everything on this device. It is built on open content, credited under
        Credits and licences.
      </p>
      <p className={styles.small}>
        <Link to="/privacy">Privacy, data and support</Link>
      </p>
    </Section>
  );
}

/** Settings › Credits and licences: every translation, source, photo and font we build on. */
function CreditsSection() {
  const [backgrounds, setBackgrounds] = useState<BackgroundEntry[]>([]);
  const all = useBible((s) => s.translations);
  const translations = useMemo(() => all.filter((t) => t.bundled), [all]);
  useEffect(() => {
    void loadBackgrounds().then(setBackgrounds);
  }, []);
  return (
    <Section
      title="Credits and licences"
      description="Lampstand stands on the generous work of others. Thank you."
    >
      <details className={styles.details} open>
        <summary>Bible translations</summary>
        <ul>
          {translations.map((t) => (
            <li key={t.code}>
              <strong>{t.name}</strong> — {t.license} Source: {t.source}.
            </li>
          ))}
        </ul>
      </details>
      <details className={styles.details} open>
        <summary>Study and plan content</summary>
        <ul>
          {OPEN_CONTENT.map((c) => (
            <li key={c.name}>
              <strong>{c.name}</strong> — {c.what} By {c.by}. {c.license}.{' '}
              <a href={c.url} target="_blank" rel="noreferrer">
                Source
              </a>
            </li>
          ))}
          <li>{LAMPSTAND_PLANS}</li>
        </ul>
      </details>
      <details className={styles.details}>
        <summary>Background photos</summary>
        <ul>
          {backgrounds.map((b) => (
            <li key={b.id}>
              {b.description} — {b.author || 'Unknown'}, {b.license}, via Wikimedia Commons.
            </li>
          ))}
        </ul>
      </details>
      <details className={styles.details}>
        <summary>Fonts, icons and software</summary>
        <ul>
          <li>Plus Jakarta Sans, Inter and Fraunces — SIL Open Font License.</li>
          <li>Lucide icons — ISC License.</li>
          <li>Bible reference parsing — bible-passage-reference-parser (MIT).</li>
        </ul>
      </details>
    </Section>
  );
}
