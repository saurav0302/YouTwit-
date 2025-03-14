import express from 'express';

const app = express();

app.use(Cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))
app.use(express.json({limit: '100kb'})); // Parse JSON bodies
app.use(express.urlencoded({extended: true, limit: '100kb'})); // Parse URL-encoded bodies , extended: true allows for nested objects in the URL parameters
app.use(express.static('public')); // Serve static files
app.use(cookieParser()); // Parse cookies
export default app;