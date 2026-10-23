import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Input, cx } from '@/design-system/components';
import { FlameCompanion } from '@/design-system/FlameCompanion';
import { LampLockup, AnimatedLampMark } from '@/design-system/LampMark';
import { USE_CASES, featuresFor, type UseCaseId } from '@/app/features';
import { suggestedPlan, type FaithJourney } from '@/app/faithJourney';
import { paths } from '@/app/paths';
import { markOnboarded } from '@/app/onboarding';
import { builtinPlans, startPlan } from '@/features/bible-app/plans';
import { useAccount } from '@/features/account/accountStore';
import { useSettings } from '@/features/settings/settingsStore';
import {
  useApplyDocumentTheme,
  useReducedMotion,
  useStatusBarColor,
} from '@/features/settings/theme';
import styles from './WelcomePage.module.css';
import { colors } from '@/design-system/tokens';
import { track } from '@/features/insights/insights';

// Welcome has its own dark palette; the rest of the app remains light.
const welcomePalette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

type Step = 'name' | 'uses' | 'start';

/** Where you are, each with the plan that fits it (src/app/faithJourney.ts). */
const STARTS: readonly { journey: FaithJourney; title: string }[] = [
  { journey: 'exploring', title: 'Exploring who Jesus is' },
  { journey: 'new', title: 'Taking my first steps' },
  { journey: 'returning', title: 'Coming back to God' },
  { journey: 'growing', title: 'Building a daily rhythm' },
  { journey: 'deepening', title: 'Going deeper' },
];
// Someone exploring or new to faith begins with Understanding salvation on Today, not a plan.
const SALVATION_FIRST: ReadonlySet<FaithJourney> = new Set(['exploring', 'new']);
const SALVATION_DETAIL: Partial<Record<FaithJourney, string>> = {
  exploring: 'Who Jesus is and why he came',
  new: 'The good news, one step at a time',
};
const VERSE_ONLY = 'verse';
// Long enough to meet the flame and see what is being prepared.
const SETUP_DURATION_MS = 5000;

/** A first name from the Google profile, when signed in. */
function googleFirstName(meta: Record<string, unknown> | undefined): string {
  const given = typeof meta?.given_name === 'string' ? meta.given_name : '';
  const full = typeof meta?.full_name === 'string' ? meta.full_name : '';
  return (given || full.split(/\s+/)[0] || '').slice(0, 40);
}

/**
 * First run, in at most three steps: your name (from Google when signed in), what brings you
 * here, and where to start. Translation and everything else can change later in the reader and
 * Profile.
 */
export function WelcomePage() {
  useApplyDocumentTheme();
  useStatusBarColor(colors.dark.bg);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const googleName = useAccount((s) => googleFirstName(s.user?.user_metadata));
  const saving = useRef(false);
  const main = useRef<HTMLElement>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [name, setName] = useState(googleName);
  // Google already told us the name; it can be changed in Profile.
  const askName = !googleName;
  const [step, setStep] = useState<Step>(askName ? 'name' : 'uses');
  useEffect(() => track('welcome_started'), []);
  useEffect(() => {
    main.current?.scrollTo?.({ top: 0 });
    main.current?.querySelector('h1')?.focus({ preventScroll: true });
  }, [step]);
  const [uses, setUses] = useState<Set<UseCaseId>>(new Set());
  const [start, setStart] = useState<FaithJourney | typeof VERSE_ONLY | null>(null);
  const plansById = new Map(builtinPlans().map((p) => [p.id, p]));
  const startPlanId = (journey: FaithJourney) => {
    if (SALVATION_FIRST.has(journey)) return null;
    const id = suggestedPlan(journey);
    return id && plansById.has(id) ? id : null;
  };

  // Where to start only matters for daily growth.
  const steps: Step[] = [
    ...(askName ? (['name'] as const) : []),
    'uses',
    ...(uses.has('grow') ? (['start'] as const) : []),
  ];
  const index = steps.indexOf(step);
  const last = index === steps.length - 1;

  const complete = async () => {
    if (!name.trim()) {
      setStep('name');
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setSetupError('');
    setSettingUp(true);
    const started = Date.now();
    try {
      const journey = start && start !== VERSE_ONLY ? start : null;
      const planToStart = journey ? startPlanId(journey) : null;
      const features = featuresFor(uses.size ? uses : ['grow']);
      features.today = true;
      if (planToStart) features.plans = true;
      const settings = useSettings.getState();
      await settings.set('profile', {
        ...settings.profile,
        name: name.trim(),
        faithJourney: journey ? [journey] : [],
      });
      await settings.set('features', features);
      if (planToStart) await startPlan(planToStart);
      // Give the short handoff time to read; never show invented percentage progress.
      const remaining = SETUP_DURATION_MS - (Date.now() - started);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      markOnboarded();
      track('welcome_completed');
      navigate(paths.today, { replace: true });
    } catch {
      setSetupError('We couldn’t finish setting things up. Please try again.');
      setSettingUp(false);
    } finally {
      saving.current = false;
    }
  };

  const next = () => (last ? void complete() : setStep(steps[index + 1]!));
  const canContinue =
    name.trim().length > 0 &&
    (step !== 'uses' || uses.size > 0) &&
    (step !== 'start' || start !== null);
  const toggle = (id: UseCaseId) =>
    setUses((u) => {
      const n = new Set(u);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (settingUp) {
    return (
      <div className={cx(styles.page, styles.setupPage)} style={welcomePalette}>
        <SetupPreview
          reduced={reduced}
          prepared={[
            'A daily verse to encourage you',
            start && start !== VERSE_ONLY && SALVATION_FIRST.has(start)
              ? 'Understanding salvation, to begin'
              : start && start !== VERSE_ONLY && startPlanId(start)
                ? `${plansById.get(startPlanId(start)!)!.name}, ready when you are`
                : 'Reading plans for whenever you’re ready',
            'A private place to reflect',
          ]}
        />
      </div>
    );
  }

  return (
    <div className={styles.page} style={welcomePalette} data-step={step}>
      <header className={styles.top}>
        <span className={styles.desktopLockup}>
          <LampLockup size={30} title="Lampstand" />
        </span>
      </header>
      <main ref={main} className={styles.main}>
        <motion.form
          key={step}
          className={styles.card}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) next();
          }}
        >
          {step === 'name' && (
            <>
              <div className={styles.mobileMark}>
                <AnimatedLampMark size={150} title="Lampstand" />
              </div>
              <h1 tabIndex={-1} className={styles.title}>
                What should we call you?
              </h1>
              <div className={styles.nameField}>
                <Input
                  label="What should we call you?"
                  hideLabel
                  required
                  autoComplete="given-name"
                  maxLength={40}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.nameInput}
                />
              </div>
            </>
          )}

          {step === 'uses' && (
            <>
              <h1 tabIndex={-1} className={styles.title}>
                What brings you here?
              </h1>
              <p className={styles.lede}>Pick any.</p>
              <div className={styles.uses} role="group" aria-label="What brings you here?">
                {USE_CASES.map((u) => {
                  const on = uses.has(u.id);
                  return (
                    <label key={u.id} className={cx(styles.use, on && styles.useOn)}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(u.id)}
                        className={styles.checkbox}
                      />
                      <span className={styles.check} aria-hidden>
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className={styles.useText}>
                        <span className={styles.useTitle}>{u.title}</span>
                        <span className={styles.useBody}>{u.summary}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {step === 'start' && (
            <>
              <h1 tabIndex={-1} className={styles.title}>
                Where would you like to start?
              </h1>
              <div className={styles.options} role="radiogroup" aria-label="Where to start">
                {STARTS.flatMap(({ journey, title }) => {
                  const id = startPlanId(journey);
                  const detail = SALVATION_FIRST.has(journey)
                    ? SALVATION_DETAIL[journey]
                    : id && plansById.get(id)!.name;
                  return detail
                    ? [
                        <button
                          key={journey}
                          type="button"
                          role="radio"
                          aria-checked={start === journey}
                          className={styles.option}
                          onClick={() => setStart(journey)}
                        >
                          <span className={styles.optionText}>
                            <span className={styles.optionTitle}>{title}</span>
                            <span className={styles.optionDescription}>{detail}</span>
                          </span>
                        </button>,
                      ]
                    : [];
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={start === VERSE_ONLY}
                  className={styles.option}
                  onClick={() => setStart(VERSE_ONLY)}
                >
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>Just the verse of the day</span>
                  </span>
                </button>
              </div>
            </>
          )}

          {setupError && (
            <p role="alert" className={styles.lede}>
              {setupError}
            </p>
          )}
          <div className={styles.actions}>
            {index > 0 && (
              <Button
                variant="ghost"
                icon={<ArrowLeft size={16} />}
                onClick={() => setStep(steps[index - 1]!)}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              iconEnd={last ? undefined : <ArrowRight size={16} />}
              disabled={!canContinue}
              className={styles.continue}
            >
              {last ? 'Let’s begin' : 'Continue'}
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}

/** The handoff to Today: the flame, and what is being prepared, one line at a time. */
function SetupPreview({ reduced, prepared }: { reduced: boolean; prepared: string[] }) {
  const [stage, setStage] = useState(reduced ? prepared.length - 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const timers = prepared
      .slice(1)
      .map((_, i) => setTimeout(() => setStage(i + 1), (i + 1) * 1400));
    return () => timers.forEach(clearTimeout);
  }, [prepared, reduced]);
  return (
    <motion.main
      className={styles.setup}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      tabIndex={-1}
      ref={(element) => element?.focus()}
    >
      <FlameCompanion mood="celebrate" size={150} />
      <h1 className={styles.title}>Getting Today ready…</h1>
      <div className={styles.setupExpectations} role="status" aria-live="polite">
        {prepared.map((text, i) => (
          <p key={text} className={cx(styles.setupExpectation, i <= stage && styles.setupRevealed)}>
            <Check size={16} aria-hidden />
            {text}
          </p>
        ))}
      </div>
    </motion.main>
  );
}
