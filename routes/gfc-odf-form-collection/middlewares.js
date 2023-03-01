const {years} = require("../../service/years")
const {getFlatObj} = require("../CommonActionAPI/service")
module.exports.changeFormGetStructure = (req,res,next)=>{
    try{
        let obj =[
            {
              "_id": "63fc56abd4434c05939ac5e9",
              "lng": "en",
              "question": [
                {
                  "information": "",
                  "_id": "63fc53dad4434c05939ac50c",
                  "order": "1",
                  "answer_option": [
                    {
                      "name": "ODF",
                      "did": [],
                      "viewSequence": "1",
                      "_id": "1"
                    },
                    {
                      "name": "ODF+",
                      "did": [],
                      "viewSequence": "2",
                      "_id": "2"
                    },
                    {
                      "name": "ODF++",
                      "did": [],
                      "viewSequence": "3",
                      "_id": "3"
                    },
                    {
                      "name": "Non ODF",
                      "did": [],
                      "viewSequence": "4",
                      "_id": "4"
                    },
                    {
                      "name": "No Rating",
                      "did": [],
                      "viewSequence": "5",
                      "_id": "5"
                    }
                  ],
                  "title": "Open Defecation Free (ODF) Rating",
                  "hint": "Single Select",
                  "resource_urls": [],
                  "label": "",
                  "shortKey": "rating",
                  "viewSequence": "1",
                  "child": [
                    {
                      "type": "11",
                      "value": "^([5])$",
                      "order": "2"
                    },
                    {
                      "type": "11",
                      "value": "^([1]|[2]|[3]|[4])$",
                      "order": "3"
                    },
                    {
                      "type": "14",
                      "value": "^([1]|[2]|[3]|[4])$",
                      "order": "4"
                    }
                  ],
                  "parent": [],
                  "validation": [
                    {
                      "_id": "1",
                      "error_msg": ""
                    }
                  ],
                  "restrictions": [],
                  "input_type": "3",
                  "weightage": [],
                  "editable": false
                },
                {
                  "information": "",
                  "_id": "63fc5529d4434c05939ac521",
                  "order": "2",
                  "answer_option": [],
                  "title": "Upload Declaration?",
                  "hint": "Upload PDF",
                  "resource_urls": [],
                  "label": "",
                  "shortKey": "Declaration",
                  "viewSequence": "2",
                  "child": [],
                  "parent": [
                    {
                      "value": "^([5])$",
                      "type": "3",
                      "order": "1"
                    }
                  ],
                  "min": null,
                  "max": null,
                  "minRange": null,
                  "maxRange": null,
                  "pattern": "",
                  "validation": [
                    {
                      "error_msg": "",
                      "_id": "1"
                    },
                    {
                      "error_msg": "",
                      "_id": "81",
                      "value": "20480"
                    },
                    {
                      "error_msg": "",
                      "_id": "82",
                      "value": "1"
                    }
                  ],
                  "restrictions": [],
                  "input_type": "11",
                  "editable": false,
                  "weightage": []
                },
                {
                  "information": "",
                  "_id": "63fc556dd4434c05939ac535",
                  "order": "3",
                  "answer_option": [],
                  "title": "Upload ODF Certificate?",
                  "hint": "Upload PDF",
                  "resource_urls": [],
                  "label": "",
                  "shortKey": "Certificate ",
                  "viewSequence": "3",
                  "child": [],
                  "parent": [
                    {
                      "value": "^([1]|[2]|[3]|[4])$",
                      "type": "3",
                      "order": "1"
                    }
                  ],
                  "min": null,
                  "max": null,
                  "minRange": null,
                  "maxRange": null,
                  "pattern": "",
                  "validation": [
                    {
                      "error_msg": "",
                      "_id": "1"
                    },
                    {
                      "error_msg": "",
                      "_id": "81",
                      "value": "20480"
                    },
                    {
                      "error_msg": "",
                      "_id": "82",
                      "value": "1"
                    }
                  ],
                  "restrictions": [],
                  "input_type": "11",
                  "editable": false,
                  "weightage": []
                },
                {
                  "information": "",
                  "_id": "63fc55a7d4434c05939ac54a",
                  "order": "4",
                  "answer_option": [],
                  "title": "Certificate Issue Date?",
                  "hint": "Date",
                  "resource_urls": [],
                  "label": "",
                  "shortKey": "Issue_Date",
                  "viewSequence": "4",
                  "child": [],
                  "parent": [
                    {
                      "value": "^([1]|[2]|[3]|[4])$",
                      "type": "3",
                      "order": "1"
                    }
                  ],
                  "validation": [
                    {
                      "error_msg": "",
                      "_id": "1"
                    },
                    {
                      "_id": "24",
                      "error_msg": "",
                      "value": ""
                    }
                  ],
                  "restrictions": [],
                  "input_type": "14",
                  "editable": false,
                  "weightage": []
                },
                {
                  "information": "",
                  "_id": "63fc563ad4434c05939ac573",
                  "order": "5",
                  "answer_option": [
                    {
                      "name": "Approved",
                      "did": [],
                      "viewSequence": "1",
                      "_id": "1"
                    },
                    {
                      "name": "Rejected",
                      "did": [],
                      "viewSequence": "2",
                      "_id": "2"
                    }
                  ],
                  "title": "State Review",
                  "hint": "",
                  "resource_urls": [],
                  "label": "",
                  "shortKey": "StateReview",
                  "viewSequence": "5",
                  "child": [],
                  "parent": [],
                  "validation": [
                    {
                      "error_msg": "",
                      "_id": "1"
                    },
                    {
                      "error_msg": "",
                      "_id": "182",
                      "value": "2"
                    }
                  ],
                  "restrictions": [],
                  "input_type": "5",
                  "weightage": [],
                  "editable": false
                }
              ],
              "title": "Open Defecation Free (ODF)",
              "buttons": []
            }
          ]
        let design_year = req.query.design_year
        if(1==1){
            let form = JSON.parse(JSON.stringify(req.form))
        // if(design_year  ==  years['2022-23']){
            let flattedForm = getFlatObj(form)
            console.log("flattedForm :: ",flattedForm)
            for(let keys in obj){
                console.log(">>>>>>>>> obj >>> ",obj[key])
            }
            // console.log("flattedForm :: ",flattedForm)
        }
        // else{
            res.status(200).json({
                success: true,
                data: req.form
            })
        // }
        
    }
    catch(err){
        console.log("error in changeFormGetStructure :::: ",err.message)
        res.status(200).json({
            success: false,
            data: {},
            "message":"some server error occured"
        })
    }
}