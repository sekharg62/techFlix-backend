import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { userRoutes } from './modules/users/users.routes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

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
