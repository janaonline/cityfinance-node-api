require('./dbConnect');
const StateSchema = new Schema({
    name: { type: String, required: true  },
    code: { type: String, required: true },
    regionalName: { type: String, required: true,default : "" },
    censusCode:{ type: String, default:null },
    totalUlbs: { type: Number, default:0 },
    participatedUlbs: { type: Number, default:0 },
    rankedUlbs: { type: Number, default:0 },
    nonRankedUlbs: { type: Number, default:0 },
    stateType: { type: String, enum: ['Large', 'Small', 'UT'] },
    modifiedAt : { type: Date },
    createdAt : { type: Date },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});

StateSchema.index(
    { 
        code : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);
StateSchema.index(
    { 
        name : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);
module.exports = mongoose.model('State', StateSchema);
