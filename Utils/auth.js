const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../Model/userModel')
require('dotenv').config();



let amadeusToken = null; // Cached token
let tokenExpiry = null;  // Token expiry time (optional if server always checks validity)

const auth = {

  // isTokenValid, checkAmadeusToken for token validity from Amadeus API and return true if token is valid.
  // Function to validate if token is still valid
  isTokenValid: async () => {
    try {
      if (!amadeusToken) return false;

      // Send a test request to validate the token
      const response = await axios.get('https://test.api.amadeus.com/v1/security/oauth2/check_token', {
        headers: {
          Authorization: `Bearer ${amadeusToken}`,
        },
      });

      return response.status === 200; // Token is valid if request succeeds
    } catch (error) {
      console.error('Token validation failed:', error.message);
      return false; // Token is invalid
    }
  },

  // Middleware to validate or refresh token
  checkAmadeusToken: (getToken) => async (req, res, next) => {
    try {
      // Validate token
      const valid = await auth.isTokenValid();

      if (!valid) {
        console.log('Token invalid or expired. Fetching a new token...');
        const tokenResponse = await getToken; // Call getToken dynamically
        amadeusToken = tokenResponse.access_token; // Cache the new token
        tokenExpiry = Date.now() + (tokenResponse.expires_in * 1000); // Cache expiry time (if available)
      }

      // Attach the token to the request object
      req.amadeusToken = amadeusToken;
      next();
    } catch (error) {
      console.error('Error in checkAmadeusToken middleware:', error.message);
      res.status(500).json({ message: 'Failed to validate or fetch a new token' });
    }
  },
  isAuthenticate: async (request, response, next) => {
    try {
      const token = request.cookies.token;
      if (!token)
        return response.status(401).json({ message: "You don't have authorization to get Information" });
  
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const user = await User.findById(decoded.id).select("name email");
      if (!user)
        return response.status(404).json({ message: "User not found" });
  
      request.user = user;
    //  console.log("Authenticated User:", request.user._id);
      next();
    } catch (error) {
      return response.status(500).json({ message: error.message });
    }
  }
  


};

module.exports = auth;
