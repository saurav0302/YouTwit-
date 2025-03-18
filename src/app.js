import express from 'express';
import Cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(Cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))
app.use(express.json({limit: '100kb'})); // Parse JSON bodies
app.use(express.urlencoded({extended: true, limit: '100kb'})); // Parse URL-encoded bodies , extended: true allows for nested objects in the URL parameters
app.use(express.static('public')); // Serve static files
app.use(cookieParser()); // Parse cookies

// Routes import
import userRouter from './routers/user.routes.js';
import videoRouter from './routers/video.routes.js';
import subscriptionRouter from './routers/subscription.routes.js';

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/videos', videoRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);


export default app;