module.exports = {
    processData:require('./process'),
    getProcessStatus:require('./get-process-status'),
    ulbLocationUpdate:require('./ulb-location-update'),
    stateUlbCountUpdate:require("./state-ulb-count-update"),
    csvToJSON:require('./csv-to-json'),
    uploadLedger: require('./upload-ledger'),
    bondUpload:require('./bonds-upload'),
    ulbUlpload:require('./ulb-upload'),
    overallUlbUlpload:require('./overall-ulb-upload')
}
