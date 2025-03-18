import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.models.js"
import {Video} from "../models/video.models.js"
import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"

/**
 * Get all comments for a specific video with pagination
 */
const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    // Validate video ID
    if (!videoId) {
        throw new ApiError(400, "Video ID is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format")
    }

    // Check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Validate pagination parameters
    const pageNumber = parseInt(page, 10) || 1
    const limitNumber = parseInt(limit, 10) || 10
    
    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Invalid pagination parameters")
    }

    try {
        const commentAggregate = Comment.aggregate([
            {
                $match: { video: new mongoose.Types.ObjectId(videoId) }
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
                    video: 1,
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
            }
        ])

        // Use the aggregate paginate plugin
        const options = {
            page: pageNumber,
            limit: limitNumber
        }

        const comments = await Comment.aggregatePaginate(commentAggregate, options)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200, 
                    {
                        comments: comments.docs,
                        totalComments: comments.totalDocs,
                        currentPage: comments.page,
                        totalPages: comments.totalPages,
                        hasNextPage: comments.hasNextPage,
                        hasPrevPage: comments.hasPrevPage
                    },
                    "Video comments fetched successfully"
                )
            )
    } catch (error) {
        console.error("Error in getVideoComments:", error)
        throw new ApiError(500, "Error fetching video comments: " + error.message)
    }
})

/**
 * Add a new comment to a video
 */
const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if (!videoId) {
        throw new ApiError(400, "Video ID is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    if (content.length > 500) {
        throw new ApiError(400, "Comment content cannot exceed 500 characters")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    const commentWithOwner = await Comment.findById(comment._id).populate("owner", "username fullName avatar")

    return res
        .status(201)
        .json(new ApiResponse(201, commentWithOwner, "Comment added successfully"))
})

/**
 * Update an existing comment
 */
const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    if (content.length > 500) {
        throw new ApiError(400, "Comment content cannot exceed 500 characters")
    }

    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized - You can only update your own comments")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content },
        { new: true } // Return the updated document
    ).populate("owner", "username fullName avatar")

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

/**
 * Delete a comment
 */
const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format")
    }

    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized - You can only delete your own comments")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if (!deletedComment) {
        throw new ApiError(500, "Failed to delete comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { deleted: true }, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment, 
    deleteComment
}