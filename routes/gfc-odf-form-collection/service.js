const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");
const {response} = require('../../util/response');
const {canTakenAction} = require('../CommonActionAPI/service');
const Service = require('../../service');
const {FormNames} = require('../../util/FormNames');
const User = require('../../models/User');

function dateFormatter(input){
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
        const user = req.decoded;
        let formData = {};
        formData = {...data};
	    const isGfc = data.isGfc;  // flag to check which collection to use 
        let collection = isGfc ? GfcFormCollection : OdfFormCollection;
        const formName =  isGfc ? FormNames["gfc"]: FormNames["odf"];
       
        const {_id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
    
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
        formData['ulbSubmit'] = "";
        
        let condition = {}; // condition to find a document using ulb and design_year
        condition['ulb'] = ObjectId(data.ulb);
        condition['design_year'] = ObjectId(data.design_year);

        let userData =  await User.find({
            $or:[
            { isDeleted: false, ulb: ObjectId(data.ulb), role: 'ULB' },
            {isDeleted: false, state: ObjectId(user.state), role: 'STATE', isNodalOfficer: true },
            ]
        }
        ).lean();

        let emailAddress = [];
        let ulbUserData = {},
          stateUserData = {};
        for(let i =0 ; i< userData.length; i++){//getting email address from the data
            if(userData[i]){
                if(userData[i].role === "ULB"){
                    ulbUserData = userData[i];
                }else if(userData[i].role === "STATE"){
                    stateUserData = userData[i];
                }
            }
            if(ulbUserData && ulbUserData.commissionerEmail){
                emailAddress.push(ulbUserData.commissionerEmail);
            }
            if(stateUserData && stateUserData.email ){
                emailAddress.push(stateUserData.email);
            }   
        }
        //unique email address
        emailAddress =  Array.from(new Set(emailAddress))
       //importing email template
        let ulbTemplate = Service.emailTemplate.ulbFormSubmitted(
          ulbName,
          formName
        );
        let mailOptions = {
          Destination: {
            /* required */
            ToAddresses: ["dalbeer.kaur@dhwaniris.com", "aditya.yadav@dhwaniris.com"],
          },
          Message: {
            /* required */
            Body: {
              /* required */
              Html: {
                Charset: "UTF-8",
                Data: ulbTemplate.body,
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: ulbTemplate.subject,
            },
          },
          Source: process.env.EMAIL,
          /* required */
          ReplyToAddresses: [process.env.EMAIL],
        };
        
        let savedBody = new collection(formData);
        if(data.ulb && data.design_year){
            const submittedForm = await collection.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "ULB" ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                }) 
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    savedBody["ulbSubmit"] = new Date();
                    const formSubmit = await collection.create(savedBody);
                    formData['createdAt'] = formSubmit.createdAt;
                    formData['modifiedAt'] = formSubmit.modifiedAt;
                    formData['certDate'] = formSubmit.certDate;
                    formData['ulbSubmit'] = savedBody['ulbSubmit'];
                    if (formSubmit) {//add history
                        let updateData = await collection.findOneAndUpdate(condition, 
                            {
                                $push: { history: formData},
                                $set: formData,  
                            },
                            { new: true } );
                        //email trigger after form submission
                        Service.sendEmail(mailOptions);

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
                } else {
                    if( (!submittedForm) && formData.isDraft === true){ // create as draft
 			            const form = await collection.create(savedBody);
                        return response(form, res,"Form created", "Form not created");
                    }
                }           
            }
            if ( submittedForm && submittedForm.status !== "APPROVED") {
                if(formData.isDraft === true){
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
                } else {
                    const formSubmit = await collection.findOne(condition);
                    formData['createdAt'] = formSubmit.createdAt;
                    formData['modifiedAt'] = new Date();
                    formData['ulbSubmit'] =  new Date();
                    if(formData['certDate'] === ""){
                        formData['certDate'] = null;
                    }
                    let updateData = await collection.findOneAndUpdate(condition, 
                        { $push: { history: formData}, $set: formData },//todo
                        { returnDocument: "after" });
                    
                    //email trigger after form submission
                    Service.sendEmail(mailOptions);

                    return res.status(201).json({
                        success: true,
                        message: "Form saved",
                        data: updateData
                    });
                }
        }
        if(submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB" 
                && submittedForm.isDraft === false){
                    return res.status(200).json({
                        status: true,
                        message: "Form already submitted"
                    })
            }
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
        let role = req.decoded.role;
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
            Object.assign(form, {canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "ULB",role ) })
            if(form.certDate !== null && form.certDate !== ""){
                form.certDate = dateFormatter(form?.certDate);
            }
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