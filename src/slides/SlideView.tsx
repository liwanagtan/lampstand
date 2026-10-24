import { Component, type ComponentType, type ReactNode } from 'react';
import { LampMark } from '@/design-system/LampMark';
import type { SlideType, StoredSlide } from '@/schema/presentation';
import type { Template } from '@/templates/templates';
import { Backdrop } from './Backdrop';
import { SlideStage } from './SlideStage';
import type { RenderProps, SlideMode } from './types';
import { ClosingSlide } from './renderers/ClosingSlide';
import { CountdownSlide } from './renderers/CountdownSlide';
import { ImageSlide } from './renderers/ImageSlide';
import { ListSlide } from './renderers/ListSlide';
import { PointSlide } from './renderers/PointSlide';
import { QuoteSlide } from './renderers/QuoteSlide';
import { SectionSlide } from './renderers/SectionSlide';
import { StatementSlide } from './renderers/StatementSlide';
import { TitleSlide } from './renderers/TitleSlide';
import { VerseSlide } from './renderers/VerseSlide';
import s from './Slide.module.css';

const RENDERERS: { [T in SlideType]: ComponentType<RenderProps<T>> } = {
  title: TitleSlide,
  section: SectionSlide,
  point: PointSlide,
  list: ListSlide,
  reading: VerseSlide,
  quote: QuoteSlide,
  statement: StatementSlide,
  image: ImageSlide,
  countdown: CountdownSlide,
  closing: ClosingSlide,
};

export interface SlideViewProps {
  slide: StoredSlide;
  template: Template;
  mode: SlideMode;
  translation: string;
  buildStep?: number;
  page?: number;
  countdownEndsAt?: number | null;
  showMediaPlaceholders?: boolean;
}

/** Draws one slide on the canvas. The same renderer serves editor, preview, thumbnails and output. */
export function SlideView({
  slide,
  template,
  mode,
  translation,
  buildStep,
  page = 0,
  countdownEndsAt,
  showMediaPlaceholders = mode !== 'live',
}: SlideViewProps) {
  const Renderer = RENDERERS[slide.type] as ComponentType<RenderProps>;
  const animate = mode === 'live';

  return (
    <SlideErrorBoundary key={slide.id} template={template}>
      {/* The title slide is the poster, which draws its own background. */}
      {slide.type !== 'title' && (
        <Backdrop
          background={slide.background}
          template={template}
          animate={animate}
          showPlaceholder={showMediaPlaceholders}
          textOver={slide.type !== 'image' || Boolean(slide.caption)}
        />
      )}
      <Renderer
        slide={slide}
        template={template}
        animate={animate}
        mode={mode}
        buildStep={buildStep}
        page={page}
        translation={translation}
        countdownEndsAt={countdownEndsAt}
        showMediaPlaceholders={showMediaPlaceholders}
      />
    </SlideErrorBoundary>
  );
}

/** Neutral slide shown when a slide can't render, never a blank or broken layout (PRD §10). */
export function FallbackSlide({ template }: { template: Template }) {
  return (
    <>
      <Backdrop
        background={undefined}
        template={template}
        animate={false}
        showPlaceholder={false}
      />
      <div className={`${s.content} ${s.center}`}>
        <LampMark size={160} variant="mono" className={s.fallbackMark} />
      </div>
    </>
  );
}

interface BoundaryProps {
  template: Template;
  children: ReactNode;
}

export class SlideErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Slide failed to render', error);
  }
  render() {
    return this.state.failed ? (
      <FallbackSlide template={this.props.template} />
    ) : (
      this.props.children
    );
  }
}

/** A slide inside its own scaled stage: thumbnails, panes, previews. */
export function SlideFrame(
  props: SlideViewProps & { className?: string; fit?: 'width' | 'contain'; label?: string },
) {
  const { className, fit, label, ...view } = props;
  return (
    <SlideStage template={view.template} className={className} fit={fit} label={label}>
      <SlideView {...view} />
    </SlideStage>
  );
}
