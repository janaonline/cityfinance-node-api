require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const pdfSchema = ()=>{
    return {
        name: {type: String},
        url: {type: String}
    }
}

const TwentyEightSlbFormSchema = new Schema({
    design_year:{
        type: Schema.Types.ObjectId,
        ref: 'Year',
        required: true
    },
    ulb: {
        type: Schema.Types.ObjectId,
        ref: 'Ulb',
        required: true
    },
    population : {
        type: Number,
        default:0
    },
    data: [{
        indicatorLineItem:{
            type: Schema.Types.ObjectId,
            ref:"indicatorLineItem",
            required: true
        },
        question : {type: String, default : ""}, 
        type : {type: String, default : ""}, 
        unit : {type: String, default : ""}, 
        range : {type: String, default : ""}, 

        actual:{
            year:{
                type: Schema.Types.ObjectId,
                ref: 'Year',
                required: true
            },
            value:{ type: Number,}
        },
        target_1:{
            year:{
                type: Schema.Types.ObjectId,
                ref: 'Year',
                required: true
            },
             value:{ type: Number,}
        },
    }
      
    ],
    

    createdAt:{
        type: Date, 
        default: Date.now()
    },
    modifiedAt:{
        type: Date,
        default: Date.now()
    },
    isDraft:{ 
        type: Boolean, 
        default: true 
    },
    status:{
        type: String,
        enum:{
            values:["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: status can be either PENDING/APPROVED/REJECTED"
        }
    },
    rejectReason: {type: String, default:""},
    responseFile: pdfSchema(),
    actionTakenBy:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actionTakenByRole: {
        type: String,
        enum:["ULB","STATE", "MoHUA"],
        required: true
    },
    history:{
        type: Array,
        default:[]
    }
},{
    timestamps:{createdAt:"createdAt", updatedAt:"modifiedAt"}
})

TwentyEightSlbFormSchema.index({design_year:1,ulb:1},{unique:true});

module.exports = mongoose.model('TwentyEightSlbForm', TwentyEightSlbFormSchema);

// twentyEightSlbsForm.ensureIndexes(function (err) {
// if (err) console.log("'ENSURE INDEX'", err);
// });

// twentyEightSlbsForm.on("index", function (error) {
// if (error) console.log("ON INDEX", error);
// });