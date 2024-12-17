const mongoose=require('mongoose');

const app = require('./app');
require('dotenv').config();


//connect to database

mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    console.log('Connected to the database');
    app.listen(3001,()=>{
        console.log("Server is running @ http://localhost:3001");
        
    });
})
.catch((error)=>{
    console.log('Connection failed');
    console.log(error); 
})