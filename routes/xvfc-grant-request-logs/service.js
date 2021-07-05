const requestLogs = require("../../models/XVFcGrantRequestLogs");
const ObjectId = require("mongoose").Types.ObjectId;

exports.saveLogs = async (req, res) => {
  const { ulb } = req?.decoded?._id;
  try {
    await requestLogs.findOneAndUpdate(
      { ulb: ObjectId(ulb), financialYear: req.body?.financialYear },
      {
        ulb,
        financialYear: req.body?.financialYear,
        $push: { logs: req.body },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    return res.status(200).json({ msg: "requestLogs Submitted!" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.getLogs = async (req, res) => {
  const { financialYear } = req.body;
  const ulb = req?.decoded?._id;
  try {
    const logs = await requestLogs.find({ ulb: ObjectId(ulb), financialYear });
    return res.status(200).json({ msg: "Success", logs });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};
