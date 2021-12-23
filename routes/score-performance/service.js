const scorePerformanceQuestions = require( "../../models/scorePerformanceQuestions" );
// const scorePerformance = require( "../../models/scorePerformance" );

async function addScoreQuestion( req, res ) {

    const questionsText = new scorePerformanceQuestions( {
        enumeration: req.body.enumeration.map( ( question ) => {
            return {
                question: {
                    text: question.question,
                    number: question.number
                }
            }
        } ),
        valuation: req.body.valuation.map(( question ) => {
            return {
                question: {
                    text: question.question,
                    number: question.number
                }
            }
        } ),
        assesment: req.body.assesment.map(( question ) => {
            return {
                question: {
                    text: question.question,
                    number: question.number
                }
            }
        } ),
        billing_collection: req.body.billing_collection.map(( question ) => {
            return {
                question: {
                    text: question.question,
                    number: question.number
                }
            }
        } ),
        reporting: req.body.reporting.map(( question ) => {
            return {
                question: {
                    text: question.question,
                    number: question.number
                }
            }
        } )
        
    } )

    // const questionsList = new scorePerformanceQuestions( {
    //     enumeration: [ {
    //         question: {
    //             text: req.body.enumeration[0].question
    //         }
    //     }],
    //     valuation: [ {
    //         question: req.body.valuation.question
    //     }],
    //     assesment: [ {
    //         question: req.body.assesment.question
    //     }],
    //     billing_collection: [ {
    //         question: req.body.billing_collection.question
    //     }],
    //     reporting: [ {
    //         question: req.body.reporting.question
            
    //     }]
    // })
    // console.log("questionsText",questionsList)
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
        console.log(getQuestion)
        res.status( 201 ).json( getQuestion );
    } catch (err) {
        res.status( 400 ).json(err)
    }
} 



module.exports = {addScoreQuestion, getAddScoreQuestion}