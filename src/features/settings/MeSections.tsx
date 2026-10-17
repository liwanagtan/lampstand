import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input, Select, Toggle, cx } from '@/design-system/components';
import {
  PART_LABELS,
  USE_CASES,
  useCaseState,
  type FeatureKey,
  type UseCase,
} from '@/app/features';
import { useBible } from '@/features/bible/bibleStore';
import { READER_SIZES, useReader } from '@/features/bible-app/readerStore';
import { Avatar } from '@/features/profile/Avatar';
import { AVATAR_COLORS } from '@/features/profile/avatarColors';
import { useJourneyStats } from '@/features/profile/useJourneyStats';
import { Section } from './Section';
import { useSettings } from './settingsStore';
import styles from './SettingsPage.module.css';

/** Profile › You: your name and colour. Becomes the signed-in account in v2. */
export function YouSection() {
  const profile = useSettings((s) => s.profile);
  const set = useSettings((s) => s.set);
  const [name, setName] = useState(profile.name);
  const stats = useJourneyStats();
  return (
    <Section title="You" description="Today and Profile greet you by name.">
      <div className={styles.you}>
        <Avatar size={48} />
        <Input
          label="Your name"
          value={name}
          maxLength={40}
          placeholder="What should Lampstand call you?"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void set('profile', { ...profile, name: name.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={styles.grow}
        />
      </div>
      <div className={styles.colors} role="radiogroup" aria-label="Avatar colour">
        {AVATAR_COLORS.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={(profile.color ?? 'amber') === color}
            aria-label={label}
            title={label}
            className={styles.colorSwatch}
            data-avatar-color={color}
            onClick={() => void set('profile', { ...profile, color })}
          />
        ))}
      </div>
      {stats?.since && (
        <p className={styles.since}>
          Reading with Lampstand since {sinceFormat.format(stats.since)}
        </p>
      )}
    </Section>
  );
}

const sinceFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

/** Profile › What I use Lampstand for: the onboarding choices, each with Customize. */
export function UsesSection() {
  return (
    <Section
      title="What I use Lampstand for"
      description="Turn parts of Lampstand on or off. Switching off hides them; nothing you wrote is lost. The Bible is always here."
    >
      <div className={styles.uses}>
        {USE_CASES.map((u) => (
          <UseCaseSwitch key={u.id} useCase={u} />
        ))}
      </div>
    </Section>
  );
}

function UseCaseSwitch({ useCase: u }: { useCase: UseCase }) {
  const features = useSettings((s) => s.features);
  const set = useSettings((s) => s.set);
  const [open, setOpen] = useState(false);
  const state = useCaseState(features, u);
  const setParts = (parts: FeatureKey[], on: boolean) =>
    void set('features', { ...features, ...Object.fromEntries(parts.map((p) => [p, on])) });
  return (
    <div className={styles.useCase}>
      <Toggle
        checked={state !== 'off'}
        onChange={(on) => setParts(u.parts, on)}
        label={state === 'some' ? `${u.title} (customised)` : u.title}
        description={`${u.description} ${u.turnsOn}`}
      />
      {u.parts.length > 1 && (
        <>
          <button
            type="button"
            className={styles.customize}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            Customize
            <ChevronDown size={14} className={cx(open && styles.flip)} aria-hidden />
          </button>
          {open && (
            <div className={styles.parts}>
              {u.parts.map((p) => (
                <Toggle
                  key={p}
                  checked={features[p]}
                  onChange={(on) => setParts([p], on)}
                  label={PART_LABELS[p]}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Settings › Reading: how the Bible reads, everywhere it appears. */
export function ReadingSection() {
  const translation = useReader((s) => s.translation);
  const parallel = useReader((s) => s.parallel);
  const size = useReader((s) => s.size);
  const translations = useBible((b) => b.translations);
  const options = translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }));
  return (
    <Section title="Reading" description="Used in the Bible, Today, Plans and Journal.">
      <div className={styles.grid3}>
        <Select
          label="Bible translation"
          value={translation}
          onChange={(v) => useReader.getState().setTranslation(v)}
          options={options}
        />
        <Select
          label="Side-by-side translation"
          value={parallel ?? 'none'}
          onChange={(v) => useReader.getState().setParallel(v === 'none' ? null : v)}
          options={[
            { value: 'none', label: 'None' },
            ...options.filter((o) => o.value !== translation),
          ]}
        />
        <Select
          label="Text size"
          value={String(size)}
          onChange={(v) => useReader.getState().setSize(Number(v))}
          options={READER_SIZES.map((n) => ({ value: String(n), label: `${n} px` }))}
        />
      </div>
    </Section>
  );
}

/** Settings › Tips: the occasional suggestion about something Lampstand can do. */
export function TipsSection() {
  const tips = useSettings((s) => s.tips);
  const set = useSettings((s) => s.set);
  return (
    <Section title="Tips">
      <Toggle
        checked={tips.enabled}
        onChange={(enabled) => void set('tips', { ...tips, enabled })}
        label="Feature tips"
        description="Now and then — at most once a week, never while presenting — Lampstand suggests something it can do."
      />
    </Section>
  );
}
