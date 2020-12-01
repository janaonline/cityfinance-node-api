const { Schema } = require('mongoose');
require('./dbConnect');
const XVStateFormDataSchema = new Schema({
    state : { type: Schema.Types.ObjectId,ref: 'State',required : true,unique:true},
    isActive : { type  : Boolean, default : 1 },
    grantTransferCertificate:{
        type:[
            {
                url : { type: String, required: true},
                name : { type: String, required: true}
            }
        ],
        default:null
    },
    utilizationReport:{
        type:[
            {
                url : { type: String, required: true},
                name : { type: String, required: true}
            }
        ],
        default:null
    },
    serviceLevelBenchmarks:{
        type:[
            {
                url : { type: String, required: true},
                name : { type: String, required: true}
            }
        ],
        default:null
    },
    modifiedAt : { type: Date, default : Date.now},
    createdAt : { type: Date, default : Date.now}
    
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model('XVStateForm', XVStateFormDataSchema);
