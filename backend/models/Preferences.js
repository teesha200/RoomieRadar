// backend/models/Preferences.js
const mongoose = require('mongoose');

const PreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    preferredGender: {
      type: String,
      default: ""
    },

    department: {
      type: String,
      default: ""
    },

    yearOfStudy: {
      type: String,
      default: ""
    },

    seaterType: {
      type: String,
      default: ""
    },

    cleanliness: {
      type: String,
      default: ""
    },

    smoking: {
      type: String,
      default: ""
    },

    drinking: {
      type: String,
      default: ""
    },

    hobbies: {
      type: [String],
      default: []
    },

    sleepSchedule: {
      type: String,
      default: ""
    },

    studyStyle: {
      type: String,
      default: ""
    },

    noiseTolerance: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preferences", PreferencesSchema);
