import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Search, X } from 'lucide-react';
import { paths } from '@/app/paths';
import { faithJourneys } from '@/app/faithJourney';
import { useSettings } from '@/features/settings/settingsStore';
import type { CatalogNode } from '@/schema/planCatalog';
import { ActivePlan } from './ActivePlan';
import {
  planMeta,
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
import { planSuggestions } from './planSuggestions';
import { CategoryChip, CategoryTile, PlanCard } from './PlanCards';
import { activePlanCount, isPlanFinished, usePlanProgress, usePlans, type Plan } from './plans';
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
  const journey = useSettings((s) => s.profile.faithJourney);
  const [query, setQuery] = useState('');
  const [pace, setPace] = useState<PaceFilter>('all');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const byId = new Map((progress ?? []).map((p) => [p.planId, p]));
  const all = plans ?? [];
  const completed = all.filter((p) => {
    const record = byId.get(p.id);
    return record && isPlanFinished(p, record);
  });
  const completedIds = new Set(completed.map((p) => p.id));
  const isActive = (p: Plan) => byId.has(p.id) && !completedIds.has(p.id);
  const active = all.filter((p) => isActive(p) && !byId.get(p.id)?.pausedAt);
  const paused = all.filter((p) => isActive(p) && Boolean(byId.get(p.id)?.pausedAt));
  const activeCount = activePlanCount(all, progress ?? []);
  const searching = query.trim() !== '' || pace !== 'all' || audience !== 'all';
  const results = searching ? searchPlans(all, query, pace, audience) : [];
  const hello = plansGreeting(name, active.length);
  const suggestions = planSuggestions(all, new Set(byId.keys()), journey);

  return (
    <div className={styles.page} data-enter>
      <div className={styles.headRow}>
        <div>
          <p className={styles.eyebrow}>Plans</p>
          <h1 className={styles.title}>{hello.title}</h1>
          <p className={styles.lede}>{hello.line}</p>
        </div>
      </div>
      {/* Advice only when it changes a decision: with two or more plans going. */}
      {plans && progress && activeCount >= 2 && (
        <p className={styles.paceAdvice}>
          {activeCount} plans going. Finish one before starting another.
        </p>
      )}

      {active.length > 0 && (
        <section className={styles.section} aria-label="Your plans">
          <h2 className={styles.activeHeading}>Your plans</h2>
          <div className={styles.activeGrid}>
            {active.map((plan) => (
              <ActivePlan key={plan.id} plan={plan} progress={byId.get(plan.id)!} />
            ))}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section className={styles.section} aria-label="Paused plans">
          <h2 className={`${styles.activeHeading} ${styles.pausedHeading}`}>Paused plans</h2>
          <p className={styles.groupText}>Your progress is here whenever you want to return.</p>
          <div className={styles.activeGrid}>
            {paused.map((plan) => (
              <ActivePlan key={plan.id} plan={plan} progress={byId.get(plan.id)!} />
            ))}
          </div>
        </section>
      )}

      {!searching && suggestions.length > 0 && (
        <section className={styles.suggestions} aria-labelledby="plan-suggestions-title">
          <div className={styles.suggestionHeader}>
            <div>
              <h2 id="plan-suggestions-title" className={styles.groupTitle}>
                {faithJourneys(journey).length ? 'Suggested for you' : 'A place to start'}
              </h2>
              <p className={styles.groupText}>
                {faithJourneys(journey).length
                  ? 'Chosen with your faith journey in mind.'
                  : 'Start with Jesus’ life or a daily rhythm in the Psalms.'}
              </p>
            </div>
          </div>
          <ul className={styles.suggestionList}>
            {suggestions.map(({ plan, reason }) => (
              <li key={plan.id}>
                <Link to={paths.planPage(plan.id)} className={styles.suggestionLink}>
                  <span>
                    <span className={styles.suggestionName}>{plan.name}</span>
                    <span className={styles.suggestionMeta}>{planMeta(plan)}</span>
                    <span className={styles.suggestionReason}>{reason}</span>
                  </span>
                  <span className={styles.suggestionAction} aria-hidden>
                    View plan <ArrowRight size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="discover-plans" className={styles.section} aria-label="Discover">
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

      {completed.length > 0 && (
        <details className={styles.completedPlans}>
          <summary>
            <span>
              Completed plans <span className={styles.completedCount}>({completed.length})</span>
            </span>
            <ChevronDown size={18} aria-hidden />
          </summary>
          <p className={styles.completedIntro}>
            Readings you’ve finished. Revisit them whenever you like.
          </p>
          <ul className={styles.completedList}>
            {completed.map((plan) => (
              <li key={plan.id}>
                <Link to={paths.planPage(plan.id)} className={styles.completedLink}>
                  <Check size={18} aria-hidden />
                  <span>
                    <span className={styles.completedName}>{plan.name}</span>
                    <span className={styles.completedMeta}>
                      {plan.days.length} {plan.pace === 'daily' ? 'days' : 'readings'} · Completed
                    </span>
                  </span>
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
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
    <div className={styles.group} data-group={group.id} role="group" aria-label={group.name}>
      <div className={styles.groupHead}>
        <div>
          <h3 className={styles.groupTitle}>{group.name}</h3>
          {group.description && <p className={styles.groupText}>{group.description}</p>}
        </div>
      </div>
      {group.id === 'feel' ? (
        <div className={styles.chips}>
          {children.slice(0, 8).map((c) => (
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
      <Link to={paths.planCategory(group.id)} className={styles.seeAll}>
        See all <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
