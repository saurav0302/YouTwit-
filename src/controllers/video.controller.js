import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/Cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    // Convert string values to appropriate types
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    
    // Prepare the query object
    const queryObj = {}
    
    // Add search by title or description if query is provided
    if (query) {
        queryObj.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }
    
    // Filter by userId if provided
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user ID")
        }
        queryObj.owner = userId
    }
    
    // Only show published videos unless it's the owner requesting
    queryObj.isPublished = true
    
    // Prepare sort options
    const sortOptions = {}
    if (sortBy && sortType) {
        sortOptions[sortBy] = sortType === "desc" ? -1 : 1
    } else {
        // Default sort by createdAt in descending order
        sortOptions.createdAt = -1
    }
    
    const videoAggregate = Video.aggregate([
        {
            $match: queryObj
        },
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
            $addFields: {
                owner: { $arrayElemAt: ["$owner", 0] }
            }
        },
        {
            $sort: sortOptions
        }
    ])
    
    const videos = await Video.aggregatePaginate(
        videoAggregate,
        {
            page: pageNumber,
            limit: limitNumber,
            customLabels: {
                totalDocs: "totalVideos",
                docs: "videos"
            }
        }
    )
    
    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    
    // Validate required fields
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }
    
    // Check if files are uploaded
    if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
        throw new ApiError(400, "Video file and thumbnail are required")
    }
    
    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }
    
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }
    
    // Upload to cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    
    if (!videoFile) {
        throw new ApiError(500, "Error uploading video file")
    }
    
    if (!thumbnail) {
        throw new ApiError(500, "Error uploading thumbnail")
    }
    
    // Create video in database
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration || 0,
        owner: req.user._id
    })
    
    // Check if video is created
    const createdVideo = await Video.findById(video._id).populate("owner", "fullName username avatar")
    
    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong while publishing the video")
    }
    
    return res.status(201).json(
        new ApiResponse(201, createdVideo, "Video published successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    
    // Find the video and increment view count
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: { views: 1 }
        },
        { new: true }
    ).populate("owner", "fullName username avatar")
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if video is published or if the requester is the owner
    if (!video.isPublished && !video.owner._id.equals(req.user._id)) {
        throw new ApiError(403, "You don't have permission to view this video")
    }
    
    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
})

const updateThumbnail = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    
    if (!title && !description && !req.file) {
        throw new ApiError(400, "At least one field is required to update")
    }
    
    // Find the video
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if the requester is the owner
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You don't have permission to update this video")
    }
    
    // Update thumbnail if provided
    let thumbnailUrl = video.thumbnail
    if (req.file) {
        const thumbnailLocalPath = req.file.path
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        
        if (!thumbnail) {
            throw new ApiError(500, "Error uploading thumbnail")
        }
        
        // Delete old thumbnail from cloudinary
        await deleteFromCloudinary(video.thumbnail)
        
        thumbnailUrl = thumbnail.url
    }
    
    // Update video
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title || video.title,
                description: description || video.description,
                thumbnail: thumbnailUrl
            }
        },
        { new: true }
    ).populate("owner", "fullName username avatar")
    
    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    
    // Find the video
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if the requester is the owner
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You don't have permission to delete this video")
    }
    
    // Delete video and thumbnail from cloudinary
    await deleteFromCloudinary(video.videoFile)
    await deleteFromCloudinary(video.thumbnail)
    
    // Delete video from database
    await Video.findByIdAndDelete(videoId)
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    
    // Find the video
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if the requester is the owner
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You don't have permission to update this video")
    }
    
    // Toggle publish status
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        { new: true }
    ).populate("owner", "fullName username avatar")
    
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedVideo,
            `Video ${updatedVideo.isPublished ? "published" : "unpublished"} successfully`
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateThumbnail,
    deleteVideo,
    togglePublishStatus
}