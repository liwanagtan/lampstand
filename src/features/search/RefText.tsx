import { usePassage } from '@/slides/usePassage';

/** The words of a passage, for a one-line preview under its reference. */
export function RefText({ osis, translation }: { osis: string; translation: string }) {
  const { passage } = usePassage(osis, translation);
  if (!passage) return null;
  return (
    <>
      {passage.verses
        .filter((v) => !v.missing)
        .map((v) => v.text)
        .join(' ')}
    </>
  );
}
