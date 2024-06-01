const ulbList = [
    { ulbId: "5dcfca53df6f59198c4ac3d5", censusCode: "801557", sbCode: "", formType: "form1" },
    { ulbId: "5dd24e98cc3ddc04b552b7d4", censusCode: "802716", sbCode: "", formType: "form2" }
];

function getFromForUlb(userId) {
    let indexOfUlb = ulbList.findIndex(x => { return x.ulbId == userId });
    if (indexOfUlb > -1) {
        return ulbList[indexOfUlb].formType;
    } else {
        return "Form not found for this ULB.";
    }
}

module.exports.getFromForUlb = getFromForUlb;