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
                        ownRevenue:1000,
                        revenueExpenditure: 10000,
                        ownRevenuePercentage:10,
                        minOwnRevenuePercentage:8,
                        maxOwnRevenuePercentage:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        revenueExpenditure: 10000,
                        ownRevenuePercentage:10,
                        minOwnRevenuePercentage:8,
                        maxOwnRevenuePercentage:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        ownRevenue:1000,
                        revenueExpenditure: 10000,
                        ownRevenuePercentage:10,
                        minOwnRevenuePercentage:8,
                        maxOwnRevenuePercentage:20
                    }
                ]
            },
            {
                year:"2017-18",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        revenueExpenditure: 10000,
                        ownRevenuePercentage:10,
                        minOwnRevenuePercentage:8,
                        maxOwnRevenuePercentage:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        revenueExpenditure: 10000,
                        ownRevenuePercentage:10,
                        minOwnRevenuePercentage:8,
                        maxOwnRevenuePercentage:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        ownRevenue:1000,
                        revenueExpenditure: 10000,
                        ownRevenuePercentage:10,
                        minOwnRevenuePercentage:8,
                        maxOwnRevenuePercentage:20
                    }
                ]
            }
        ]
    })
}