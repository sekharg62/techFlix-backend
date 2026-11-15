import {
  Prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethodType,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import { badRequest, conflict, notFound, paginationMeta, parsePagination } from '../../utils/http';

type Tx = Prisma.TransactionClient;

const MAX_ITEMS = 20;
/** Must match PAYOUT_CHARGE_PERCENT in techFlix-Next/src/lib/pricing.ts. */
export const PAYOUT_CHARGE_PERCENT = 2;
const MAX_QUANTITY = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;
const TRX_RE = /^[A-Za-z0-9]{6,30}$/;

export interface CheckoutInput {
  fullName?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  country?: unknown;
  note?: unknown;
  items?: unknown;
  payment?: unknown;
}

export interface PaymentInput {
  method?: unknown;
  senderNumber?: unknown;
  trxId?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const formatOrderNumber = (seq: number) => `TF-${String(seq).padStart(6, '0')}`;

export const parsePaymentMethod = (value: unknown): PaymentMethodType => {
  const method = str(value).toUpperCase() as PaymentMethodType;
  if (!Object.values(PaymentMethodType).includes(method)) {
    throw badRequest(`payment method must be one of: ${Object.values(PaymentMethodType).join(', ')}`);
  }
  return method;
};

export const parsePaymentInput = (input: unknown) => {
  const payment = (input || {}) as PaymentInput;
  const method = parsePaymentMethod(payment.method);
  const senderNumber = str(payment.senderNumber).replace(/[\s-]/g, '');
  if (!PHONE_RE.test(senderNumber)) {
    throw badRequest('payment senderNumber must be a valid phone number');
  }
  const trxId = str(payment.trxId).toUpperCase();
  if (!TRX_RE.test(trxId)) {
    throw badRequest('payment trxId must be 6-30 letters or digits');
  }
  return { method, senderNumber, trxId };
};

export const ensureTrxIdUnused = async (db: Tx | typeof prisma, trxId: string) => {
  const used = await db.payment.findUnique({ where: { trxId }, select: { id: true } });
  if (used) {
    throw conflict('This transaction ID has already been used');
  }
};

/** Admin user id from the JWT, or null if that user no longer exists (keeps FKs valid). */
export const resolveAdminId = async (db: Tx | typeof prisma, userId?: string) => {
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  return user?.id ?? null;
};

export const orderDetailInclude = {
  customer: true,
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    include: { verifiedBy: { select: { id: true, name: true, email: true } } },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    include: { changedBy: { select: { id: true, name: true, email: true } } },
  },
} satisfies Prisma.OrderInclude;

/** Order status workflow. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'], // only when the payment had been verified (checked below)
  REFUNDED: [],
};

export const changeOrderStatus = async (
  tx: Tx,
  order: { id: string; status: OrderStatus; paymentStatus: PaymentStatus },
  toStatus: OrderStatus,
  changedById: string | null,
  note?: string | null
) => {
  if (order.status === toStatus) return;
  if (!ALLOWED_TRANSITIONS[order.status].includes(toStatus)) {
    throw badRequest(`Cannot change order status from ${order.status} to ${toStatus}`);
  }
  if (toStatus === 'PROCESSING' && order.paymentStatus !== 'PAID') {
    throw badRequest('Payment must be verified before the order can be processed');
  }
  if (order.status === 'CANCELLED' && toStatus === 'REFUNDED' && order.paymentStatus !== 'PAID') {
    throw badRequest('Only cancelled orders with a verified payment can be refunded');
  }

  const data: Prisma.OrderUpdateInput = { status: toStatus };
  if (toStatus === 'DELIVERED') data.deliveredAt = new Date();
  if (toStatus === 'CANCELLED') {
    data.cancelledAt = new Date();
    // Unverified payments of a cancelled order will never be reviewed — close them out
    const closed = await tx.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        verifiedById: changedById,
        verifiedAt: new Date(),
        rejectionReason: note ? `Order cancelled: ${note}` : 'Order cancelled',
      },
    });
    if (closed.count > 0 && order.paymentStatus === 'PENDING_VERIFICATION') data.paymentStatus = 'REJECTED';
  }
  if (toStatus === 'REFUNDED') data.paymentStatus = 'REFUNDED';

  await tx.order.update({ where: { id: order.id }, data });
  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus,
      note: note || null,
      changedById,
    },
  });
};

const findOrderOrThrow = async (db: Tx | typeof prisma, idOrNumber: string) => {
  const order = await db.order.findFirst({
    where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber.toUpperCase() }] },
  });
  if (!order) throw notFound('Order not found');
  return order;
};

export const ordersService = {
  /** Public checkout: validates input, prices items from the database and creates everything atomically. */
  checkout: async (input: CheckoutInput) => {
    const fullName = str(input.fullName);
    const email = str(input.email).toLowerCase();
    const whatsapp = str(input.whatsapp).replace(/[\s-]/g, '');
    const country = str(input.country) || null;
    const note = str(input.note) || null;

    if (!fullName || fullName.length > 120) throw badRequest('fullName is required (max 120 characters)');
    if (!EMAIL_RE.test(email)) throw badRequest('A valid email is required');
    if (!PHONE_RE.test(whatsapp)) throw badRequest('A valid whatsapp number is required');
    if (note && note.length > 1000) throw badRequest('note must be at most 1000 characters');

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw badRequest('items must be a non-empty array of { productId, planId, quantity }');
    }
    if (input.items.length > MAX_ITEMS) throw badRequest(`An order can have at most ${MAX_ITEMS} items`);

    // Merge duplicate plans
    const quantities = new Map<string, { productId: string; planId: string; quantity: number }>();
    input.items.forEach((raw: any, index: number) => {
      const productId = str(raw?.productId);
      const planId = str(raw?.planId);
      const quantity = raw?.quantity === undefined ? 1 : Number(raw.quantity);
      if (!productId || !planId) throw badRequest(`items[${index}] needs productId and planId`);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        throw badRequest(`items[${index}].quantity must be an integer between 1 and ${MAX_QUANTITY}`);
      }
      const existing = quantities.get(planId);
      if (existing && existing.productId !== productId) {
        throw badRequest(`items[${index}] plan does not belong to the given product`);
      }
      quantities.set(planId, { productId, planId, quantity: (existing?.quantity || 0) + quantity });
    });

    const payment = parsePaymentInput(input.payment);

    const lines = [...quantities.values()];
    if (lines.some((l) => l.quantity > MAX_QUANTITY)) {
      throw badRequest(`quantity per plan must not exceed ${MAX_QUANTITY}`);
    }

    const plans = await prisma.productPlan.findMany({
      where: { id: { in: lines.map((l) => l.planId) } },
      include: { product: true, variant: true },
    });
    const planById = new Map(plans.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const itemsData = lines.map((line) => {
      const plan = planById.get(line.planId);
      if (!plan || plan.productId !== line.productId) {
        throw badRequest('One of the selected plans no longer exists. Please refresh your cart.');
      }
      const label = [plan.product.name, plan.variant?.name, plan.name].filter(Boolean).join(' - ');
      if (!plan.product.stock || !plan.inStock || (plan.variant && !plan.variant.inStock)) {
        throw badRequest(`"${label}" is out of stock`);
      }
      const lineTotal = plan.price.mul(line.quantity);
      subtotal = subtotal.add(lineTotal);
      return {
        productId: plan.productId,
        planId: plan.id,
        productName: plan.product.name,
        productSlug: plan.product.slug,
        productImgUrl: plan.product.imgUrl,
        variantName: plan.variant?.name ?? null,
        planName: plan.name,
        planDurationDays: plan.durationDays,
        planValidity: plan.validity,
        unitPrice: plan.price,
        quantity: line.quantity,
        lineTotal,
      };
    });

    const discount = new Prisma.Decimal(0);
    // Payout (cash-out) charge: 2% of the discounted subtotal, rounded up to a whole taka.
    // Stored inside `total` (charge = total - subtotal + discount), so no extra column is needed.
    const payoutCharge = subtotal.sub(discount).mul(PAYOUT_CHARGE_PERCENT).div(100).ceil();
    const total = subtotal.sub(discount).add(payoutCharge);

    await ensureTrxIdUnused(prisma, payment.trxId);

    const orderId = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email },
        update: { fullName, whatsapp, ...(country ? { country } : {}) },
        create: { fullName, email, whatsapp, country },
      });

      const created = await tx.order.create({
        data: {
          orderNumber: `TMP-${crypto.randomUUID()}`,
          customerId: customer.id,
          customerName: fullName,
          customerEmail: email,
          customerPhone: whatsapp,
          country,
          customerNote: note,
          currency: 'BDT',
          subtotal,
          discount,
          total,
          items: { create: itemsData },
          payments: {
            create: {
              method: payment.method,
              senderNumber: payment.senderNumber,
              trxId: payment.trxId,
              amount: total,
            },
          },
          statusHistory: {
            create: { fromStatus: null, toStatus: 'PENDING', note: 'Order placed by customer' },
          },
        },
      });

      await tx.order.update({
        where: { id: created.id },
        data: { orderNumber: formatOrderNumber(created.seq) },
      });
      return created.id;
    });

    return prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
  },

  /** Public tracking: requires both order number and the email used at checkout. */
  track: async (orderNumber: string, email: string) => {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim().toUpperCase(),
        customerEmail: email.trim().toLowerCase(),
      },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        currency: true,
        subtotal: true,
        discount: true,
        total: true,
        createdAt: true,
        deliveredAt: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        country: true,
        items: {
          select: {
            productName: true,
            productSlug: true,
            productImgUrl: true,
            variantName: true,
            planName: true,
            planValidity: true,
            unitPrice: true,
            quantity: true,
            lineTotal: true,
            deliveredAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: { method: true, trxId: true, amount: true, status: true, rejectionReason: true, createdAt: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: { toStatus: true, createdAt: true },
        },
      },
    });
    if (!order) throw notFound('No order found with this order number and email');
    return order;
  },

  /** Public: customer submits a new payment after the previous one was rejected. */
  resubmitPayment: async (orderNumber: string, email: string, paymentInput: unknown) => {
    const payment = parsePaymentInput(paymentInput);
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim().toUpperCase(),
        customerEmail: email.trim().toLowerCase(),
      },
    });
    if (!order) throw notFound('No order found with this order number and email');
    if (order.status !== 'PENDING' || order.paymentStatus !== 'REJECTED') {
      throw badRequest('A new payment can only be submitted when the previous payment was rejected');
    }

    await ensureTrxIdUnused(prisma, payment.trxId);

    await prisma.$transaction([
      prisma.payment.create({
        data: { orderId: order.id, ...payment, amount: order.total },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PENDING_VERIFICATION' },
      }),
    ]);

    return ordersService.track(order.orderNumber, order.customerEmail);
  },

  list: async (query: Record<string, unknown>) => {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.OrderWhereInput = {};

    const status = str(query.status).toUpperCase() as OrderStatus;
    if (status) {
      if (!Object.values(OrderStatus).includes(status)) throw badRequest('Invalid status filter');
      where.status = status;
    }
    const paymentStatus = str(query.paymentStatus).toUpperCase() as PaymentStatus;
    if (paymentStatus) {
      if (!Object.values(PaymentStatus).includes(paymentStatus)) throw badRequest('Invalid paymentStatus filter');
      where.paymentStatus = paymentStatus;
    }
    if (str(query.method)) {
      where.payments = { some: { method: parsePaymentMethod(query.method) } };
    }
    if (str(query.customerId)) where.customerId = str(query.customerId);

    const from = str(query.from) ? new Date(str(query.from)) : null;
    const to = str(query.to) ? new Date(str(query.to)) : null;
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      throw badRequest('from/to must be valid dates');
    }
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const search = str(query.search);
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { payments: { some: { trxId: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Counts per status for the current filters (ignoring the status filter itself) — used for tabs
    const { status: _ignored, ...whereWithoutStatus } = where;

    const [total, orders, grouped] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          items: { select: { id: true, productName: true, variantName: true, planName: true, quantity: true, deliveredAt: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, method: true, trxId: true, senderNumber: true, status: true },
          },
        },
      }),
      prisma.order.groupBy({ by: ['status'], where: whereWithoutStatus, _count: { _all: true } }),
    ]);

    const statusCounts: Record<string, number> = { ALL: 0 };
    Object.values(OrderStatus).forEach((s) => (statusCounts[s] = 0));
    grouped.forEach((g) => {
      statusCounts[g.status] = g._count._all;
      statusCounts.ALL += g._count._all;
    });

    return { orders, statusCounts, pagination: paginationMeta(total, page, limit) };
  },

  getById: async (idOrNumber: string) => {
    const order = await findOrderOrThrow(prisma, idOrNumber);
    return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
  },

  updateStatus: async (idOrNumber: string, statusInput: unknown, note: unknown, adminUserId?: string) => {
    const toStatus = str(statusInput).toUpperCase() as OrderStatus;
    if (!Object.values(OrderStatus).includes(toStatus)) {
      throw badRequest(`status must be one of: ${Object.values(OrderStatus).join(', ')}`);
    }
    return prisma.$transaction(async (tx) => {
      const order = await findOrderOrThrow(tx, idOrNumber);
      if (toStatus === 'DELIVERED') {
        const undelivered = await tx.orderItem.count({ where: { orderId: order.id, deliveredAt: null } });
        if (undelivered > 0) throw badRequest('Deliver all items before marking the order as delivered');
      }
      const adminId = await resolveAdminId(tx, adminUserId);
      await changeOrderStatus(tx, order, toStatus, adminId, str(note) || null);
      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
    });
  },

  updateAdminNote: async (idOrNumber: string, adminNote: unknown) => {
    const order = await findOrderOrThrow(prisma, idOrNumber);
    return prisma.order.update({
      where: { id: order.id },
      data: { adminNote: str(adminNote) || null },
      include: orderDetailInclude,
    });
  },

  /** Save the license key / credentials for one item; auto-completes the order when every item is delivered. */
  deliverItem: async (idOrNumber: string, itemId: string, deliveryDetails: unknown, adminUserId?: string) => {
    const details = str(deliveryDetails);
    if (!details) throw badRequest('deliveryDetails is required');

    return prisma.$transaction(async (tx) => {
      const order = await findOrderOrThrow(tx, idOrNumber);
      if (order.paymentStatus !== 'PAID') throw badRequest('Payment must be verified before delivering items');
      if (order.status !== 'PROCESSING' && order.status !== 'DELIVERED') {
        throw badRequest(`Items cannot be delivered while the order is ${order.status}`);
      }

      const item = await tx.orderItem.findFirst({ where: { id: itemId, orderId: order.id } });
      if (!item) throw notFound('Order item not found');

      await tx.orderItem.update({
        where: { id: item.id },
        data: { deliveryDetails: details, deliveredAt: item.deliveredAt ?? new Date() },
      });

      if (order.status === 'PROCESSING') {
        const undelivered = await tx.orderItem.count({ where: { orderId: order.id, deliveredAt: null } });
        if (undelivered === 0) {
          const adminId = await resolveAdminId(tx, adminUserId);
          await changeOrderStatus(tx, order, 'DELIVERED', adminId, 'All items delivered');
        }
      }

      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
    });
  },

  delete: async (idOrNumber: string) => {
    const order = await findOrderOrThrow(prisma, idOrNumber);
    if (order.status !== 'CANCELLED') {
      throw badRequest('Only cancelled orders can be deleted');
    }
    await prisma.order.delete({ where: { id: order.id } });
  },
};
