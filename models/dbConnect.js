exports = mongoose = require('mongoose');
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useNewUrlParser', true)
mongoose.set('useUnifiedTopology', true)

exports =  Schema = mongoose.Schema;
if(process.env.CONNECTION_STRING){
    mongoose.connect(process.env.CONNECTION_STRING,function(err){
        if(err){
            console.log("Error in connecting production database : ",err);
            process.exit(0);
        }else{
            console.log(process.env.ENV + " Database connected");
            if (process.env.ENV == "production") { //disable logs only for production
              console.log = function () { };
          }
        }
    });
}else{
    console.log(process.env.ENV,"Env not supported"); process.exit(0);
}
exports = Schema = mongoose.Schema;
