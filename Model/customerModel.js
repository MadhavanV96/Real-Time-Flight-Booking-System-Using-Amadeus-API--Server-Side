const mongoose = require('mongoose');
const User = require("./userModel");

const phoneSchema = new mongoose.Schema({

  deviceType: {
    type: String,
    enum: ["MOBILE", "LANDLINE", "FAX", "OTHER"], // Allowed types
    required: true,
  },
  countryCallingCode: {
    type: String,
    match: /^[0-9]+$/, // Ensure it's numeric
    required: true,
  },
  number: {
    type: String,
    match: /^[0-9]{6,15}$/, // Phone number should be 6-15 digits
    required: true,
  },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  documentType:{
    type:String,
    default:"PASSPORT"
  },

  birthPlace: {
    type: String,
    required: true,
  },
  issuanceLocation: {
    type: String,
    required: true,
  },
  issuanceDate: {
    type: String,
    required: true,
    validate: {
      validator: (value) => {
          const parsedDate = new Date(value);
          return !isNaN(parsedDate) && parsedDate <= new Date();
      },
  }
},
  number: {
    type: String,
    required: true,
    match: /^[0-9A-Za-z]+$/, // Allows alphanumeric document numbers
  },
  expiryDate: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
          const parsedExpiryDate = new Date(value);
          const parsedIssuanceDate = new Date(this.issuanceDate); // Access `issuanceDate` from `this`
          return (
              !isNaN(parsedExpiryDate) &&
              !isNaN(parsedIssuanceDate) &&
              parsedExpiryDate > parsedIssuanceDate
          );
      },
      message: "Expiry date must be after the issuance date.",
  }
},
  issuanceCountry: {
    type: String,
    required: true,
    match: /^[A-Z]{2}$/, // ISO 3166-1 alpha-2 country code format
  },
  validityCountry: {
    type: String,
    required: true,
    match: /^[A-Z]{2}$/, // ISO 3166-1 alpha-2 country code format
  },
  nationality: {
    type: String,
    required: true,
    match: /^[A-Z]{2}$/, // ISO 3166-1 alpha-2 country code format
  },
  holder: {
    type: Boolean, // Set the data type to Boolean
    default: true, // Default value is true
},
}, { _id: false });



const customerSchema = new mongoose.Schema({
  // Add other customer fields here...
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User' // Reference to User model using Mongoose's ref option. This will create a virtual field called "creator" in the Customer schema that contains the user's name.
  },
  travelerInfo:
  {
    name: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      }
    },
    dateOfBirth: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      required: true
    },
    contact: {
      emailAddress: {
        type: String,
        required: true,
        unique: true,
        sparse: false
      },
      phones: {
        type: [phoneSchema], // Array of phone objects
        required: true
      },

    },
    documents: {
      type: [documentSchema], // Array of document objects
      required: true
    }
  }

});

module.exports = mongoose.model('Customer', customerSchema, 'Customers');