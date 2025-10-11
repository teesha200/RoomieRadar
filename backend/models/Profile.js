import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phone: { type: String, default: "" },
    dob: { type: Date },
    description: { type: String, default: "" },
    bio: { type: String, default: "" },
    pronouns: { type: String, default: "" },
    hobbies: { type: String, default: "" },
    photo: { type: String, default: "" },   // single profile picture
    photos: { type: [String], default: [] } // photo gallery
  },
  { timestamps: true }
);

const Profile = mongoose.model("Profile", profileSchema);
export default Profile;
