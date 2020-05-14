const User = require('../models/User');
module.exports.mobile = async (mobile,checkDepartment=false)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let query = {
                isActive:true,
                isDeleted:false,
                $or:[
                    {mobile:mobile},
                    {commissionerConatactNumber:mobile},
                    {accountantConatactNumber:mobile}
                ]
            };
            if(checkDepartment){
                query["$or"].push({departmentContactNumber:mobile})
            }
            let user = await User.findOne(query,{_id:1,role:1});
            resolve(user);
        }catch (e) {
            reject(e)
        }
    });
};
module.exports.email = async (email, checkDepartment=false)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let query = {
                isActive:true,
                isDeleted:false,
                $or:[
                    {email:email},
                    {commissionerEmail:email},
                    {accountantEmail:email}
                ]
            };
            if(checkDepartment){
                query["$or"].push({departmentEmail:email})
            }
            let user = await User.findOne(query,{_id:1,role:1});
            resolve(user);
        }catch (e) {
            reject(e)
        }
    });
};