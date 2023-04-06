const ulbColumnNames = {
    sNo: "S No.",
    ulbName: "ULB Name",
    stateName: "State Name",
    censusCode: "Census/SB Code",
    ulbType: "ULB Type",
    populationType: "Population Type",
    UA: "UA",
    formStatus: "Form Status",
    filled: "Filled Status",
    filled_audited: "Audited Filled Status",
    filled_provisional: "Provisional Filled Status",
    action: "Action"
  }
  const stateColumnNames = {
    sNo: "S No.",
    stateName: "State Name",
    formStatus: "Form Status"
  }
let filterKeys = []
let dbKeys = []
let annualAccountKeys = {
    "filled1":"filled_audited",
    "filled2":"filled_provisional"
}
let ulbFilterKeys = {
    formId: 'formId',
    design_year: 'design_year',
    state: 'stateName',
    limit: 'limit',
    skip: 'skip',
    ulbName: 'ulbName',
    ulbCode: 'ulbCode',
    censusCode: 'censusCode',
    ulbType: 'ulbType',
    UA: 'UA',
    status: 'formData.currentFormStatus',
    filled1: 'filled',
    populationType: 'populationType',
    filled2: 'filled2'
  }
module.exports.ulbFilterKeys = ulbFilterKeys
module.exports.annualAccountKeys = annualAccountKeys
module.exports.ulbColumnNames = ulbColumnNames
module.exports.stateColumnNames = stateColumnNames