let grantsWithUlbTypes =  {
    "million_tied":{ulbType:"MPC",grantType:"Tied"},
    "nonmillion_untied":{ulbType:"NMPC",grantType:"Untied"},
    "nonmillion_tied" :{ulbType:"NMPC",grantType:"Tied"}
}

let installment_types = {
    1 :"1st Installment",
    2 :"2nd Installment"
}

let grantDistributeOptions = {
    "Yes":"As per Census 2011",
    "No":"As per SFC Recommendations"
}

let warningkeys = {
    "recomAvail":"IsSfcFormFilled",
    "propertyTaxNotif":"isPfrFilled",
    "propertyTaxNotifCopy":"pfrFile",
    "accountLinked":"pfmsFilledPerc"
}

const getMessagesForRadioButton = (sfcLink="",propertyFrLink="",prevAccountLink="")=>{
    return {
        "recomAvail":{
            "1":"",
            "2":`States are advised to set up SFC in such a way that the SFC recommendations will be available for laying in State legislature on or before 2024, and it will be taken as a pre-condition for States to claim grants from 2024-25 onwards ${sfcLink}`
        },
        "propertyTaxNotif":{
            "1":"",
            "2":`States need to notify their property tax floor rates by 2022-23 as this will be a pre-condition for claiming grants from 2022-23 onwards. ${propertyFrLink}`
        },
        "accountLinked":{
            "1":"",
            "2":`States need to ensure 100% PFMS linkage of their ULBs as linking of ULB account for XVFC Grant with PFMS or any other e-governance system fully integrated with PFMS will be a pre-condition for release of grant from 2022-23 ${prevAccountLink}`
        },
    }
}
let singleInstallmentTypes = ["million_tied"]

module.exports.warningkeys = warningkeys
module.exports.getMessagesForRadioButton = getMessagesForRadioButton
module.exports.grantDistributeOptions = grantDistributeOptions
module.exports.grantsWithUlbTypes = grantsWithUlbTypes
module.exports.installment_types = installment_types
module.exports.singleInstallmentTypes = singleInstallmentTypes