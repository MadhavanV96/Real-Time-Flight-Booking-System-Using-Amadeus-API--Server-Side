const express=require('express');
const cors=require('cors');
const bodyParser=require('body-parser');
const cookieParser=require('cookie-parser');
const authRouter = require('./Routes/authRouter');

const app = express();
app.use(bodyParser.json());
const allowedOrigins = ['http://localhost:5173', 'https://bookyourticketguvi.netlify.app']
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., Postman, cURL, same-origin requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("Blocked by CORS: ", origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  })
);


// app.use(cors());

app.use(express.json());
app.use(cookieParser());
app.use('/api/v1',authRouter)
module.exports=app;
