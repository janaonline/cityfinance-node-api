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
        label: "State Share",
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
        label: "Capital Expentiture (State Share)",
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
        label: "O&M Expenses (State Share)",
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
            return false
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

module.exports = {
    columns
}