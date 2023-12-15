let csvColsFr = ["State Name",
"ULB Name", //ULB Name
"Design Year",//year
"City Finance Code",
"Census Code", //Census Code
"ULB Type", //ULB Type
"Form Status", //filled
"Created Date", //createdAt
"Last Submitted Date", //modifiedAt
"MoHUA Comments",
"MoHUA Review File URL",
"Population as per 2011 Census", //population11
"Population as on 1st April 2022", //populationFr
"ULB website URL link", //webUrlAnnual
"Name of Commissioner / Executive Officer", //nameCmsnr
"Name of the Nodal Officer", //nameOfNodalOfficer
"Designation of the Nodal Officer",
"Email ID",//email
"Mobile number",//number
"Does the ULB handle water supply services?", //waterSupply
"Does the ULB handle sanitation service delivery?", //sanitationService
"Does your Property Tax include Water Tax?", //propertyWaterTax
"Does your Property Tax include Sanitation/Sewerage Tax?", //propertySanitationTax
"Basic ULB Details_Comment",
"Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2019-20", //totalRcptActl
"Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2020-21", //totalRcptActl
"Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2021-22", //totalRcptActl
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2018-19", //totalRcptWaterSupply
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2019-20", //totalRcptWaterSupply 
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2020-21", //totalRcptWaterSupply
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2021-22", //totalRcptWaterSupply
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2018-19", //totalRcptSanitation
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2019-20", //totalRcptSanitation
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2020-21", //totalRcptSanitation
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2021-22", //totalRcptSanitation
"Budget Estimate of Revenue Mobilization Parameter for FY 2019-20", //totalRcptBudget
"Budget Estimate of Revenue Mobilization Parameter for FY 2020-21", //totalRcptBudget
"Budget Estimate of Revenue Mobilization Parameter for FY 2021-22", //totalRcptBudget
"Total Own Revenue of Revenue Mobilization Parameter for FY 2018-19", //totalOwnRvnue
"Total Own Revenue of Revenue Mobilization Parameter for FY 2019-20", //totalOwnRvnue 
"Total Own Revenue of Revenue Mobilization Parameter for FY 2020-21", //totalOwnRvnue
"Total Own Revenue of Revenue Mobilization Parameter for FY 2021-22", //totalOwnRvnue
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2018-19",  //totalProperty
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2019-20", //totalProperty
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2020-21", //totalProperty
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2021-22", //totalProperty
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2018-19", //totalTaxRevWaterSupply
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2019-20", //totalTaxRevWaterSupply
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2020-21", //totalTaxRevWaterSupply
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2021-22", //totalTaxRevWaterSupply
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2018-19", //totalTaxRevSanitation
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2019-20", //
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2020-21",//
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2021-22",//
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2018-19", //totalFeeChrgWaterSupply
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2019-20", //
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2020-21", //
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2021-22",//
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2018-19", //totalFeeChrgSanitation
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2019-20", //
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2020-21", //
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2021-22", //
"Resource Mobilization_Coment",
"Total Capital Expenditure Performance Parameter for FY 2018-19", //totalCaptlExp
"Total Capital Expenditure Performance Parameter for FY 2019-20", //
"Total Capital Expenditure Performance Parameter for FY 2020-21", //
"Total Capital Expenditure Performance Parameter for FY 2021-22", //
"Total Capital Water Supply Expenditure Performance Parameter for FY 2018-19", //totalCaptlExpWaterSupply
"Total Capital Water Supply Expenditure Performance Parameter for FY 2019-20", //
"Total Capital Water Supply Expenditure Performance Parameter for FY 2020-21", //
"Total Capital Water Supply Expenditure Performance Parameter for FY 2021-22", //
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2018-19", //totalCaptlExpSanitation
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2019-20", //
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2020-21", //
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2021-22", //
"Total O & M Expenditure Performance Parameter for FY 2018-19", //totalOmExp
"Total O & M Expenditure Performance Parameter for FY 2019-20", //
"Total O & M Expenditure Performance Parameter for FY 2020-21", //
"Total O & M Expenditure Performance Parameter for FY 2021-22", //
"Total Revenue Expenditure Performance Parameter for FY 2018-19", // totalRevlExp
"Total Revenue Expenditure Performance Parameter for FY 2019-20", //
"Total Revenue Expenditure Performance Parameter for FY 2020-21", //
"Total Revenue Expenditure Performance Parameter for FY 2021-22", //
"O & M Expenditure for Water Supply for FY 2019-20", //totalCaptlExpWaterSupply
"O & M Expenditure for Water Supply for FY 2020-21", //
"O & M Expenditure for Water Supply for FY 2021-22", //
"O & M Expenditure for Sanitation/Sewerage for FY 2019-20", // totalCaptlExpSanitation
"O & M Expenditure for Sanitation/Sewerage for FY 2020-21", //
"O & M Expenditure for Sanitation/Sewerage for FY 2021-22", //
"Total Revenue Expenditure Performance for FY 2019-20",
"Total Revenue Expenditure Performance for FY 2020-21",
"Total Revenue Expenditure Performance for FY 2021-22",
"Expenditure Performance_Comment",
"Date of Audit Report for audited financial statements for FY 2019-20",
"Date of Audit Report for audited financial statements for FY 2020-21",
"Date of Audit Report for audited financial statements for FY 2021-22",
"ULB website URL link of Audited Annual Accounts for FY 2019-20 to FY 2020-21",
"Is the property tax register GIS-based?", //registerGis
"Do you use accounting software?", //accountStwre
"Total Own Revenue Arrears as on 31st March 2022",
"Own Revenue Collection Amount FY 2021-22 - by Cash/Cheque/DD", //ownRevenAmt
"Number of Properties assessed/listed as per Property Tax Register (as on 1st April 2022)", //NoOfProlisted
"Number of Properties exemt from paying Property Tax (as on 1st April 2022)", //NoOfProExemtfromPayProTax
"Number of Properties for which Property Tax has been paid (for FY 2021-22)", //NoOfProwhichProTaxPaid
"Fiscal Governance_Comments",
"Approved Annual Budget financial documents for FY 2020-21",
"Approved Annual Budget financial documents for FY 2021-22",
"Approved Annual Budget financial documents for FY 2022-23",
"Audited Annual Budget financial documents for FY 2020-21",
"Audited Annual Budget financial documents for FY 2021-22",
"Audited Annual Budget financial documents for FY 2022-23",
"Contact Information_comment",
"Self Declaration Download File Link",
"Self Declaration Uploaded File link",
"Self Declaration_comments"]

let hideFormVisibleUlb = {
  "Vallabh Vidyanagar Municipality": "5fa2465e072dab780a6f109b"
}



/**
 * query that sends create projection queries for csv data download 
 */
function getCsvProjectionQueries(functionalObj,queryArr,collectionName,skip,limit,newFilter){
    try{
        let {mainProjectionQuery,getCensusCodeCondition,getUAcondition,getUA_id,getPopulationCondition,filterQuery} = functionalObj
      let csvProjection = {
        "$project":{
          "ULB Name":"$name",
          "ulbId": "$_id",
          "City Finance Code": "$code",
          "Census Code":getCensusCodeCondition(),
          "UA":getUAcondition(),
          "UA_ID":getUA_id(),
          "ULB Type": "$ulbType.name",
          "ulbType_id": "$ulbType._id",
          "population": "$population",
          "state_id": "$state._id",
          "State Name": "$state.name",
          "populationType":getPopulationCondition(),
          "formData": { $ifNull: [`$${collectionName}`, ""] },
          "Design Year":`$${collectionName}.design_year.year`,
          "Created Date":{ "$dateToString": { "format": "%Y-%m-%d", "date": "$fiscalrankings.createdAt" }},
          "Last Submitted Date":{ "$dateToString": { "format": "%Y-%m-%d", "date": "$fiscalrankings.modifiedAt" }},
          "Population as per 2011 Census":`$${collectionName}.population11.value`,
          "Population as on 1st April 2022":`$${collectionName}.population11.value`,
          "ULB website URL link":`$${collectionName}.webUrlAnnual.value`,
          "nameCmsnr":`$${collectionName}.nameCmsnr`,
          "Name of the Nodal Officer":`$${collectionName}.nameOfNodalOfficer`,
          "Designation of the Nodal Officer":`$${collectionName}.designationOftNodalOfficer`,
          "Email ID":`$${collectionName}.email`,
          "Mobile number":`$${collectionName}.mobile`,
          "Does the ULB handle water supply services?":`$${collectionName}.waterSupply.value`,
          "Does the ULB handle sanitation service delivery?":`$${collectionName}.sanitationService.value`,
          "Does your Property Tax include Water Tax?":`$${collectionName}.propertyWaterTax.value`,
          "Does your Property Tax include Sanitation/Sewerage Tax?":`$${collectionName}.propertySanitationTax.value`,
          "totalRcptActl_arr_2019-20":filterQuery("totalRcptActl","2019-20"),
          "totalRcptActl_arr_2020-21":filterQuery("totalRcptActl","2020-21"),
          "totalRcptActl_arr_2021-22":filterQuery("totalRcptActl","2021-22"),
          //water sanitization cols
          "totalRcptWaterSupply_arr_2018-19":filterQuery("totalRcptWaterSupply","2018-19"),
          "totalRcptWaterSupply_arr_2019-20":filterQuery("totalRcptWaterSupply","2019-20"),
          "totalRcptWaterSupply_arr_2020-21":filterQuery("totalRcptWaterSupply","2020-21"),
          "totalRcptWaterSupply_arr_2021-22":filterQuery("totalRcptWaterSupply","2021-22"),
          //totalRcptSanitation
          "totalRcptSanitation_arr_2018-19":filterQuery("totalRcptSanitation","2018-19"),
          "totalRcptSanitation_arr_2019-20":filterQuery("totalRcptSanitation","2019-20"),
          "totalRcptSanitation_arr_2020-21":filterQuery("totalRcptSanitation","2020-21"),
          "totalRcptSanitation_arr_2021-22":filterQuery("totalRcptSanitation","2021-22"),
          //totalRcptBudget
          "totalRcptBudget_arr_2019-20":filterQuery("totalRcptBudget","2019-20"),
          "totalRcptBudget_arr_2020-21":filterQuery("totalRcptBudget","2020-21"),
          "totalRcptBudget_arr_2021-22":filterQuery("totalRcptBudget","2021-22"),
          //totalOwnRvnue
          "totalOwnRvnue_arr_2018-19":filterQuery("totalOwnRvnue","2018-19"),
          "totalOwnRvnue_arr_2019-20":filterQuery("totalOwnRvnue","2019-20"),
          "totalOwnRvnue_arr_2020-21":filterQuery("totalOwnRvnue","2020-21"),
          "totalOwnRvnue_arr_2021-22":filterQuery("totalOwnRvnue","2021-22"),
          //totalProperty
          "totalProperty_arr_2018-19":filterQuery("totalProperty","2018-19"),
          "totalProperty_arr_2019-20":filterQuery("totalProperty","2019-20"),
          "totalProperty_arr_2020-21":filterQuery("totalProperty","2020-21"),
          "totalProperty_arr_2021-22":filterQuery("totalProperty","2021-22"),
          //totalTaxRevWaterSupply
          "totalTaxRevWaterSupply_arr_2018-19":filterQuery("totalTaxRevWaterSupply","2018-19"),
          "totalTaxRevWaterSupply_arr_2019-20":filterQuery("totalTaxRevWaterSupply","2019-20"),
          "totalTaxRevWaterSupply_arr_2020-21":filterQuery("totalTaxRevWaterSupply","2020-21"),
          "totalTaxRevWaterSupply_arr_2021-22":filterQuery("totalTaxRevWaterSupply","2021-22"),
          //totalTaxRevSanitation
          "totalTaxRevSanitation_arr_2018-19":filterQuery("totalTaxRevSanitation","2018-19"),
          "totalTaxRevSanitation_arr_2019-20":filterQuery("totalTaxRevSanitation","2019-20"),
          "totalTaxRevSanitation_arr_2020-21":filterQuery("totalTaxRevSanitation","2020-21"),
          "totalTaxRevSanitation_arr_2021-22":filterQuery("totalTaxRevSanitation","2021-22"),
          //totalFeeChrgWaterSupply
          "totalFeeChrgWaterSupply_arr_2018-19":filterQuery("totalFeeChrgWaterSupply","2018-19"),
          "totalFeeChrgWaterSupply_arr_2019-20":filterQuery("totalFeeChrgWaterSupply","2019-20"),
          "totalFeeChrgWaterSupply_arr_2020-21":filterQuery("totalFeeChrgWaterSupply","2020-21"),
          "totalFeeChrgWaterSupply_arr_2021-22":filterQuery("totalFeeChrgWaterSupply","2021-22"),
          //totalFeeChrgSanitation
          "totalFeeChrgSanitation_arr_2018-19":filterQuery("totalFeeChrgSanitation","2018-19"),
          "totalFeeChrgSanitation_arr_2019-20":filterQuery("totalFeeChrgSanitation","2019-20"),
          "totalFeeChrgSanitation_arr_2020-21":filterQuery("totalFeeChrgSanitation","2020-21"),
          "totalFeeChrgSanitation_arr_2021-22":filterQuery("totalFeeChrgSanitation","2021-22"),
          //totalCaptlExp
          "totalCaptlExp_arr_2018-19":filterQuery("totalCaptlExp","2018-19"),
          "totalCaptlExp_arr_2019-20":filterQuery("totalCaptlExp","2019-20"),
          "totalCaptlExp_arr_2020-21":filterQuery("totalCaptlExp","2020-21"),
          "totalCaptlExp_arr_2021-22":filterQuery("totalCaptlExp","2021-22"),
          //totalCaptlExpWaterSupply 
          "totalCaptlExpWaterSupply_arr_2019-20":filterQuery("totalCaptlExpWaterSupply","2019-20"),
          "totalCaptlExpWaterSupply_arr_2020-21":filterQuery("totalCaptlExpWaterSupply","2020-21"),
          "totalCaptlExpWaterSupply_arr_2021-22":filterQuery("totalCaptlExpWaterSupply","2021-22"),
          //totalCaptlExpSanitation
          "totalCaptlExp_arr_2019-20":filterQuery("totalCaptlExp","2019-20"),
          "totalCaptlExp_arr_2020-21":filterQuery("totalCaptlExp","2020-21"),
          "totalCaptlExp_arr_2021-22":filterQuery("totalCaptlExp","2021-22"),
          
  
        }
      }
      queryArr.push(csvProjection)
      mainProjectionQuery(csvProjection,queryArr,true)
      queryArr.push({"$skip":parseInt(skip)})
      queryArr.push({"$limit":parseInt(limit)})
    }
    catch(err){
      console.log("error in getCsvProjectionQueries :: ",err.message)
    }
  }

function updateCsvCols(obj,fetchAmountFromQuery){
    let showFields = {...obj}
    try{
      showFields["Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2019-20"] = fetchAmountFromQuery("totalRcptActl_arr_2019-20")
      showFields["Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2020-21"] = fetchAmountFromQuery("totalRcptActl_arr_2020-21")
      showFields["Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2021-22"] = fetchAmountFromQuery("totalRcptActl_arr_2021-22")
      //
      showFields["Water Supply (Actual) of Revenue Mobilization Parameter for FY 2018-19"] = fetchAmountFromQuery("totalRcptWaterSupply_arr_2018-19")
      showFields["Water Supply (Actual) of Revenue Mobilization Parameter for FY 2019-20"] = fetchAmountFromQuery("totalRcptWaterSupply_arr_2019-20")
      showFields["Water Supply (Actual) of Revenue Mobilization Parameter for FY 2020-21"] = fetchAmountFromQuery("totalRcptWaterSupply_arr_2020-21")
      showFields["Water Supply (Actual) of Revenue Mobilization Parameter for FY 2021-22"] = fetchAmountFromQuery("totalRcptWaterSupply_arr_2021-22")
      //
      showFields["Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2018-19"] = fetchAmountFromQuery("totalRcptSanitation_arr_2018-19")
      showFields["Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2019-20"] = fetchAmountFromQuery("totalRcptSanitation_arr_2019-20")
      showFields["Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2020-21"] = fetchAmountFromQuery("totalRcptSanitation_arr_2020-21")
      showFields["Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2021-22"] = fetchAmountFromQuery("totalRcptSanitation_arr_2021-22")
      //
      showFields["Budget Estimate of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalRcptBudget_arr_2019-20")
      showFields["Budget Estimate of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalRcptBudget_arr_2020-21")
      showFields["Budget Estimate of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalRcptBudget_arr_2021-22")
      //
      showFields["Total Own Revenue of Revenue Mobilization Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalOwnRvnue_arr_2018-19")
      showFields["Total Own Revenue of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalOwnRvnue_arr_2019-20")
      showFields["Total Own Revenue of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalOwnRvnue_arr_2020-21")
      showFields["Total Own Revenue of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalOwnRvnue_arr_2021-22")
      //
      showFields["Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalProperty_arr_2018-19")
      showFields["Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalProperty_arr_2019-20")
      showFields["Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalProperty_arr_2020-21")
      showFields["Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalProperty_arr_2021-22")
      //
      showFields["Revenue of Water Supply of Revenue Mobilization Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalTaxRevWaterSupply_arr_2018-19")
      showFields["Revenue of Water Supply of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalTaxRevWaterSupply_arr_2019-20")
      showFields["Revenue of Water Supply of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalTaxRevWaterSupply_arr_2020-21")
      showFields["Revenue of Water Supply of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalTaxRevWaterSupply_arr_2021-22")
      //
      showFields["Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalTaxRevSanitation_arr_2018-19")
      showFields["Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalTaxRevSanitation_arr_2019-20")
      showFields["Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalTaxRevSanitation_arr_2020-21")
      showFields["Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalTaxRevSanitation_arr_2021-22")
      //
      showFields["Charge for Water Supply of Revenue Mobilization Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalFeeChrgWaterSupply_arr_2018-19")
      showFields["Charge for Water Supply of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalFeeChrgWaterSupply_arr_2019-20")
      showFields["Charge for Water Supply of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalFeeChrgWaterSupply_arr_2020-21")
      showFields["Charge for Water Supply of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalFeeChrgWaterSupply_arr_2021-22")
      //
      showFields["Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalFeeChrgSanitation_arr_2018-19")
      showFields["Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalFeeChrgSanitation_arr_2019-20")
      showFields["Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalFeeChrgSanitation_arr_2020-21")
      showFields["Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalFeeChrgSanitation_arr_2021-22")
      //
      showFields["Total Capital Expenditure Performance Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalCaptlExp_arr_2018-19")
      showFields["Total Capital Expenditure Performance Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalCaptlExp_arr_2019-20")
      showFields["Total Capital Expenditure Performance Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalCaptlExp_arr_2020-21")
      showFields["Total Capital Expenditure Performance Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalCaptlExp_arr_2021-22")
      //
      showFields["Total Capital Water Supply Expenditure Performance Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalCaptlExpWaterSupply_arr_2019-20")
      showFields["Total Capital Water Supply Expenditure Performance Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalCaptlExpWaterSupply_arr_2020-21")
      showFields["Total Capital Water Supply Expenditure Performance Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalCaptlExpWaterSupply_arr_2021-22")
      //
      showFields["Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2018-19"]  =  fetchAmountFromQuery("totalCaptlExpSanitation_arr_2018-19")
      showFields["Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2019-20"]  =  fetchAmountFromQuery("totalCaptlExpSanitation_arr_2019-20")
      showFields["Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2020-21"]  =  fetchAmountFromQuery("totalCaptlExpSanitation_arr_2020-21")
      showFields["Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2021-22"]  =  fetchAmountFromQuery("totalCaptlExpSanitation_arr_2021-22")
    }
    catch(err){
        console.log("error in updateCsvFIelds::",err.message)
    }
    return showFields
}
  module.exports = {
    csvColsFr,
    getCsvProjectionQueries,
    updateCsvCols,
    hideFormVisibleUlb
    

}