require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PropertyTaxOpDropDownSchema = new Schema({
       name:{
        type: String
       },
       value:{
        type: String
       },
       sequence:{
        type: Number,
        default: 0
       }
    }
);

module.exports = mongoose.model('PropertyTaxOpDropDown', PropertyTaxOpDropDownSchema);
