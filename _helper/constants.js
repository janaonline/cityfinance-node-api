module.exports = {
    
    INACTIVETIME:{TIME:60*60*1000*60},// 60 min
    PASSWORDEXPIRETIME : {TIME:90*24*60*60*1000*3}, // 3 hour
    USER: {
        ROLES: ['ADMIN','MoHUA','PARTNER','STATE','ULB','USER'],
        DEFAULT_ROLE: 'USER',
        ONBOARD_AUTHORITY: 'SUPERADMIN',
        LEDGER_AUTHORITY: 'SUPERADMIN',
        LEVEL_ACCESS:{
            ADMIN:['MoHUA','PARTNER','STATE','ULB','USER'],
            MoHUA:['PARTNER','STATE','ULB','USER'],
            PARTNER:['STATE','ULB','USER'],
            STATE:['ULB']
        }
    },
    BUDGET: {
        YEAR: ['2015-16', '2016-17', '2017-18']
    },
    AUDIT: {
        STATUS: ['Audited']
    },
    LEDGER: {
        BULK_ENTRY: {
            OVERVIEW_SHEET_NAME: 'Overview',
            INPUT_SHEET_NAME: 'Input sheet'
        }
    },
    ULBMASTER:{
        INPUT_SHEET_NAME: 'Input sheet'
    },
    POPULATION_DROPDOWN:[
        {
            _id:1,
            label:"Overall",
            condition:{}
        },
        {
            _id:2,
            label:"Less than 50k",
            condition:{ $lt:50000}
        },
        {
            _id:3,
            label:"Over 50k but less than 100k",
            condition:{ $gte:(50 * 1000), $lt:(100 * 1000)}
        },
        {
            _id:4,
            label:"Over 100k but less than 300k",
            condition:{ $gte:(100 * 1000), $lt:(300 * 1000)}
        },
        {
            _id:5,
            label:"Over 300k but less than 500k",
            condition:{ $gte:(300 * 1000), $lt:(500 * 1000)}
        },
        {
            _id:6,
            label:"Over 500k but less than 1 million",
            condition:{ $gte:(500 * 1000), $lt:(1000 * 1000)}
        },
        {
            _id:7,
            label:"Over 1 million",
            condition:{ $gte:(1000 * 1000)}
        }
    ]
}
