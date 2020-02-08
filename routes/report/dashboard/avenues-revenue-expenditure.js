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
                        establishmentExpense:20,
                        administrativeExpense: 11,
                        operationalAndMaintananceExpense:10,
                        interestAndFinanceExpense:8,
                        other:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        establishmentExpense:30,
                        administrativeExpense: 30,
                        operationalAndMaintananceExpense:10,
                        interestAndFinanceExpense:8,
                        other:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        establishmentExpense:20,
                        administrativeExpense: 40,
                        operationalAndMaintananceExpense:10,
                        interestAndFinanceExpense:8,
                        other:20
                    }
                ]
            },
            {
                year:"2017-18",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        establishmentExpense:10,
                        administrativeExpense: 10,
                        operationalAndMaintananceExpense:10,
                        interestAndFinanceExpense:8,
                        other:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        establishmentExpense:10,
                        administrativeExpense: 10,
                        operationalAndMaintananceExpense:10,
                        interestAndFinanceExpense:8,
                        other:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        establishmentExpense:10,
                        administrativeExpense: 10,
                        operationalAndMaintananceExpense:10,
                        interestAndFinanceExpense:8,
                        other:20
                    }
                ]
            }
        ]
    })
}