require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;


const tabsFiscalRankingSchema = new Schema({
    label : {
        type:String,
        required:[true,"Name is required"]
    },
    id:{
        type:String,
        required:[true,'id is required']
    },
    key : {
        type:String,
        default:""
    },
    icon:{
        type:String,
        default : ""
    },
    text:{
        type:String,
        default:"",
    },
    displayPriority:{
        type:Number,
        required:[true,"Priority to show the index is required"]
    },

})
module.exports = mongoose.model("tabsFiscalRankings",tabsFiscalRankingSchema)