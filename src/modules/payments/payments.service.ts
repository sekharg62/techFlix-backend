import { Prisma, PaymentRecordStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import { badRequest, notFound, paginationMeta, parsePagination } from '../../utils/http';
import { changeOrderStatus, orderDetailInclude, parsePaymentMethod, resolveAdminId } from '../orders/orders.service';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const paymentsService = {
  list: async (query: Record<string, unknown>) => {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.PaymentWhereInput = {};

    const status = str(query.status).toUpperCase() as PaymentRecordStatus;
    if (status) {
      if (!Object.values(PaymentRecordStatus).includes(status)) throw badRequest('Invalid status filter');
      where.status = status;
    }
    if (str(query.method)) where.method = parsePaymentMethod(query.method);

    const search = str(query.search);
    if (search) {
      where.OR = [
        { trxId: { contains: search, mode: 'insensitive' } },
        { senderNumber: { contains: search } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              total: true,
              status: true,
              paymentStatus: true,
            },
          },
          verifiedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return { payments, pagination: paginationMeta(total, page, limit) };
  },

  /** Mark a payment as verified: order becomes PAID and moves to PROCESSING. */
  verify: async (paymentId: string, adminUserId?: string) => {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
      if (!payment) throw notFound('Payment not found');
      if (payment.status !== 'PENDING') throw badRequest(`Payment is already ${payment.status}`);
      if (payment.order.status !== 'PENDING') {
        throw badRequest(`Cannot verify a payment for an order that is ${payment.order.status}`);
      }

      const adminId = await resolveAdminId(tx, adminUserId);

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'VERIFIED', verifiedById: adminId, verifiedAt: new Date(), rejectionReason: null },
      });
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } });

      await changeOrderStatus(
        tx,
        { ...payment.order, paymentStatus: 'PAID' },
        'PROCESSING',
        adminId,
        `Payment verified (${payment.method} ${payment.trxId})`
      );

      return tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: orderDetailInclude });
    });
  },

  /** Reject a payment: the customer can then submit a new one from the tracking page. */
  reject: async (paymentId: string, reasonInput: unknown, adminUserId?: string) => {
    const reason = str(reasonInput);
    if (!reason) throw badRequest('reason is required');

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
      if (!payment) throw notFound('Payment not found');
      if (payment.status !== 'PENDING') throw badRequest(`Payment is already ${payment.status}`);

      const adminId = await resolveAdminId(tx, adminUserId);

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'REJECTED', verifiedById: adminId, verifiedAt: new Date(), rejectionReason: reason },
      });

      const otherPending = await tx.payment.count({
        where: { orderId: payment.orderId, status: 'PENDING', NOT: { id: payment.id } },
      });
      if (otherPending === 0 && payment.order.paymentStatus === 'PENDING_VERIFICATION') {
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'REJECTED' } });
      }

      return tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: orderDetailInclude });
    });
  },
};
