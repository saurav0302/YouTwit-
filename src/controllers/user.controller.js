import asynchHandler from '../utils/asyncHandler.js';

const registerUser = asynchHandler(async (req, res) => {
    // code to register user
    res.status(201).json({ message: "User registered successfully" });
});

export { registerUser };