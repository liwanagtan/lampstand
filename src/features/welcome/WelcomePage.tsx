import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Input, cx } from '@/design-system/components';
import { FlameCompanion } from '@/design-system/FlameCompanion';
import { LampLockup, AnimatedLampMark } from '@/design-system/LampMark';
import { USE_CASES, featuresFor, type UseCaseId } from '@/app/features';
import { FAITH_JOURNEYS, suggestedPlanIds, type FaithJourney } from '@/app/faithJourney';
import { paths } from '@/app/paths';
import { markOnboarded } from '@/app/onboarding';
import { useBible } from '@/features/bible/bibleStore';
import { builtinPlans, startPlan } from '@/features/bible-app/plans';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';
import { useApplyDocumentTheme, useReducedMotion } from '@/features/settings/theme';
import styles from './WelcomePage.module.css';
import { colors } from '@/design-system/tokens';
import { track } from '@/features/insights/insights';

// Welcome has its own dark palette; the rest of the app remains light.
const welcomePalette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

type Step = 'name' | 'uses' | 'journey' | 'translation' | 'plan';

/** Plans offered at the end of onboarding: a gentle start first. */
const STARTER_PLANS = ['gospels-40', 'psalms-proverbs-30', 'nt-90'];
const SETUP_DURATION_MS = 5000;

/**
 * First run: your name, what brings you to Lampstand, your translation, and a plan. Only what
 * you tick is switched on; everything else stays one tap away in Profile.
 */
export function WelcomePage() {
  useApplyDocumentTheme();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const translations = useBible((s) => s.translations);
  const saving = useRef(false);
  const main = useRef<HTMLElement>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  useEffect(() => track('welcome_started'), []);
  useEffect(() => {
    main.current?.scrollTo?.({ top: 0 });
    main.current?.querySelector('h1')?.focus({ preventScroll: true });
  }, [step]);
  const [uses, setUses] = useState<Set<UseCaseId>>(new Set());
  const [translation, setTranslation] = useState(useReader.getState().translation);
  const [plan, setPlan] = useState<string | null>(null);
  const [planTouched, setPlanTouched] = useState(false);
  const [journey, setJourney] = useState<FaithJourney[]>([]);
  const recommended = suggestedPlanIds(journey);
  const salvationFirst = journey.includes('new') || journey.includes('exploring');
  const selectedPlan = planTouched ? plan : salvationFirst ? null : (recommended[0] ?? null);
  const starterIds = [...new Set([...recommended, ...STARTER_PLANS])].slice(0, 3);

  const steps: Step[] = ['name', 'uses', 'journey', 'translation', 'plan'];
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
      const planToStart = step === 'plan' ? selectedPlan : null;
      const features = featuresFor(uses.size ? uses : ['grow']);
      features.today = true;
      if (planToStart) features.plans = true;
      const settings = useSettings.getState();
      await settings.set('profile', {
        ...settings.profile,
        name: name.trim(),
        faithJourney: journey,
      });
      await settings.set('features', features);
      await settings.set('defaultTranslation', translation);
      useReader.getState().setTranslation(translation);
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
  const canContinue = name.trim().length > 0 && (step !== 'uses' || uses.size > 0);
  const toggle = (id: UseCaseId) =>
    setUses((u) => {
      const n = new Set(u);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const progressIndicator = (
    <p className={styles.progress} aria-label={`Step ${index + 1} of ${steps.length}`}>
      {String(index + 1).padStart(2, '0')} <span aria-hidden> / </span>
      {String(steps.length).padStart(2, '0')}
    </p>
  );

  if (settingUp) {
    return (
      <div className={cx(styles.page, styles.setupPage)} style={welcomePalette}>
        <SetupPreview hasPlan={step === 'plan' && Boolean(selectedPlan)} reduced={reduced} />
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
          {progressIndicator}
          {step === 'name' && (
            <>
              <div className={styles.mobileMark}>
                <AnimatedLampMark size={150} title="Lampstand" />
              </div>
              <h1 tabIndex={-1} className={styles.title}>
                Make Lampstand yours
              </h1>
              <p className={styles.lede}>Let’s start with your name.</p>
              <div className={styles.nameField}>
                <Input
                  label="What should we call you?"
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
                What brings you to Lampstand?
              </h1>
              <p className={styles.lede}>
                Choose what you’d like to do. You can pick more than one.
              </p>
              <div className={styles.uses} role="group" aria-label="What brings you to Lampstand?">
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
                        <span className={styles.useBody}>
                          {
                            {
                              grow: 'Daily verse, plans and journal',
                              study: 'Read, search and save notes',
                              teach: 'Present Scripture and slides',
                            }[u.id]
                          }
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {step === 'journey' && (
            <>
              <h1 tabIndex={-1} className={styles.title}>
                Where are you in your faith journey?
              </h1>
              <p className={styles.lede}>Choose any that fit. This is optional.</p>
              <div className={styles.options} role="group" aria-label="Your faith journey">
                {FAITH_JOURNEYS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={journey.includes(option.value)}
                    className={styles.option}
                    onClick={() =>
                      setJourney((current) =>
                        current.includes(option.value)
                          ? current.filter((value) => value !== option.value)
                          : [...current, option.value],
                      )
                    }
                  >
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>{option.label}</span>
                    </span>
                    <span className={styles.choiceIndicator} aria-hidden>
                      <Check size={13} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'translation' && (
            <>
              <h1 tabIndex={-1} className={styles.title}>
                Which Bible do you read?
              </h1>
              <p className={styles.lede}>You can change this later.</p>
              <div className={styles.options} role="radiogroup" aria-label="Bible translation">
                {translations.map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    role="radio"
                    aria-checked={translation === t.code}
                    className={styles.option}
                    onClick={() => setTranslation(t.code)}
                  >
                    <span className={styles.optionCode}>{t.code}</span>
                    <span>
                      {t.name}
                      {t.code === 'NLT' ? ' · Internet needed' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'plan' && (
            <>
              <h1 tabIndex={-1} className={styles.title}>
                Start a reading plan?
              </h1>
              <p className={styles.lede}>
                {salvationFirst
                  ? 'Start with Understanding salvation on Today. You can add a reading plan whenever you’re ready.'
                  : 'Choose one for now, or start with the daily verse.'}
              </p>
              <div className={styles.options} role="radiogroup" aria-label="Reading plan">
                {builtinPlans()
                  .filter((p) => starterIds.includes(p.id))
                  .sort((a, b) => starterIds.indexOf(a.id) - starterIds.indexOf(b.id))
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedPlan === p.id}
                      className={styles.option}
                      onClick={() => {
                        setPlan(p.id);
                        setPlanTouched(true);
                      }}
                    >
                      <span className={styles.optionText}>
                        <span className={styles.optionTitle}>
                          {p.name}
                          {recommended[0] === p.id && (
                            <small className={styles.recommendation}>For you</small>
                          )}
                        </span>
                      </span>
                    </button>
                  ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === null}
                  className={styles.option}
                  onClick={() => {
                    setPlan(null);
                    setPlanTouched(true);
                  }}
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
              {last ? 'Complete setup' : 'Continue'}
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}

/** A short preview of Today, not simulated saving percentages. */
function SetupPreview({ hasPlan, reduced }: { hasPlan: boolean; reduced: boolean }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const second = setTimeout(() => setStage(1), 1500);
    const third = setTimeout(() => setStage(2), 3000);
    return () => {
      clearTimeout(second);
      clearTimeout(third);
    };
  }, []);
  const expectations = [
    'A daily verse to encourage you',
    hasPlan ? 'Your chosen plan, ready when you are' : 'Reading plans to help you grow',
    'A place to reflect and follow your journey',
  ];
  return (
    <motion.main
      className={styles.setup}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      tabIndex={-1}
      ref={(element) => element?.focus()}
    >
      <FlameCompanion mood="celebrate" size={150} />
      <h1 tabIndex={-1} className={styles.title}>
        Preparing your daily reading…
      </h1>
      <p className={styles.lede}>Here’s what’s waiting for you on Today.</p>
      <div className={styles.setupExpectations}>
        {expectations.map((text, i) => (
          <p key={text} className={cx(styles.setupExpectation, i <= stage && styles.setupRevealed)}>
            <Check size={16} aria-hidden />
            {text}
          </p>
        ))}
      </div>
      <p className={styles.setupStatus} role="status" aria-live="polite">
        {
          [
            'Getting your reading space ready…',
            'A little encouragement, every day.',
            'Taking you to Today…',
          ][stage]
        }
      </p>
    </motion.main>
  );
}
