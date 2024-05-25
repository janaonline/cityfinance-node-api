require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const XviFcForm1TabsSchema = new Schema({
    label: {
        type: String,
        required: [true, "Tab label is required."]
    },
    id: {
        type: String,
    },
    key: {
        type: String,
        default: ""
    },
    icon: {
        type: String,
        default: ""
    },
    text: {
        type: String,
        default: "",
    },
    displayPriority: {
        type: Number,
        // required: [true, "Display priority is required."]
    },
    formType: {
        type: String,
        default: ""
    }
})
module.exports = mongoose.model("XviFcForm1Tabs", XviFcForm1TabsSchema)