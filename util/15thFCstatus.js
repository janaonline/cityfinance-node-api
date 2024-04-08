module.exports.ulbFormStatus = {
    'Not_Started': 'Not Started',
    'In_Progress': 'In Progress',
    'Under_Review_By_State': 'Under Review By State',
    'Under_Review_By_MoHUA': 'Under Review By MoHUA',
    'Rejected_By_State': 'Returned By State',
    'Approved_By_MoHUA': 'Approved By MoHUA',
    'Rejected_By_MoHUA': 'Returned By MoHUA',
}

module.exports.stateFormStatus = {
    'Not_Started': 'Not Started',
    'In_Progress': 'In Progress',
    'Under_Review_By_MoHUA': 'Under Review By MoHUA',
    'Approved_By_MoHUA': 'Approved By MoHUA',
    'Rejected_By_MoHUA': 'Returned By MoHUA',
}

module.exports.filledStatus = {
    'Submitted': 'Yes',
    'Not_Submitted': 'No'
}

module.exports.ulbType = {
    'tP': 'Town Panchayat',
    'mCorp': 'Municipal Corporation',
    'mC': 'Municipality',
}

module.exports.populationType = {
    'million': 'Million Plus',
    'nonMillion': 'Non Million'
}

module.exports.ModelNames = {
    annualAcc: "AnnualAccountData",
    linkPFMS: "PFMSAccount",
    gtc: "GrantTransferCertificate",
    sfc: "StateFinanceCommissionFormation",
    pTAX: "PropertyTaxFloorRate",
    dur: "UtilizationReport",
    propTaxOp:"PropertyTaxOp",
    twentyEightSlbs: "TwentyEightSlbForm",
    odf: "OdfFormCollection",
    gfc: "GfcFormCollection",
    slb: "XVFcGrantULBForm",
    waterRej : "WaterRejenuvationRecycling",
    actionPlan: "ActionPlans",
    slbScoring: "slbScoring",
}

module.exports.CollectionNames = {
    annualAcc: "annualaccountdatas",
    linkPFMS: "pfmsaccounts",
    gtc: "granttransfercertificates",
    sfc: "statefinancecommissionformations",
    pTAX: "propertytaxfloorrates",
    dur: "utilizationreports",
    propTaxOp:"propertytaxops",
    twentyEightSlbs: "twentyeightslbforms",
    odf: "odfformcollections",
    gfc: "gfcformcollections",
    slb: "xvfcgrantulbforms",
    waterRej: "waterrejenuvationrecyclings",
    actionPlan: "actionplans",
    rating: "ratings",
    slbScoring: "slbScoring"
}
module.exports.ModelNamesToFormId = {
     "annualaccountdatas":5,
     "pfmsaccounts":8,
     "granttransfercertificates":7,
     "statefinancecommissionformations":15,
     "propertytaxfloorrates":17,
     "utilizationreports":4,
    "propertytaxops":3,
     "twentyeightslbforms":6,
     "odfformcollections":1,
     "gfcformcollections":2,
     "waterrejenuvationrecyclings":12,
     "actionplans":13,
}
module.exports.FormPathMappings = {
    "annualaccountdatas":"AnnualAccounts",
    "pfmsaccounts":"LinkPFMS",
    "xvfcgrantulbforms":"XVFcGrantForm",
    "twentyeightslbforms":"TwentyEightSlbsForm",
    "utilizationreports":"UtilizationReport",
    "granttransfercertificates":"GrantTransferCertificate",
    "odfformcollections":"OdfFormCollection",
    "gfcformcollections":"GfcFormCollection",
    "statefinancecommissionformations":"StateFinanceCommissionFormation",
    "propertytaxfloorrates":"PropertyTaxFloorRate",
    "propertytaxops":"PropertyTaxOp",
    "waterrejenuvationrecyclings":"WaterRejenuvationRecycling",
    "actionplans":"ActionPlans",
 };
module.exports.FolderName = {
    'IndicatorForWaterSupply': "indicators_wss",

}

module.exports.FRFormStatus = {

    'Not_Started': 'Not Started',
    'In_Progress': 'In Progress',
    'Under_Review_By_MoHUA': 'Under Review By MoHUA',
    'Approved_By_MoHUA': 'Approved By MoHUA',
    'Rejected_By_MoHUA': 'Returned By MoHUA',

}

module.exports.UlbFormCollections = {
    "gfcformcollections": "GfcFormCollection",
    "odfformcollections" : "OdfFormCollection",
    "xvfcgrantulbforms": "XVFcGrantULBForm",
    "propertytaxops": "PropertyTaxOp",
    "twentyeightslbforms": "TwentyEightSlbForm",
    "utilizationreports": "UtilizationReport",
    "annualaccountdatas" : "AnnualAccountData",
    "pfmsaccounts":"PFMSAccount"
}