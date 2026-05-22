import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import { initWebSocketServer } from './services/websocket';
import { initQuestionWorker } from './workers/generatorWorker';
import { initPdfWorker } from './workers/pdfWorker';
import { assignmentRouter } from './routes/assignment';
import { paperRouter } from './routes/paper';
import { authRouter } from './routes/auth';
import { groupRouter } from './routes/groups';
import { errorHandler } from './middleware/error';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Initialize MongoDB
connectDB();

// Setup WebSocket server sharing the HTTP Server port
initWebSocketServer(httpServer);

// Start BullMQ Background Processing Workers
const questionWorker = initQuestionWorker();
const pdfWorker = initPdfWorker();

console.log('BullMQ Background Workers initialized successfully.');

// Middleware Layers (Strict Order)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

// Static serving for uploads and generated Puppeteer A4 PDF files
app.use('/static', express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes prefixes registration
app.use('/api/auth', authRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/papers', paperRouter);
app.use('/api/groups', groupRouter);

// Root Endpoint (So Render doesn't show "Cannot GET /")
app.get('/', (req, res) => {
  res.send('VedaAI Backend is Live and Running!');
});

// Service Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Centralized error boundary middleware at the very bottom
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`[VedaAI Server] Listening on port: ${PORT}`);
});
