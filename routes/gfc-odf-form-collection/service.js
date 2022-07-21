const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");

function dateFormatter(input){
    console.log(input)
    const t = new Date(input);
    const date = ('0' + t.getDate()).slice(-2);
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    return `${year}-${month}-${date}`;
}

// const dateFormatter = require('../../util/dateformatter')
module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        let user = req.decoded;
        const isGfc = data.isGfc;  // flag to check which collection to use 
        let collection = isGfc ? GfcFormCollection : OdfFormCollection;
        const { role: actionTakenByRole, _id: actionTakenBy, } = user;
        let formData = {}; //Object to store form data
        formData = {...data}
        
        if(formData.rating === "") {
            formData.rating = null;
        }
        if(formData.rating){
            formData.rating = ObjectId(formData.rating);
        }
        if(formData.certDate){
            formData.certDate = new Date(formData.certDate);
            formData.certDate.toISOString();
        }
        if(formData.ulb){
            formData.ulb = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData.design_year = ObjectId(formData.design_year);
        }
        
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        
        let condition = {}; // condition to find a document using ulb and design_year
        condition['ulb'] = ObjectId(data.ulb);
        condition['design_year'] = ObjectId(data.design_year);
        let savedBody = new collection(formData);
        if (data.ulb && data.design_year) {
            const form = await collection.findOne(condition);
            if (form && (form.isDraft === false)) {//check if already exist and submitted
                return res.status(200).json({
                    success: false,
                    message: "Form already submitted."
                });
            }else if ((form === null) && (formData.isDraft === false)){//final submit in 1st attempt
                const formSubmit = await collection.create(savedBody);
                formData['createdAt'] = formSubmit.createdAt;
                formData['modifiedAt'] = formSubmit.modifiedAt;
                    if (formSubmit) {//add history
                        let updateData = await collection.findOneAndUpdate(condition, 
                            {
                                $push: { history: formData},
                                $set: formData,  
                            },
                            { new: true } );
                        return res.status(200).json({
                            success: true,
                            message: "Data saved.",
                            data: updateData
                        });
                    } else {
                            return res.status(400).send({
                            success: false,
                            message: "Data not saved.",
                        });
                    }
            }
        }
        if (data.isDraft){//update fields when isDraft===true and form already created

            const updateForm = await collection.findOneAndUpdate(condition,
                formData,
                { new: true });
            if(updateForm){
                return res.status(201).json({
                    success: true,
                    message: "Form updated",
                    data: updateForm
                })
            }
        }
        if (data.isDraft){ // save as draft when form is not created yet
            const savedForm = await collection.create(savedBody);
                if (!savedForm) {
                    return res.status(400).send({
                        success: false,
                        message: "Data not saved.",
                    });
                } else {
                    return res.status(200).json({
                        success: true,
                        message: "Data saved.",
                        data: savedForm,
                    });
                }
            }
        delete formData["history"]
        if (!data.isDraft){ //when form is submitted, save history
            const formSubmit = await collection.findOne(condition);
            formData['createdAt'] = formSubmit.createdAt;
                formData['modifiedAt'] = new Date();
            let updateData = await collection.findOneAndUpdate(condition, 
                { $push: { history: formData}, $set: formData },//todo
                { returnDocument: "after" });
            
            return res.status(201).json({
                success: true,
                message: "Form saved",
                data: updateData
            });
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

module.exports.getForm = async (req, res) => {
    try {
        const { isGfc } = req.query;
        const ulb = ObjectId(req.query.ulb);
        const design_year = ObjectId(req.query.design_year);
        let collection = (isGfc=== 'true') ? GfcFormCollection : OdfFormCollection;
        if (ulb && design_year) {
            let form = await collection.findOne({ulb, design_year}).lean();
            if(!form){
                return res.status(400).json({
                    status: false,
                    message: "Form not found!"
                })
            }
            form.certDate = dateFormatter(form?.certDate);
            return res.status(200).json({
                success: true,
                data: form
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

module.exports.getCSV = async (req, res)=>{
    const { isGfc } = req.query;
    let collection = (isGfc=== 'true') ? GfcFormCollection : OdfFormCollection;
    let filename = "All Ulbs " + moment().format("DD-MMM-YY HH:MM:SS") + ".csv";
    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });

    res.write(
    `ULB Name,Census Code, Action Taken By Role,Rating,Cert URL,Cert Name,
    Cert Date, Design year, Status, Draft, Reject Reason, Response File Name,
    Response File URL, Created On, Modified On \r\n`
    );
    // Flush the headers before we start pushing the CSV content
    res.flushHeaders();

    let pipeline = [
        {
            $lookup:{
                from:"ulbs",
                localField: "ulb",
                foreignField: "_id",
                as:"ulbData"
                }
        },
        {$unwind:"$ulbData"
        }
    ];

    collection.aggregate(pipeline).exec((err, data) => {
        if (err) {
          res.json({
            success: false,
            msg: "Invalid Payload",
            data: err.message,
          });
        } else {
          for (let el of data) {
            // el.natureOfUlb = el.natureOfUlb ? el.natureOfUlb : "";
            // el.name = el.name ? el.name.toString().replace(/[,]/g, " | ") : "";
            // el.location = el.location ? el.location : { lat: "NA", lng: "NA" };
            
            res.write(
                el.ulbData.name +
                "," +
                el.ulbData.censusCode +
                "," +
                el.actionTakenByRole +
                "," +
                el.rating +
                "," +
                el.cert.url +
                "," +
                el.cert.name +
                "," +
                el.certDate +
                "," +
                el.design_year +
                "," +
                el.status +
                "," +
                el.isDraft +
                "," +
                el.rejectReason +
                "," +
                el.responseFile.name +
                "," +
                el.responseFile.url +
                "," +
                el.createdAt +
                "," +
                el.modifiedAt +
                "\r\n"
           );
          }
          res.end();
        }
      });

}