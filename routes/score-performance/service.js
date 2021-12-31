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

    const ulb = req.body.ulb;
    const data = req.body.scorePerformance;
    let totalCount = 0;
    let totalval = 0;
    let particularQuestions = 0;
    let partcularAnswerValues = [];

    for ( const key in data ) {
        const element = data[ key ];
        particularQuestions = element.length;
        totalCount += element.length;
        element.map( value => {
            if ( value.answer ) {
                totalval++;
            }
           
        } );

        let filterValue = element.filter( value => value.answer == true );

        let answerValuesPercentage = ( filterValue.length / particularQuestions ) * 100;
        partcularAnswerValues.push( { value: answerValuesPercentage.toFixed( 1 ) });

    }

    const keys = Object.keys( data )
    keys.forEach( ( k, index ) => {
        partcularAnswerValues[ index ].name = k;
    })

    let total = ( totalval / totalCount * 10 ).toFixed( 1 );

    let finalAnswers = Object.assign( {scorePerformance : data}, {ulb}, { total }, {partcularAnswerValues} )

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
    // try {
    //     let getQuestionAnswer = await scorePerformance.find( {} ).lean()

    //     res.status( 201 ).json( getQuestionAnswer );
    // } catch (err) {
    //     res.status( 400 ).json(err)
    // }
}

async function getAnswerByUlb( req, res ) {
    let {ulbId} = req.params;
    
    if ( ulbId ) {
        let prescription = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est."
        let findAnswerByUlb = await scorePerformance.findOne( { ulb: ObjectId( ulbId ) } );
        let topThreeData = await scorePerformance.find(  ).sort({total: -1}).limit(3);
        res.status( 201 ).json( {
            currentUlb: findAnswerByUlb,
            prescription: prescription,
            top3: topThreeData } );
        } else {
        res.status( 400 ).json({
            success: false,
        });
    }
}


module.exports = {addScoreQuestion, getAddScoreQuestion, postQuestionAnswer, getPostedAnswer, getAnswerByUlb }