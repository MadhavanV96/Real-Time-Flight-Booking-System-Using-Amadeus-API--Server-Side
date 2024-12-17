const express= require('express');
const authController = require('../Controller/authController');
const auth = require('../utils/auth');
// const auth = require('../Utils/auth');
// const authController = require('../Controller/authController');
// const auth = require('../utils/auth');

const authRouter = express.Router();

//Public Routes

// authRouter.post('/flights', auth.checkAmadeusToken, authController.searchFlightOffers);
authRouter.post('/flights', authController.searchFlightOffers);
authRouter.post('/userRegister', authController.userRegister);
authRouter.post('/login',authController.login);
authRouter.get('/signout',authController.logout);
authRouter.get('/check-login',auth.isAuthenticate,authController.checkLogin);
authRouter.post('/resetPassword',authController.resetPassword);
authRouter.post('/setNewPassword',authController.setNewPassword);
authRouter.post('/customer-register',auth.isAuthenticate,authController.customerRegister);
authRouter.get('/customerInfo',auth.isAuthenticate,authController.customerInfo);
authRouter.post('/getTickets',auth.isAuthenticate,authController.getTicketes);
authRouter.post('/placeOrder',auth.isAuthenticate,authController.placeOrder);
authRouter.get('/tickets', auth.isAuthenticate, authController.viewTickets);





//Payment Interface

authRouter.post('/payment',authController.payAmount);



module.exports =authRouter;