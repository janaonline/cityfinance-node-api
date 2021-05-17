const MasterForm = require("../models/MasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
exports.UpdateMasterSubmitForm = async (req, formName) => {
  let data = {
    body: req?.body,
    user: req?.decoded,
  };
  console.log(data.body)
  try {
    const oldForm = await MasterForm.findOne({
      ulb: ObjectId(data?.user?.ulb),
      design_year: data.body?.designYear ? ObjectId(data.body?.designYear) : ObjectId(data.body?.design_year)
    }).select({
      history: 0,
    });
    if (oldForm) {
      if (data?.user?._id.toString() != oldForm.actionTakenBy) {
        let newForm = {
          steps: {
            [formName]: {
              status: data.body?.status,
              remarks: data.body?.remarks,
              isSubmit: data.body?.isDraft ? !data.body?.isDraft : data.body?.isCompleted
            },
          },
        };
        await MasterForm.findOneAndUpdate(
          {
            ulb: ObjectId(data.user?.ulb),
            isActive: true,
            design_year: data.body?.designYear ? ObjectId(data.body?.designYear) : ObjectId(data.body?.design_year)
          },
          {
            $set: {
              steps: newForm.steps,
              status: "NA",
              isSubmit: false,      // total isSubmit
              actionTakenBy: data?.user?._id,
            },
            $push: { history: oldForm },
          }
        );
      } else {
        //   // values changes
        temp = oldForm;
        let newForm = new MasterForm(oldForm);
        newForm.steps[formName].status = data?.body?.status;
        newForm.steps[formName].remarks = data?.body?.remarks;
        newForm.steps[formName].isSubmit = data.body?.isDraft ? !data.body?.isDraft : data.body?.isCompleted

        let tempSubmit = true,
          tempStatus = "APPROVED";

        // calculate final submit & status
        Object.entries(newForm.steps).forEach((ele) => {
          if (ele[1].isSubmit === false) tempSubmit = false;
          if (ele[1].status === "NA" || ele[1].status === null) {
            tempStatus = "NA";
          } else if (ele[1].status === "REJECTED" && tempStatus == "APPROVED") {
            tempStatus = "REJECTED";
          }
        });

        newForm.status = tempStatus;
        newForm.isSubmit = tempSubmit;
        if (
          (data.user?.role === "MoHUA" || data.user?.role === "STATE") &&
          newForm.isSubmit === true
        ) {
          await MasterForm.findOneAndUpdate(
            {
              ulb: ObjectId(data.user?.ulb),
              isActive: true,
              design_year: data.body?.designYear ? ObjectId(data.body?.designYear) : ObjectId(data.body?.design_year)
            },
            {
              $set: {
                steps: newForm.steps,
                status: newForm.status,
                isSubmit: newForm.isSubmit,
              },
              $push: { history: temp },
            }
          );
        } else {
          await MasterForm.findOneAndUpdate(
            {
              ulb: ObjectId(data.user?.ulb),
              isActive: true,
              design_year: data.body?.designYear ? ObjectId(data.body?.designYear) : ObjectId(data.body?.design_year)
            },
            {
              $set: {
                steps: newForm.steps,
                status: newForm.status,
                isSubmit: newForm.isSubmit,
              },
            }
          );
        }
      }
    } else {
      let form = new MasterForm({
        ulb: data.user?.ulb,
        steps: {
          [formName]: {
            remarks: data.body?.remarks,
            status: data.body?.status,
            isSubmit: data.body?.isDraft ? !data.body?.isDraft : data.body?.isCompleted

          },
        },
        actionTakenBy: data?.user?._id,
        state: ObjectId(data?.user?.state),
        design_year: data.body?.designYear ? ObjectId(data.body?.designYear) : ObjectId(data.body?.design_year)
      });
      await form.save();
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
