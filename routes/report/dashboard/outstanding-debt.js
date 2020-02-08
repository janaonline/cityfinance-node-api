const moment = require('moment');
module.exports = (req, res, next)=>{
    return res.status(200).json({
        timestamp:moment().unix(),
        success:true,
        message:"",
        data:[
            {
                year:"2016-17",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    }
                ]
            },
            {
                year:"2017-18",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    }
                ]
            }
        ].map(d=>{
            return {
                year:d.year,
                data: d.data.map(m=>{
                    m["ulbName"] = 'C';
                    return m;
                })
            }
        })
    })
}