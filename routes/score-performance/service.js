const scorePerformanceQuestions = require( "../../models/scorePerformanceQuestions" );
const scorePerformance = require( "../../models/scorePerformance" );
const ObjectId = require('mongoose').Types.ObjectId;

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

async function postQuestionAnswer( req, res ) {
try{
  const ulb = req.body.ulb;
  const data = req.body.scorePerformance;
  let totalCount = 0;
  let totalval = 0;
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
        totalval++;
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

  let total = ((totalval / totalCount) * 10).toFixed(1);

  let finalAnswers = Object.assign(
    { scorePerformance: data },
    { ulb },
    { total },
    { partcularAnswerValues }
  );

  const answers = new scorePerformance(finalAnswers);

  try {
    await answers.save();
    return res.status(201).json(answers);
  } catch (err) {
    return res.status(400).json(err);
  }
}catch(e){
    return res.json({
        success: false,
        message:e.message
    })
}
  
}

async function getPostedAnswer(req, res) {
    try {
        let getQuestionAnswer = await scorePerformance.find( {} ).lean()

      return  res.status( 201 ).json( getQuestionAnswer );
    } catch (err) {
      return  res.status( 400 ).json(err)
    }
}

async function getAnswerByUlb( req, res ) {
    try{
        let {ulbId} = req.params;
   
    if ( ulbId ) {
        let prescription = [
            {
                name: "enumeration",
                value: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est."
            },
            {
                name: "valuation",
                value: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est."
            },
            {
                name: "assessment",
                value: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est."  
            },
            {
                name: "billing_collection",
                value: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est."
            },
            {
                name: "reporting",
                value: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est."
            }
        ]
        let findAnswerByUlb = await scorePerformance.findOne( { ulb: ObjectId( ulbId ) } ).lean();
        if(!findAnswerByUlb){
            return res.status(200).json({
                success: false,
                data: null
            })
        }
        findAnswerByUlb.partcularAnswerValues.forEach( elem => {
            prescription.forEach( elem2 => {
                if ( elem.name == elem2.name ) {
                    Object.assign(elem,{prescription: elem2.value })
                   
                }
            })
        })
        let topThreeData = await scorePerformance.find(  ).sort({total: -1}).limit(3);
        return res.status( 201 ).json( {
            data:{
                currentUlb: findAnswerByUlb,
                top3: topThreeData
            }
             } );
        } else {
       return res.status( 400 ).json({
            success: false,
            message:"ULB ID MIssing"
        });
    }

    } catch(e){
        return res.json({
            success: false,
            message:e.message
        })
    }
    
}


module.exports = {addScoreQuestion, getAddScoreQuestion, postQuestionAnswer, getPostedAnswer, getAnswerByUlb }