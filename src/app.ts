import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { userRoutes } from './modules/users/users.routes';
import { reviewRoutes } from './modules/reviews/reviews.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import heroSlideRoutes from './modules/heroSlides/heroSlides.routes';
import { categoryRoutes } from './modules/categories/categories.routes';
import { productRoutes } from './modules/products/products.routes';
import { homeSectionRoutes } from './modules/homeSections/homeSections.routes';
import { homeSectionProductRoutes } from './modules/homeSectionProducts/homeSectionProducts.routes';
import { orderRoutes } from './modules/orders/orders.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { customerRoutes } from './modules/customers/customers.routes';
import { paymentMethodRoutes } from './modules/paymentMethods/paymentMethods.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { subscriptionAlertRoutes } from './modules/subscriptionAlerts/subscriptionAlerts.routes';
import { decimalReplacer } from './utils/http';
import { revalidateStorefront as storefront } from './middlewares/storefrontRevalidate.middleware';

const app: Application = express();

// Serialise Prisma Decimal (money) values as numbers in JSON responses
app.set('json replacer', decimalReplacer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/reviews', storefront('reviews'), reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hero-slides', storefront('hero-slides'), heroSlideRoutes);
app.use('/api/categories', storefront('categories', 'products', 'home-sections'), categoryRoutes);
app.use('/api/products', storefront('products', 'categories', 'home-sections'), productRoutes);
app.use('/api/home-sections', storefront('home-sections'), homeSectionRoutes);
app.use('/api/home-section-products', storefront('home-sections'), homeSectionProductRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payment-methods', storefront('payment-methods'), paymentMethodRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription-alerts', subscriptionAlertRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the API' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;
