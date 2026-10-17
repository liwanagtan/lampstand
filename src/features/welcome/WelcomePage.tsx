import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Input, cx } from '@/design-system/components';
import { LampLockup } from '@/design-system/LampMark';
import { ALL_FEATURES, USE_CASES, featuresFor, homePath, type UseCaseId } from '@/app/features';
import { markOnboarded } from '@/app/onboarding';
import { useBible } from '@/features/bible/bibleStore';
import { builtinPlans, formatDay, startPlan } from '@/features/bible-app/plans';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';
import { useApplyDocumentTheme, useReducedMotion } from '@/features/settings/theme';
import styles from './WelcomePage.module.css';

type Step = 'name' | 'uses' | 'translation' | 'plan';

/** Plans offered at the end of onboarding: a gentle start first. */
const STARTER_PLANS = ['gospels-40', 'psalms-proverbs-30', 'nt-90', 'bible-year'];

/**
 * First run: your name, what brings you to Lampstand, your translation, and a plan. Only what
 * you tick is switched on; everything else stays one tap away in Me.
 */
export function WelcomePage() {
  useApplyDocumentTheme();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const translations = useBible((s) => s.translations);
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [uses, setUses] = useState<Set<UseCaseId>>(new Set());
  const [translation, setTranslation] = useState(useReader.getState().translation);
  const [plan, setPlan] = useState<string | null>(null);

  const steps: Step[] = uses.has('grow')
    ? ['name', 'uses', 'translation', 'plan']
    : ['name', 'uses', 'translation'];
  const index = steps.indexOf(step);
  const last = index === steps.length - 1;

  const finish = async () => {
    const features = featuresFor(uses);
    const settings = useSettings.getState();
    await settings.set('profile', { ...settings.profile, name: name.trim() });
    await settings.set('features', features);
    await settings.set('defaultTranslation', translation);
    useReader.getState().setTranslation(translation);
    if (plan && uses.has('grow')) await startPlan(plan);
    markOnboarded();
    navigate(homePath(features), { replace: true });
  };

  const skip = async () => {
    await useSettings.getState().set('features', ALL_FEATURES);
    markOnboarded();
    navigate('/', { replace: true });
  };

  const next = () => (last ? void finish() : setStep(steps[index + 1]!));
  const canContinue = step !== 'uses' || uses.size > 0;
  const toggle = (id: UseCaseId) =>
    setUses((u) => {
      const n = new Set(u);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <LampLockup size={30} title="Lampstand" />
        <Button variant="ghost" size="sm" onClick={() => void skip()}>
          Skip, show me everything
        </Button>
      </header>
      <main className={styles.main}>
        <ol className={styles.dots} aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <li key={s} className={cx(styles.dot, i <= index && styles.dotOn)} aria-hidden />
          ))}
        </ol>
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
              <h1 className={styles.title}>Welcome to Lampstand</h1>
              <p className={styles.lede}>
                A light for your daily reading. What should we call you?
              </p>
              <Input
                label="Your name"
                hideLabel
                autoFocus
                maxLength={40}
                placeholder="Your first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.nameInput}
              />
            </>
          )}

          {step === 'uses' && (
            <>
              <h1 className={styles.title}>What brings you to Lampstand?</h1>
              <p className={styles.lede}>
                Choose all that apply. You can change this any time in Me.
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
                        <span className={styles.useBody}>{u.description}</span>
                        <span className={styles.useTurns}>{u.turnsOn}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {step === 'translation' && (
            <>
              <h1 className={styles.title}>Which Bible do you read?</h1>
              <p className={styles.lede}>You can switch any time while reading.</p>
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
                One reading a day, at your pace. Miss a day and simply carry on.
              </p>
              <div className={styles.options} role="radiogroup" aria-label="Reading plan">
                {builtinPlans()
                  .filter((p) => STARTER_PLANS.includes(p.id))
                  .sort((a, b) => STARTER_PLANS.indexOf(a.id) - STARTER_PLANS.indexOf(b.id))
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
                        <span className={styles.optionTitle}>{p.name}</span>
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
              {last ? 'Start' : 'Continue'}
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}
