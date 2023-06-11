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

let singleInstallmentTypes = ["million_tied"]


module.exports.grantDistributeOptions = grantDistributeOptions
module.exports.grantsWithUlbTypes = grantsWithUlbTypes
module.exports.installment_types = installment_types
module.exports.singleInstallmentTypes = singleInstallmentTypes