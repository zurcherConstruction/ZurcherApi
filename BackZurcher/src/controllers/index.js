const { catchedAsync } = require("../utils/catchedAsync");

// Auth controllers
const { login, register, logout, changePassword } = require("./User/authController");

// Email controllers
const { 
    forgotPassword, 
    resetPassword, 
    sendEmail 
} = require("./nodemailerController");



// Admin controllers
const {
    getAllStaff,
    createStaff,
    updateStaff,
    deactivateStaff
} = require("./User/adminController");



module.exports = {
    // Auth endpoints
    login,
    register,
    logout,
    changePassword,

    // // Email endpoints
    // forgotPassword,
    // resetPassword,
    // sendEmail,

    

    // Admin endpoints
    getAllStaff,
    createStaff,
    updateStaff,
    deactivateStaff


};