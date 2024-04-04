require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const {getKeyByValue} = require("../util/masterFunctions")
const ratings = {
    "1" : "No Rating",
    "2" :"ODF+",
    "3": "ODF",
    "4" : "ODF++",
    "5" :"Non ODF"
}

const pdfSchema = () => {
    return {
        url: { type: String},
        name: { type: String}
    }
}

const OdfFormCollectionSchema = new Schema({
    rating:{
        type: Schema.Types.ObjectId,
        ref: 'Rating',
    },
    cert: pdfSchema(),
    certDate:{
        type: Date,
    },
    ulb:{
        type: Schema.Types.ObjectId,
        ref: 'Ulb',
        required: true,
    },
    design_year:{
        type: Schema.Types.ObjectId,
        ref: 'Year',
        required: true,
    },
    actionTakenByRole:{
        type: String,
        enum:["ULB","MoHUA","STATE"],
        required: true,
    },
    actionTakenBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status:{
        type: String,
        enum: {
            values: ['APPROVED', 'REJECTED', 'PENDING',""],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        }
    },
    currentFormStatus: {
        type: Number,
    },
    ulbSubmit:{
        type: Date,
    },
    isDraft:{
        type: Boolean,
        default: true,
    },
    odfRating:{type:String,default:""},
    marks : {type:Number,default:""},
    cert_declaration:pdfSchema(),
    rejectReason: { type: String, default: "" },
    responseFile: pdfSchema(),
    responseFile_state:pdfSchema(),
    responseFile_mohua:pdfSchema(),
    rejectReason_state:{ type: String, default: "" },
    rejectReason_mohua: { type: String, default: "" },
    history:{
        type: Array,
        default: [],
    },
    
 }
,{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
}
);
OdfFormCollectionSchema.index({ ulb: 1, design_year: 1 }, { unique: true });

// OdfFormCollectionSchema.post("findOne",function(result){
//     if(bject.values(ratings).includes(result)){
//         let key = getKeyByValue(ratings,result.odfRating)
//         result.odfRating = key
//     }
// })

// OdfFormCollectionSchema.pre("findOneAndUpdate",function(next){
//     let obj = this._update["$set"]
//     if(Object.keys(ratings).includes(obj.odfRating)){
//         obj.odfRating = ratings[obj.odfRating]
//     }
//     next()
// })
// OdfFormCollectionSchema.pre("save",function(next){
//     if(Object.keys(ratings).includes(this.odfRating)){
//         this.odfRating = ratings[this.odfRating]
//     }
//     next()
// })
module.exports = mongoose.model('OdfFormCollection', OdfFormCollectionSchema)