require('./dbConnect');

const type = ()=>{
    return {type:String, enum: ["Yes","No"], default:"No"};
}
var XVFcReFormsSchema = new Schema({

    propertyTax:{
        Act_Linking_PT_A:type(),
        Existing_Status_PT_A : {type:String,default:""},
        Relevent_Sections_PT_A : {type:String,default:""},
        Legislative_Changes_PT_A:{type:String,default:""},
        Action_Date_PT_A:{type:Date,default:Date.now()},
        Relevent_Sections_No_PT_A:{type:String,default:""},
        Adoption_Plan_PT_A:{type:String,default:""},
        Implement_Date_PT_A:{type:Date,default:Date.now()},
        Periodic_Increase_PT_B:type(),
        Existing_Status_Yes_PT_B:{type:String,default:""},
        Relevent_Sections_PT_B:{type:String,default:""},
        Legislative_Changes_PT_B:{type:String,default:""},
        Action_Date_PT_B:{type:Date,default:Date.now()},
        Existing_Status_No_PT_B:{type:String,default:""},
        Implement_Plan_PT_B:{type:String,default:""},
        Implement_Date_PT_B:{type:Date,default:Date.now()}
    },
    userCharges:{
        Byelaws_UC_A:type(),
        Existing_Status_Yes_UC_A : {type:String,default:""},
        Relevant_Section_UC_A : {type:String,default:""},
        State_Approval_UC_A :{type:String,default:""},
        Action_Date_UC_A : {type:Date,default:Date.now()},
        Existing_Status_No_UC_A : {type:String,default:""},
        Implement_Plan_UC_A : {type:String,default:""},
        Implement_Date_UC_A : {type:String,default:""},
        Periodic_Increase_UC_B : type(),
        Existing_Status_Yes_UC_B : {type:String,default:""},
        Relevant_Section_UC_B : {type:String,default:""},
        State_Approval_UC_B : {type:String,default:""},
        Action_Date_UC_B : {type:Date,default:Date.now()},
        Existing_Status_No_UC_B : {type:String,default:""},
        Implement_Plan_UC_B : {type:String,default:""},
        Implement_Date_UC_B : {type:Date,default:Date.now()}
    },
    state:{type: Schema.Types.ObjectId, ref: 'State',unique:true,required : true},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() }
},

{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}}
);



module.exports = mongoose.model('XVFinanceComissionReForms', XVFcReFormsSchema);
