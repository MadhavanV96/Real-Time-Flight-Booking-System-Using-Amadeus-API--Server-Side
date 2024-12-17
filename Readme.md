# Flight Booking and Reservation System - Backend

This is the backend of the Flight Booking and Reservation System. The backend handles API endpoints for user authentication, flight search, booking management, payments, notifications, and real-time updates. Built using Node.js, Express.js, and connected to a database for managing data.

## Features

Features
The backend offers the following functionalities:

1. User Authentication: Login and registration of users with JWT-based authentication.
2. Flight Search: Search flights using various parameters.
3. Booking Management:
        Book, modify, and cancel flight reservations.
4. Fetch booking details and history.
5. Payment Integration: Handles secure payment processing with gateways like Stripe or PayPal.
6. Notifications: Send email booking confirmations and updates.
7. Real-Time Flight Updates: Integration with external APIs for flight status, schedules, and pricing.
8. Error Handling: Robust error handling with meaningful HTTP responses.




# Tech Stack
    Runtime: Node.js
    Framework: Express.js
    Database: MongoDB (with Mongoose)
    Authentication: JWT (JSON Web Token)
    Styling: Not applicable (backend)
    APIs: Amadeus API (for real-time updates)
    Payment Gateways:RazorPaymentGateway
    Environment Management: dotenv
    Deployment: Render

## API Endpoints
The backend exposes RESTful API endpoints documented here:
[Postman Documentation URL](https://documenter.getpostman.com/view/38692959/2sAYHzHiPZ)

## BackEnd Deployment 
The Backend is deployed using Render.com
[Render URL ](https://real-time-flight-booking-system-using.onrender.com)


## API Endpoints and their functions : 

    1. post('/flights', authController.searchFlightOffers); --> Searches flight Offers
    2. post('/userRegister', authController.userRegister);  --> Used to register the User
    3. post('/login',authController.login); --> Used for login purpose
    4. get('/signout',authController.logout); --> Used for Logout Purpose
    5. get('/check-login',auth.isAuthenticate,authController.checkLogin); --> Test API for login test
    6. post('/resetPassword',authController.resetPassword); --> Used for Reset Password
    7. post('/setNewPassword',authController.setNewPassword); --> Used for Setting New Password
    8. post('/customer-register',auth.isAuthenticate,authController.customerRegister); --> Used to register the customer/Passenger/Traveler
    9. get('/customerInfo',auth.isAuthenticate,authController.customerInfo); --> Used to retrieve the information of the Customer
    10. post('/getTickets',auth.isAuthenticate,authController.getTicketes); --> Used to get the information of the tickets
    11. post('/placeOrder',auth.isAuthenticate,authController.placeOrder); --> Used to book the ticket
    12. get('/tickets', auth.isAuthenticate, authController.viewTickets); --> Used to get information about the particular ticket

For More Information Kindly refer the Front End Code and Documentation : 

The Front End is deployed using Netlify
[Netlify URL ](https://bookyourticketguvi.netlify.app/)

The Code for the Front End is [Github Front End Code](https://github.com/MadhavanV96/Real-Time-Flight-Booking-System-Using-Amadeus-API--Front-END.git)