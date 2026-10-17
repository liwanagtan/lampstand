import { usePhoneTitle } from '@/app/topBar';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { BarTitle } from '@/app/BarTitle';
import { paths } from '@/app/paths';
import { useSettings } from '@/features/settings/settingsStore';
import type { CatalogNode } from '@/schema/planCatalog';
import { ActivePlan } from './ActivePlan';
import {
  plansIn,
  searchPlans,
  uncategorised,
  visibleChildren,
  visibleGroups,
  type AudienceFilter,
  type PaceFilter,
} from './discover';
import { FilterChip } from './FilterChip';
import { plansGreeting } from './greetings';
import { CategoryChip, CategoryTile, PlanCard } from './PlanCards';
import { usePlanProgress, usePlans, type Plan } from './plans';
import styles from './Discover.module.css';

const PACES: { value: PaceFilter; label: string }[] = [
  { value: 'all', label: 'Any length' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly lessons' },
  { value: 'monthly', label: 'Monthly lessons' },
];
const AUDIENCES: { value: AudienceFilter; label: string }[] = [
  { value: 'all', label: 'Anyone' },
  { value: 'personal', label: 'Just me' },
  { value: 'group', label: 'Groups' },
];

/** Plans: the ones you're reading, then Discover — by feeling, by group, or by search. */
export function PlansPage() {
  const plans = usePlans();
  const progress = usePlanProgress();
  const name = useSettings((s) => s.profile.name);
  const [query, setQuery] = useState('');
  const [pace, setPace] = useState<PaceFilter>('all');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const byId = new Map((progress ?? []).map((p) => [p.planId, p]));
  const all = plans ?? [];
  const active = all.filter((p) => byId.has(p.id));
  const isActive = (p: Plan) => byId.has(p.id);
  const searching = query.trim() !== '' || pace !== 'all' || audience !== 'all';
  const results = searching ? searchPlans(all, query, pace, audience) : [];
  const hello = plansGreeting(name, active.length);
  usePhoneTitle(<BarTitle title={hello.title} line={hello.line} />);

  return (
    <div className={styles.page} data-enter>
      <div className={styles.headRow}>
        <div className="phone-hidden">
          <p className={styles.eyebrow}>Plans</p>
          <h1 className={styles.title}>{hello.title}</h1>
          <p className={styles.lede}>{hello.line}</p>
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
          <label className={styles.searchBox}>
            <Search size={18} aria-hidden />
            <input
              type="search"
              aria-label="Search plans"
              placeholder="Search plans — anxiety, Gospels, prayer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className={styles.searchClear}
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </label>
          <div className={styles.filters} role="group" aria-label="Filters">
            <FilterChip
              label="Length"
              value={pace}
              empty="all"
              options={PACES}
              onChange={setPace}
            />
            <FilterChip
              label="For"
              value={audience}
              empty="all"
              options={AUDIENCES}
              onChange={setAudience}
            />
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
