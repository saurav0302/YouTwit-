import { Router } from "express";
import { registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multter.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();


router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT,logoutUser);    
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/update-account-details").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route("/channel-profile").get(verifyJWT,getUserChannelProfile);
router.route("/watch-history").get(verifyJWT,getWatchHistory);



export default router;
