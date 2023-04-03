require('./dbConnect');

var DataCollectionFormSchema = new Schema({

    bodyType : { type : String, required : true,index:true, enum:["parastatal","ulb"]},
    ulb:{type: Schema.Types.ObjectId, ref: 'Ulb',default:null},
    parastatalName:{type: String,default:null},
    person :{type: String,default:null} ,
    designation : {type: String,default:null},
    email: {type: String,default:null},
    documents:{
        financial_year_2015_16:{
            type:{
                pdf :[{name:{ type : String,required : true},url:{type : String,required : true}}],
                excel :[{name:{ type : String,required : true},url:{type : String,required : true}}]        
            },
            default:null
        },
        
       financial_year_2016_17:{
            type:{
                pdf :[{name:{ type : String,required : true},url:{type : String,required : true}}],
                excel :[{name:{ type : String,required : true},url:{type : String,required : true}}]        
            },
            default:null
        },
       financial_year_2017_18:{
            type:{
                pdf :[{name:{ type : String,required : true},url:{type : String,required : true}}],
                excel :[{name:{ type : String,required : true},url:{type : String,required : true}}]        
            },
            default:null
        },
        financial_year_2018_19:{
            type:{
                pdf :[{name:{ type : String,required : true},url:{type : String,required : true}}],
                excel :[{name:{ type : String,required : true},url:{type : String,required : true}}]        
            },
            default:null
        }, 
        financial_year_2019_20:{
            type:{
                pdf :[{name:{ type : String,required : true},url:{type : String,required : true}}],
                excel :[{name:{ type : String,required : true},url:{type : String,required : true}}]        
            },
            default:null
        }, 
        financial_year_2020_21:{
            type:{
                pdf :[{name:{ type : String,required : true},url:{type : String,required : true}}],
                excel :[{name:{ type : String,required : true},url:{type : String,required : true}}]        
            },
            default:null
        },
   
    },
    state:{type: Schema.Types.ObjectId, ref: 'State',required : true},
    modifiedAt : { type: Date, default : Date.now },
    createdAt : { type: Date, default : Date.now }
},

{timestamp : {createdAt : "createdAt", modifiedAt : "modifiedAt"}}
);

module.exports = mongoose.model('DataCollectionForm', DataCollectionFormSchema);

DataCollectionFormSchema.pre('save', function(next) {
    this.modifiedAt = new Date(); 
    next();
})