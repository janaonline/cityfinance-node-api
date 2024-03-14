const XVFcGrantForm = require('../../models/XVFcGrantForm');
const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');
const Rating = require('../../models/Rating');
const minMax = require('../../util/minMax');
const { YEAR_CONSTANTS } = require('../../util/FormNames');

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
//                     "url" : `https://${process.env.PROD_HOST}/objects/cbe9d33c-7baf-4e71-8f14-430e2aed901e.pdf`
//                 }
//             ], 
//             "waterSupplyCoverage" : [
//                 {
//                     "status" : "", 
//                     "rejectReason" : "", 
//                     "_id" : ("600946919c4fb07ddb508add"), 
//                     "name" : "CTPT_Telangana_Parakala.pdf", 
//                     "url" : `https://${process.env.PROD_HOST}/objects/4df4b123-0997-4707-bfc5-07c7d5753b1e.pdf`
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

module.exports.calculateSlbMarks = (data, flag) => {
    if(flag){
        const yearToCalculate = 2122;
        return calculateSlbMarks2324(data, yearToCalculate);
    }
    let obj = {
        waterSuppliedPerDay : {
            baseline : {
                "2021":""
            },
            target : {
                "2122":""
            },
            achieved : {
                "2122":""
            }
        },
        reduction : {
            baseline : {
                "2021":""
            },
            target : {
                "2122":""
            },
            achieved : {
                "2122":""
            }
        },
        houseHoldCoveredWithSewerage : {
            baseline : {
                "2021":""
            },
            target : {
                "2122":""
            },
            achieved : {
                "2122":""
            }
        },
        houseHoldCoveredPipedSupply : {
            baseline : {
                "2021":""
            },
            target : {
                "2122":""
            },
            achieved : {
                "2122":""
            }
        }
    }

    let x,y,z;
    let obtainedMarks =[];
    if(data.hasOwnProperty("ua")){
        for(let el in data){
      
        if(el.includes("waterSuppliedPerDay") && el.includes("2021")){
         obj.waterSuppliedPerDay.baseline["2021"] = data[el]
        }else if(el.includes("waterSuppliedPerDay") && el.includes("2122") && !el.includes("actual") ){
            obj.waterSuppliedPerDay.target["2122"] = data[el]
        }else if(el.includes("waterSuppliedPerDay") && el.includes("2122") && el.includes("actual")){
            obj.waterSuppliedPerDay.achieved["2122"] = data[el]
        } else  if(el.includes("reduction") && el.includes("2021")){
            obj.reduction.baseline["2021"] = data[el]
           }else if(el.includes("reduction") && el.includes("2122") && !el.includes("actual") ){
               obj.reduction.target["2122"] = data[el]
           }else if(el.includes("reduction") && el.includes("2122") && el.includes("actual")){
               obj.reduction.achieved["2122"] = data[el]
           } else  if(el.includes("houseHoldCoveredWithSewerage") && el.includes("2021")){
            obj.houseHoldCoveredWithSewerage.baseline["2021"] = data[el]
           }else if(el.includes("houseHoldCoveredWithSewerage") && el.includes("2122") && !el.includes("actual") ){
               obj.houseHoldCoveredWithSewerage.target["2122"] = data[el]
           }else if(el.includes("houseHoldCoveredWithSewerage") && el.includes("2122") && el.includes("actual")){
               obj.houseHoldCoveredWithSewerage.achieved["2122"] = data[el]
           }  else  if(el.includes("houseHoldCoveredPipedSupply") && el.includes("2021")){
            obj.houseHoldCoveredPipedSupply.baseline["2021"] = data[el]
           }else if(el.includes("houseHoldCoveredPipedSupply") && el.includes("2122") && !el.includes("actual") ){
               obj.houseHoldCoveredPipedSupply.target["2122"] = data[el]
           }else if(el.includes("houseHoldCoveredPipedSupply") && el.includes("2122") && el.includes("actual")){
               obj.houseHoldCoveredPipedSupply.achieved["2122"] = data[el]
           }
      }
    }else{
        obj = {}
        obj = data
    }
    if(obj.waterSuppliedPerDay){
        x = Number(obj.waterSuppliedPerDay.baseline['2021']);
        y = Number(obj.waterSuppliedPerDay.target['2122']);
        z = Number(obj.waterSuppliedPerDay.achieved['2122']);
        obtainedMarks[0] = incrementFormula(
            x, y, z,
            minMax.waterSuppliedPerDay.min,
            minMax.waterSuppliedPerDay.max,
            );
        // console.log(x, y, z,obtainedMarks[0], "---x, y, z, obtainedMarks waterSuppliedPerDay-----")
    }
    if(obj.reduction){
        x = Number(obj.reduction.baseline['2021']);
        y = Number(obj.reduction.target['2122']);
        z = Number(obj.reduction.achieved['2122']);
        obtainedMarks[1] = decrementFormula(
            x, y, z,
            minMax.reduction.min,
            minMax.reduction.max
            );
        // console.log(x, y, z,obtainedMarks[1], "---x, y, z obtainedMarks reduction-----")
        
    }
    if(obj.houseHoldCoveredWithSewerage){
        x = Number(obj.houseHoldCoveredWithSewerage.baseline['2021']);
        y = Number(obj.houseHoldCoveredWithSewerage.target['2122']);
        z = Number(obj.houseHoldCoveredWithSewerage.achieved['2122']);
        obtainedMarks[2] = incrementFormula(
            x, y, z,
            minMax.houseHoldCoveredWithSewerage.min,
            minMax.houseHoldCoveredWithSewerage.max
            );
        // console.log(x, y, z,obtainedMarks[2], "---x, y, z, obtainedMarks houseHoldCoveredWithSewerage-----")

    }
    if(obj.houseHoldCoveredPipedSupply){
        x = Number(obj.houseHoldCoveredPipedSupply.baseline['2021']);
        y = Number(obj.houseHoldCoveredPipedSupply.target['2122']);
        z = Number(obj.houseHoldCoveredPipedSupply.achieved['2122']);
        obtainedMarks[3] = incrementFormula(
            x, y, z,
            minMax.houseHoldCoveredPipedSupply.min,
            minMax.houseHoldCoveredPipedSupply.max
            );
        // console.log(x, y, z,obtainedMarks[3], "---x, y, z obtainedMarks houseHoldCoveredPipedSupply-----")
    }
    return obtainedMarks;
}

function calculateSlbMarks2324(data, year) {
    try {
      const slbCategories = [
        "waterSuppliedPerDay",
        "reduction",
        "houseHoldCoveredWithSewerage",
        "houseHoldCoveredPipedSupply",
      ];
      const obj = {};
      const yearUpdateNumber = 101;
      for (const category of slbCategories) {
        obj[category] = {
          baseline: {
            [`${year}`]: "",
          },
          target: {
            [`${year + yearUpdateNumber}`]: "",
          },
          achieved: {
            [`${year + yearUpdateNumber}`]: "",
          },
        };
        const ignoreKeys = ["_id", "total"]
        let counter =0;
        for (const el in data) {
          if (typeof data[el] === "number" && !ignoreKeys.includes(el)) {
            if (el.includes(category) && el.includes(year) && el.includes("actual")
            ) {
              obj[category].baseline[year] = data[el];
              counter++;
            } else if (
              el.includes(category) &&
              el.includes(`${year + yearUpdateNumber}`) &&
              !el.includes("actual")
            ) {
              obj[category].target[`${year + yearUpdateNumber}`] = data[el];
              counter++;
            } else if (
              el.includes(category) &&
              el.includes(`${year + yearUpdateNumber}`) &&
              el.includes("actual")
            ) {
              obj[category].achieved[`${year + yearUpdateNumber}`] = data[el];
              counter++;
            }
          }
          if (counter >= 3) break;
        }
      }
      const obtainedMarks = [];
      for (const category of slbCategories) {
        const { baseline, target, achieved } = obj[category];

        if (
          baseline[`${year}`] &&
          target[`${year + yearUpdateNumber}`] &&
          achieved[`${year + yearUpdateNumber}`]
        ) {
          const x = Number(baseline[`${year}`]);
          const y = Number(target[`${year + yearUpdateNumber}`]);
          const z = Number(achieved[`${year + yearUpdateNumber}`]);

          if (category === "reduction") {
            obtainedMarks.push(
              decrementFormula(
                x,
                y,
                z,
                minMax.reduction.min,
                minMax.reduction.max
              )
            );
          } else {
            obtainedMarks.push(
              incrementFormula(
                x,
                y,
                z,
                minMax[category].min,
                minMax[category].max
              )
            );
          }
        }
      }
      return obtainedMarks;
    } catch (error) {
      throw `calculateSlbMarks2324:: ${error.message}`;
    }
};
  
  
function incrementFormula(x, y, z, minMarks, maxMarks){
    let marks =0;
    if(z>=y){
        marks = maxMarks;
    } else if(z<=x){
        marks = minMarks;
    } else if(z>x && z<y){
        marks = Number((((z-x)/(y-x))*maxMarks).toFixed(2));
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
        marks = Number((((x-z)/(x-y))*maxMarks).toFixed(2));
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