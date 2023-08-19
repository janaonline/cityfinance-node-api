const removableKeys = ['answer', 'isSelectValue', 'selectedAnswerOption', 'modelFilter', 'modelName', 'previousValue'];


const minifyMFormResponse = data => {
    return data;
    
    data?.forEach(dataItem => {
        dataItem?.language?.forEach(language => {
            language?.question?.forEach(questionObject => {
                questionObject?.childQuestionData?.forEach(row => {
                    row?.forEach(question => {
                        Object.keys(question).forEach(key => {
                            if(removableKeys.includes(key)) {
                                delete question[key];
                            }
                        })
                    })
                })
            })
        })
    })
    return data;
}

module.exports = {
    minifyMFormResponse
};