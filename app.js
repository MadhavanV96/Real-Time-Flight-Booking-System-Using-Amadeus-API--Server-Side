const express=require('express');
const cors=require('cors');
const bodyParser=require('body-parser');
const cookieParser=require('cookie-parser');
const authRouter = require('./Routes/authRouter');

const app = express();
const allowedOrigins = ['http://localhost:5173', 'https://bookyourticketguvi.netlify.app/']
app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true, // Ensure cookies are sent
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    })
  );
// app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1',authRouter)
module.exports=app;
