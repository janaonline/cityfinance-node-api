const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

exports.nationalDashRevenuePipeline = (
  financialYear,
  stateId,
  ulbs,
  type,
  formType
) => {
  const pipeline = [{ $match: { financialYear } }];
  if (stateId)
    pipeline.push(
      {
        $match: {
          ulb: { $in: ulbs },
        },
      }
      //   {
      //     $project: {
      //       "ulb.state": 1,
      //     },
      //   }
    );
  if (type == "totalRevenue") {
    if (formType == "populationCategory") {
      pipeline.push();
    }
  }
  pipeline.push({ $limit: 100 }); //temporary
  console.log(pipeline);
  return pipeline;
};
