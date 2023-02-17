const modelSchema = ()=>{
    return {
        type:String,
        enum:{
            values :["ULBLedger","FiscalRanking"]
        }
    }
}
module.exports = {
    modelSchema
}