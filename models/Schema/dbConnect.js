exports = mongoose = require('mongoose');
if(process.env.CONNECTION_STRING){
    mongoose.connect(CONFIG[process.env.CONNECTION_STRING],{useMongoClient: true},function(err){
        if(err){
            console.log("Error in connecting production database : ",err);
            process.exit(0);
        }else{
            console.log(process.env.ENV + " Database connected");
        }
    });
}else{
    console.log(process.env.ENV,"Env not supported"); process.exit(0);
}
exports = Schema = mongoose.Schema;
