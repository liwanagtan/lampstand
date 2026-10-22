import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Play } from 'lucide-react';
import { Button, Dialog, EmptyState, cx } from '@/design-system/components';
import { paths } from '@/app/paths';
import { matchTopics } from '@/features/search/topics';
import { RefText } from '@/features/search/RefText';
import { fromOsis, formatRef } from '@/features/bible/ref';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import { categoryById } from '@/schema/planCatalog';
import { ActivePlan } from './ActivePlan';
import { CompletedPlanActions } from './CompletedPlanActions';
import { planMeta, plansIn, visibleChildren } from './discover';
import { CategoryChip, CategoryLinks, PlanCard } from './PlanCards';
import { useCoverUrl } from './useCoverUrl';
import {
  currentDay,
  activePlanCount,
  isPlanFinished,
  stopPlan,
  formatDay,
  isLessons,
  readingMinutes,
  removePlan,
  startPlan,
  usePlan,
  usePlanProgress,
  usePlanProgressFor,
  usePlans,
} from './plans';
import styles from './Discover.module.css';

/** A category (or a whole group): its subcategories with plans, and its plans. */
export function PlanCategoryPage() {
  const { categoryId = '' } = useParams();
  const node = categoryById(categoryId);
  const plans = usePlans();
  const progress = usePlanProgress();
  const navigate = useNavigate();
  if (!node) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="This category doesn't exist"
          actions={<Button onClick={() => navigate(paths.plans)}>Back to plans</Button>}
        />
      </div>
    );
  }
  const all = plans ?? [];
  const active = new Set(
    (progress ?? [])
      .filter((record) => {
        const plan = all.find((p) => p.id === record.planId);
        return plan && !isPlanFinished(plan, record);
      })
      .map((p) => p.planId),
  );
  const children = visibleChildren(node, all);
  const list = plansIn(all, node.id);
  const trail = node.path.slice(0, -1).flatMap((id) => {
    const n = categoryById(id);
    return n ? [n] : [];
  });

  return (
    <div className={styles.page} data-enter data-category>
      <nav className={styles.trail} aria-label="Breadcrumb">
        <Link to={paths.plans}>Plans</Link>
        {trail.map((t) => (
          <span key={t.id}>
            {' › '}
            <Link to={paths.planCategory(t.id)}>{t.name}</Link>
          </span>
        ))}
      </nav>
      <h1 className={styles.title}>{node.name}</h1>
      {node.description && <p className={styles.lede}>{node.description}</p>}
      {node.id === 'new-to-faith' && (
        <Link to={paths.salvation} className={styles.foundationBanner}>
          <span>
            <small>FAITH FOUNDATIONS · START HERE</small>
            <strong>Understanding salvation</strong>
            <span>Read the good news of Jesus Christ before choosing a reading plan.</span>
          </span>
          <ArrowRight size={22} aria-hidden />
        </Link>
      )}
      {children.length > 0 && (
        <div className={styles.chips} aria-label="Topics">
          {children.map((c) => (
            <CategoryChip key={c.id} node={c} plans={all} />
          ))}
        </div>
      )}
      {plans && list.length === 0 ? (
        <p className={styles.none}>Plans for {node.name.toLowerCase()} are on their way.</p>
      ) : (
        <div className={styles.cardGrid} aria-label={`${node.name} plans`}>
          {list.map((p) => (
            <PlanCard key={p.id} plan={p} active={active.has(p.id)} />
          ))}
        </div>
      )}
      {node.path[0] === 'feel' && <CategoryVerses name={node.name} />}
      {node.path[0] === 'feel' && trail.at(-1) && (
        <section className={styles.relatedCategories}>
          <h2>Also for how you feel</h2>
          <div className={styles.chips}>
            {visibleChildren(trail.at(-1)!, all)
              .filter((c) => c.id !== node.id)
              .slice(0, 4)
              .map((c) => (
                <CategoryChip key={c.id} node={c} plans={all} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** A plan before (or while) you read it: what it is, how long, a first look, and Start. */
export function PlanPage() {
  const { planId = '' } = useParams();
  const plan = usePlan(planId);
  const progress = usePlanProgressFor(planId);
  const allPlans = usePlans();
  const allProgress = usePlanProgress();
  const navigate = useNavigate();
  const cover = useCoverUrl(plan?.cover, 'full');
  const [removing, setRemoving] = useState(false);
  const [allDays, setAllDays] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [startAdviceOpen, setStartAdviceOpen] = useState(false);

  if (plan === undefined || progress === undefined) return <div className={styles.page} />;
  if (!plan) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="This plan isn't available"
          actions={<Button onClick={() => navigate(paths.plans)}>Back to plans</Button>}
        >
          It may have been removed.
        </EmptyState>
      </div>
    );
  }
  const first = plan.days[0]!;
  const unit = isLessons(plan) ? 'Lesson' : 'Day';
  const status = progress ? currentDay(plan, progress) : null;
  const next = status?.kind === 'read' ? status.day : null;
  const activeCount = activePlanCount(allPlans ?? [], allProgress ?? [], plan.id);
  const begin = () => void startPlan(plan.id).then(() => navigate(paths.planDay(plan.id, 1)));

  return (
    <div className={styles.page} data-enter>
      <Link to={paths.plans} className={cx(styles.back, 'phone-hidden')}>
        <ArrowLeft size={16} aria-hidden /> Plans
      </Link>
      <header className={styles.hero}>
        <Link to={paths.plans} className={styles.mobileHeroBack} aria-label="Back to Plans">
          <ArrowLeft size={22} aria-hidden />
        </Link>
        {cover && <img className={styles.heroImg} src={cover} alt="" />}
        <div className={styles.heroScrim} aria-hidden />
        <div className={styles.heroBody}>
          <p className={styles.heroMeta}>
            {planMeta(plan)}
            {plan.audience === 'group' ? ' · For groups' : ''}
            {plan.level ? ` · ${plan.level}` : ''}
          </p>
          <h1 className={styles.heroTitle}>{plan.name}</h1>
          <p className={styles.heroText}>{plan.description}</p>
        </div>
      </header>

      <CategoryLinks ids={plan.categories} />

      {progress ? (
        <>
          <div className="laptop-only">
            <ActivePlan plan={plan} progress={progress} />
          </div>
          <section className={styles.mobileProgress} aria-label="Your progress">
            <div>
              <h2>Your progress</h2>
              <span>
                {progress.done.length} of {plan.days.length} {isLessons(plan) ? 'lessons' : 'days'}
              </span>
            </div>
            <progress
              max={plan.days.length}
              value={progress.done.length}
              aria-label="Plan progress"
            />
            {next && (
              <Button variant="primary" onClick={() => navigate(paths.planDay(plan.id, next))}>
                Read {unit.toLowerCase()} {next} · {formatDay(plan.days[next - 1]!)}
              </Button>
            )}
            {status?.kind === 'finished' && <CompletedPlanActions plan={plan} />}
            {status?.kind === 'waiting' && (
              <p>Your next lesson opens {new Date(status.unlocks).toLocaleDateString()}.</p>
            )}
            {status?.kind !== 'finished' && (
              <div>
                <small>Miss a day and simply carry on.</small>
                <button onClick={() => setStopping(true)}>Stop plan</button>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className={styles.startArea}>
          <div className={styles.startRow}>
            <Button
              variant="primary"
              icon={<Play size={16} />}
              onClick={() => (activeCount >= 2 ? setStartAdviceOpen(true) : begin())}
              disabled={allPlans === undefined || allProgress === undefined}
            >
              Start plan
            </Button>
            {plan.source === 'imported' && (
              <Button variant="ghost" onClick={() => setRemoving(true)}>
                Remove plan
              </Button>
            )}
          </div>
          {allPlans && allProgress && activeCount < 2 && (
            <p className={styles.startAdvice}>
              {activeCount === 0
                ? 'A steady start: choose one plan and build a rhythm. Two at most is plenty.'
                : 'You already have a plan going. Add another only if you have room for it.'}
            </p>
          )}
        </div>
      )}

      {plan.credits && (
        <p className={styles.credits}>
          From {plan.credits}
          {plan.license ? ` · ${plan.license}` : ''}
        </p>
      )}

      <section className={cx(styles.preview, 'laptop-only')} aria-label="First reading">
        <p className={styles.eyebrow}>{unit} 1</p>
        <h2 className={styles.previewTitle}>{first.title ?? formatDay(first)}</h2>
        <p className={styles.planMeta}>
          {first.title && <span>{formatDay(first)} · </span>}
          <Clock size={12} aria-hidden /> {readingMinutes(first)} min
        </p>
        {first.note && <p className={styles.previewNote}>{first.note}</p>}
        <Button
          variant="ghost"
          icon={<BookOpen size={16} />}
          onClick={() => navigate(paths.planDay(plan.id, 1))}
        >
          Read {unit.toLowerCase()} 1
        </Button>
      </section>

      <section className={styles.mobileDays} aria-label="Plan readings">
        <h2>
          Days <span>{plan.days.length} readings</span>
        </h2>
        {plan.days.slice(0, allDays ? undefined : 4).map((day, index) => (
          <Link
            key={index}
            to={paths.planDay(plan.id, index + 1)}
            className={styles.dayRow}
            aria-label={`Read ${unit.toLowerCase()} ${index + 1}: ${day.title ?? formatDay(day)}`}
          >
            <span className={styles.dayNumber}>{index + 1}</span>
            <span>
              <strong>{day.title ?? formatDay(day)}</strong>
              <small>
                {readingMinutes(day)} min{progress?.done.includes(index + 1) ? ' · Finished' : ''}
              </small>
            </span>
            <ArrowLeft size={18} className={styles.dayArrow} aria-hidden />
          </Link>
        ))}
        {plan.days.length > 4 && !allDays && (
          <Button variant="ghost" onClick={() => setAllDays(true)}>
            Show all {plan.days.length} {isLessons(plan) ? 'lessons' : 'days'}
          </Button>
        )}
      </section>

      <Dialog
        open={startAdviceOpen}
        onOpenChange={setStartAdviceOpen}
        title="Keep your reading manageable"
        description={`You already have ${activeCount} plans in progress. We recommend focusing on one or two at a time so it is easier to keep going.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => navigate(paths.plans)}>
              See my plans
            </Button>
            <Button variant="primary" onClick={begin}>
              Start anyway
            </Button>
          </>
        }
      />
      <Dialog
        open={stopping}
        onOpenChange={setStopping}
        title={`Stop ${plan.name}?`}
        description="Your progress on this plan is removed. You can start it again any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setStopping(false)}>
              Keep going
            </Button>
            <Button
              variant="primary"
              onClick={() => void stopPlan(plan.id).then(() => setStopping(false))}
            >
              Stop plan
            </Button>
          </>
        }
      />
      <Dialog
        open={removing}
        onOpenChange={setRemoving}
        size="sm"
        title={`Remove “${plan.name}”?`}
        description="The plan is removed from this device. You can import the file again later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(false)}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => void removePlan(plan.id).then(() => navigate(paths.plans))}
            >
              Remove plan
            </Button>
          </>
        }
      />
    </div>
  );
}

function CategoryVerses({ name }: { name: string }) {
  const translation = useReader((s) => s.translation);
  const open = useOpenInReader();
  const topic = matchTopics(name)[0];
  if (!topic) return null;
  return (
    <section className={styles.categoryVerses}>
      <h2>Verses for {name.toLowerCase()}</h2>
      {topic.refs.slice(0, 2).map((osis) => {
        const range = fromOsis(osis);
        return range ? (
          <button key={osis} onClick={() => open(range)}>
            <strong>{formatRef(range)}</strong>
            <span>
              <RefText osis={osis} translation={translation} />
            </span>
          </button>
        ) : null;
      })}
    </section>
  );
}
