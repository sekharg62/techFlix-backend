import app from './app';
import dotenv from 'dotenv';
import { connectDB } from './utils/prisma';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
});
