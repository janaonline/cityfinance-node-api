const ObjectId = require("mongoose").Types.ObjectId;
const moongose = require("mongoose");
const Response = require("../../service").response;
const FiscalRanking = require("../../models/FiscalRanking");
var getheadObject = require("../../service/s3-services").getheadObject;
const url = require('url');

module.exports.updateSubmittedDate = async(req,res)=>{
  let response = {
    success: false,
    message: "Some server error occured",
  };

  let condition = { $and:[{ $or: [{ submittedDate: { $exists: false } },{ submittedDate: { $eq: "" } },{ submittedDate: null }],},{$or: [{ currentFormStatus: 8 },{ currentFormStatus: 9 }]}] };
  let projection = {signedCopyOfFile: 1};
  let fsData = await FiscalRanking.find(condition,projection).lean();
  const frIds = [];
  const promises = fsData.map(async element => {
  try {
      const fileurl = element.signedCopyOfFile.url;
      const fr_id = element._id;
      const parsedUrl = new URL(fileurl);
      const bucketName = parsedUrl.hostname.split('.')[0];
      const objectKey = decodeURIComponent(parsedUrl.pathname.slice(1));
      const params = {
        Bucket: bucketName,
        Key: objectKey
      };
      
      const creationDate = await getheadObject(params);
      await FiscalRanking.updateOne({ _id: fr_id }, { $set: { submittedDate : creationDate } });
      frIds.push(fr_id);
      // console.log("process-", fileurl + " Date-" + creationDate);
      // console.log(fr_id);
    } catch (error) {
      console.error('Error:', error);
    }
  });

  Promise.all(promises)
    .then(() => {
      const response = {
        data: frIds,
        success: true,
        message: "Operation Completed successfully"
      };
      return res.status(200).json(response);
    })
    .catch(error => {
      console.error('Error:', error);
      const response = {
        data: [],
        success: false,
        message: "Error occurred during processing"
      };
      return res.status(500).json(response);
    });

}
