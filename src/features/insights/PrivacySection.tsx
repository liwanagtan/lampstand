import { Link } from 'react-router-dom';
import { Toggle } from '@/design-system/components';
import { Section } from '@/features/settings/Section';
import { useSettings } from '@/features/settings/settingsStore';
import { clearPendingInsights } from './insights';

/** Settings › Privacy: the one switch for anonymous usage counts. */
export function PrivacySection() {
  const on = useSettings((s) => s.insights);
  const set = useSettings((s) => s.set);
  return (
    <Section title="Privacy">
      <Toggle
        checked={on}
        onChange={(next) => {
          if (!next) clearPendingInsights();
          void set('insights', next);
        }}
        label="Share anonymous usage counts"
        description="Helps us see whether Lampstand helps people keep reading: events like “plan day completed”, with a random device code and the date. Never your name, email, writing, searches or verses."
      />
      <p>
        <Link to="/privacy">What Lampstand stores and shares</Link>
      </p>
    </Section>
  );
}
