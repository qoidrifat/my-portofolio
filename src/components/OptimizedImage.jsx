import React, { useState } from 'react';

/**
 * OptimizedImage — renders optimal image format based on src extension.
 *
 * - .png / .jpg / .jpeg → renders <picture> with AVIF + WebP sources + original fallback.
 * - .webp / .avif       → renders plain <img> (already optimized).
 * - http(s)://          → renders plain <img> (external, no local conversion).
 *
 * Props:
 *   src         — image path
 *   alt         — alt text
 *   className   — class for the <img> element
 *   loading     — lazy loading strategy (default 'lazy')
 *   decoding    — image decoding hint (default 'async')
 *   onError     — fallback if all sources fail
 *   ...rest     — passed to the <img> element
 */
export default function OptimizedImage({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  decoding = 'async',
  onError,
  ...rest
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  const isExternal = src.startsWith('http://') || src.startsWith('https://');
  const isPngJpg = /\.(png|jpg|jpeg)$/i.test(src);

  // Shared image element
  const imgEl = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );

  // External URLs or already-optimized formats — render directly
  if (isExternal || !isPngJpg) {
    return imgEl;
  }

  // PNG/JPG → wrap in <picture> with AVIF + WebP sources
  const base = src.replace(/\.(png|jpg|jpeg)$/i, '');
  const webpSrc = `${base}.webp`;
  const avifSrc = `${base}.avif`;

  return (
    <picture>
      <source srcSet={avifSrc} type="image/avif" />
      <source srcSet={webpSrc} type="image/webp" />
      {imgEl}
    </picture>
  );
}
