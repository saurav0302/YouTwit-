import asynchHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiErrors.js';
import uploadOnCloudinary from '../utils/Cloudinary.js';
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


const registerUser = asynchHandler(async (req, res) => {
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

const loginUser = asynchHandler(async (req, res) => {
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

const logoutUser = asynchHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id, {
            $set: {
                refreshToken: undefined
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

const refreshAccessToken = asynchHandler(async (req, res) => {
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };