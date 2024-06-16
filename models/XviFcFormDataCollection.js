require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;
// const { pdfSchema } = require("../util/masterFunctions");
const { } = require("../util/FormNames");

const FORM_FIELD_TYPE = ["text", "number", "dropdown", "radio", "file"];

const xviFcFormDataCollectionSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true, unique: true },
        state: { type: Schema.Types.ObjectId, ref: "State", required: true },
        xvifc: { type: Schema.Types.ObjectId, ref: "User", required: true },
        tab: [{
            tabKey: { type: String },
            tabPosition: { type: Number },
            data: [
                {
                    year: { type: String, default: "" },
                    displayPriority: { type: String, default: null },
                    formFieldType: { type: String, enum: FORM_FIELD_TYPE, message: `ERROR: STATUS MUST BE ONE OF ${FORM_FIELD_TYPE}` },
                    key: { type: String, required: true },
                    value: { type: Schema.Types.Mixed, default: null },
                    saveAsDraftValue: { type: Schema.Types.Mixed, default: null },
                    isActive: { type: Boolean, default: 1 },
                    file: {
                        name: { type: String },
                        url: { type: String },
                    },
                    isPdfAvailable: { type: Boolean, default: false },
                    fileApprovedByULB: { type: Boolean, default: true },
                    filesRejected: { type: String },
                    fileRejectReason: { type: String },
                    fileAlreadyOnCf: [{
                        type: { type: String },
                        name: { type: String },
                        url: { type: String },
                    }],
                    reason: { type: String },
                }
            ]
        }],
        censusCode: { type: String },
        sbCode: { type: String },
        ulbName: { type: String },
        stateName: { type: String },
        formId: { type: Number, required: true },
        formStatus: { type: String, requird: true },
        rejectReason_state: { type: String, default: "" },
        rejectReason_xvifc: { type: String, default: "" },
        tracker: [{ eventName: { type: String, default: null }, eventDate: { type: Date }, submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true } }], // Submitted, Approved by State, Reject by State, Approved by 16th FC, Reject by 16th FC, Auto-approved by state, Auto-approved by 16th FC.
        // modifiedAt: { type: Date },
        // createdAt: { type: Date },
        submittedAt: { type: Date },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isActive: { type: Boolean, default: 1 },
        autoSubmitDate_ulb: { type: Date },
        autoApproveDate_state: { type: Date },
        autoApproveDate_xvifc: { type: Date },
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
xviFcFormDataCollectionSchema.index(
    { ulb: 1 },
    { key: 1 },
    { tab: 1 },

);
module.exports = mongoose.model("XviFcFormDataCollection", xviFcFormDataCollectionSchema);
