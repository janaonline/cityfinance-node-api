const MasterForm = require("../../models/MasterForm");

exports.formSubmit = async (req, res) => {
  const { ulb } = req.decoded;
  const { design_year } = req.body;
  try {
    const form = await MasterForm.findOne({ ulb, design_year }).select({
      history: 0,
    });
    if (!form) {
      return res.status(404).json({ msg: "Master Form not found!" });
    }
    if (!form.isSubmit) {
      return res.status(400).json({ msg: "Fill all steps", form });
    }
    return res.status(200).json({ msg: "Form Submitted!", form });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.formAction = async (req, res) => {
  const { ulb } = req.body;
  const { role } = req?.decoded?.user;
  try {
    const form = await MasterForm.findOne({ ulb });
    if (!from) {
      return res.status(404).json({ msg: "Master Form not found!" });
    }
    if (!form.isSubmit) {
      return res.status(400).json({ msg: "take actions on all forms" });
    }
    if (form.status === "REJECTED") {
      // reject email
    } else if (form.status === "APPROVED") {
      // approve email
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};
