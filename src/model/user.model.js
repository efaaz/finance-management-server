import mongoose, {Schema} from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    avatar: {
        type: String,
    },
    refreshToken: {
        type: String,
    },
    resetPasswordExpire: {
        type: Date,
    },
}, {timestamps: true});

export const User = mongoose.model("User", userSchema);