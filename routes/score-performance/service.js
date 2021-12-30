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
        res.status( 201 ).json( questionsText );
    } catch (err) {
        res.status( 400 ).json(err)
    }
}

async function getAddScoreQuestion(req, res) {
    try {
        let getQuestion = await scorePerformanceQuestions.find( {} ).lean()
        res.status( 201 ).json( getQuestion );
    } catch (err) {
        res.status( 400 ).json(err)
    }
} 

async function postQuestionAnswer( req, res ) {

    const data = req.body;
    let totalCount = 0;
    let totalval = 0

    for ( const key in data ) {
        const element = data[ key ];
        totalCount += element.length;
        element.map( value => {
            if ( value.answer )
                totalval++;
        } );
    }

    let total =   (totalval / totalCount * 10).toFixed(1) ;

    let finalAnswers = Object.assign( data, { total } )

    const answers = new scorePerformance(finalAnswers)

    try {
      await answers.save()
        res.status( 201 ).json(answers );
    } catch (err) {
        res.status( 400 ).json(err)
    }
}

async function getPostedAnswer(req, res) {
    try {
        let getQuestionAnswer = await scorePerformance.find( {} ).lean()

        res.status( 201 ).json( getQuestionAnswer );
    } catch (err) {
        res.status( 400 ).json(err)
    }
}

async function getAnswerByUlb( req, res ) {
    let {ulbId} = req.params;
    
    if ( ulbId ) {
        let findAnswerByUlb = await scorePerformance.findOne( { ulb: ObjectId(ulbId) } );
        res.status( 201 ).json( findAnswerByUlb );
        } else {
        res.status( 400 ).json({
            success: false,
        });
    }
}


module.exports = {addScoreQuestion, getAddScoreQuestion, postQuestionAnswer, getPostedAnswer, getAnswerByUlb }