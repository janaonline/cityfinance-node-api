const UlbLedger = require("../../models/UlbLedger");
const Ulb = require("../../models/Ulb");
const LineItem = require("../../models/LineItem");
const Redis = require('../../service/redis');
const lineItems  = {
    "Audit report": "1001",
    "Balance sheet": "1002",
    "Income & Expenditure": "1003",
    "Schedules": "1004",
    "Trial balance": "1005",
    "Notes to accounts": "1006",
    "Schedule and Trial Balance": "1007"
};
module.exports = async (req, res)=>{
    try {
        const jsonArray = req.body.jsonArray;
        //console.log("jsonArray", jsonArray.length);
        let dataArr= [];

        for(let json of jsonArray){
            console.log("json", json);
            let ulb = await Ulb.findOne({code : json["ULB Code"]},"_id");
            if(ulb){
                for(let k in json){
                    // Find ulb based on ULB Code
                    if(["YEAR","ULB Code"].indexOf(k) < 0 && lineItems[k]){
                        
                        // Find lineItems in existing line items
                        let lineItem = await LineItem.findOne({code : lineItems[k]},"_id");
                        if(ulb && lineItem){
                            dataArr.push({
                                ulb:ulb._id,
                                lineItem:lineItem._id,
                                financialYear:json["YEAR"],
                                amount: !isNaN(Number(json[k])) ? Number(json[k]) : 0
                            })
                        }
                    }
                }
            }
        }

        let i=0;
        for(let data of dataArr){

            let du = {
                query : {ulb:data.ulb, lineItem:data.lineItem, financialYear: data.financialYear},
                update : data,
                options : {upsert : true,setDefaultsOnInsert : true,new: true}
            }
            let d = await UlbLedger.findOneAndUpdate(du.query,du.update,du.options);
            console.log(i);

           i++; 
        }
        Redis.resetDashboard();
        return res.status(200).json({success:true, data:dataArr});
    }catch (e) {
        console.log("Exception:",e);
        return res.status(500).json({message:e.message, success:false})
    }
};

