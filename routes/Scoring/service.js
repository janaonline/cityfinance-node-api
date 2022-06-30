const XVFcGrantForm = require('../../models/XVFcGrantForm');
const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');

function calculateSlbMarks(data){
    let x,y,z;
    let obtainedMarks =[];
    if(data.waterSuppliedPerDay){
        x = Number(data.waterSuppliedPerDay.baseline['2021']);
        y = Number(data.waterSuppliedPerDay.target[0]);
        z = Number(data.waterSuppliedPerDay.actual);
        obtainedMarks[0] = incrementFormula(x, y, z, 0, 10);
    }
    if(data.reduction){
        x = Number(data.waterSuppliedPerDay.baseline['2021']);
        y = Number(data.waterSuppliedPerDay.target['2122']);
        z = Number(data.waterSuppliedPerDay.actual['2122']);
        obtainedMarks[1] = decrementFormula(x, y, z, 0, 10);
    }
    if(data.houseHoldCoveredWithSewerage){
        x = Number(data.waterSuppliedPerDay.baseline['2021']);
        y = Number(data.waterSuppliedPerDay.target['2122']);
        z = Number(data.waterSuppliedPerDay.actual['2122']);
        obtainedMarks[2] = incrementFormula(x, y, z, 0, 20);
    }
    if(data.houseHoldCoveredPipedSupply){
        x = Number(data.houseHoldCoveredPipedSupply.baseline['2021']);
        y = Number(data.houseHoldCoveredPipedSupply.target['2122']);
        z = Number(data.houseHoldCoveredPipedSupply.actual['2122']);
        obtainedMarks[3] = incrementFormula(x, y, z, 0, 20);
    }
    return obtainedMarks;
}

function incrementFormula(x, y, z, minMarks, maxMarks){
    let marks =0;
    if(z>=y){
        marks = maxMarks;
    } else if(z<=x){
        marks = minMarks;
    } else if(z>x && x<y){
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
    } else if(z<x && x>y){
        marks = ((y-z)/(y-x))*maxMarks;
    }
    return marks;
}

function calculateRecommendationPercentage(score){
    let percent = 0;
    if(score>=0 && score<= 29){ 
        percent = 0 
    }else if(score>=30 && score<=45){
        percent = 60;
    }else if(score>=46 && score<=60){
        percent = 75;
    }else if(score>=61 && score<=80){
        percent = 80;
    }else if(score>=81 && score<=100){
        percent = 100;
    }
    return percent;
}

module.exports.calculateRecommendation = async (req, res) => {
    const data = req.body;
    const slbMarks = [];
    let totalSlbMarks = 0;
    const condition = {};
    condition['ulb'] = data.ulb;
    condition['design_year'] = ulb.design_year;

    const slbForm = await XVFcGrantForm.findOne(condition);
    slbMarks = calculateSlbMarks(slbForm.waterManagement);
    
    const gfcForm = await GfcFormCollection.findOne(condition);
    const gfcMark = gfcForm.marks;
    const odfForm = await OdfFormCollection.findOne(condition);
    const odfMark = odfForm.marks;
    
    for(let i=0; i < slbMarks.length; i++){
        totalSlbMarks = slbMarks[i] + totalSlbMarks;
    }
    const totalScore =  (totalSlbMarks + gfcMark + odfMark);
    const recommendation = calculateRecommendationPercentage(totalScore);
    return recommendation;
}

