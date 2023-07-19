// exports = mongoose = require('mongoose');
// mongoose.set('useCreateIndex', true)
// mongoose.set('useFindAndModify', false)
// mongoose.set('useNewUrlParser', true)
// mongoose.set('useUnifiedTopology', true)

// exports =  Schema = mongoose.Schema;

// if(process.env.CONNECTION_STRING){
//     mongoose.connect(process.env.CONNECTION_STRING,function(err){
//         if(err){
//             console.log("Error in connecting production database : ",err);
//             process.exit(0);
//         }else{
//             console.log(process.env.ENV + " Database connected");
//         }
//     });
// }else{
//     console.log(process.env.ENV,"Env not supported"); process.exit(0);
// }
// exports = Schema = mongoose.Schema;


const fs = require("fs");
const path = require('path');
const cluster = require("cluster");
exports = mongoose = require("mongoose");
// exports = autoIncrement = require("mongoose-auto-increment");
// autoIncrement.initialize(mongoose.connection);
let { ENV, SSH_PVT_KEY, SSH_PASSPHRASE, SSH_HOST, SSH_USERNAME, CONNECTION_STRING } = process.env;
if (SSH_PVT_KEY) {
    let tunnel = require("tunnel-ssh");
    let sshConfig = {
        username: SSH_USERNAME,
        host: SSH_HOST,
        port: 22,
        dstHost: "13.229.130.117",
        dstPort: "",
        keepAlive: true,
        privateKey: fs.readFileSync(path.join(__dirname + "../../../sahil.pem")),
        passphrase: SSH_PASSPHRASE,
    };
    try {
        let serverAddress = CONNECTION_STRING.split("@")[1].split("/");
        // sshConfig.host = serverAddress[0].split(":")[0];
        sshConfig.dstPort = serverAddress[0].split(":")[1];
    } catch (error) {
        console.log(error, ";skjadlkfsja")
    }
    tunnel(sshConfig, async (error, server) => {
        if (error) {
            console.log(` -------------------------------------------`);
            console.log(`file: dbConnect.js ~ line 27 ~ Invalid ssh config`, error);
            console.log(` -------------------------------------------`);
        }
        let newUri = CONNECTION_STRING.split("@");
        newUri[1] = newUri[1].split(":");
        newUri[1][0] = "localhost";
        newUri[1] = newUri[1].join(":");
        newUri = newUri.join("@");
        await connectMongoDB(newUri);
    });
} else if (ENV) {
    connectMongoDB(CONNECTION_STRING);
} else {
    console.log(ENV, ": Env not supported");
    process.exit(ENV + ": Env not supported");
}

async function connectMongoDB(config = "") {
    let options = { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true };
    let dbIP = "";
    try {
        await mongoose.connect(config, options);
        console.log(`${ENV} : Database connected`);
    } catch (error) {
        console.log("error",error)
        process.exit(error);
    }
}

exports = Schema = mongoose.Schema;