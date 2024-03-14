const User = require('../models/User');
const mobile = async (mobile,checkDepartment=true, _id="", role)=>{
    if(role === "STATE"){
        return new Promise(async (resolve, reject)=>{
            try{
                let query = {
                    isActive:true,
                    isDeleted:false,
                    $or:[
                        {mobile:mobile},
                        {commissionerConatactNumber:mobile},
                        {accountantConatactNumber:mobile}
                    ],
                    role: "STATE"
                };
                if(checkDepartment){
                    query["$or"].push({departmentContactNumber:mobile})
                }
                let user = await User.find(query,{_id:1,role:1}).lean();
                if(user && user.length === 1){
                    if(_id && user[0]._id.toString() == _id.toString()){
                        user = null;
                    }
                }else if (user.length === 0){
                    user = null
                }
                resolve(user);
            }catch (e) {
                reject(e)
            }
        });
    }else {
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
                if(user){
                    if(_id && user._id.toString() == _id.toString()){
                        user = null;
                    }
                }
                resolve(user);
            }catch (e) {
                reject(e)
            }
        });
    }
};
const email = async (email, checkDepartment=true, _id, role)=>{
    if(role === "STATE"){
        return new Promise(async (resolve, reject)=>{
            try{
                let query = {
                    isActive:true,
                    isDeleted:false,
                    $or:[
                        {email:email},
                        {commissionerEmail:email},
                        {accountantEmail:email}
                    ],
                    role: "STATE"
                };
                if(checkDepartment){
                    query["$or"].push({departmentEmail:email})
                }
                let user = await User.find(query,{_id:1,role:1}).lean();
                if(user && user.length === 1){
                    if(_id && user[0]._id.toString() == _id.toString()){
                        user = null;
                    }
                }else if(user.length === 0){
                    user = null
                }
                resolve(user);
            }catch (e) {
                reject(e)
            }
        });
    } else{
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
                if(user){
                    if(_id && user._id.toString() == _id.toString()){
                        user = null;
                    }
                }
                resolve(user);
            }catch (e) {
                reject(e)
            }
        });
    }

};
const validate = (data, role,_id)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let validation = {
                USER:[
                    {
                        key:"mobile",
                        type:"mobile",
                        message:"Mobile number already taken."
                    },
                    {
                        key:"email",
                        type:"email",
                        message:"Email already taken."
                    },
                    {
                        key:"commissionerConatactNumber",
                        type:"mobile",
                        message:"Commissioner contact number already taken."
                    },
                    {
                        key:"commissionerEmail",
                        type:"email",
                        message:"Commissioner email already taken."
                    }
                ],
                ULB:[
                    /*{
                        key:"commissionerEmail",
                        type:"email",
                        message:"Commissioner email already taken."
                    },
                    {
                        key:"accountantEmail",
                        type:"email",
                        message:"Accountant email already taken."
                    },
                    {
                        key:"mobile",
                        type:"mobile",
                        message:"Mobile number already taken."
                    },
                    {
                        key:"commissionerConatactNumber",
                        type:"mobile",
                        message:"Commissioner contact number already taken."
                    },
                    {
                        key:"accountantConatactNumber",
                        type:"mobile",
                        message:"Accountant contact number already taken."
                    }*/
                ],
                
                STATE:[
                    {
                        key:"mobile",
                        type:"mobile",
                        message:"Mobile number already taken."
                    },
                    {
                        key:"email",
                        type:"email",
                        message:"Email already taken."
                    },
                    {
                        key:"departmentEmail",
                        type:"email",
                        message:"Department email already taken."
                    },
                    {
                        key:"departmentContactNumber",
                        type:"mobile",
                        message:"Department contact number already taken."
                    }
                ],
                PARTNER:[
                    {
                        key:"mobile",
                        type:"mobile",
                        message:"Mobile number already taken.",
                        ignoreDepartment:true
                    },
                    {
                        key:"email",
                        type:"email",
                        message:"Email already taken.",
                        ignoreDepartment:true
                    }
                ],
                MoHUA:[
                    {
                        key:"mobile",
                        type:"mobile",
                        message:"Mobile number already taken.",
                        ignoreDepartment:true
                    },
                    {
                        key:"email",
                        type:"email",
                        message:"Email already taken.",
                        ignoreDepartment:true
                    }
                ]
            };
            let errors = [];
            if(validation[role]){
                for(val of validation[role]){
                    if(data[val.key]){
                        let d; let departmentCheck = val.ignoreDepartment ? false : true
                        if(val.type == "email"){
                            d = await email(data[val.key], departmentCheck,_id, role);
                        }else {
                            d = await mobile(data[val.key], departmentCheck,_id, role);
                        }
                        if(d){
                            errors.push(val.message);
                        }
                    }
                }
                resolve(errors.length ? errors:null);
            }else {
                reject(`${role}: Role not supported.`)
            }
        }catch (e) {
            reject(e);
        }
    });
}
module.exports = {
    email:email,
    mobile:mobile,
    validate:validate
}