const XVFcGrantForm = require('../../models/XVFcGrantForm');
const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');
const Rating = require('../../models/Rating');
const minMax = require('../../util/minMax')

// let test1Data ={ 
//     "_id" : ("5fce2bdeff874c1ad9774c4f"), 
//     "ulb" : ("5dd24729437ba31f7eb42ed0"), 
//     "__v" : (0), 
//     "actionTakenBy" : ("5fcf45d5ff874c1ad9774c9e"), 
//     "createdAt" : ("2021-01-19T12:47:04.591+0000"), 
//     "isActive" : true, 
//     "isCompleted" : true, 
//     "millionPlusCities" : null, 
//     "modifiedAt" : ("2021-01-21T14:47:05.722+0000"), 
//     "overallReport" : null, 
//     "solidWasteManagement" : {
//         "_id" : ("600946919c4fb07ddb508adb"), 
//         "documents" : {
//             "garbageFreeCities" : [
//                 {
//                     "status" : "", 
//                     "rejectReason" : "", 
//                     "_id" : ("600946919c4fb07ddb508adc"), 
//                     "name" : "GFC_Telangana_Parakala.pdf", 
//                     "url" : "https://cityfinance.in/objects/cbe9d33c-7baf-4e71-8f14-430e2aed901e.pdf"
//                 }
//             ], 
//             "waterSupplyCoverage" : [
//                 {
//                     "status" : "", 
//                     "rejectReason" : "", 
//                     "_id" : ("600946919c4fb07ddb508add"), 
//                     "name" : "CTPT_Telangana_Parakala.pdf", 
//                     "url" : "https://cityfinance.in/objects/4df4b123-0997-4707-bfc5-07c7d5753b1e.pdf"
//                 }
//             ]
//         }
//     }, 
//     "status" : "APPROVED", 
//     "waterManagement" : {
//         "serviceLevel" : {
//             "status" : "", 
//             "rejectReason" : ""
//         }, 
//         "houseHoldCoveredPipedSupply" : {
//             "baseline" : {
//                 "2021" : "88.00"
//             }, 
//             "achieved":{
//                 "2122" : "90"
//             },
//             "target" : {
//                 "2122" : "99.00", 
//                 "2223" : "92.00", 
//                 "2324" : "95.00", 
//                 "2425" : "100.00"
//             }, 
//             "status" : "", 
//             "rejectReason" : ""
//         }, 
//         "waterSuppliedPerDay" : {
//             "baseline" : {
//                 "2021" : "80.00"
//             }, 
//             "achieved":{
//                 "2122": "95"
//             },
//             "target" : {
//                 "2122" : "100.00", 
//                 "2223" : "110.00", 
//                 "2324" : "120.00", 
//                 "2425" : "135.00"
//             }, 
//             "status" : "", 
//             "rejectReason" : ""
//         }, 
//         "reduction" : {
//             "baseline" : {
//                 "2021" : "30.00"
//             }, 
//             "achieved":{
//                 "2122": "29"
//             },
//             "target" : {
//                 "2122" : "28.00", 
//                 "2223" : "26.00", 
//                 "2324" : "23.00", 
//                 "2425" : "20.00"
//             }, 
//             "status" : "", 
//             "rejectReason" : ""
//         }, 
//         "houseHoldCoveredWithSewerage" : {
//             "baseline" : {
//                 "2021" : "70.00"
//             }, 
//             "achieved":{
//                 "2122": "74"
//             },
//             "target" : {
//                 "2122" : "80.00", 
//                 "2223" : "90.00", 
//                 "2324" : "95.00", 
//                 "2425" : "100.00"
//             }, 
//             "status" : "", 
//             "rejectReason" : ""
//         }, 
//         "_id" : ("600946919c4fb07ddb508ada")
//     }, 
//     "design_year" : ("606aadac4dff55e6c075c507")
// }

module.exports.calculateSlbMarks = (data) => {
    let x,y,z;
    let obtainedMarks =[];
    if(data.waterSuppliedPerDay){
        x = Number(data.waterSuppliedPerDay.baseline['2021']);
        y = Number(data.waterSuppliedPerDay.target['2122']);
        z = Number(data.waterSuppliedPerDay.achieved['2122']);
        obtainedMarks[0] = incrementFormula(
            x, y, z,
            minMax.waterSuppliedPerDay.min,
            minMax.waterSuppliedPerDay.max,
            );
        // console.log(x, y, z,obtainedMarks[0], "---x, y, z, obtainedMarks waterSuppliedPerDay-----")
    }
    if(data.reduction){
        x = Number(data.reduction.baseline['2021']);
        y = Number(data.reduction.target['2122']);
        z = Number(data.reduction.achieved['2122']);
        obtainedMarks[1] = decrementFormula(
            x, y, z,
            minMax.reduction.min,
            minMax.reduction.max
            );
        // console.log(x, y, z,obtainedMarks[1], "---x, y, z obtainedMarks reduction-----")
        
    }
    if(data.houseHoldCoveredWithSewerage){
        x = Number(data.houseHoldCoveredWithSewerage.baseline['2021']);
        y = Number(data.houseHoldCoveredWithSewerage.target['2122']);
        z = Number(data.houseHoldCoveredWithSewerage.achieved['2122']);
        obtainedMarks[2] = incrementFormula(
            x, y, z,
            minMax.houseHoldCoveredWithSewerage.min,
            minMax.houseHoldCoveredWithSewerage.max
            );
        // console.log(x, y, z,obtainedMarks[2], "---x, y, z, obtainedMarks houseHoldCoveredWithSewerage-----")

    }
    if(data.houseHoldCoveredPipedSupply){
        x = Number(data.houseHoldCoveredPipedSupply.baseline['2021']);
        y = Number(data.houseHoldCoveredPipedSupply.target['2122']);
        z = Number(data.houseHoldCoveredPipedSupply.achieved['2122']);
        obtainedMarks[3] = incrementFormula(
            x, y, z,
            minMax.houseHoldCoveredPipedSupply.min,
            minMax.houseHoldCoveredPipedSupply.max
            );
        // console.log(x, y, z,obtainedMarks[3], "---x, y, z obtainedMarks houseHoldCoveredPipedSupply-----")
    }
    return obtainedMarks;
}

function incrementFormula(x, y, z, minMarks, maxMarks){
    let marks =0;
    if(z>=y){
        marks = maxMarks;
    } else if(z<=x){
        marks = minMarks;
    } else if(z>x && z<y){
        marks = ((z-x)/(y-x))*maxMarks;
    }
    return marks;
}

function decrementFormula(x, y, z, minMarks, maxMarks){
    let marks =0;
    if(z<=y){
        marks = maxMarks;
    } else if(z>=x){
        marks = minMarks;
    } else if(z<x && z>y){
        marks = ((x-z)/(x-y))*maxMarks;
    }
    return marks;
}

function calculateRecommendationPercentage(score){
    let percent = 0;
    score = Math.round(score);
    // console.log( "-->Rounded score",score);
    if(score>=0 && score<=29){ 
        percent = 0 
    }else if(score>=30 && score<=45){
        percent = 60;
    }else if(score>=46 && score<=60){
        percent = 75;
    }else if(score>=60 && score<=80){
        percent = 90;
    }else if(score>=80 && score<=100){
        percent = 100;
    }
    return percent;
}

module.exports.calculateRecommendation = async (req, res) => {
    
    try {
        const data = req.body;
        let slbMarks = [];
        let totalSlbMarks = 0;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;

        const slbForm = await XVFcGrantForm.findOne(condition);
        if(slbForm.status === "APPROVED"){
            slbMarks = calculateSlbMarks(slbForm.waterManagement);
        }else{
            return res.status(200).json({
                status: true,
                message: `SlbForm is still in ${slbForm.status}!`
            });
        }
        
        const gfcForm = await GfcFormCollection.findOne(condition);
        let gfcMark;
        if(gfcForm.status === "APPROVED"){
            const gfcRating = await Rating.findOne({_id:gfcForm.rating});
            gfcMark = Number(gfcRating.marks);
        } else {
            return res.status(200).json({
                status: true,
                message: `GfcForm is still in ${gfcForm.status}!`
            })
        }
        const odfForm = await OdfFormCollection.findOne(condition);
        let odfMark;
        if(odfForm.status === "APPROVED"){
            const odfRating = await Rating.findOne({_id:odfForm.rating})
            odfMark = Number(odfRating.marks);
        } else {
            return res.status(200).json({
                status: true,
                message: `OdfForm is still in ${odfForm.status}!`
            })
        }

        for(let i=0; i < slbMarks.length; i++){
            totalSlbMarks = slbMarks[i] + totalSlbMarks;
        }
        const totalScore = totalSlbMarks + gfcMark + odfMark;
        const recommendation = calculateRecommendationPercentage(totalScore);
        // console.log(gfcMark, "---gfcMark",'\n',odfMark,"-----odfMark",'\n',
        //     totalScore,"----totalScore---")
        return res.status(200).json({
            status: "true",
            data: `${recommendation} % recommended.`
        });
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}