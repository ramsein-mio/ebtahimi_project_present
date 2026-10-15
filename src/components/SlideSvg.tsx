import { useEffect, useMemo } from 'react';
import { renderSlideToSvg, type Presentation, type Slide } from '@web-ppt/core';
import { preloadPresentationFonts } from '../editor/font-catalog';

export function SlideSvg({
  presentation,
  slide,
  idPrefix,
  className = '',
  textMode = 'html',
}: {
  presentation: Presentation;
  slide: Slide;
  idPrefix: string;
  className?: string;
  textMode?: 'html' | 'svg';
}) {
  useEffect(() => {
    preloadPresentationFonts(presentation);
  }, [presentation]);

  const markup = useMemo(
    () => renderSlideToSvg(presentation, slide, { idPrefix, textMode }),
    [presentation, slide, idPrefix, textMode],
  );
  return <div className={`slide-svg ${className}`} dir="ltr" dangerouslySetInnerHTML={{ __html: markup }} />;
}
