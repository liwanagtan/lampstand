import { useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { Page } from '@/app/Page';
import { Button, Tabs } from '@/design-system/components';
import { validatePresentation } from '@/schema/validate';
import { ACTIVE_TEMPLATE_IDS, type TemplateId } from '@/schema/common';
import { getTemplate } from '@/templates/templates';
import { SlideFrame } from '@/slides/SlideView';
import type { StoredPresentation } from '@/schema/presentation';
import { addBundledBackground, loadBackgrounds } from '@/features/library/backgrounds';
import sample from '../../../tests/fixtures/sample-sermon.lampstand.json';
import { PosterContext, posterInfoFor } from '@/slides/poster/posterInfo';
import styles from './SlidesPage.module.css';

export function SlidesPage() {
  const base = useMemo(() => {
    const r = validatePresentation(sample, {
      newId: (() => {
        let n = 0;
        return () => `s${++n}`;
      })(),
    });
    if (!r.ok) throw new Error('Sample sermon is invalid');
    return r.presentation;
  }, []);
  const [presentation, setPresentation] = useState<StoredPresentation>(base);
  // Give image backgrounds real photos from the bundled library.
  useEffect(() => {
    void (async () => {
      const library = await loadBackgrounds();
      if (!library.length) return;
      let n = 0;
      const slides = await Promise.all(
        base.slides.map(async (s) => {
          if (s.background?.type !== 'image') return s;
          const assetId = await addBundledBackground(library[(n++ * 7) % library.length]!);
          return { ...s, background: { ...s.background, assetId } };
        }),
      );
      setPresentation({ ...base, slides });
    })();
  }, [base]);
  const [templateId, setTemplateId] = useState<TemplateId>('lampstand');
  const [selected, setSelected] = useState(1);
  const [liveKey, setLiveKey] = useState(0);
  const [step, setStep] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const template = getTemplate(templateId);
  const slide = presentation.slides[selected]!;

  return (
    <PosterContext.Provider value={posterInfoFor(presentation, 'KJV')}>
      <Page
        title="Slides"
        description="The sample sermon in every template. Click a slide to preview it live."
        actions={
          <Button
            icon={<Play size={16} />}
            onClick={() => {
              setStep(0);
              setLiveKey((k) => k + 1);
              setEndsAt(Date.now() + 5 * 60_000);
            }}
          >
            Replay motion
          </Button>
        }
      >
        <Tabs
          label="Template"
          value={templateId}
          onChange={(v) => setTemplateId(v)}
          items={ACTIVE_TEMPLATE_IDS.map((id) => ({
            value: id,
            label: getTemplate(id).name,
            content: null,
          }))}
        />
        <div className={styles.live}>
          <SlideFrame
            key={`${slide.id}-${templateId}-${liveKey}`}
            slide={slide}
            template={template}
            mode="live"
            translation="KJV"
            buildStep={slide.type === 'list' && slide.build ? step : undefined}
            countdownEndsAt={slide.type === 'countdown' ? endsAt : undefined}
            label="Live preview"
          />
          {slide.type === 'list' && slide.build && (
            <Button onClick={() => setStep((n) => Math.min(n + 1, slide.items.length))}>
              Next build step
            </Button>
          )}
        </div>
        <div className={styles.grid}>
          {presentation.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={styles.thumb}
              aria-pressed={i === selected}
              onClick={() => {
                setSelected(i);
                setStep(0);
                setLiveKey((k) => k + 1);
                setEndsAt(Date.now() + 5 * 60_000);
              }}
            >
              <SlideFrame slide={s} template={template} mode="thumbnail" translation="KJV" />
              <span className={styles.caption}>
                {i + 1}. {s.type}
              </span>
            </button>
          ))}
        </div>
      </Page>
    </PosterContext.Provider>
  );
}
