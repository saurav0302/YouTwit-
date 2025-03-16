import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiErrors.js';
import{ uploadOnCloudinary, deleteFromCloudinary} from '../utils/Cloudinary.js';
import { User } from '../models/user.models.js';
import { ApiResponse } from '../utils/ApiResoponse.js';

const genrateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user =await User.findById(userId);
        const accessToken = user.genrateAccessToken();
        const refreshToken = user.genrateRefreshToken();
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // Get the user details from the request body
    const {username, fullName, email, password} = req.body;
    
    // Check if the required fields are not empty
    if([username, fullName, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if the user already exists - MOVED UP
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
        // The execution stops here when the error is thrown
    }

    // Now check for avatar and process images
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
   
    // Upload the avatar and cover image on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    // Only attempt to upload coverImage if it exists
    let coverImage = null;
    if(coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    
    if(!avatar) {
        throw new ApiError(500, "Failed to upload avatar image");
    }
    
    // Create a new user with optional coverImage
    const newUser = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "" // Use empty string if no cover image
    });

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");
    if(!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(
        new ApiResponse(201, "User registered successfully", createdUser)
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const {email, username, password} = req.body;
    if(!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    });

    if(!user) {
        throw new ApiError(404, "User not found");
    }

    const isMatch = await user.matchPassword(password);

    if(!isMatch) {
        throw new ApiError(401, "Incorrect password");
    }

    const {accessToken, refreshToken} = await genrateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
});

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id, {
            $unset: {
                refreshToken: 1 // remove the refresh token
            }},
            { new: true });

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, "User logged out successfully")
    )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }

    try {

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        if(!decodedToken) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        const user = await User.findById(decodedToken.id);
        if(!user) {
            throw new ApiError(404, "User not found");
        }
        
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }

        const {accessToken, refreshToken} = await genrateAccessTokenAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, "Access token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
        
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {currentPassword, newPassword} = req.body;
    if(!currentPassword || !newPassword) {
        throw new ApiError(400, "Current password and new password are required");
    }

    const user = await User.findById(req.user._id);
    if(!user) {
        throw new ApiError(404, "User not found");
    }

    const isMatch = await user.matchPassword(currentPassword);
    if(!isMatch) {
        throw new ApiError(401, "Incorrect current password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    if(!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, user)
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email, username} = req.body;
    if(!fullName && !email && !username) {
        throw new ApiError(400, "At least one field is required");
    }
    
    const user = await User.findByIdAndUpdate(req.user._id,{
        $set: {
            fullName,
            email,
            username
        }
    }, {
        new: true,
    }).select("-password"); 
    
    res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    const oldUser = await User.findById(req.user._id);

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            avatar: avatar.url
        }
    }, {
        new: true
    }).select("-password");

    if (oldUser.avatar) {
        await deleteFromCloudinary(oldUser.avatar);
    }
    

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url) {
        throw new ApiError(500, "Failed to upload cover image");
    }

    const oldUser = await User.findById(req.user._id);

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, {
        new: true
    }).select("-password"); 

    if (oldUser.avatar) {
        await deleteFromCloudinary(oldUser.avatar);
    }
    

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const username = req.params;
    if(!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                    
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ]);

    if(!channel) {
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200).json(new ApiResponse(200, channel, "Channel profile fetched successfully"));
});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})



export { registerUser,
     loginUser, 
     logoutUser, 
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory
    };