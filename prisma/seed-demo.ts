/**
 * Demo data for every table (5–10 rows each).
 * Safe to re-run: existing rows are matched by slug / email / title and never overwritten.
 *
 *   npm run seed:demo
 */
import { Prisma, OrderStatus, PaymentMethodType } from '@prisma/client';
import prisma from '../src/utils/prisma';

const img = (w: number, h: number, bg: string, fg: string, text: string) =>
  `https://placehold.co/${w}x${h}/${bg}/${fg}/png?text=${encodeURIComponent(text)}`;

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const daysAgo = (d: number, hour = 12) => {
  const date = new Date(Date.now() - d * DAY);
  date.setHours(hour, (d * 17) % 60, 0, 0);
  return date;
};

// ── Data ────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'OTT', slug: 'ott', desc: 'Movies, series and live TV streaming' },
  { name: 'Design', slug: 'design', desc: 'Creative and design software' },
  { name: 'Music', slug: 'music', desc: 'Ad-free music streaming' },
  { name: 'AI Tools', slug: 'ai-tools', desc: 'AI assistants and generators' },
  { name: 'Productivity', slug: 'productivity', desc: 'Office and productivity suites' },
  { name: 'VPN & Security', slug: 'vpn-security', desc: 'Private browsing and security' },
  { name: 'Education', slug: 'education', desc: 'Online learning platforms' },
];

type Plan = { name: string; price: number; durationDays: number; validity: string };
const PRODUCTS: {
  name: string;
  slug: string;
  category: string;
  color: string;
  smallDesc: string;
  longDesc: string;
  type: string[];
  features: string[];
  plans: Plan[];
  stock?: boolean;
}[] = [
  {
    name: 'Amazon Prime Video', slug: 'amazon-prime-video', category: 'ott', color: '00A8E1',
    smallDesc: 'Prime Video originals, movies and TV in HD.',
    longDesc: 'Watch Amazon Originals, blockbuster movies and award-winning series on any device. Private profile, instant activation.',
    type: ['ott', 'subscription'], features: ['Private profile', 'HD streaming', 'Watch on 3 devices'],
    plans: [{ name: '1 Month', price: 249, durationDays: 30, validity: '30 days' }, { name: '6 Months', price: 1290, durationDays: 180, validity: '180 days' }],
  },
  {
    name: 'Disney+ Hotstar', slug: 'disney-plus-hotstar', category: 'ott', color: '0F1E5A',
    smallDesc: 'Disney, Marvel, Star Wars and live cricket.',
    longDesc: 'Stream Disney, Pixar, Marvel and Star Wars titles plus live sports. Shared premium account with a dedicated profile.',
    type: ['ott', 'sports'], features: ['Live cricket', 'Marvel & Star Wars', 'Full HD'],
    plans: [{ name: '1 Month', price: 299, durationDays: 30, validity: '30 days' }, { name: '1 Year', price: 2490, durationDays: 365, validity: '365 days' }],
  },
  {
    name: 'YouTube Premium', slug: 'youtube-premium', category: 'ott', color: 'FF0000',
    smallDesc: 'Ad-free YouTube with background play.',
    longDesc: 'Enjoy YouTube and YouTube Music without ads, download videos for offline viewing and play in the background.',
    type: ['ott', 'music'], features: ['No ads', 'Background play', 'Offline downloads', 'YouTube Music included'],
    plans: [{ name: '1 Month', price: 199, durationDays: 30, validity: '30 days' }, { name: '1 Year', price: 1790, durationDays: 365, validity: '365 days' }],
  },
  {
    name: 'Spotify Premium', slug: 'spotify-premium', category: 'music', color: '1DB954',
    smallDesc: 'Ad-free music with offline listening.',
    longDesc: 'Upgrade your own Spotify account to Premium: unlimited skips, offline downloads and high-quality audio.',
    type: ['music', 'subscription'], features: ['On your own account', 'Unlimited skips', 'Offline mode'],
    plans: [{ name: '1 Month', price: 179, durationDays: 30, validity: '30 days' }, { name: '3 Months', price: 499, durationDays: 90, validity: '90 days' }, { name: '1 Year', price: 1690, durationDays: 365, validity: '365 days' }],
  },
  {
    name: 'ChatGPT Plus', slug: 'chatgpt-plus', category: 'ai-tools', color: '10A37F',
    smallDesc: 'Access to the most capable ChatGPT models.',
    longDesc: 'ChatGPT Plus on your own account with priority access, faster responses and advanced tools such as image generation and file analysis.',
    type: ['ai', 'subscription'], features: ['Own account', 'Priority access', 'Image generation', 'File uploads'],
    plans: [{ name: '1 Month', price: 2490, durationDays: 30, validity: '30 days' }],
  },
  {
    name: 'Canva Pro', slug: 'canva-pro', category: 'design', color: '7D2AE8',
    smallDesc: 'Premium templates, brand kit and background remover.',
    longDesc: 'Unlock 100M+ premium photos, videos and templates, Magic Resize, Brand Kit and one-click background removal.',
    type: ['design', 'subscription'], features: ['Premium templates', 'Background remover', 'Brand kit', 'Magic resize'],
    plans: [{ name: '1 Month', price: 149, durationDays: 30, validity: '30 days' }, { name: '1 Year', price: 990, durationDays: 365, validity: '365 days' }],
  },
  {
    name: 'Adobe Creative Cloud', slug: 'adobe-creative-cloud', category: 'design', color: 'DA1F26',
    smallDesc: 'Photoshop, Illustrator, Premiere Pro and 20+ apps.',
    longDesc: 'The complete Adobe Creative Cloud collection including Photoshop, Illustrator, Premiere Pro, After Effects and 100GB cloud storage.',
    type: ['design', 'software'], features: ['All 20+ apps', '100GB cloud storage', 'Adobe Fonts'],
    plans: [{ name: '1 Month', price: 1490, durationDays: 30, validity: '30 days' }, { name: '1 Year', price: 12990, durationDays: 365, validity: '365 days' }],
    stock: false,
  },
  {
    name: 'Microsoft 365', slug: 'microsoft-365', category: 'productivity', color: 'D83B01',
    smallDesc: 'Word, Excel, PowerPoint and 1TB OneDrive.',
    longDesc: 'Microsoft 365 Personal with the latest Office apps on PC, Mac and mobile plus 1TB of OneDrive cloud storage.',
    type: ['productivity', 'software'], features: ['Word, Excel, PowerPoint', '1TB OneDrive', 'Works on 5 devices'],
    plans: [{ name: '1 Year', price: 2990, durationDays: 365, validity: '365 days' }],
  },
  {
    name: 'NordVPN', slug: 'nordvpn', category: 'vpn-security', color: '4687FF',
    smallDesc: 'Fast, private VPN on 6 devices.',
    longDesc: 'Browse privately with NordVPN: 6,000+ servers in 60+ countries, threat protection and no-logs policy.',
    type: ['vpn', 'security'], features: ['6 devices', '60+ countries', 'Threat protection'],
    plans: [{ name: '1 Month', price: 399, durationDays: 30, validity: '30 days' }, { name: '1 Year', price: 2990, durationDays: 365, validity: '365 days' }],
  },
];

const HERO_SLIDES = [
  { order: 1, text: 'Netflix Premium from ৳199', bg: 'E50914' },
  { order: 2, text: 'Spotify Premium — 3 months ৳499', bg: '1DB954' },
  { order: 3, text: 'ChatGPT Plus on your own account', bg: '10A37F' },
  { order: 4, text: 'Canva Pro for designers', bg: '7D2AE8' },
  { order: 5, text: 'Pay with bKash, Nagad or Rocket', bg: '141414' },
];

const REVIEWS = [
  { name: 'Rafiul Islam', role: 'University student', stars: 5, text: 'Got my Netflix profile within 10 minutes of paying with bKash. Super smooth!' },
  { name: 'Sumaiya Rahman', role: 'Graphic designer', stars: 5, text: 'Canva Pro at this price is unbeatable. Renewed for a full year.' },
  { name: 'Arif Hossain', role: 'Software engineer', stars: 4, text: 'ChatGPT Plus activated on my own account. Support answered quickly on WhatsApp.' },
  { name: 'Tasnim Akter', role: 'Content creator', stars: 5, text: 'YouTube Premium has been working perfectly for 3 months now.' },
  { name: 'Mehedi Hasan', role: 'Freelancer', stars: 4, text: 'Microsoft 365 key worked instantly. Would love more payment options.' },
  { name: 'Nabila Chowdhury', role: 'Teacher', stars: 5, text: 'Very trustworthy seller. Spotify family upgrade done the same day.' },
  { name: 'Imran Kabir', role: 'Gamer', stars: 3, text: 'Delivery took a few hours at night, but everything works fine.' },
  { name: 'Fariha Sultana', role: 'Marketing executive', stars: 5, text: 'Best prices in Bangladesh for streaming subscriptions.' },
];

const HOME_SECTIONS = [
  { title: 'Best Sellers', desc: 'Our most popular subscriptions this month', tag: 'HOT', products: ['netflix', 'spotify-premium', 'youtube-premium', 'chatgpt-plus', 'canva-pro'] },
  { title: 'Streaming Deals', desc: 'Movies, series and sports for less', tag: 'OTT', products: ['netflix', 'amazon-prime-video', 'disney-plus-hotstar', 'youtube-premium'] },
  { title: 'Creative Tools', desc: 'Everything designers need', tag: 'DESIGN', products: ['canva-pro', 'adobe-creative-cloud'] },
  { title: 'Work Smarter', desc: 'AI and productivity essentials', tag: 'AI', products: ['chatgpt-plus', 'microsoft-365', 'nordvpn'] },
  { title: 'New Arrivals', desc: 'Freshly added to the store', tag: 'NEW', products: ['nordvpn', 'microsoft-365', 'disney-plus-hotstar'] },
];

const ADMIN_USERS = [
  { name: 'Store Manager', email: 'manager@techflix.test' },
  { name: 'Support Agent', email: 'support@techflix.test' },
  { name: 'Delivery Agent', email: 'delivery@techflix.test' },
  { name: 'Content Editor', email: 'editor@techflix.test' },
];
const DEMO_USER_PASSWORD = 'demo1234';

const CUSTOMERS = [
  { fullName: 'Rahim Uddin', email: 'rahim.uddin@example.com', whatsapp: '01711223344', country: 'Bangladesh' },
  { fullName: 'Nusrat Jahan', email: 'nusrat.jahan@example.com', whatsapp: '01812345678', country: 'Bangladesh' },
  { fullName: 'Tanvir Ahmed', email: 'tanvir.ahmed@example.com', whatsapp: '01913579246', country: 'Bangladesh' },
  { fullName: 'Farhana Akter', email: 'farhana.akter@example.com', whatsapp: '01556677889', country: 'Bangladesh' },
  { fullName: 'Sakib Hasan', email: 'sakib.hasan@example.com', whatsapp: '01622334455', country: 'Bangladesh' },
  { fullName: 'Mitu Das', email: 'mitu.das@example.com', whatsapp: '01788990011', country: 'Bangladesh' },
  { fullName: 'Ayaan Khan', email: 'ayaan.khan@example.com', whatsapp: '+971501234567', country: 'United Arab Emirates' },
  { fullName: 'Priya Sen', email: 'priya.sen@example.com', whatsapp: '01399887766', country: 'Bangladesh' },
];

// Store numbers from techFlix-Next/src/constants/siteConfig.ts
const PAYMENT_METHODS: { method: PaymentMethodType; accountNumber: string; instructions: string }[] = [
  { method: 'BKASH', accountNumber: '01996518593', instructions: 'Open bKash → Send Money → enter the number above and the exact amount, then paste the TrxID.' },
  { method: 'NAGAD', accountNumber: '01996518593', instructions: 'Open Nagad → Send Money → enter the number above, then paste the TrxID.' },
  { method: 'ROCKET', accountNumber: '017513114385', instructions: 'Dial *322# or use the Rocket app → Send Money, then paste the TrxID.' },
];

// Order scenarios: [customer index, [[product slug, plan index, qty]], method, flow, days ago]
type Flow = 'PENDING' | 'REJECTED' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
const ORDERS: [number, [string, number, number][], PaymentMethodType, Flow, number][] = [
  [0, [['netflix', 0, 1]], 'BKASH', 'DELIVERED', 27],
  [1, [['spotify-premium', 1, 1], ['canva-pro', 0, 1]], 'NAGAD', 'DELIVERED', 22],
  [2, [['chatgpt-plus', 0, 1]], 'BKASH', 'DELIVERED', 18],
  [3, [['youtube-premium', 1, 1]], 'ROCKET', 'REFUNDED', 15],
  [4, [['amazon-prime-video', 0, 2]], 'BKASH', 'CANCELLED', 12],
  [5, [['microsoft-365', 0, 1]], 'NAGAD', 'DELIVERED', 9],
  [6, [['nordvpn', 1, 1]], 'BKASH', 'REJECTED', 6],
  [7, [['disney-plus-hotstar', 0, 1], ['netflix', 1, 1]], 'NAGAD', 'PROCESSING', 3],
  [0, [['canva-pro', 1, 1]], 'BKASH', 'DELIVERED', 2],
  [2, [['spotify-premium', 0, 1]], 'ROCKET', 'PENDING', 0],
];

// ── Seeders ─────────────────────────────────────────────

async function seedCategories() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
}

async function seedProducts() {
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  for (const p of PRODUCTS) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        imgUrl: img(600, 400, p.color, 'FFFFFF', p.name),
        smallDesc: p.smallDesc,
        longDesc: p.longDesc,
        categoryId: categories.get(p.category) ?? null,
        stock: p.stock ?? true,
        type: p.type,
        features: p.features,
        plans: {
          create: p.plans.map((plan, i) => ({ ...plan, price: new Prisma.Decimal(plan.price), sortOrder: i })),
        },
      },
    });
  }
}

async function seedHeroSlides() {
  for (const s of HERO_SLIDES) {
    await prisma.heroSlide.upsert({
      where: { order: s.order },
      update: {},
      create: { order: s.order, imageUrl: img(1600, 600, s.bg, 'FFFFFF', s.text) },
    });
  }
}

async function seedReviews() {
  for (const [i, r] of REVIEWS.entries()) {
    const exists = await prisma.review.findFirst({ where: { name: r.name } });
    if (exists) continue;
    await prisma.review.create({
      data: {
        name: r.name,
        role: r.role,
        description: r.text,
        starCount: r.stars,
        profileUrl: img(200, 200, ['E50914', '1DB954', '4687FF', '7D2AE8'][i % 4], 'FFFFFF', r.name.charAt(0)),
        createdAt: daysAgo(40 - i * 4),
      },
    });
  }
}

async function seedHomeSections() {
  const products = new Map((await prisma.product.findMany()).map((p) => [p.slug, p.id]));
  for (const s of HOME_SECTIONS) {
    let section = await prisma.homeSection.findFirst({ where: { title: s.title } });
    if (!section) section = await prisma.homeSection.create({ data: { title: s.title, desc: s.desc, tag: s.tag } });
    const productIds = s.products.map((slug) => products.get(slug)).filter((id): id is string => Boolean(id));
    await prisma.homeSectionProduct.createMany({
      data: productIds.map((productId) => ({ homeSectionId: section.id, productId })),
      skipDuplicates: true,
    });
  }
}

async function seedUsers() {
  for (const u of ADMIN_USERS) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, password: DEMO_USER_PASSWORD } });
  }
}

async function seedPaymentMethods() {
  for (const m of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { method: m.method },
      update: {},
      create: { ...m, accountType: 'Personal', isActive: true },
    });
  }
}

async function seedCustomersAndOrders() {
  const customers = [];
  for (const [i, c] of CUSTOMERS.entries()) {
    customers.push(
      await prisma.customer.upsert({ where: { email: c.email }, update: {}, create: { ...c, createdAt: daysAgo(30 - i * 3, 9) } })
    );
  }

  const alreadySeeded = await prisma.order.count({ where: { customerEmail: { in: CUSTOMERS.map((c) => c.email) } } });
  if (alreadySeeded > 0) return;

  const admin = await prisma.user.findFirst({ orderBy: { email: 'asc' }, where: { email: { not: { endsWith: '@techflix.test' } } } });
  const adminId = admin?.id ?? null;
  const plansBySlug = new Map<string, Awaited<ReturnType<typeof prisma.productPlan.findMany>>>();
  const products = await prisma.product.findMany({ include: { plans: { orderBy: { sortOrder: 'asc' } } } });
  products.forEach((p) => plansBySlug.set(p.slug, p.plans));
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  for (const [n, [customerIndex, lines, method, flow, ago]] of ORDERS.entries()) {
    const customer = customers[customerIndex];
    const placedAt = daysAgo(ago, 10 + (n % 8));
    const at = (hours: number) => new Date(placedAt.getTime() + hours * HOUR);

    const items = lines.map(([slug, planIndex, quantity]) => {
      const product = productBySlug.get(slug)!;
      const plan = plansBySlug.get(slug)![planIndex] ?? plansBySlug.get(slug)![0];
      return { product, plan, quantity, lineTotal: plan.price.mul(quantity) };
    });
    const total = items.reduce((sum, i) => sum.add(i.lineTotal), new Prisma.Decimal(0));

    const paid = flow === 'PROCESSING' || flow === 'DELIVERED' || flow === 'REFUNDED';
    const delivered = flow === 'DELIVERED' || flow === 'REFUNDED';
    const status: OrderStatus = flow === 'REJECTED' ? 'PENDING' : flow;
    const paymentStatus = flow === 'REFUNDED' ? 'REFUNDED' : paid ? 'PAID' : flow === 'PENDING' ? 'PENDING_VERIFICATION' : 'REJECTED';

    const history: Prisma.OrderStatusHistoryCreateWithoutOrderInput[] = [
      { fromStatus: null, toStatus: 'PENDING', note: 'Order placed by customer', createdAt: placedAt },
    ];
    if (paid) {
      history.push({ fromStatus: 'PENDING', toStatus: 'PROCESSING', note: `Payment verified (${method})`, createdAt: at(1), changedBy: adminId ? { connect: { id: adminId } } : undefined });
    }
    if (delivered) {
      history.push({ fromStatus: 'PROCESSING', toStatus: 'DELIVERED', note: 'All items delivered', createdAt: at(2), changedBy: adminId ? { connect: { id: adminId } } : undefined });
    }
    if (flow === 'REFUNDED') {
      history.push({ fromStatus: 'DELIVERED', toStatus: 'REFUNDED', note: 'Account stopped working, refunded via Rocket', createdAt: at(48), changedBy: adminId ? { connect: { id: adminId } } : undefined });
    }
    if (flow === 'CANCELLED') {
      history.push({ fromStatus: 'PENDING', toStatus: 'CANCELLED', note: 'Customer asked to cancel', createdAt: at(3), changedBy: adminId ? { connect: { id: adminId } } : undefined });
    }

    const trxId = `DM${String(n + 1).padStart(2, '0')}${method.charAt(0)}${(placedAt.getTime() % 1e6).toString(36).toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: `TMP-${trxId}`,
        customer: { connect: { id: customer.id } },
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerPhone: customer.whatsapp,
        country: customer.country,
        status,
        paymentStatus,
        subtotal: total,
        total,
        customerNote: n === 7 ? 'Please send the login details on WhatsApp.' : null,
        adminNote: flow === 'REFUNDED' ? 'Refund sent on Rocket, TrxID RF92KD.' : null,
        createdAt: placedAt,
        deliveredAt: delivered ? at(2) : null,
        cancelledAt: flow === 'CANCELLED' ? at(3) : null,
        items: {
          create: items.map(({ product, plan, quantity, lineTotal }, i) => ({
            product: { connect: { id: product.id } },
            plan: { connect: { id: plan.id } },
            productName: product.name,
            productSlug: product.slug,
            productImgUrl: product.imgUrl,
            planName: plan.name,
            planDurationDays: plan.durationDays,
            planValidity: plan.validity,
            unitPrice: plan.price,
            quantity,
            lineTotal,
            deliveryDetails: delivered ? `Email: ${product.slug}.${n}${i}@techflix-accounts.test\nPassword: Demo-${1000 + n * 7 + i}` : null,
            deliveredAt: delivered ? at(2) : null,
            createdAt: placedAt,
          })),
        },
        payments: {
          create: [
            {
              method,
              senderNumber: customer.whatsapp.startsWith('01') ? customer.whatsapp : '01899001122',
              trxId,
              amount: total,
              status: paid ? 'VERIFIED' : flow === 'PENDING' ? 'PENDING' : 'REJECTED',
              verifiedAt: paid ? at(1) : flow === 'PENDING' ? null : at(2),
              verifiedBy: !paid && flow === 'PENDING' ? undefined : adminId ? { connect: { id: adminId } } : undefined,
              rejectionReason:
                flow === 'REJECTED' ? 'Transaction ID not found' : flow === 'CANCELLED' ? 'Order cancelled: Customer asked to cancel' : null,
              createdAt: placedAt,
            },
          ],
        },
        statusHistory: { create: history },
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { orderNumber: `TF-${String(order.seq).padStart(6, '0')}` } });
  }
}

async function main() {
  await seedCategories();
  await seedProducts();
  await seedHeroSlides();
  await seedReviews();
  await seedHomeSections();
  await seedUsers();
  await seedPaymentMethods();
  await seedCustomersAndOrders();

  const tables = [
    'user', 'category', 'product', 'productPlan', 'heroSlide', 'review', 'homeSection', 'homeSectionProduct',
    'customer', 'order', 'orderItem', 'payment', 'orderStatusHistory', 'paymentMethod',
  ] as const;
  const counts: Record<string, number> = {};
  for (const t of tables) counts[t] = await (prisma[t] as unknown as { count: () => Promise<number> }).count();
  console.table(counts);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  });
