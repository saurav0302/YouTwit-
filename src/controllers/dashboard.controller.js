import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subsriptions.models.js"
import {Like} from "../models/like.models.js"
import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    
    if (!userId) {
        throw new ApiError("User not authenticated", 401)
    }
    
    const totalVideos = await Video.countDocuments({ owner: userId })
    
    const videosWithViews = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ])
    const totalViews = videosWithViews[0]?.totalViews || 0
    
    const totalSubscribers = await Subscription.countDocuments({ channel: userId })
    
    const totalVideoLikes = await Like.countDocuments({
        video: { $in: await Video.find({ owner: userId }).distinct('_id') }
    })
    
    const latestVideos = await Video.find({ owner: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title views createdAt")
    
    const averageViews = totalVideos > 0 ? totalViews / totalVideos : 0
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentSubscribers = await Subscription.countDocuments({
        channel: userId,
        createdAt: { $gte: thirtyDaysAgo }
    })
    
    const stats = {
        totalVideos,
        totalViews,
        totalSubscribers,
        totalVideoLikes,
        averageViews,
        recentSubscribers,
        latestVideos
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, stats, "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    
    if (!userId) {
        throw new ApiError("User not authenticated", 401)
    }
    
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = -1 } = req.query
    
    const parsedPage = parseInt(page)
    const parsedLimit = parseInt(limit)
    const parsedSortType = parseInt(sortType)
    
    const sortOptions = {}
    sortOptions[sortBy] = parsedSortType
    
    const videos = await Video.find({ owner: userId })
        .sort(sortOptions)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate("owner", "username fullName avatar")
    
    const totalVideosCount = await Video.countDocuments({ owner: userId })
    
    const videoStats = {
        videos,
        totalVideosCount,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalVideosCount / parsedLimit)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, videoStats, "Channel videos fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
}