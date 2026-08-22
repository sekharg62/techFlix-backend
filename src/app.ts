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

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hero-slides', heroSlideRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/home-sections', homeSectionRoutes);
app.use('/api/home-section-products', homeSectionProductRoutes);

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
