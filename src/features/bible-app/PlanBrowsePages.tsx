import { usePhoneTitle } from '@/app/topBar';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Play } from 'lucide-react';
import { Button, Dialog, EmptyState, cx } from '@/design-system/components';
import { paths } from '@/app/paths';
import { categoryById } from '@/schema/planCatalog';
import { ActivePlan } from './ActivePlan';
import { planMeta, plansIn, visibleChildren } from './discover';
import { CategoryChip, CategoryLinks, PlanCard } from './PlanCards';
import { useCoverUrl } from './useCoverUrl';
import {
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
  const parent = node && node.path.length > 1 ? node.path[node.path.length - 2]! : null;
  usePhoneTitle(node?.name ?? 'Plans', {
    back: parent ? paths.planCategory(parent) : paths.plans,
  });
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
  const active = new Set((progress ?? []).map((p) => p.planId));
  const children = visibleChildren(node, all);
  const list = plansIn(all, node.id);
  const trail = node.path.slice(0, -1).flatMap((id) => {
    const n = categoryById(id);
    return n ? [n] : [];
  });

  return (
    <div className={styles.page} data-enter>
      <nav className={cx(styles.trail, 'phone-hidden')} aria-label="Breadcrumb">
        <Link to={paths.plans}>Plans</Link>
        {trail.map((t) => (
          <span key={t.id}>
            {' › '}
            <Link to={paths.planCategory(t.id)}>{t.name}</Link>
          </span>
        ))}
      </nav>
      <h1 className={cx(styles.title, 'phone-hidden')}>{node.name}</h1>
      {node.description && <p className={styles.lede}>{node.description}</p>}
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
    </div>
  );
}

/** A plan before (or while) you read it: what it is, how long, a first look, and Start. */
export function PlanPage() {
  const { planId = '' } = useParams();
  const plan = usePlan(planId);
  const progress = usePlanProgressFor(planId);
  const navigate = useNavigate();
  const cover = useCoverUrl(plan?.cover, 'full');
  const [removing, setRemoving] = useState(false);
  usePhoneTitle(plan?.name ?? 'Plan', { back: paths.plans });

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

  return (
    <div className={styles.page} data-enter>
      <Link to={paths.plans} className={cx(styles.back, 'phone-hidden')}>
        <ArrowLeft size={16} aria-hidden /> Plans
      </Link>
      <header className={styles.hero}>
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

      {progress ? (
        <ActivePlan plan={plan} progress={progress} />
      ) : (
        <div className={styles.startRow}>
          <Button
            variant="primary"
            icon={<Play size={16} />}
            onClick={() => void startPlan(plan.id).then(() => navigate(paths.planDay(plan.id, 1)))}
          >
            Start plan
          </Button>
          {plan.source === 'imported' && (
            <Button variant="ghost" onClick={() => setRemoving(true)}>
              Remove plan
            </Button>
          )}
        </div>
      )}

      <CategoryLinks ids={plan.categories} />
      {plan.credits && (
        <p className={styles.credits}>
          From {plan.credits}
          {plan.license ? ` · ${plan.license}` : ''}
        </p>
      )}

      <section className={styles.preview} aria-label="First reading">
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
