import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.models.js"
import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"

/**
 * Create a new tweet
 */
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required")
    }

    // content exceeds character limit 
    if (content.length > 280) {
        throw new ApiError(400, "Tweet content cannot exceed 280 characters")
    }

    // Create new tweet
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created successfully"))
})

/**
 * Get all tweets by a specific user
 */
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!userId) {
        throw new ApiError(400, "User ID is required")
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID format")
    }

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const pageNumber = parseInt(page, 10) || 1
    const limitNumber = parseInt(limit, 10) || 10
    
    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Invalid pagination parameters")
    }

    const skip = (pageNumber - 1) * limitNumber

    try {
        // Find all tweets by the user
        const tweets = await Tweet.aggregate([
            {
                $match: { owner: new mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails"
            },
            {
                $project: {
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar"
                    }
                }
            },
            {
                $sort: { createdAt: -1 } // Sort by creation date (newest first)
            },
            {
                $skip: skip
            },
            {
                $limit: limitNumber
            }
        ])

        // Get total count for pagination
        const totalTweets = await Tweet.countDocuments({ owner: userId })

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200, 
                    {
                        tweets,
                        totalTweets,
                        currentPage: pageNumber,
                        totalPages: Math.ceil(totalTweets / limitNumber)
                    },
                    "User tweets fetched successfully"
                )
            )
    } catch (error) {
        console.error("Error in getUserTweets:", error)
        throw new ApiError(500, "Error fetching user tweets: " + error.message)
    }
})

/**
 * Update an existing tweet
 */
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required")
    }

    if (content.length > 280) {
        throw new ApiError(400, "Tweet content cannot exceed 280 characters")
    }

    const tweet = await Tweet.findById(tweetId)
    
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized - You can only update your own tweets")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content },
        { new: true } // Return the updated document
    )

    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"))
})

/**
 * Delete a tweet
 */
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format")
    }

    const tweet = await Tweet.findById(tweetId)
    
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized - You can only delete your own tweets")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deletedTweet) {
        throw new ApiError(500, "Failed to delete tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { deleted: true }, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}