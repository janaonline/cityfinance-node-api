const Rating = require('../../models/Rating');
const catchAsync = require('../../util/catchAsync');

function setValueGfc(name){
    let value = 0;
    switch(name){
        case 'No Star':
            value = 0;
            break;
        case '1 Star':
            value = 1;
            break;
        case '3 Star':
            value = 3;
            break;
        case '5 Star':
            value = 5;
            break;
        case '7 Star':
            value = 7;
            break;
        case 'No Rating':
            value = -1;
            break;
        default:
            value = -1;
    }
    return value;
}

function setValueOdf(name){
    let value = 0;
    switch(name){
        case 'ODF':
            value = 1;
            break;
        case 'ODF+':
            value = 2;
            break;
        case 'ODF++':
            value = 3;
            break;
        case 'Non ODF':
            value = 0;
            break;
        case 'No Rating':
            value = -1;
            break;
        default:
            value = -1;
    }
    return value;
}

module.exports.createFormRating = async (req, res)=>{
    try {
        const {name, formName} = req.body;
        if(name && formName === 'gfc'){
            let value = setValueGfc(name);
            const form = await Rating.create({name,value,formName})
            if(form){
                res.status(201).json({
                    success: true,
                    message: "success",
                    data: form
                })
            }
        } else if (name && formName === 'odf'){
            let value = setValueOdf(name);
            const form = await Rating.create({name,value,formName})
            if(form){
                res.status(201).json({
                    success: true,
                    message: "success",
                    data: form
                })
            }
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "failed",
        })
    }
}
module.exports.getFormRatings = async (req, res)=>{
    try {
        let { formName,financialYear} = req.query;
        financialYear = financialYear ? financialYear :null
        let condition ={ "financialYear":financialYear};
        condition.formName = (formName === 'gfc') ? 'gfc' : 'odf';
        const ratings = await Rating.find(condition);
        //forms received
        if (ratings){
            return res.status(200).json({
                success: true,
                msg: 'success',
                data: ratings,
            })
        }
        //no response found
        return res.status(200).json({
            success: true,
            msg: "success",
            data: "No forms found."
        })

    } catch (error) {
        console.log(error.message)
        res.status(400)
            .json({
                success: false,
                msg: "failed",
            })
    }
}

module.exports.updateFormRating = async (req, res)=>{
    try {
        const {formId} = req.params;
        const {name, formName, marks} = req.body;
        //if formId not given
        if(!formId){
            return res.status(400)
                .json({
                    success: false,
                    message: "formId not given."
                })
        }
        if(name && formName){
            // let value = setValue(name);
            let rating = 0 ;
            if (formName === 'gfc') {
                rating = setValueGfc(name);
            } else {
                rating = setValueOdf(name);
            }
            const newRating = await Rating.findOneAndUpdate(
                {_id:formId},
                {name, rating, formName, marks},
                {
                returnDocument: "after",
            });
            return res.status(200).json({
                success: true,
                message: "success",
                data: newRating
            });
        }
        //incorrect form data
        return res.status(400).json({
            success: false,
            message: "Please give correct info."
        });
    } catch (error) {
        console.log(error)
        return res.status(400)
        .json({
            success: false,
            msg: "failed",
        });
    }
}

module.exports.deleteFormRating = async (req, res)=>{
    try {
        const {formId} = req.params;
        if(!formId){
            res.status(400).json({
                success: false,
                message: 'Provide formId'
            })
        };

        const newRating = await Rating.findOneAndUpdate(
            { _id: formId },
            { isActive: false },
            { returnDocument: "after" }
        );
        if(!newRating){
            return res.status(400).json({
                success: false,
                message: 'Form not found.'
            });
        }
        return res.status(200).json({
            success: true,
            message: "success",
            data: newRating
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "failed",
        });
    }
}