const mongoose = require('mongoose');

const TicketSchema=new mongoose.Schema({
    flightId: {
        type: String
    }
});

const userSchema=new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordToken:String,
    resetPasswordExpires:Date,
    role:{
        type: String,
        enum:['user','admin','manager'],
        required:true,  //default value is 'user'
        default:'user'
    },
    tickets: [TicketSchema]
});

module.exports=mongoose.model('User', userSchema,'Users');