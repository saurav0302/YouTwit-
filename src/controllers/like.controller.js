import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.models.js"
import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video ID", 400)
    }
    
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })
    
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        
        return res
            .status(200)
            .json(new ApiResponse(200, {liked: false}, "Video unliked successfully"))
    }
    
    const like = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })
    
    if (!like) {
        throw new ApiError("Failed to like video", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Video liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if (!isValidObjectId(commentId)) {
        throw new ApiError("Invalid comment ID", 400)
    }
    
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })
    
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        
        return res
            .status(200)
            .json(new ApiResponse(200, {liked: false}, "Comment unliked successfully"))
    }
    
    const like = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })
    
    if (!like) {
        throw new ApiError("Failed to like comment", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Comment liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError("Invalid tweet ID", 400)
    }
    
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })
    
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        
        return res
            .status(200)
            .json(new ApiResponse(200, {liked: false}, "Tweet unliked successfully"))
    }
    
    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })
    
    if (!like) {
        throw new ApiError("Failed to like tweet", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Tweet liked successfully"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likes = await Like.find({
        likedBy: req.user?._id,
        video: { $exists: true }
    }).populate("video")
    
    const likedVideos = likes.map((like) => like.video).filter(Boolean)
    
    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            likedVideos, 
            "Liked videos fetched successfully"
        ))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}