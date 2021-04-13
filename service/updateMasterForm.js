const MasterForm = require("../models/MasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
exports.UpdateMasterSubmitForm = async (data, formName) => {
  try {
    const oldForm = await MasterForm.findOne({
      ulb: ObjectId(data?.ulb),
    }).select({
      history: 0,
    });
    if (oldForm) {
      if (data?.decoded?.user?.id !== oldForm.actionTakenBy) {
        let newForm = {
          ulb: data?.ulb,
          steps: {
            [formName]: {
              status: data?.status,
              remarks: data?.remarks,
              isSubmit: true,
            },
          },
          status: "NA",
          isSubmit: false,
        };
        await MasterForm.findOneAndUpdate(
          { ulb: ObjectId(data?.ulb) },
          {
            $set: {
              steps: newForm.steps,
              status: "NA",
              isSubmit: false,
            },
            $push: { history: oldForm },
          }
        );
      } else {
        //   // values changes
        temp = oldForm;
        let newForm = new MasterForm(oldForm);
        newForm.steps[formName].status = data?.status;
        newForm.steps[formName].remarks = data.remarks;
        newForm.steps[formName].isSubmit = true;

        let tempSubmit = true,
          tempStatus = "APPROVED";

        // calculate final submit & status
        Object.entries(newForm.steps).forEach((ele) => {
          if (ele[1].isSubmit === false) tempSubmit = false;
          if (ele[1].status === "NA") {
            tempStatus = "NA";
          } else if (ele[1].status === "REJECTED" && tempStatus == "APPROVED") {
            tempStatus = "REJECTED";
          }
        });

        newForm.status = tempStatus;
        newForm.isSubmit = tempSubmit;
        if (
          (data?.decoded?.user?.role === "MoHUA" ||
            data?.decoded?.user?.role === "STATE") &&
          newForm.isSubmit === true
        ) {
          await MasterForm.findOneAndUpdate(
            { ulb: ObjectId(data?.ulb) },
            { $set: newForm, $push: { history: temp } }
          );
        } else {
          await MasterForm.findOneAndUpdate(
            { ulb: ObjectId(data?.ulb) },
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
        ulb: data?.ulb,
        steps: {
          [formName]: {
            remarks: data?.remarks,
            status: data?.status,
            isSubmit: true,
          },
        },
      });
      await form.save();
    }
  } catch (error) {
    throw new error(error);
  }
};
