const MasterForm = require("../models/MasterForm");
const ObjectId = require("mongoose").Types.ObjectId;

exports.UpdateMasterSubmitForm = async (req, formName) => {
  let data = {
    body: req?.body,
    user: req?.decoded,
  };


  if (!data.body?.status) data.body.status = "PENDING";

  try {
    const oldForm = await MasterForm.findOne({
      ulb: ObjectId(data.user?.ulb ? data?.user?.ulb : data.body?.ulb),
      design_year: data.body?.designYear
        ? ObjectId(data.body?.designYear)
        : ObjectId(data.body?.design_year),
    }).select({
      history: 0,
    });
    if (oldForm) {
      temp = oldForm;
      let newForm = new MasterForm(oldForm);
      newForm.steps[formName].status = data.body?.status
        ? data.body?.status
        : "PENDING";
      newForm['modifiedAt'] = new Date();
      newForm.steps[formName].isSubmit = data.body.hasOwnProperty("isDraft")
        ? !data.body.isDraft
        : data.body?.isCompleted;
      if (data.body?.rejectReason) {
        newForm.steps[formName].rejectReason = data.body?.rejectReason;
        newForm.steps[formName].isSubmit = false;
      }
      await MasterForm.findOneAndUpdate(
        {
          ulb: ObjectId(data.user?.ulb ? data?.user?.ulb : data.body?.ulb),
          isActive: true,
          design_year: data.body?.designYear
            ? ObjectId(data.body?.designYear)
            : ObjectId(data.body?.design_year),
        },
        {
          $set: {
            steps: newForm.steps,
            actionTakenBy: data.user._id,
            actionTakenByRole: data.user.role,
            isSubmit: false,
            status: "PENDING",
            modifiedAt: data?.body?.modifiedAt
          },
        }
      );
    } else {
      let form = new MasterForm({
        ulb: data.user?.ulb ? data?.user?.ulb : data.body?.ulb,
        steps: {
          [formName]: {
            rejectReason: data.body?.rejectReason,
            status: data.body?.status,
            isSubmit: data.body.hasOwnProperty("isDraft")
              ? !data.body.isDraft
              : data.body?.isCompleted,
          },
        },
        actionTakenBy: data?.user?._id,
        actionTakenByRole: data?.user?.role,
        state: ObjectId(data?.user?.state),
        design_year: data.body?.designYear
          ? ObjectId(data.body?.designYear)
          : ObjectId(data.body?.design_year),
      });
      await form.save();
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
