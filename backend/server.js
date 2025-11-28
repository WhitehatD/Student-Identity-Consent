import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite and React dev servers
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableEndpoints: [
            'GET /api/contracts/meta',
            'POST /api/wallets',
            'GET /api/student-data/:cid',
            'GET /api/data-types',
            'GET /api/wallet/:address',
            'GET /api/blockchain/student/:address',
            'GET /api/blockchain/requester/:address',
            'GET /api/blockchain/consent/:studentAddress/:requesterAddress/:dataType',
            'POST /api/blockchain/check-consents',
            'POST /api/blockchain/compute-email-hash',
            'GET /health'
        ]
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
async function startServer() {
    try {
        await pool.query('SELECT NOW()');
        console.log('Database connection verified');

        app.listen(PORT, () => {
            console.log('');
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('');
            console.log('Available endpoints:');
            console.log('');
            console.log('  Off-chain Data:');
            console.log(`   POST   http://localhost:${PORT}/api/wallets`);
            console.log(`   GET    http://localhost:${PORT}/api/student-data/:cid`);
            console.log(`   GET    http://localhost:${PORT}/api/data-types`);
            console.log(`   GET    http://localhost:${PORT}/api/wallet/:address`);
            console.log('');
            console.log('  Blockchain Data:');
            console.log(`   GET    http://localhost:${PORT}/api/blockchain/student/:address`);
            console.log(`   GET    http://localhost:${PORT}/api/blockchain/requester/:address`);
            console.log(`   GET    http://localhost:${PORT}/api/blockchain/consent/:studentAddress/:requesterAddress/:dataType`);
            console.log(`   POST   http://localhost:${PORT}/api/blockchain/check-consents`);
            console.log(`   POST   http://localhost:${PORT}/api/blockchain/compute-email-hash`);
            console.log('');
            console.log('  Health:');
            console.log(`   GET    http://localhost:${PORT}/health`);
            console.log('');
            console.log('Database: Connected to PostgreSQL');
            console.log(`Blockchain: ${process.env.RPC_URL || 'http://127.0.0.1:8545'}`);
            console.log('');
            console.log('Press Ctrl+C to stop the server');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});

startServer();

