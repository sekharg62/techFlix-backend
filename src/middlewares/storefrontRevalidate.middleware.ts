import { Request, Response, NextFunction } from 'express';

/**
 * Cache tags used by the storefront (techFlix-Next). Keep in sync with
 * techFlix-Next/src/lib/api/tags.ts.
 */
export type StorefrontTag =
  | 'products'
  | 'categories'
  | 'hero-slides'
  | 'home-sections'
  | 'reviews'
  | 'payment-methods';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Tell the storefront to drop its cached copies of the given data.
 * Fire-and-forget: a storefront outage must never fail an admin request.
 * Disabled unless STOREFRONT_URL and REVALIDATE_SECRET are set.
 */
export const notifyStorefront = (tags: StorefrontTag[]) => {
  const baseUrl = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!baseUrl || !secret || tags.length === 0) return;

  fetch(`${baseUrl.replace(/\/$/, '')}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
    body: JSON.stringify({ tags }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (!res.ok) console.warn(`[storefront] revalidate ${tags.join(',')} failed: HTTP ${res.status}`);
    })
    .catch((err) => console.warn(`[storefront] revalidate ${tags.join(',')} failed: ${err.message}`));
};

/** After a successful create/update/delete on this router, revalidate the given storefront tags. */
export const revalidateStorefront =
  (...tags: StorefrontTag[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (MUTATING.has(req.method)) {
      res.on('finish', () => {
        if (res.statusCode < 400) notifyStorefront(tags);
      });
    }
    next();
  };
