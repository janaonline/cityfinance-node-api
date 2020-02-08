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
                        taxRevenue:1000,
                        rentalIncome: 10000,
                        feesAndUserCharges:10,
                        ownRevenues:8,
                        saleAndHireCharges:20,
                        assignedRevenue:20,
                        grants:20,
                        interestIncome:20,
                        otherIncome:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        taxRevenue:1000,
                        rentalIncome: 10000,
                        feesAndUserCharges:10,
                        ownRevenues:8,
                        saleAndHireCharges:20,
                        assignedRevenue:20,
                        grants:20,
                        interestIncome:20,
                        otherIncome:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        taxRevenue:1000,
                        rentalIncome: 10000,
                        feesAndUserCharges:10,
                        ownRevenues:8,
                        saleAndHireCharges:20,
                        assignedRevenue:20,
                        grants:20,
                        interestIncome:20,
                        otherIncome:20
                    }
                ]
            },
            {
                year:"2017-18",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        taxRevenue:1000,
                        rentalIncome: 10000,
                        feesAndUserCharges:10,
                        ownRevenues:8,
                        saleAndHireCharges:20,
                        assignedRevenue:20,
                        grants:20,
                        interestIncome:20,
                        otherIncome:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        taxRevenue:1000,
                        rentalIncome: 10000,
                        feesAndUserCharges:10,
                        ownRevenues:8,
                        saleAndHireCharges:20,
                        assignedRevenue:20,
                        grants:20,
                        interestIncome:20,
                        otherIncome:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        taxRevenue:1000,
                        rentalIncome: 10000,
                        feesAndUserCharges:10,
                        ownRevenues:8,
                        saleAndHireCharges:20,
                        assignedRevenue:20,
                        grants:20,
                        interestIncome:20,
                        otherIncome:20
                    }
                ]
            }
        ]
    })
}