import ApiError from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResoponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            {
                status: "OK",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                service: "API Service",
                environment: process.env.NODE_ENV || "development"
            }, 
            "Health check successful"
        ))
})

export {
    healthcheck
}