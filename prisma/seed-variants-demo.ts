/**
 * Demo product for the variants feature: "Netflix (Variants Demo)" with
 * Mobile / Basic / Premium 4K variants, each with its own 1 / 3 / 12-month plans.
 *
 * Safe to re-run: the product is matched by slug and its variants/plans are re-synced.
 *
 *   npm run seed:variants
 */
import prisma from '../src/utils/prisma';
import { productsService, type VariantInput } from '../src/modules/products/products.service';

const SLUG = 'netflix-variants-demo';

const month = (n: number, price: number) => ({
  name: n === 1 ? '1 Month' : `${n} Months`,
  price,
  durationDays: n * 30,
  validity: n === 1 ? '30 days' : `${n * 30} days`,
});

const VARIANTS: VariantInput[] = [
  {
    name: 'Mobile',
    description: '1 phone or tablet · 480p · private profile',
    plans: [month(1, 199), month(3, 549), month(12, 1999)],
  },
  {
    name: 'Basic (TV + Laptop)',
    description: '1 screen at a time · 720p HD · any device',
    plans: [month(1, 299), month(3, 849), month(12, 2999)],
  },
  {
    name: 'Premium 4K',
    description: '4 screens · Ultra HD 4K + HDR · any device',
    plans: [month(1, 449), month(3, 1299), month(12, 4499)],
  },
];

async function main() {
  const category = await prisma.category.findUnique({ where: { slug: 'ott' } });

  const base = {
    name: 'Netflix (Variants Demo)',
    imgUrl: 'https://placehold.co/600x400/E50914/FFFFFF/png?text=Netflix',
    smallDesc: 'Pick your device type, then 1, 3 or 12 months.',
    longDesc:
      'Demo product showing product variants: choose Mobile, Basic or Premium 4K, then pick a 1, 3 or 12-month plan. Each variant has its own prices.',
    categoryId: category?.id ?? null,
    stock: true,
    type: ['ott', 'subscription'],
    features: ['Private profile', 'Instant activation', 'Replacement warranty'],
    plans: [] as never[],
    variants: VARIANTS,
  };

  const existing = await prisma.product.findUnique({ where: { slug: SLUG }, include: { variants: true, plans: true } });

  let product;
  if (existing) {
    // Keep existing ids where names match so order history keeps its links.
    const variants = VARIANTS.map((v) => {
      const ev = existing.variants.find((x) => x.name === v.name);
      return {
        ...v,
        id: ev?.id,
        plans: v.plans.map((p) => ({
          ...p,
          id: existing.plans.find((x) => x.variantId === ev?.id && x.name === p.name)?.id,
        })),
      };
    });
    product = await productsService.updateProduct(existing.id, { ...base, variants });
    console.log('Updated', product.slug);
  } else {
    product = await productsService.createProduct({ ...base, slug: SLUG });
    console.log('Created', product.slug);
  }

  for (const v of product.variants) {
    console.log(`  ${v.name}: ${v.plans.map((p) => `${p.name} ৳${p.price}`).join(', ')}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
