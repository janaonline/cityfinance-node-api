module.exports.FormNames = {
    gfc: "Garbage Free City (GFC)",
    odf: "Open Defecation Free (ODF)",
    gtc: "Grant Transfer Certificate",
    dur: "Detailed Utilisation Report",
    pfms: "Linking of PFMS Account",
    annualAcc: "Annual Accounts",
    propTaxOp: "Property Tax Operationalisation",
    slb28: "28 SLBs",

}

// values: ["Grant Transfer Certificate", "Detailed Utilisation Report",
// "Annual Accounts", "Linking of PFMS Account", "Property Tax Operationalisation",
// "SLBs for Water Supply and Sanitation", "Open Defecation Free (ODF)", 
// "Garbage Free City (GFC)", "Scoring"],

module.exports.YEAR_CONSTANTS = {
    "20_21": "606aadac4dff55e6c075c507",
    "21_22":"606aaf854dff55e6c075d219",
    "22_23":"606aafb14dff55e6c075d3ae",
    "23_24": "606aafc14dff55e6c075d3ec"
}


module.exports.MASTER_STATUS = {
    "Not Started": 1,
    "In Progress": 2,
    "Under Review by State": 3,
    "Under Review by MoHUA": 4,
    "Rejected by State": 5,
    "Approved by MoHUA": 6,
    "Rejected by MoHUA":7
}


module.exports.FORMIDs = {
    "AnnualAccount": 1,
    "ODF": 2,
    "GFC":3
}


module.exports.FORM_LEVEL = {
    "form": 1,
    "tab": 2,
    "question": 3
}