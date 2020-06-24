require('./dbConnect');

const type = ()=>{
    return {type:String, enum: ["Yes","No"], default:"No"};
}
var XVFcReFormsSchema = new Schema({

    propertyTax:{
        Act_Linking_PT_A:{type:String,default:""},
        Existing_Status_PT_A : {type:String,default:""},
        Relevent_Sections_Yes_PT_A : {type:String,default:""},
        Legislative_Changes_PT_A:{type:String,default:""},
        Action_Date_PT_A:{type:Date,default:Date.now},
        Relevent_Sections_No_PT_A:{type:String,default:""},
        Adoption_Plan_PT_A:{type:String,default:""},
        Implement_Date_PT_A:{type:Date,default:Date.now},
        Periodic_Increase_PT_B:{type:String,default:""},
        Existing_Status_Yes_PT_B:{type:String,default:""},
        Relevent_Sections_PT_B:{type:String,default:""},
        Legislative_Changes_PT_B:{type:String,default:""},
        Action_Date_PT_B:{type:Date,default:Date.now},
        Existing_Status_No_PT_B:{type:String,default:""},
        Implement_Plan_PT_B:{type:String,default:""},
        Implement_Date_PT_B:{type:Date,default:Date.now}
    },
    userCharges:{
        Byelaws_UC_A:{type:String,default:""},
        Existing_Status_Yes_UC_A : {type:String,default:""},
        Relevant_Section_UC_A : {type:String,default:""},
        State_Approval_UC_A :{type:String,default:""},
        Action_Date_UC_A : {type:Date,default:Date.now},
        Existing_Status_No_UC_A : {type:String,default:""},
        Implement_Plan_UC_A : {type:String,default:""},
        Implement_Date_UC_A : {type:String,default:""},
        Periodic_Increase_UC_B : {type:String,default:""},
        Existing_Status_Yes_UC_B : {type:String,default:""},
        Relevant_Section_UC_B : {type:String,default:""},
        State_Approval_UC_B : {type:String,default:""},
        Action_Date_UC_B : {type:Date,default:Date.now},
        Existing_Status_No_UC_B : {type:String,default:""},
        Implement_Plan_UC_B : {type:String,default:""},
        Implement_Date_UC_B : {type:Date,default:Date.now}
    },

    documents:{

        State_Acts_Doc:{
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[],
            required:true
        },
        
        State_Amendments_Doc : {
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },
        City_Acts_Doc :{
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },
        State_Rules_Doc :{
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },
        City_Amendments_Doc : {
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },
        City_Rules_Doc : {
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },
        Admin_Doc : {
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },       
        Implement_Doc : {
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        },       
        Other_Doc : {
            type:[
                {
                    name :{ type : String, required : true},  
                    url : { type: String, required: true}    
                }
            ],
            default:[]
        }    
    },
    isCompleted:{type:Boolean,default:1},
    state:{type: Schema.Types.ObjectId, ref: 'State',required : true},
    ulb:{type: Schema.Types.ObjectId, ref: 'Ulb',required : true,default:null},
    createdBy:{type: Schema.Types.ObjectId, ref: 'User',required : true},
    modifiedAt : { type: Date, default : Date.now },
    createdAt : { type: Date, default : Date.now },
    questionnaireType : { type : String, required : true,index:true, enum:["state","ulb"]}
},

{timestamp : {createdAt : "createdAt", modifiedAt : "modifiedAt"}}
);

module.exports = mongoose.model('XVFinanceComissionReForms', XVFcReFormsSchema);

XVFcReFormsSchema.pre('save', function(next) {
    this.modifiedAt = new Date(); 
    next();
})