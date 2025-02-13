const scorePerformanceQuestions = require( "../../models/scorePerformanceQuestions" );
const scorePerformance = require( "../../models/scorePerformance" );
const ObjectId = require('mongoose').Types.ObjectId;
const Prescriptions = require('../../util/prescription')
async function addScoreQuestion( req, res ) {

    const returnQuestion = (question) => {
        return {
            question: {
                text: question.question,
                number: question.number
            }
        }   
    }

    let newData={};
    for (const key in req.body) {
        const element = req.body[ key ];
        Object.assign(newData,{[key]: element.map(returnQuestion)})
    }

    const questionsText = new scorePerformanceQuestions(newData)

    try {
        await questionsText.save()
       return res.status( 201 ).json( questionsText );
    } catch (err) {
       return res.status( 400 ).json(err)
    }
}

async function getAddScoreQuestion(req, res) {
    try {
        let getQuestion = await scorePerformanceQuestions.find( {} ).lean()
     return   res.status( 201 ).json( getQuestion );
    } catch (err) {
        return res.status( 400 ).json(err)
    }
} 

async function postQuestionAnswer(req, res) {
  try {
    const ulb = req.body.ulb;
    const data = req.body.scorePerformance;
    let totalCount = 0;
    let totalVal = 0;
    let particularQuestions = 0;
    let partcularAnswerValues = [];
    if (!ulb) {
      return res.status(404).json({
        success: false,
        message: "ULB Missing",
      });
    }
    for (const key in data) {
      const element = data[key];

      particularQuestions = element.length;
      totalCount += element.length;
      element.map((value) => {
        if (value.answer) {
          totalVal++;
        }
      });

      let filterValue = element.filter((value) => value.answer == true);

      let answerValuesPercentage =
        (filterValue.length / particularQuestions) * 100;
      partcularAnswerValues.push({ value: answerValuesPercentage.toFixed(1) });
    }

    const keys = [
      "Enumeration",
      "Valuation",
      "Assesment",
      "Billing & Collection",
      "Reporting",
    ];
    keys.forEach((k, index) => {
      partcularAnswerValues[index].name = k;
    });

    let total = ((totalVal / totalCount) * 10).toFixed(1);

    let finalAnswers = Object.assign(
      { scorePerformance: data },
      { ulb },
      { total },
      { partcularAnswerValues }
    );

    const answers = new scorePerformance(finalAnswers);
    await answers.save();
    return res.status(200).json(answers);
  } catch (e) {
    return res.json({
      success: false,
      message: e.message,
    });
  }
}

async function getPostedAnswer(req, res) {
  try {
    let getQuestionAnswer = await scorePerformance.find({}).lean();

    return res.status(201).json(getQuestionAnswer);
  } catch (err) {
    return res.status(400).json(err);
  }
}

const fetchPrescription = (category,question,answer  ) => {
switch (true) {
  case answer :
    return Prescriptions.YES; 
  case category == 'enumeration' && question == '1' : 
  return Prescriptions.ENUM_1;
  case category == 'enumeration' && question == '2' : 
  return Prescriptions.ENUM_2;
  case category == 'enumeration' && question == '3' : 
  return Prescriptions.ENUM_3;

  case category == 'valuation' && question == '1' : 
  return Prescriptions.VAL_1;
  case category == 'valuation' && question == '2' : 
  return Prescriptions.VAL_2;

  case category == 'assessment' && question == '1' : 
  return Prescriptions.ASSESS_1;
  case category == 'assessment' && question == '2' : 
  return Prescriptions.ASSESS_2;
  case category == 'assessment' && question == '3' : 
  return Prescriptions.ASSESS_3;

  case category == 'billing_collection' && question == '1' : 
  return Prescriptions.BILL_1;
  case category == 'billing_collection' && question == '2' : 
  return Prescriptions.BILL_2;
  case category == 'billing_collection' && question == '3' : 
  return Prescriptions.BILL_3;

  case category == 'reporting' && question == '1' : 
  return Prescriptions.REP_1;
  case category == 'reporting' && question == '2' : 
  return Prescriptions.REP_2;
  
  

  default:
    break;
}
}

const attachPrescription = (data) => {
  let scorePerformance = data.scorePerformance ;
  let category, question, answer, prescription = '';
  for(let el in scorePerformance ){
    let temp = "";
    for(let el2 of scorePerformance[el] ){
      category = el;
      question = el2?.question;
      answer = el2?.answer;
       prescription =  fetchPrescription(category,question,answer);
    
       if(temp != prescription ){
        temp = prescription
        Object.assign(el2, {prescription: temp })
       }
       

       
    }
  
  }
  data.scorePerformance = scorePerformance;
  
  // Find the Combined Prescription for Each Tab
let overallPrescription = ''
  for(let el in scorePerformance ){
    for(let el2 of scorePerformance[el] ){
        overallPrescription = overallPrescription + (el2.hasOwnProperty('prescription') ?  `- ${el2.prescription}<br>` : ``) ;
    }
    
    for(let key of data.partcularAnswerValues){
      if(key.name == 'Enumeration' && el == 'enumeration'){
key['prescription'] = overallPrescription;
      }else if(key.name == 'Valuation' && el == 'valuation'){
        key['prescription'] = overallPrescription;
      }else if(key.name == 'Assesment' && el == 'assessment'){
        key['prescription'] = overallPrescription;
      }else if(key.name == 'Billing & Collection' && el == 'billing_collection'){
        key['prescription'] = overallPrescription;
      }else if(key.name == 'Reporting' && el == 'reporting'){
        key['prescription'] = overallPrescription;
      }
    }
    overallPrescription = ''
  }



return data;
}

async function getAnswerByUlb(req, res) {
  try {
    let { ulbId } = req.params;

    if (!ulbId) {
      return res.status(400).json({
        success: false,
        message: "ULB ID MIssing",
      });
    }
    let prescription = [
      {
        name: "enumeration",
        value:
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.",
      },
      {
        name: "valuation",
        value:
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.",
      },
      {
        name: "assessment",
        value:
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.",
      },
      {
        name: "Billing & Collection",
        value:
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.",
      },
      {
        name: "reporting",
        value:
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.",
      },
    ];
    let findAnswerByUlb = (
      await scorePerformance
        .find({ ulb: ObjectId(ulbId) })
        .sort({ _id: -1 })
        .limit(1)
        .lean()
    )[0];
    if (!findAnswerByUlb) {
      return res.status(200).json({
        success: false,
        data: null,
      });
    }
    console.log(findAnswerByUlb)
    findAnswerByUlb =  attachPrescription(findAnswerByUlb);

    console.log(findAnswerByUlb)
    // findAnswerByUlb.partcularAnswerValues.map((elem) => {
    //   prescription.map((elem2) => {
    //     if (elem.name.toLowerCase() == elem2.name.toLowerCase()) {
    //       Object.assign(elem, { prescription: elem2.value });
    //     }
    //   });
    // });
    let query = [
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $group: {
          _id: "$ulb._id",
          ulb: {
            $first: "$ulb._id",
          },
          ulbName: {
            $first: "$ulb.name",
          },
          scorePerformance: {
            $first: "$scorePerformance",
          },
          total: {
            $first: "$total",
          },
          partcularAnswerValues: {
            $first: "$partcularAnswerValues",
          },
          createdAt: {
            $first: "$createdAt",
          },
        },
      },
      {
        $sort: {
          total: -1,
          createdAt: -1,
        },
      },
      {
        $limit: 3,
      },
    ];
    let topThreeData = await scorePerformance.aggregate(query);

    return res.status(200).json({
      data: {
        currentUlb: findAnswerByUlb,
        top3: topThreeData,
      },
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: e.message,
    });
  }
}


module.exports = {addScoreQuestion, getAddScoreQuestion, postQuestionAnswer, getPostedAnswer, getAnswerByUlb }