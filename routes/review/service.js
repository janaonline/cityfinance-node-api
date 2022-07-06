const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const CollectionNames = require('../../util/Collections')
module.exports.get = catchAsync( async(req,res) => {
let loggedInUserRole = req.decoded.role
    let review = req.query.review;
    let design_year = req.query.review;
    let form = req.query.formId
    let skip = req.query.skip
    let limit = req.query.limit
    let csv = req.query.csv
    
    if(!review || !design_year || !form ){
        return res.status(400).json({
            success: false,
            message:"Data Missing"
        })
    }
    let formTab = await Sidemenu.findOne({_id: ObjectId(form)});
let path = formTab.collectionName
 const model = require(`../../models/${path}`)
let query = computeQuery(path, loggedInUserRole);
 let data = await model.aggregate(query)


 console.log(data)
 return res.status(200).json({
     success: true,
     data: data
 })



})

const computeQuery = (formName, userRole) => {
 switch (formName) {
     case "":
         
         break;
 
     default:
         break;
 }
}