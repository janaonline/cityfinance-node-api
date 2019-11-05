const ledgerLogModel = require('../models/ledger_log_model');
const ledgerModel = require('../models/ledger_model');
const CONSTANTS = require('../_helper/constants');
const UlbModel = require('../models/ulb_list');

module.exports.getOwnRevenueReport = function (req, res) {
    
    let payload = {};
    payload['head_of_account'] = {$in : ['Revenue']};
    ledgerModel.getAll(payload, (err, ledgers) => {
        if (err) {
            res.json({
                success: false,
                msg: 'Invalid payload',
                data: err.toString()
            });
        }


        result = [];
        for (let i = 0; i < ledgers.length; i++) {
            let ledger = {}
            let ledgerInfo = ledgers[i];
            const ulbInfo = UlbModel.getUlbByCode(ledgerInfo.ulb_code);
            for (let i = 0; i < ledgerInfo['budget'].length; i++) {
                const budget = ledgerInfo['budget'][i];
            
                ledger['state_name'] = ulbInfo.stateName;
                ledger['ulb_name'] = ulbInfo.name;
                ledger['population'] = ulbInfo.population;

                ledger['head_of_account'] = ledgerInfo.head_of_account;
                ledger['code'] = ledgerInfo.code;
                ledger['line_item'] = ledgerInfo.line_item;

                ledger['year'] = budget.year;
                ledger['amount'] = budget.amount;

                result.push(ledger);
            }
           
        }
        res.json({
            success: true,
            msg: 'success',
            data: result
        });
    })
}