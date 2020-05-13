const User = require('../models/User');
module.exports.mobile = async (mobile)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let query = {
                $or:[
                    {mobile:mobile},
                    {commissionerConatactNumber:mobile},
                    {accountantConatactNumber:mobile}
                ]
            };
            let exists = await User.count(query);
            resolve(exists?true:false);
        }catch (e) {
            reject(e)
        }
    });
};
module.exports.email = async (email)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let query = {
                $or:[
                    {email:email},
                    {commissionerEmail:email},
                    {accountantEmail:email}
                ]
            };
            let exists = await User.count(query);
            resolve(exists?true:false);
        }catch (e) {
            reject(e)
        }
    });
};