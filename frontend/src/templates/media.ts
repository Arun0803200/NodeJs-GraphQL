// Uploaded images are stored in three sizes by the API: <base>-w400.webp, <base>-w800.webp, <base>-w1600.webp.
// Content always stores the largest (-w1600) URL; these helpers derive the smaller variants for srcSet.
export const IMAGE_WIDTHS = [400, 800, 1600] as const;

const VARIANT_PATTERN = /-w(400|800|1600)\.webp$/;

export const isResponsiveImage = (url: string) => VARIANT_PATTERN.test(url);

export function imageVariant(url: string, width: (typeof IMAGE_WIDTHS)[number]): string {
  return isResponsiveImage(url) ? url.replace(VARIANT_PATTERN, `-w${width}.webp`) : url;
}

// srcSet for <img>; undefined for external URLs (e.g. sample Unsplash images), which render as-is
export function srcSetFor(url: string): string | undefined {
  if (!isResponsiveImage(url)) return undefined;
  return IMAGE_WIDTHS.map((w) => `${imageVariant(url, w)} ${w}w`).join(", ");
}

// Common `sizes` hints for the places images appear in templates
export const IMAGE_SIZES = {
  avatar: "160px",
  thumb: "(max-width: 600px) 50vw, 300px",
  card: "(max-width: 600px) 100vw, 400px",
  wide: "100vw",
} as const;

// Props to spread on an <img>: src (mid-size default), srcSet and sizes
export function responsiveImageProps(url: string, sizes: string = IMAGE_SIZES.card) {
  const srcSet = srcSetFor(url);
  return srcSet ? { src: imageVariant(url, 800), srcSet, sizes } : { src: url };
}
