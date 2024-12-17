const axios = require('axios');
const User = require('../Model/userModel');
const Customer = require('../Model/customerModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const auth = require('../utils/auth');
const nodemailer = require('nodemailer');
const Razorpay=require('razorpay');
require('dotenv').config();



const qs = require('qs');
require('dotenv').config();

const authController = {

  //SearchFlightOffers --- Open Function
  searchFlightOffers: async (req, res) => {
    try {
      console.log("Testing Function");

      // Step 1: Fetch the bearer token
      const data = qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'client_credentials',
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://test.api.amadeus.com/v1/security/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data,
      };

      // Fetch bearer token from Amadeus API
      const bearerTokenResponse = await axios.request(config);
      console.log('Bearer token:', bearerTokenResponse.data.access_token);

      // Step 2: Prepare the flight search query
      const { originLocationCode, destinationLocationCode, departureDate, adults } = req.body;
      const queryParams = {
        originLocationCode,
        destinationLocationCode,
        departureDate,
        adults,
        max: 5, // limiting to 5 offers
      };
      console.log('Flight query params:', queryParams);

      // Step 3: Use the bearer token to fetch flight offers from Amadeus
      const flightOffersResponse = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
        headers: { Authorization: `Bearer ${bearerTokenResponse.data.access_token}` },
        params: queryParams,
      });

      // Log the response body to check for any data
      console.log('Flight offers response:', flightOffersResponse.data.data);

      // Step 4: Check if there is any data returned
      // if (!flightOffersResponse.data || flightOffersResponse.data.errors) {
      //   console.log('No flight offers or errors:', flightOffersResponse.data.errors);
      //   return res.status(400).json({ message: 'No flight offers found or error in response' });
      // }

      // Step 5: Send the response to the client
      res.status(200).json({
        message: 'Flight offers retrieved successfully',
        data: flightOffersResponse.data,
      });
    } catch (error) {
      // Improved error logging
      console.error('Error fetching flight offers:', error.response?.data || error.message);
      res.status(500).json({ message: 'Failed to fetch flight offers' });
    }
  },
  userRegister: async (req, res) => {
    try {
      //extract detail
      const { name, email, password } = req.body;
      //Check if the user is already registered
      const user = await User.findOne({ email });
      if (user) return res.status(400).json({ error: 'User already exists' });
      //Create a new user

      const hashedPassword = await bcrypt.hash(password, 10);

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // Use app password here
        },
      });

      const message = {
        from: process.env.EMAIL_USER,
        to: email, // Ensure this is defined
        subject: "Account Created Successfully",
        text: ` You have successfully registered with real time Flight API Application as an user. Please Contact your administrator for other access.You can use the following login credentials \n Your Username: ${email} \n Your Password: ${password}`,
      };

      await transporter.sendMail(message);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
      });
      await newUser.save();
      return res.status(201).json({ message: "User Created Successfully" });
    }
    catch (error) {
      console.error('Error registering user:', error.message);
      res.status(500).json({ message: 'Failed to register user' });
    }
  },
  login: async (request, response) => {
    try {
      const { email, password } = request.body;
      const user = await User.findOne({ email: email });
      if (!user) return response.status(400).json({ message: 'User does not exist' });
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) {
        return response.status(400).json({ message: 'Invalid Password' });
      }
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
      console.log(token);
      //store the token in cookies
      response.cookie('token', token, {
        httpOnly: true,
        secure: true, // Ensure cookies are secure in production
        sameSite: 'none', // Required for cross-origin requests
      });
      response.status(201).json({ message: "Login Successful", user: user.name, email:user.email, id:user._id, tickets: user.tickets }); 
    }
    catch (error) {
      response.status(400).json({ error: error.message });

    }
  },
  checkLogin: async (req, res) => {
    await res.json({ loggedIn: true, user: { name: req.user.name } });
  },
  logout: async (request, response) => {
    try {
      //clear the cookie
      response.clearCookie('token', {
        httpOnly: true,
        secure: true, // Same as the one used when setting the cookie
        sameSite: 'none', // Same as the one used when setting the cookie
      });
      response.status(200).json({ message: 'Logout Successful' });

    }
    catch (error) {
      response.status(400).json({ error: error.message });
    }
  },
  resetPassword: async (request, response) => {
    try {
      const { email } = request.body;
      const user = await User.findOne({ email: email });

      if (!user) {
        return response.status(404).json({ message: "User Not Found" });
      }

      const token = Math.random().toString(36).slice(-8);
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 360000; // Token expires in 1 hour
      await user.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Use app password here
        },
      });

      const message = {
        from: process.env.EMAIL_USER,
        to: user.email, // Ensure this is defined
        subject: "Password Reset Request",
        text: `You are receiving this email because you (or someone else) have requested a password reset for your account. \n\n Please use the following token to reset your password: ${token} \n\n If you did not request this, please ignore this email.`,
      };

      await transporter.sendMail(message);

      response.status(200).json({ message: "Password reset email sent successfully!" });
    } catch (error) {
      response.status(500).json({ error: error.message });
    }
  },
  setNewPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required." });
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token." });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword; // Hash password before saving (use bcrypt)
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  customerRegister: async (req, res) => {
    try {
      // Destructure nested objects properly
      const { firstname, lastname, dateOfBirth, gender, Contact_email, countryCallingCode, Contact_no, birthPlace, issuanceLocation, issuanceDate, PP_No, expiryDate, issuanceCountry, validityCountry, nationality
      } = req.body;
      // Check for missing fields
      if (
        !firstname ||
        !lastname ||
        !dateOfBirth ||
        !Contact_email ||
        !countryCallingCode ||
        !Contact_no ||
        !birthPlace ||
        !issuanceLocation ||
        !issuanceDate ||
        !PP_No ||
        !expiryDate ||
        !issuanceCountry ||
        !validityCountry ||
        !nationality
      ) {
        return res.status(400).json({ error: "All fields are required." });
      }



      const { _id: creatorId } = req.user; // Get creator ID from authenticated user

      // Create the customer object
      const newCustomerData = {
        travelerInfo: {
          name: { firstname, lastname },
          dateOfBirth,
          gender,
          contact: {
            emailAddress: Contact_email,
            phones: [{ deviceType: "MOBILE", countryCallingCode, number: Contact_no }]
          },
          documents: [{ birthPlace, issuanceLocation, issuanceDate, number: PP_No, expiryDate, issuanceCountry, validityCountry: validityCountry, nationality }]
        },
        creator: creatorId,
      };

      // Save the new customer to the database
      const newCustomer = new Customer(newCustomerData);
      await newCustomer.save();

      // Send success email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const message = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: "Customer Created Successfully",
        text: `Customer created successfully for ${firstname} ${lastname}.`,
      };

      await transporter.sendMail(message);

      return res.status(201).json({ message: "Customer Created Successfully" });
    } catch (error) {
      console.error("Error registering Customer:", error.message);
      return res.status(500).json({ message: "Failed to register Customer" });
    }
  },
  customerInfo: async (req, res) => {
    try {
      const { _id: creatorId } = req.user;
      const Passengers = await Customer.find({ creator: creatorId });

      if (Passengers.length === 0) {
        return res
          .status(404)
          .json({ message: "No Passengers found for this User. Please Create New Passengers" });
      }

      // Ensure each passenger has travelerInfo and name fields
      const formattedPassengers = Passengers.map((passenger) => ({
        ...passenger._doc,
        travelerInfo: passenger.travelerInfo || { name: { firstname: "", lastname: "" }, dateOfBirth: null },
      }));

      res.json(formattedPassengers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Server error while fetching customers" });
    }


  },

   // console.log(travelers);
      
      // const inputData = {
      //   "data": {
      //     "type": "flight-order",
      //     "flightOffers": flightOffers,
      //     "travelers": travelers,
      //     "remarks": {
      //       "general": [
      //         {
      //           "subType": "GENERAL_MISCELLANEOUS",
      //           "text": "ONLINE BOOKING FROM INCREIBLE VIAJES"
      //         }
      //       ]
      //     },
      //     "ticketingAgreement": {
      //       "option": "DELAY_TO_CANCEL",
      //       "delay": "6D"
      //     },
      //     "contacts": [
      //       {
      //         "addresseeName": {
      //           "firstName": "MADHAVAN",
      //           "lastName": "V"
      //         },
      //         "companyName": "APP TESTIN COMPANY",
      //         "purpose": "STANDARD",
      //         "phones": [
      //           {
      //             "deviceType": "MOBILE",
      //             "countryCallingCode": "91",
      //             "number": "9994576279"
      //           },
      //         ],
      //         "emailAddress": "13isid4me@gmail.com",
      //         "address": {
      //           "lines": [
      //             "43/4A3"
      //           ],
      //           "postalCode": "628501",
      //           "cityName": "Kovilpatti",
      //           "countryCode": "IN"
      //         }
      //       }
      //     ]
      //   }
      // }

      

      // placeOrder: async (req, res) => {
      //   try {
      //     const data = qs.stringify({
      //       client_id: process.env.CLIENT_ID,
      //       client_secret: process.env.CLIENT_SECRET,
      //       grant_type: 'client_credentials',
      //     });
      
      //     const config = {
      //       method: 'post',
      //       maxBodyLength: Infinity,
      //       url: 'https://test.api.amadeus.com/v1/security/oauth2/token',
      //       headers: {
      //         'Content-Type': 'application/x-www-form-urlencoded',
      //       },
      //       data: data,
      //     };
      
      //     // Fetch bearer token from Amadeus API
      //     const bearerTokenResponse = await axios.request(config);
      //     const { flightOffers, travelers } = req.body;
      
      //     const user = await User.findById(req.user._id);
      
      //     const inputData = {
      //       data: {
      //         type: "flight-order",
      //         flightOffers: flightOffers,
      //         travelers: travelers,
      //         remarks: {
      //           general: [
      //             {
      //               subType: "GENERAL_MISCELLANEOUS",
      //               text: "ONLINE BOOKING FROM INCREIBLE VIAJES",
      //             },
      //           ],
      //         },
      //         ticketingAgreement: {
      //           option: "DELAY_TO_CANCEL",
      //           delay: "6D",
      //         },
      //         contacts: [
      //           {
      //             addresseeName: {
      //               firstName: user.name.split(' ')[0],
      //               lastName: user.name.split(' ')[1] || '',
      //             },
      //             emailAddress: user.email,
      //             phones: [
      //               {
      //                 deviceType: "MOBILE",
      //                 countryCallingCode: "91",
      //                 number: user.phoneNumber || "9999999999",
      //               },
      //             ],
      //           },
      //         ],
      //       },
      //     };
      
      //     const orderConfig = {
      //       headers: {
      //         Authorization: `Bearer ${bearerTokenResponse.data.access_token}`,
      //         'Content-Type': 'application/json',
      //       },
      //     };
      
      //     const bookingResponse = await axios.post(
      //       'https://test.api.amadeus.com/v1/booking/flight-orders',
      //       inputData,
      //       orderConfig
      //     );
      
      //     const flightOrder = bookingResponse.data;
      //     console.log("Flight Order Confirmation:", flightOrder);
      
      //     // Save ticket details to the user's account
      //     user.tickets.push({ flightId: flightOrder.data.id });
      //     await user.save();
      
      //     // Send confirmation email
      //     const transporter = nodemailer.createTransport({
      //       service: 'Gmail', // You can use any SMTP provider
      //       auth: {
      //         user: process.env.EMAIL_USER, // Your email address
      //         pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      //       },
      //     });
      
      //     const emailHTML = `
      //       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      //         <h2 style="color: #014085;">Flight Ticket Confirmation</h2>
      //         <p>Dear ${user.name},</p>
      //         <p>Thank you for booking your flight with us. Here are your ticket details:</p>
      //         <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      //           <tr style="background-color: #f2f2f2;">
      //             <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Flight ID</th>
      //             <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Booking Date</th>
      //           </tr>
      //           <tr>
      //             <td style="border: 1px solid #ddd; padding: 8px;">${flightOrder.data.id}</td>
      //             <td style="border: 1px solid #ddd; padding: 8px;">${new Date().toLocaleDateString()}</td>
      //           </tr>
      //         </table>
      //         <p>If you have any questions, feel free to contact us at support@bookyourticket.com.</p>
      //         <p>Safe travels!</p>
      //         <p style="color: #555;">- BookYourTicket.com Team</p>
      //       </div>
      //     `;
      
      //     await transporter.sendMail({
      //       from: `"BookYourTicket.com" <${process.env.EMAIL_USER}>`,
      //       to: user.email,
      //       subject: "Your Flight Ticket Confirmation",
      //       html: emailHTML,
      //     });
      
      //     console.log("Email sent to:", user.email);
      
      //     // Respond to the client
      //     return res.status(200).json({ message: "Order placed successfully", flightOrder });
      
      //   } catch (error) {
      //     console.error("Error placing order:", error);
      //     return res.status(500).json({ message: "Failed to place order", error: error.message });
      //   }
      // },
      
// old placeOrder Worked fine before email
  placeOrder: async (req, res) => {
    try {
      console.log("Place Order");
      
      const data = qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'client_credentials',
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://test.api.amadeus.com/v1/security/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data,
      };

      // Fetch bearer token from Amadeus API
      const bearerTokenResponse = await axios.request(config);
      const { flightOffers, travelers  } = req.body;
     
      
      const user = await User.findById(req.user._id);
      console.log(user);
      

     


      const inputData = {
          "data": {
            "type": "flight-order",
            "flightOffers":flightOffers,
            //  [
            //   {
            //     "type": "flight-offer",
            //     "id": "1",
            //     "source": "GDS",
            //     "instantTicketingRequired": false,
            //     "nonHomogeneous": false,
            //     "paymentCardRequired": false,
            //     "lastTicketingDate": "2024-12-23",
            //     "itineraries": [
            //       {
            //         "segments": [
            //           {
            //             "departure": {
            //               "iataCode": "CDG",
            //               "at": "2024-12-23T15:25:00"
            //             },
            //             "arrival": {
            //               "iataCode": "HEL",
            //               "at": "2024-12-23T19:20:00"
            //             },
            //             "carrierCode": "6X",
            //             "number": "3618",
            //             "aircraft": {
            //               "code": "733"
            //             },
            //             "operating": {
            //               "carrierCode": "6X"
            //             },
            //             "duration": "PT2H55M",
            //             "id": "9",
            //             "numberOfStops": 0,
            //             "co2Emissions": [
            //               {
            //                 "weight": 174,
            //                 "weightUnit": "KG",
            //                 "cabin": "ECONOMY"
            //               }
            //             ]
            //           },
            //           {
            //             "departure": {
            //               "iataCode": "HEL",
            //               "at": "2024-12-24T17:30:00"
            //             },
            //             "arrival": {
            //               "iataCode": "ICN",
            //               "at": "2024-12-25T08:20:00"
            //             },
            //             "carrierCode": "6X",
            //             "number": "3605",
            //             "aircraft": {
            //               "code": "733"
            //             },
            //             "operating": {
            //               "carrierCode": "6X"
            //             },
            //             "duration": "PT7H50M",
            //             "id": "10",
            //             "numberOfStops": 0,
            //             "co2Emissions": [
            //               {
            //                 "weight": 295,
            //                 "weightUnit": "KG",
            //                 "cabin": "ECONOMY"
            //               }
            //             ]
            //           }
            //         ]
            //       }
            //     ],
            //     "price": {
            //       "currency": "EUR",
            //       "total": "231.94",
            //       "base": "134.00",
            //       "fees": [
            //         {
            //           "amount": "0.00",
            //           "type": "SUPPLIER"
            //         },
            //         {
            //           "amount": "0.00",
            //           "type": "TICKETING"
            //         },
            //         {
            //           "amount": "0.00",
            //           "type": "FORM_OF_PAYMENT"
            //         }
            //       ],
            //       "grandTotal": "231.94",
            //       "billingCurrency": "EUR"
            //     },
            //     "pricingOptions": {
            //       "fareType": ["PUBLISHED"],
            //       "includedCheckedBagsOnly": true
            //     },
            //     "validatingAirlineCodes": ["6X"],
            //     "travelerPricings": [
            //       {
            //         "travelerId": "1",
            //         "fareOption": "STANDARD",
            //         "travelerType": "ADULT",
            //         "price": {
            //           "currency": "EUR",
            //           "total": "115.97",
            //           "base": "67.00",
            //           "taxes": [
            //             {
            //               "amount": "4.51",
            //               "code": "IZ"
            //             },
            //             {
            //               "amount": "3.00",
            //               "code": "O4"
            //             },
            //             {
            //               "amount": "5.54",
            //               "code": "WL"
            //             },
            //             {
            //               "amount": "13.13",
            //               "code": "QX"
            //             },
            //             {
            //               "amount": "21.89",
            //               "code": "FR"
            //             },
            //             {
            //               "amount": "0.90",
            //               "code": "XU"
            //             }
            //           ],
            //           "refundableTaxes": "48.97"
            //         },
            //         "fareDetailsBySegment": [
            //           {
            //             "segmentId": "9",
            //             "cabin": "ECONOMY",
            //             "fareBasis": "YCNV1",
            //             "class": "Y",
            //             "includedCheckedBags": {
            //               "quantity": 9
            //             }
            //           },
            //           {
            //             "segmentId": "10",
            //             "cabin": "ECONOMY",
            //             "fareBasis": "YCNV1",
            //             "class": "Y",
            //             "includedCheckedBags": {
            //               "quantity": 9
            //             }
            //           }
            //         ]
            //       }
            //     ]
            //   }
            // ],
            "travelers":travelers,
            //  [
            //   {
            //     "id": "1",
            //     "dateOfBirth": "1982-01-16",
            //     "name": {
            //       "firstName": "JORGE",
            //       "lastName": "GONZALES"
            //     },
            //     "gender": "MALE",
            //     "contact": {
            //       "emailAddress": "jorge.gonzales833@telefonica.es",
            //       "phones": [
            //         {
            //           "deviceType": "MOBILE",
            //           "countryCallingCode": "34",
            //           "number": "480080076"
            //         }
            //       ]
            //     },
            //     "documents": [
            //       {
            //         "documentType": "PASSPORT",
            //         "birthPlace": "Madrid",
            //         "issuanceLocation": "Madrid",
            //         "issuanceDate": "2015-04-14",
            //         "number": "00000000",
            //         "expiryDate": "2025-04-14",
            //         "issuanceCountry": "ES",
            //         "validityCountry": "ES",
            //         "nationality": "ES",
            //         "holder": true
            //       }
            //     ]
            //   }
            // ],
            "remarks": {
              "general": [
                {
                  "subType": "GENERAL_MISCELLANEOUS",
                  "text": "ONLINE BOOKING FROM INCREIBLE VIAJES"
                }
              ]
            },
            "ticketingAgreement": {
              "option": "DELAY_TO_CANCEL",
              "delay": "6D"
            },
            "contacts": [
              {
                "addresseeName": {
                  "firstName": "Madhavan",
                  "lastName": "RODRIGUEZ"
                },
                "companyName": "INCREIBLE VIAJES",
                "purpose": "STANDARD",
                "phones": [
                  {
                    "deviceType": "LANDLINE",
                    "countryCallingCode": "34",
                    "number": "480080071"
                  },
                  {
                    "deviceType": "MOBILE",
                    "countryCallingCode": "33",
                    "number": "480080072"
                  }
                ],
                "emailAddress": "support@increibleviajes.es",
                "address": {
                  "lines": ["Calle Prado, 16"],
                  "postalCode": "28014",
                  "cityName": "Madrid",
                  "countryCode": "ES"
                }
              }
            ]
          }
      }
      
      // console.log(inputData.data);
      // console.log("Bearer Token Testing: ",bearerTokenResponse.data.access_token);
      
      
      const order = {
        headers: {
          "Authorization": `Bearer ${bearerTokenResponse.data.access_token}`,
          'Content-Type': 'application/json',
        },
      };
      console.log();
      
      await axios.post('https://test.api.amadeus.com/v1/booking/flight-orders', inputData, order)
        .then(response => {
          console.log("Testing Response");
          
          console.log(response.data);
          user.tickets.push({flightId: response.data.data.id });
          user.save();
          // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // You can use any SMTP provider
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      },
    });

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #014085;">Flight Ticket Confirmation</h2>
        <p>Dear ${user.name},</p>
        <p>Thank you for booking your flight with us. Here are your ticket details:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Flight ID</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Booking Date</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${response.data.data.id}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
        <p>If you have any questions, feel free to contact us at support@bookyourticket.com.</p>
        <p>Safe travels!</p>
        <p style="color: #555;">- BookYourTicket.com Team</p>
      </div>
    `;

     transporter.sendMail({
      from: `"BookYourTicket.com" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your Flight Ticket Confirmation",
      html: emailHTML,
    });

    console.log("Email sent to:", user.email);






          return res.status(200).json(response.data);
        })
        .catch(error => {
          console.log(error.message);
          
          return res.status(500).json({ message: error });

        });
      }
      catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({ message: "Failed to place order" });
      }


  },


  


  //Payment Interface
//
  payAmount: async(req,res)=>{
    try{
      console.log("Executing");
      
       const razorpay=new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
        amount: req.body.amount*100, // amount in the smallest currency unit (hundredths of a rupee)
        currency: "INR",
        // payment_capture: 1, // auto capture
       })
       const options=req.body;
       console.log(options);
       
       const order=await razorpay.orders.create(options);
       if(!order){
        return res.status(500).json({ message: "Failed to create order" });
       }
       res.json(order);


       
    }
    catch(error) {
      console.error("Error paying amount:", error);
      return res.status(500).json({ message: "Failed to pay amount" });
    }
  },


  
  getTicketes:async(req,res)=>{
    try {
      const { ticketID } = req.body; // Extract ticketID from the request body
      console.log("Ticket ID:", ticketID);
  
      // Step 1: Fetch the bearer token from Amadeus API
      const data = qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'client_credentials',
      });
  
      const configToken = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://test.api.amadeus.com/v1/security/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data,
      };
  
      const bearerTokenResponse = await axios.request(configToken);
      console.log('Bearer token:', bearerTokenResponse.data.access_token);
  
      // Step 2: Use the bearer token to get flight ticket details
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://test.api.amadeus.com/v1/booking/flight-orders/${ticketID}`,
        headers: {
          "Authorization": `Bearer ${bearerTokenResponse.data.access_token}`,
        },
      };
  
      // Fetch flight ticket details from Amadeus API
      const ticketResponse = await axios.request(config);
  
      // Return the response to the client
      return res.status(200).json(ticketResponse.data);
      
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      return res.status(500).json({ message: "Failed to fetch ticket details" });
    }
  },


  viewTickets: async (req, res) => {
    try {
      const user = req.user; // Use the user from the middleware
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const populatedUser = await User.findById(user._id).populate('tickets');
      res.status(200).json({ tickets: populatedUser.tickets || [] });
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: 'Failed to fetch tickets' });
    }
  }
  //New Ticekt Get Code

  


};

module.exports = authController;
