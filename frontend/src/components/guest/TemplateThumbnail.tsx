import { useLayoutEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import type { Lang, PortfolioContent } from "../../templates/types";
import { defaultPersonaFor, getPersona } from "../../templates/samples";

const RENDER_WIDTH = 1200;

// Renders the real template at desktop width and scales it down to fit the card
// Without explicit content, each design shows the sample that suits it (travels sample for travel designs)
export function TemplateThumbnail({ designKey, content: given, lang = "en", aspect = 0.72 }: {
  designKey: string; content?: PortfolioContent; lang?: Lang; aspect?: number;
}) {
  const content = given ?? getPersona(defaultPersonaFor(designKey)).content[lang];
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / RENDER_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="thumb-frame" style={{ aspectRatio: `1 / ${aspect}` }} aria-hidden="true">
      <div className="thumb-canvas" style={{ width: RENDER_WIDTH, transform: `scale(${scale})` }}>
        <TemplateRenderer designKey={designKey} content={content} lang={lang} />
      </div>
    </div>
  );
}
