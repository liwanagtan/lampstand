import { useApplyDocumentTheme } from '@/features/settings/theme';

export function PresentPage() {
  useApplyDocumentTheme(true);
  return <div>Present</div>;
}
