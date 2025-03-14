import dotenv from 'dotenv';
import connectDB from './db/db.js';
import app from './app.js';


dotenv.config({
    path: './.env'
});

connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running on : http://localhost:${PORT}`);
    });
    app.on('error', (error) => {
        console.log(error);
        process.exit(1);
    })
}).catch((error) => {
    console.log(error);
    process.exit(1);
});

