const PropertyTaxOpDropDown = require('../../models/PropertyTaxOpDropDown');

module.exports.createValue = async(req,res)=>{
    try {
        const output = await PropertyTaxOpDropDown.create(req.body);
        if(!output){
            return res.status(400).json({
                status: false,
                message: "Value not created"
            })
        }
        return res.status(200).json({
            status: true,
            data: output
        })
        
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.getValues = async (req, res) =>{
    try {
        let output = await PropertyTaxOpDropDown.find();
        output.sort((a,b)=> a.sequence-b.sequence)
        if(!output || output.length === 0){
            return res.status(200).json({
                status: true,
                message: "No values found in db"
            })
        }
        return res.status(200).json({
            status: true,
            data: output
        })
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}