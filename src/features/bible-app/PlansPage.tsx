import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Input } from '@/design-system/components';
import { paths } from '@/app/paths';
import type { CatalogNode } from '@/schema/planCatalog';
import { ActivePlan } from './ActivePlan';
import {
  plansIn,
  searchPlans,
  uncategorised,
  visibleChildren,
  visibleGroups,
  type PaceFilter,
} from './discover';
import { CategoryChip, CategoryTile, PlanCard } from './PlanCards';
import { usePlanProgress, usePlans, type Plan } from './plans';
import styles from './Discover.module.css';

const PACES: { value: PaceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly lessons' },
  { value: 'monthly', label: 'Monthly lessons' },
];

/** Plans: the ones you're reading, then Discover — by feeling, by group, or by search. */
export function PlansPage() {
  const plans = usePlans();
  const progress = usePlanProgress();
  const [query, setQuery] = useState('');
  const [pace, setPace] = useState<PaceFilter>('all');
  const byId = new Map((progress ?? []).map((p) => [p.planId, p]));
  const all = plans ?? [];
  const active = all.filter((p) => byId.has(p.id));
  const isActive = (p: Plan) => byId.has(p.id);
  const searching = query.trim() !== '' || pace !== 'all';
  const results = searching ? searchPlans(all, query, pace) : [];

  return (
    <div className={styles.page} data-enter>
      <div className={styles.headRow}>
        <div>
          <p className={styles.eyebrow}>Plans</p>
          <h1 className={styles.title}>Find a plan for where you are</h1>
        </div>
      </div>

      {active.length > 0 && (
        <section className={styles.section} aria-label="Your plans">
          <h2 className={styles.sectionTitle}>Your plans</h2>
          <div className={styles.activeGrid}>
            {active.map((plan) => (
              <ActivePlan key={plan.id} plan={plan} progress={byId.get(plan.id)!} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.section} aria-label="Discover">
        <h2 className={styles.sectionTitle}>Discover</h2>
        <div className={styles.searchBar}>
          <Input
            label="Search plans"
            hideLabel
            placeholder="Search plans — anxiety, Gospels, prayer…"
            icon={<Search size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.search}
          />
          <div className={styles.paces} role="radiogroup" aria-label="Pace">
            {PACES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={pace === p.value}
                className={styles.pace}
                onClick={() => setPace(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {searching ? (
          results.length ? (
            <div className={styles.cardGrid} aria-label="Matching plans">
              {results.map((p) => (
                <PlanCard key={p.id} plan={p} active={isActive(p)} />
              ))}
            </div>
          ) : (
            <p className={styles.none}>No plans match yet. Try another word.</p>
          )
        ) : (
          plans && (
            <>
              {visibleGroups(all).map((g) => (
                <GroupSection key={g.id} group={g} plans={all} isActive={isActive} />
              ))}
              {uncategorised(all).length > 0 && (
                <div className={styles.group} role="group" aria-label="More plans">
                  <h3 className={styles.groupTitle}>More plans</h3>
                  <div className={styles.row}>
                    {uncategorised(all).map((p) => (
                      <PlanCard key={p.id} plan={p} active={isActive(p)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </section>
    </div>
  );
}

/** One catalog group: feelings as chips, Grow in faith as tiles, the rest as cover rows. */
function GroupSection({
  group,
  plans,
  isActive,
}: {
  group: CatalogNode;
  plans: readonly Plan[];
  isActive: (p: Plan) => boolean;
}) {
  const children = visibleChildren(group, plans);
  const inGroup = plansIn(plans, group.id);
  return (
    <div className={styles.group} role="group" aria-label={group.name}>
      <div className={styles.groupHead}>
        <div>
          <h3 className={styles.groupTitle}>{group.name}</h3>
          {group.description && <p className={styles.groupText}>{group.description}</p>}
        </div>
        <Link to={paths.planCategory(group.id)} className={styles.seeAll}>
          See all <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      {group.id === 'feel' ? (
        <div className={styles.chips}>
          {children.map((c) => (
            <CategoryChip key={c.id} node={c} plans={plans} />
          ))}
        </div>
      ) : group.id === 'grow' ? (
        <div className={styles.tiles}>
          {children.map((c) => (
            <CategoryTile key={c.id} node={c} plans={plans} />
          ))}
        </div>
      ) : (
        <div className={styles.row}>
          {inGroup.map((p) => (
            <PlanCard key={p.id} plan={p} active={isActive(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
