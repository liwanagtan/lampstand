import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Input, cx } from '@/design-system/components';
import { FlameCompanion } from '@/design-system/FlameCompanion';
import { LampLockup, AnimatedLampMark } from '@/design-system/LampMark';
import { ALL_FEATURES, USE_CASES, featuresFor, type UseCaseId } from '@/app/features';
import { useIsPhone } from '@/app/useIsPhone';
import { FAITH_JOURNEYS, suggestedPlan, type FaithJourney } from '@/app/faithJourney';
import { paths } from '@/app/paths';
import { markOnboarded } from '@/app/onboarding';
import { useBible } from '@/features/bible/bibleStore';
import { builtinPlans, formatDay, startPlan } from '@/features/bible-app/plans';
import { useReader } from '@/features/bible-app/readerStore';
import { useChapter } from '@/features/bible-app/useChapter';
import { useSettings } from '@/features/settings/settingsStore';
import { useApplyDocumentTheme, useReducedMotion } from '@/features/settings/theme';
import styles from './WelcomePage.module.css';
import { colors } from '@/design-system/tokens';

// Welcome has its own dark palette; the rest of the app remains light.
const welcomePalette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

type Step = 'name' | 'uses' | 'journey' | 'translation' | 'plan';

/** Plans offered at the end of onboarding: a gentle start first. */
const STARTER_PLANS = ['gospels-40', 'psalms-proverbs-30', 'nt-90', 'bible-year'];

/**
 * First run: your name, what brings you to Lampstand, your translation, and a plan. Only what
 * you tick is switched on; everything else stays one tap away in Profile.
 */
export function WelcomePage() {
  useApplyDocumentTheme();
  const phone = useIsPhone();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const translations = useBible((s) => s.translations);
  const saving = useRef(false);
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [uses, setUses] = useState<Set<UseCaseId>>(new Set());
  const [translation, setTranslation] = useState(useReader.getState().translation);
  const [plan, setPlan] = useState<string | null>(null);
  const [journey, setJourney] = useState<FaithJourney | undefined>();
  const recommended = suggestedPlan(journey);
  const starterIds = [...new Set([...(recommended ? [recommended] : []), ...STARTER_PLANS])];

  const steps: Step[] = ['name', 'uses', 'journey', 'translation', 'plan'];
  const index = steps.indexOf(step);
  const last = index === steps.length - 1;

  const complete = async (skipChoices = false) => {
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
      const features = skipChoices ? { ...ALL_FEATURES } : featuresFor(uses);
      features.today = true;
      if (!skipChoices && plan) features.plans = true;
      const settings = useSettings.getState();
      await settings.set('profile', {
        ...settings.profile,
        name: name.trim(),
        faithJourney: journey,
      });
      await settings.set('features', features);
      if (!skipChoices) {
        await settings.set('defaultTranslation', translation);
        useReader.getState().setTranslation(translation);
        if (plan) await startPlan(plan);
      }
      // Give the short handoff time to read; never show invented percentage progress.
      const remaining = 3000 - (Date.now() - started);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      markOnboarded();
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
    <div className={styles.progress}>
      <div className={styles.progressCaption}>
        <span>
          {
            [
              'A little about you',
              'Your reading goals',
              'Your faith journey',
              'Your Bible',
              'Your first plan',
            ][index]
          }
        </span>
        <span>
          Step {index + 1} of {steps.length}
        </span>
      </div>
      <ol className={styles.dots} aria-label={`Step ${index + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <li
            key={s}
            className={cx(styles.dot, i === index && styles.dotOn, i < index && styles.dotDone)}
            aria-current={i === index ? 'step' : undefined}
          >
            <span className="visually-hidden">
              Step {i + 1}
              {i < index ? ', completed' : i === index ? ', current' : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );

  if (settingUp) {
    return (
      <div className={cx(styles.page, styles.setupPage)} style={welcomePalette}>
        <SetupPreview hasPlan={Boolean(plan)} reduced={reduced} />
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
      <main className={styles.main}>
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
              <h1 className={styles.title}>Welcome to Lampstand</h1>
              <p className={styles.lede}>Grow in faith, one day at a time.</p>
              <div className={styles.nameField}>
                <Input
                  label="What should we call you?"
                  required
                  autoComplete="given-name"
                  hint="A first name or nickname is perfect."
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
              <h1 className={styles.title}>What brings you to Lampstand?</h1>
              <p className={styles.lede}>
                Choose all that apply. You can change this any time in Profile.
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
                          {phone
                            ? {
                                grow: 'A verse to start each day, reading plans that fit your pace, and a private journal.',
                                study:
                                  'The Bible with nothing in the way: search, compare translations, highlight and take notes.',
                                teach:
                                  'Put Scripture and sermon slides on a TV or projector, from your laptop.',
                              }[u.id]
                            : u.description}
                        </span>
                        <span className={styles.useTurns}>
                          {phone
                            ? {
                                grow: 'Turns on Today, Plans and the journal',
                                study: 'Turns on highlights and notes',
                                teach: 'Turns on Screen',
                              }[u.id]
                            : u.turnsOn}
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
              <h1 className={styles.title}>Where are you in your faith journey?</h1>
              <p className={styles.lede}>
                Choose what feels closest to you today. This is optional and helps us suggest a
                first plan. You can change it later in Profile.
              </p>
              <div className={styles.options} role="radiogroup" aria-label="Your faith journey">
                {FAITH_JOURNEYS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={journey === option.value}
                    className={styles.option}
                    onClick={() => setJourney(option.value)}
                  >
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>{option.label}</span>
                      <span className={styles.optionBody}>{option.description}</span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={journey === undefined}
                  className={styles.option}
                  onClick={() => setJourney(undefined)}
                >
                  I’d rather not say
                </button>
              </div>
            </>
          )}

          {step === 'translation' && (
            <>
              <h1 className={styles.title}>Which Bible do you read?</h1>
              <p className={styles.lede}>You can switch any time while reading.</p>
              <TranslationPreview code={translation} />
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
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'plan' && (
            <>
              <h1 className={styles.title}>Start a reading plan?</h1>
              <p className={styles.lede}>
                {recommended
                  ? 'We’ve suggested a plan based on your faith journey. Choose it, pick another, or start without a plan.'
                  : 'One reading a day, at your pace. Miss a day and simply carry on.'}
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
                      aria-checked={plan === p.id}
                      className={styles.option}
                      onClick={() => setPlan(p.id)}
                    >
                      <span className={styles.optionText}>
                        <span className={styles.optionTitle}>
                          {p.name}
                          {p.id === recommended && (
                            <small className={styles.recommendation}>Suggested for you</small>
                          )}
                        </span>
                        <span className={styles.optionBody}>Day 1: {formatDay(p.days[0]!)}</span>
                      </span>
                    </button>
                  ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === null}
                  className={styles.option}
                  onClick={() => setPlan(null)}
                >
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>Just the verse of the day</span>
                    <span className={styles.optionBody}>You can start a plan later.</span>
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
              {last ? 'Go to Today' : 'Continue'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={styles.skip}
              disabled={!name.trim()}
              onClick={() => void complete(true)}
            >
              Skip, show me everything
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}

function TranslationPreview({ code }: { code: string }) {
  const chapter = useChapter(code, 'PSA', 119);
  const verse = chapter?.verses.find((v) => v.verse === 105);
  return (
    <figure className={styles.preview} aria-label="Translation preview">
      <figcaption>Psalm 119:105 · {code}</figcaption>
      <blockquote>{verse?.text ?? 'Loading the selected translation…'}</blockquote>
    </figure>
  );
}

/** A short preview of Today, not simulated saving percentages. */
function SetupPreview({ hasPlan, reduced }: { hasPlan: boolean; reduced: boolean }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const second = setTimeout(() => setStage(1), 1000);
    const third = setTimeout(() => setStage(2), 2000);
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
      <h1 className={styles.title}>Preparing your daily reading…</h1>
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
