const LinkPfmsState = require("../../models/LinkPfmsState");
// const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const User = require('../../models/User')
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");

exports.saveLinkPfmsState = async (req, res) => {
  let { state, _id } = req.decoded;
  let data = req.body;
  data['actionTakenBy'] = req.decoded._id
  try {
    console.log(data);
    await LinkPfmsState.findOneAndUpdate(
      { state: ObjectId(state), design_year: ObjectId(data.design_year) },
      data,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    await UpdateStateMasterForm(req, "linkPFMS");
    return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getLinkPfmsState = async (req, res) => {
  const { design_year, state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  try {
    const newLink = await LinkPfmsState.findOne({
      state: ObjectId(state),
      design_year,
    }).select({ history: 0 }).lean();
    let userData = await User.findOne({ _id: ObjectId(newLink['actionTakenBy']) });
    newLink['actionTakenByRole'] = userData['role'];
    if (!newLink) {
      return Response.BadRequest(res, null, "No LinkPfmsState found");
    }
    return Response.OK(res, newLink, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    let { design_year, state } = req.body;
    let currentLinkPfmsState = await LinkPfmsState.findOne({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });
    req.body['actionTakenBy'] = req.decoded._id
    const newLinkPfmsState = await LinkPfmsState.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
      },
      { $set: req.body, $push: { history: currentLinkPfmsState } }
    );
    await UpdateStateMasterForm(req, "linkPFMS");

    return Response.OK(res, newLinkPfmsState, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
