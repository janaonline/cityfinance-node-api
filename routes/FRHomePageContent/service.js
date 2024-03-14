const FRHomePageContent = require('../../models/FRHomePageContent');
const catchAsync = require('../../util/catchAsync');

module.exports.createHomePageContent = async (req, res)=>{
    try {
        const data = req.body;
            const form = await FRHomePageContent.create(data)
            if(form){
                res.status(201).json({
                    success: true,
                    message: "success",
                    data: form
                })
            }
       
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "failed",
        })
    }
}
module.exports.getHomePageContent = async (req, res)=>{
    try {
        const getFromData = await FRHomePageContent.find();
        //forms received
        //console.log("1")
        if (getFromData){
            return res.status(200).json({
                success: true,
                msg: 'success',
                data: getFromData,
            })
        }
        //no response found
        return res.status(200).json({
            success: true,
            msg: "success",
            data: "No forms found."
        })

    } catch (error) {
        res.status(400)
            .json({
                success: false,
                msg: "failed",
            })
    }
}

