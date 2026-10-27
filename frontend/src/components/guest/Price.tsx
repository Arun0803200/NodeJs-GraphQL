import { formatPrice, hasDiscount, discountPercent, isFree, type TemplateItem } from "../../lib/templates";
import { useUiLang } from "../../i18n/UiLang";

type PriceFields = Pick<TemplateItem, "category" | "originalPrice" | "discountPrice">;

// Free → "Free"; discounted → new price + struck-out original + % off; otherwise the original price
export function Price({ template, size = "md" }: { template: PriceFields; size?: "md" | "lg" }) {
  const { t } = useUiLang();
  if (isFree(template)) return <span className={`price price-${size}`}><span className="price-now price-free">{t("price.free")}</span></span>;

  if (hasDiscount(template)) {
    return (
      <span className={`price price-${size}`}>
        <span className="price-now">{formatPrice(template.discountPrice!)}</span>
        <s className="price-was" aria-label={`Original price ${formatPrice(template.originalPrice)}`}>{formatPrice(template.originalPrice)}</s>
        <span className="price-off">{discountPercent(template)}% {t("price.off")}</span>
      </span>
    );
  }

  return <span className={`price price-${size}`}><span className="price-now">{formatPrice(template.originalPrice)}</span></span>;
}
