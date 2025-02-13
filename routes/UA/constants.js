
const { years } = require("../../service/years")
let columns = [
    {
        label: "Project Name",
        key: "projectName",
        get databaseKey(){
            return "name"
        }
    },
    {
        label: "Implementation Agency",
        key: "implementationAgency",
        get databaseKey(){
            return "ulb.name"
        }
    },
    {
        label:"Sector",
        key:"sector"
    },
    {
        label: "Total Project cost",
        key: "totalProjectCost",
        get databaseKey(){
            return  "cost"
        }
    },
    {
        label: "State Share & Central Assistance",
        key: "stateShare",
        get databaseKey(){
            return "share"
        }
    },
    {
        label: "ULB Share(Funding Potential)",
        key: "ulbShare",
        get databaseKey(){
            return "expenditure"
        }
    },
    {
        label: "Capital Expenditure (State Share & Central Assistance)",
        key: "capitalExpenditureState",
        get databaseKey(){
            return "cpExp"
        }
    },
    {
        label: "Capital Expentiture (ULB Share)",
        key: "capitalExpenditureUlb",
        get databaseKey(){
            return "cpExpUlb"
        }
    },
    {
        label: "O&M Expenses (State Share & Central Assistance)",
        key: "omExpensesState",
        get databaseKey(){
            return "omExpState"
        }
    },
    {
        label: "O&M Expenses (ULB Share)",
        key: "omExpensesUlb",
        get databaseKey(){
            return "omExpensesUlb"
        }
    },
    {
        label:"Central Assistance",
        key:"expenditure"
    },
    {
        label: "Project Start Date",
        key: "startDate",
        get databaseKey(){
            return "createdAt"
        }
    },
    {
        label: "Estimated Project Completion Date",
        key: "estimatedCompletionDate",
        get databaseKey(){
            return "estCompDate"
        }
    },
    {
        label: "More information",
        key: "moreInformation",
        get databaseKey(){
            return "csv"
        }
    },
    {
        label: "Detailed Project Report",
        key: "projectReport",
        get databaseKey(){
            return "dprDocument.url"
        }
    },
    {
        label: "Credit Rating",
        key: "creditRating",
        get databaseKey(){
            return "rating"
        }
    },
]

let csvCols = {
    "stateName":"State Name",
    "ulbName":"ULB Name",
    "cfCode":"City Finance Code",
    "censusCode":"Census Code",
    "population":"Population Category",
    "projectName":"Project Name",
    "type": "Type",
    "implementationAgency":"Implementation Agency",
    "sector":"Sector",
    "totalProjectCost":"Total Project cost INR (in lakhs)",
    "stateShare":"State Share & Central Assistance",
    "lat":"Latitude",
    "long":"Longitude",
    "ulbShare":"ULB Share(Funding Potential)",
    "capitalExpenditureState":"Capital Expenditure (State Share & Central Assistance)",
    "capitalExpenditureUlb":"Capital Expentiture (ULB Share)",
    "omExpensesState":"O&M Expenses (State Share & Central Assistance)",
    "omExpensesUlb":"O&M Expenses (ULB Share)",
    "startDate":"Project Start Date",
    "estimatedCompletionDate":"Estimated Project Completion Date",
    "dprPrepared": "Is DPR Prepared",
    "dprPrepationDate": "DPR Preparation Date",
    "projectReport":"Detailed Project Report",
    "creditRating1":"Credit Rating 1",
    "creditRating2":"Credit Rating 2"
}

const sortFilterKeys = {
    // "totalProjectCost": "projects.cost",
    "ulbShare": "ulbShare",
    "totalProjects":"totalProjects",
    "totalProjectCost":"totalProjectCost",
    "stateName":"stateName",
    "ulbName":"ulbName"
}

const filterYears = [ // make this dynamic with the current financial year
    {
        "label":"2022-23",
        "id":years['2022-23']
    },
    {
        "label":"2023-24",
        "id":years['2023-24']
    }
]
const types = [
    {
        name: 'DUR',
        _id: 'dur'
    },
    {
        name: "AMRUT",
        _id: 'amrut'
    }
];

const dashboardColumns = [
    {
        "label":"State Name",
        "key":"stateName"
    },
    {
        "label":"City",
        "key":"ulbName"
    },
    {
        "label":"Total Project Cost INR(CR)",
        "key":"totalProjectCost"
    },
    {
        "label":"No of Projects",
        "key":"totalProjects"
    },
    {
        "label":"ULBShare(Funding Potential) INR(CR) ",
        "key":"ulbShare"
    }
]

module.exports = {
    columns,
    csvCols,
    sortFilterKeys,
    dashboardColumns,
    filterYears,
    types
}