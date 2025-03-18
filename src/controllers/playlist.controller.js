import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    
    if (!name || name.trim() === "") {
        throw new ApiError("Playlist name is required", 400)
    }
    
    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: req.user?._id
    })
    
    if (!playlist) {
        throw new ApiError("Failed to create playlist", 500)
    }
    
    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError("Invalid userId", 400)
    }
    
    // Get all playlists of the user
    const playlists = await Playlist.find({
        owner: userId
    })
    
    if (!playlists) {
        throw new ApiError("Failed to fetch playlists", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlistId", 400)
    }
    
    const playlist = await Playlist.findById(playlistId)
    
    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError("Invalid playlistId or videoId", 400)
    }
    
    const playlist = await Playlist.findById(playlistId)
    
    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }
    
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You don't have permission to modify this playlist", 403)
    }
    
    if (playlist.videos.includes(videoId)) {
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Video already in playlist"))
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId }
        },
        { new: true }
    )
    
    if (!updatedPlaylist) {
        throw new ApiError("Failed to add video to playlist", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError("Invalid playlistId or videoId", 400)
    }
    
    const playlist = await Playlist.findById(playlistId)
    
    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }
    
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You don't have permission to modify this playlist", 403)
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId }
        },
        { new: true }
    )
    
    if (!updatedPlaylist) {
        throw new ApiError("Failed to remove video from playlist", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlistId", 400)
    }
    
    const playlist = await Playlist.findById(playlistId)
    
    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }
    
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You don't have permission to delete this playlist", 403)
    }
    
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)
    
    if (!deletedPlaylist) {
        throw new ApiError("Failed to delete playlist", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlistId", 400)
    }
    
    if (!name || name.trim() === "") {
        throw new ApiError("Playlist name is required", 400)
    }
    
    const playlist = await Playlist.findById(playlistId)
    
    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }
    
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You don't have permission to update this playlist", 403)
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description: description || ""
            }
        },
        { new: true }
    )
    
    if (!updatedPlaylist) {
        throw new ApiError("Failed to update playlist", 500)
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}