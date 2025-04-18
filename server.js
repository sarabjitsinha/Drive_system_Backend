import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './controllers/auth.js';
import fileRoutes from './controllers/files.js';


dotenv.config();
const app =new express();

app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);



const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
.then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
.catch(err => console.error(err));

const db=mongoose.connection;

db.on("open",()=>{
  console.log("Databse connected")
})

