import { Link } from 'react-router-dom';
import { Check, GraduationCap, Users } from 'lucide-react';
import { cx } from '@/design-system/components';
import { paths } from '@/app/paths';
import { useCoverUrl } from './useCoverUrl';
import { categoryById, type CatalogNode } from '@/schema/planCatalog';
import { planMeta, plansIn } from './discover';
import type { Plan } from './plans';
import styles from './Discover.module.css';

/** A plan in Discover: cover, name, length and pace. Opens the plan page. */
export function PlanCard({ plan, active }: { plan: Plan; active?: boolean }) {
  const cover = useCoverUrl(plan.cover);
  return (
    <Link to={paths.planPage(plan.id)} className={styles.planCard} aria-label={plan.name}>
      <span className={styles.cover}>
        {cover && <img src={cover} alt="" loading="lazy" />}
        {active && (
          <span className={styles.activeBadge}>
            <Check size={12} aria-hidden /> In progress
          </span>
        )}
      </span>
      <span className={styles.cardBody}>
        <span className={styles.planName}>{plan.name}</span>
        <span className={styles.planMeta}>
          {plan.audience === 'group' ? (
            <Users size={12} aria-hidden />
          ) : plan.pace !== 'daily' ? (
            <GraduationCap size={12} aria-hidden />
          ) : null}
          {planMeta(plan)}
        </span>
      </span>
    </Link>
  );
}

/** A feeling or topic chip with how many plans it holds. */
export function CategoryChip({ node, plans }: { node: CatalogNode; plans: readonly Plan[] }) {
  return (
    <Link to={paths.planCategory(node.id)} className={styles.chip}>
      {node.name}
      <span className={styles.chipCount}>{plansIn(plans, node.id).length}</span>
    </Link>
  );
}

/** A category tile (Grow in faith): name, a line, and how many plans. */
export function CategoryTile({ node, plans }: { node: CatalogNode; plans: readonly Plan[] }) {
  const n = plansIn(plans, node.id).length;
  return (
    <Link to={paths.planCategory(node.id)} className={styles.tile}>
      <span className={styles.tileName}>{node.name}</span>
      {node.description && <span className={styles.tileText}>{node.description}</span>}
      <span className={styles.planMeta}>
        {n} {n === 1 ? 'plan' : 'plans'}
      </span>
    </Link>
  );
}

/** Category names as small links, for a plan page. */
export function CategoryLinks({ ids }: { ids: readonly string[] }) {
  return (
    <span className={styles.chips}>
      {ids.flatMap((id) => {
        const n = categoryById(id);
        return n
          ? [
              <Link key={id} to={paths.planCategory(id)} className={cx(styles.chip, styles.chipSm)}>
                {n.name}
              </Link>,
            ]
          : [];
      })}
    </span>
  );
}
