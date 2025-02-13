module.exports.fyCsvDownloadQuery = () => {
    return [
        {
            "$lookup": {
                "from": "fiscalrankingmappers",
                "localField": "_id",
                "foreignField": "fiscal_ranking",
                "as": "fiscalrankingmapper"
            }
        },
        {
            "$lookup": {
                "from": "ulbs",
                "localField": "ulb",
                "foreignField": "_id",
                "as": "ulb"
            }
        },
        {
            "$unwind": {
                "path": "$ulb",
                "preserveNullAndEmptyArrays": true
            }
        },
        { $match: { "ulb.isActive": true } },
        {
            "$project": {
                "ulbName": "$ulb.name",
                "state": "$ulb.state",
                "cityFinanceCode": "$ulb.code",
                "fiscalrankingmapper": "$fiscalrankingmapper",
                "sbCode": "$ulb.sbCode",
                "censusCode": "$ulb.censusCode",
                "currentFormStatus": "$currentFormStatus",
                "designYear": "$design_year"
            }
        },
        {
            "$sort": {
                "cityFinanceCode": 1
            }
        }
    ]
}