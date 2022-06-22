const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const ObjectId = require("mongoose").Types.ObjectId;
const Year = require('../../models/Year');
const { ULBMASTER } = require('../../_helper/constants');

module.exports.get = catchAsync(async(req,res)=> {
    let user = req.decoded;
    console.log(user)
let role = req.query.role;
let year = req.query.year;
// let _id =  req.query._id;

if(!role || !year  )
return res.status(400).json({
    success: false,
    message:"Data missing"
})
let isUA;
// let yearData = await Year.findOne({_id: ObjectId(year)}).lean()
// let ulbStatusObj = {
//     "annualAcc" : {
//         "tick": "",
//         "tooltip": ""
//     },
//     "pfms" : {
//         "tick": "",
//         "tooltip": ""
//     },
//     "dur" : {
//         "tick": "",
//         "tooltip": ""
//     },
//     "slb" : {
//         "tick": "",
//         "tooltip": ""
//     },
//     "ptax" : {
//         "tick": "",
//         "tooltip": ""
//     },
//     "gfc" : {
//         "tick": "",
//         "tooltip": ""
//     },
//     "odf" : {
//         "tick": "",
//         "tooltip": ""
//     },

// }
if(role == 'ULB'){
    // let ulbInfo = await Ulb.findOne({_id: ObjectId(_id)}).lean();
isUA = req.query.isUa

let allFormData = []

// findStatus(isDraft, status, actionTakenByRole )
}

let data  = await Sidemenu.find({year:ObjectId(year), role : role}).lean()
if(data.length){
    data = groupByKey(data, "category" ) 
}



if(role == 'ULB'){
if(isUA){
    delete data['Performance Conditions']
}else {
    delete data['Million Plus City Challenge Fund']
}
}


res.status(200).json({
    success: true,
    data: data
})
})

module.exports.post = catchAsync(async(req,res)=> {
let data = req.body;
if(!data.name  || !data.url || !data.role || !data.position || !data.year ){
    return res.status(400).json({
        success: false,
        message:"Data missing"
    })

}
let year = await Year.findOne({_id: ObjectId(data.year)}).lean()
let code = data.role + year.year


let obj = {
    name: data.name,
    category: data.category ?? "",
    url:data.url,
    role:data.role,
    position : data.position,
    year: ObjectId(data.year),
    code:code,
    icon: data.icon ?? ""

}
let menuData = new Sidemenu(obj);

await menuData.save();

let fetchedData = await Sidemenu.find({code: code})

return res.status(200).json({
    success: true,
    message:"Data Saved",
    data: fetchedData
    
})

})


module.exports.put = catchAsync(async(req,res)=> {

})


module.exports.delete = catchAsync(async(req,res)=> {

})

const groupByKey = (list, key) => list.reduce((hash, obj) => ({...hash, [obj[key]]:( hash[obj[key]] || [] ).concat(obj)}), {})

    
