require('./dbConnect');
const mongoose = require('mongoose');
const {Schema} = mongoose;

const pdfSchema = () => {
    return {
        url: { type: String},
        name: { type: String}
    }
}
const stateFinanceCommissionFormationSchema = new Schema({
    state:{
        type: Schema.Types.ObjectId,
        ref: "State"
    },
    design_year:{
        type: Schema.Types.ObjectId,
        ref: "Year",
    },
    constitutedSfc:{
        type: String,
        enum:{
            values:["Yes", "No"],
            message: "Error: constitutedSfc can be either Yes/No"
        }
    },
    stateNotification: pdfSchema(),
    isDraft: {
        type: Boolean,
        default: true
    },
    rejectReason: { type: String, default: "" },
    responseFile: pdfSchema(),
    
    responseFile_state:pdfSchema(),
    responseFile_mohua:pdfSchema(),
    rejectReason_state:{ type: String, default: "" },
    rejectReason_mohua: { type: String, default: "" },
    history:{
        type: Array,
        default:[]
    },
    actionTakenByRole:{
        type: String,
        enum: {
            values:["STATE","MoHUA"],
            message: "values can be either STATE/MoHUA"
        },
        required: true
    },
    actionTakenBy:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        default:"PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "values can be either PENDING/APPROVED/REJECTED"
        }
    },
    stateSubmit:{
        type: Date
    },
    createdAt:{ type: Date },
    modifiedAt:{ type: Date }
},{ timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt"}}
);

stateFinanceCommissionFormationSchema.index({state:1, design_year: 1},{unique: true});

module.exports = mongoose.model("StateFinanceCommissionFormation",
 stateFinanceCommissionFormationSchema);