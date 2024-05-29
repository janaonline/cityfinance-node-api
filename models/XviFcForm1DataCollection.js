require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;
// const { pdfSchema } = require("../util/masterFunctions");
const { } = require("../util/FormNames");

const FORM_FIELD_TYPE = ["text", "number", "dropdown", "radio"];

const xviFcForm1DataCollectionSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true, unique: true },
        state: { type: Schema.Types.ObjectId, ref: "State", required: true },
        xvifc: { type: Schema.Types.ObjectId, ref: "User", required: true },
        tab: [{
            tabKey: { type: String },
            data: [
                {
                    year: { type: String, default: "" },
                    displayPriority: { type: String, default: null },
                    formFieldType: { type: String, default: "number", enum: FORM_FIELD_TYPE, message: `ERROR: STATUS MUST BE ONE OF ${FORM_FIELD_TYPE}` },
                    key: { type: String, required: true },
                    value: { type: Schema.Types.Mixed, default: null },
                    saveAsDraftValue: { type: Schema.Types.Mixed, default: null },
                    isActive: { type: Boolean, default: 1 },
                    file: [{
                        name: { type: String },
                        url: { type: String },
                    }],
                    isPdfAvailable: { type: Boolean, default: false },
                    fileApprovedByULB: { type: Boolean, default: true },
                    filesRejected: { type: String },
                    fileRejectReason: { type: String },
                    fileAlreadyOnCf: [{
                        type: { type: String },
                        name: { type: String },
                        url: { type: String },
                    }]
                }
            ]
        }],
        formId: { type: Number, required: true },
        formStatus: { type: String, requird: true },
        rejectReason_state: { type: String, default: "" },
        rejectReason_xvifc: { type: String, default: "" },
        tracker: [{ eventName: { type: String, default: null }, eventDate: { type: Date } }],
        autoSubmitDate_ulb: { type: Date },
        autoApproveDate_state: { type: Date },
        autoApproveDate_xvifc: { type: Date },
        isActive: { type: Boolean, default: 1 }, //TODO
    },
    { timestamp: true }
);
xviFcForm1DataCollectionSchema.index(
    { ulb: 1 },
    { key: 1 },
    { displayPriority: 1 }
);
module.exports = mongoose.model("XviFcForm1DataCollection", xviFcForm1DataCollectionSchema);
