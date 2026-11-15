import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { authenticate } from '../../middlewares/auth.middleware';
import { asyncHandler, badRequest } from '../../utils/http';

const router = Router();

router.use(authenticate);

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      revenueToday,
      revenueMonth,
      revenueAllTime,
      ordersToday,
      ordersByStatus,
      pendingPayments,
      totalCustomers,
      totalProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: startOfToday } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: startOfMonth } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const statusCounts = { PENDING: 0, PROCESSING: 0, DELIVERED: 0, CANCELLED: 0, REFUNDED: 0 } as Record<string, number>;
    ordersByStatus.forEach((s) => (statusCounts[s.status] = s._count._all));

    res.status(200).json({
      success: true,
      data: {
        currency: 'BDT',
        revenue: {
          today: revenueToday._sum.total?.toNumber() ?? 0,
          thisMonth: revenueMonth._sum.total?.toNumber() ?? 0,
          allTime: revenueAllTime._sum.total?.toNumber() ?? 0,
        },
        ordersToday,
        ordersByStatus: statusCounts,
        pendingPaymentVerifications: pendingPayments,
        totalCustomers,
        totalProducts,
        recentOrders,
      },
    });
  })
);

const TIMEZONE = 'Asia/Dhaka';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

const toDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => toDay(new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS));
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS) + 1;
const pctChange = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : Math.round(((current - previous) / previous) * 1000) / 10;

/** Orders whose local (Dhaka) creation date falls in [from, to]. */
const localDate = Prisma.sql`("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE})::date`;
const inRange = (from: string, to: string) => Prisma.sql`${localDate} BETWEEN ${from}::date AND ${to}::date`;

const summaryFor = async (from: string, to: string) => {
  const rows = await prisma.$queryRaw<
    { orders: number; paid_orders: number; revenue: number; cancelled: number; customers: number }[]
  >`
    SELECT
      COUNT(*)::int AS orders,
      COUNT(*) FILTER (WHERE "paymentStatus" IN ('PAID'))::int AS paid_orders,
      COALESCE(SUM("total") FILTER (WHERE "paymentStatus" = 'PAID'), 0)::float AS revenue,
      COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::int AS cancelled,
      COUNT(DISTINCT "customerId")::int AS customers
    FROM "Order"
    WHERE ${inRange(from, to)}
  `;
  const r = rows[0];
  return {
    totalOrders: r.orders,
    paidOrders: r.paid_orders,
    revenue: r.revenue,
    cancelledOrders: r.cancelled,
    uniqueCustomers: r.customers,
    averageOrderValue: r.paid_orders ? Math.round((r.revenue / r.paid_orders) * 100) / 100 : 0,
  };
};

/**
 * Analytics for a date range (dates are interpreted in Asia/Dhaka time).
 * GET /api/dashboard/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get(
  '/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const today = toDay(new Date(Date.now() + 6 * 60 * 60 * 1000)); // Dhaka is UTC+6, no DST
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : today;
    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : addDays(to, -29);
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw badRequest('from and to must be YYYY-MM-DD');
    const rangeDays = daysBetween(from, to);
    if (rangeDays < 1) throw badRequest('from must be on or before to');
    if (rangeDays > MAX_RANGE_DAYS) throw badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);

    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(rangeDays - 1));

    const [summary, previous, daily, byStatus, byMethod, topProducts, newCustomers, pendingPayments] =
      await Promise.all([
        summaryFor(from, to),
        summaryFor(prevFrom, prevTo),
        prisma.$queryRaw<{ day: string; orders: number; paid_orders: number; revenue: number }[]>`
          SELECT to_char(${localDate}, 'YYYY-MM-DD') AS day,
                 COUNT(*)::int AS orders,
                 COUNT(*) FILTER (WHERE "paymentStatus" = 'PAID')::int AS paid_orders,
                 COALESCE(SUM("total") FILTER (WHERE "paymentStatus" = 'PAID'), 0)::float AS revenue
          FROM "Order"
          WHERE ${inRange(from, to)}
          GROUP BY 1
          ORDER BY 1
        `,
        prisma.$queryRaw<{ status: string; count: number }[]>`
          SELECT "status"::text AS status, COUNT(*)::int AS count
          FROM "Order" WHERE ${inRange(from, to)} GROUP BY 1
        `,
        prisma.$queryRaw<{ method: string; count: number; amount: number }[]>`
          SELECT p."method"::text AS method, COUNT(*)::int AS count, COALESCE(SUM(p."amount"), 0)::float AS amount
          FROM "Payment" p JOIN "Order" o ON o."id" = p."orderId"
          WHERE p."status" = 'VERIFIED'
            AND (o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE})::date BETWEEN ${from}::date AND ${to}::date
          GROUP BY 1
        `,
        prisma.$queryRaw<{ product_name: string; product_id: string | null; quantity: number; revenue: number }[]>`
          SELECT i."productName" AS product_name, i."productId" AS product_id,
                 SUM(i."quantity")::int AS quantity, COALESCE(SUM(i."lineTotal"), 0)::float AS revenue
          FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
          WHERE o."paymentStatus" = 'PAID'
            AND (o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE})::date BETWEEN ${from}::date AND ${to}::date
          GROUP BY 1, 2
          ORDER BY revenue DESC
          LIMIT 5
        `,
        prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int AS count FROM "Customer"
          WHERE ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE})::date BETWEEN ${from}::date AND ${to}::date
        `,
        prisma.payment.count({ where: { status: 'PENDING' } }),
      ]);

    // Fill every day in the range so charts have no gaps
    const byDay = new Map(daily.map((d) => [d.day, d]));
    const series = Array.from({ length: rangeDays }, (_, i) => {
      const day = addDays(from, i);
      const row = byDay.get(day);
      return { date: day, orders: row?.orders ?? 0, paidOrders: row?.paid_orders ?? 0, revenue: row?.revenue ?? 0 };
    });

    const statusCounts: Record<string, number> = { PENDING: 0, PROCESSING: 0, DELIVERED: 0, CANCELLED: 0, REFUNDED: 0 };
    byStatus.forEach((s) => (statusCounts[s.status] = s.count));

    res.status(200).json({
      success: true,
      data: {
        range: { from, to, days: rangeDays, timezone: TIMEZONE, previous: { from: prevFrom, to: prevTo } },
        currency: 'BDT',
        summary: { ...summary, newCustomers: newCustomers[0]?.count ?? 0 },
        trends: {
          totalOrders: pctChange(summary.totalOrders, previous.totalOrders),
          revenue: pctChange(summary.revenue, previous.revenue),
          paidOrders: pctChange(summary.paidOrders, previous.paidOrders),
          averageOrderValue: pctChange(summary.averageOrderValue, previous.averageOrderValue),
        },
        pendingPaymentVerifications: pendingPayments,
        series,
        ordersByStatus: statusCounts,
        paymentMethods: byMethod,
        topProducts: topProducts.map((p) => ({
          productId: p.product_id,
          productName: p.product_name,
          quantity: p.quantity,
          revenue: p.revenue,
        })),
      },
    });
  })
);

export { router as dashboardRoutes };
export default router;
