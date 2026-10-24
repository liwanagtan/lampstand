import { FAITH_JOURNEYS, faithJourneys } from '@/app/faithJourney';
import { useState } from 'react';
import { useIsPhone } from '@/app/useIsPhone';
import { Link, useNavigate } from 'react-router-dom';
import { queueTour } from '@/features/tour/tour';
import { TIPS } from '@/features/tips/tips';
import { canPreviewTips, isTipsPreview, setTipsPreview } from '@/features/tips/tipLog';
import { paths } from '@/app/paths';
import { Check, ChevronRight } from 'lucide-react';
import { Button, Input, Select, Sheet, Toggle } from '@/design-system/components';
import {
  PART_LABELS,
  USE_CASES,
  useCaseState,
  type FeatureKey,
  type UseCase,
} from '@/app/features';
import { useBible } from '@/features/bible/bibleStore';
import { useReader } from '@/features/bible-app/readerStore';
import { TextSize } from '@/features/bible-app/ReadingSettings';
import { Avatar } from '@/features/profile/Avatar';
import { AVATAR_COLORS } from '@/features/profile/avatarColors';
import { useJourneyStats } from '@/features/profile/useJourneyStats';
import { Section } from './Section';
import { useSettings } from './settingsStore';
import styles from './SettingsPage.module.css';

/** Profile › You: your name and colour. Becomes the signed-in account in v2. */
export function YouSection() {
  const phone = useIsPhone();
  const profile = useSettings((s) => s.profile);
  const set = useSettings((s) => s.set);
  const [name, setName] = useState(profile.name);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const stats = useJourneyStats();
  const selectedJourneys = faithJourneys(profile.faithJourney);
  return (
    <Section profile title={phone ? 'Your name' : 'You'}>
      <div className={styles.you}>
        <Avatar size={48} />
        <Input
          label="Your name"
          hideLabel={phone}
          value={name}
          maxLength={40}
          placeholder="What should Lampstand call you?"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void set('profile', { ...profile, name: name.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={styles.grow}
        />
      </div>
      <div className={styles.faithSummary}>
        <div>
          <strong>Your faith journey</strong>
          <p>
            {selectedJourneys.length
              ? FAITH_JOURNEYS.filter((option) => selectedJourneys.includes(option.value))
                  .map((option) => option.label)
                  .join(' · ')
              : 'Choose what describes you today.'}
          </p>
        </div>
        <button
          type="button"
          className={styles.customize}
          aria-haspopup="dialog"
          onClick={() => setJourneyOpen(true)}
        >
          Change
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      <Sheet
        open={journeyOpen}
        onOpenChange={setJourneyOpen}
        title="Your faith journey"
        description="Choose any that describe you today. Lampstand suggests plans to match."
        footer={
          <Button variant="primary" onClick={() => setJourneyOpen(false)}>
            Done
          </Button>
        }
      >
        <div className={styles.choiceList} role="group" aria-label="Your faith journey">
          {FAITH_JOURNEYS.map((option) => {
            const on = selectedJourneys.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={styles.choice}
                onClick={() =>
                  void set('profile', {
                    ...profile,
                    faithJourney: on
                      ? selectedJourneys.filter((value) => value !== option.value)
                      : [...selectedJourneys, option.value],
                  })
                }
              >
                <span className={styles.choiceText}>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
                <span className={styles.choiceCheck} aria-hidden>
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </Sheet>
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
      profile
      title="What I use Lampstand for"
      description="Switch parts on or off. Nothing you wrote is lost."
    >
      <div className={styles.uses}>
        {USE_CASES.map((u) => (
          <UseCaseSwitch key={u.id} useCase={u} />
        ))}
      </div>
    </Section>
  );
}

const PART_DETAILS: Record<FeatureKey, string> = {
  today: 'The verse of the day and your next reading',
  plans: 'Reading plans and your progress',
  journal: 'Reflections and your journal, in Journey',
  marks: 'Highlight, bookmark and note as you read',
  screen: 'Scripture and slides on a TV',
};

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
        description={u.summary}
      />
      {u.id === 'teach' && features.screen && (
        <Link to={paths.screen} className={styles.mobileOpenScreen}>
          Open Screen
        </Link>
      )}
      {u.parts.length > 1 && (
        <>
          <button
            type="button"
            className={styles.customize}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            Customize
            <ChevronRight size={14} aria-hidden />
          </button>
          <Sheet
            open={open}
            onOpenChange={setOpen}
            title={u.title}
            description="Choose which parts to show. Switching one off hides it; nothing you wrote is lost."
            footer={
              <Button variant="primary" onClick={() => setOpen(false)}>
                Done
              </Button>
            }
          >
            <div className={styles.parts}>
              {u.parts.map((p) => (
                <Toggle
                  key={p}
                  checked={features[p]}
                  onChange={(on) => setParts([p], on)}
                  label={PART_LABELS[p]}
                  description={PART_DETAILS[p]}
                />
              ))}
            </div>
          </Sheet>
        </>
      )}
    </div>
  );
}

/** Settings › Reading: how the Bible reads, everywhere it appears. */
export function ReadingSection() {
  const phone = useIsPhone();
  const translation = useReader((s) => s.translation);
  const parallel = useReader((s) => s.parallel);
  const translations = useBible((b) => b.translations);
  const options = translations.map((t) => ({
    value: t.code,
    label: phone ? t.code : `${t.code} — ${t.name}`,
  }));
  const classic = useSettings((s) => s.classicDevotional);
  const studyNotes = useSettings((s) => s.studyNotes);
  const foundations = useSettings((s) => s.faithFoundations);
  const set = useSettings((s) => s.set);
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
      </div>
      <div className={styles.textSize}>
        <TextSize />
      </div>
      <Toggle
        checked={classic}
        onChange={(on) => void set('classicDevotional', on)}
        label="Classic devotional on Today"
        description={
          phone
            ? 'Spurgeon’s Morning and Evening (1865)'
            : "Spurgeon's Morning and Evening (1865): a short reading each morning and evening."
        }
      />
      <Toggle
        checked={foundations}
        onChange={(on) => void set('faithFoundations', on)}
        label="Faith Foundations on Today"
        description={
          phone
            ? 'A short guide to the good news of Jesus'
            : 'Understanding salvation: a short guide to the good news of Jesus, read at your own pace.'
        }
      />
      <Toggle
        checked={studyNotes}
        onChange={(on) => void set('studyNotes', on)}
        label="Study notes and word study"
        description={
          phone
            ? 'Notes beside the verses, and the Hebrew or Greek behind a word'
            : 'Tyndale Open Study Notes beside the verses, and word study: the Hebrew or Greek behind a word, what it means, and where else it’s used.'
        }
      />
    </Section>
  );
}

/**
 * Settings › Tips: one switch for Ember's tips, the way back into the tour, and the tips already
 * seen, so one closed too quickly can be read again.
 */
export function TipsSection() {
  const tips = useSettings((s) => s.tips);
  const set = useSettings((s) => s.set);
  const phone = useIsPhone();
  const navigate = useNavigate();
  const seen = TIPS.filter((t) => tips.seen[t.id]);
  const [preview, setPreview] = useState(isTipsPreview);
  return (
    <Section title="Tips">
      <Toggle
        checked={tips.enabled}
        onChange={(enabled) => void set('tips', { ...tips, enabled })}
        label="Tips from Ember"
        description="Now and then, a short tip after you try something new. At most one a week, never while presenting."
      />
      {canPreviewTips() && (
        <Toggle
          checked={preview}
          onChange={(on) => {
            setTipsPreview(on);
            setPreview(on);
            if (on && !tips.enabled) void set('tips', { ...tips, enabled: true });
          }}
          label="Try every tip now (staging)"
          description="For reviewing: each tip shows the moment you do its thing, with no first-day wait or week between tips. Only on this computer and the staging site."
        />
      )}
      {seen.length > 0 && (
        <details className={styles.seenTips}>
          <summary>
            Tips you have seen · {seen.length} of {TIPS.length}
          </summary>
          <ul>
            {seen.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong>
                <span>{t.body}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {phone && (
        <Button
          variant="secondary"
          onClick={() => {
            queueTour();
            navigate(paths.today);
          }}
        >
          Replay the tour
        </Button>
      )}
    </Section>
  );
}
