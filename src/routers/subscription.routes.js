import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router();
router.use(verifyJWT); 

router
    .route("/c/:channelId")
    .post(toggleSubscription);

router.route("/c:channelId").get(getSubscribedChannels);

router.route("/u/:subscriberId").get(getUserChannelSubscribers);

export default router