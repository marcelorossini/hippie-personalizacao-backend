import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import tshirtRoutes from './routes/tshirt.routes';
import { globalLimiter, uploadLimiter } from './middlewares/rateLimiter';

const app = express();
const PORT = process.env.PORT || 4564;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar rate limiting global
app.use(globalLimiter);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir);
}

// Serve uploaded files com rate limiting específico
app.use('/uploads', uploadLimiter, express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/tshirt', tshirtRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 