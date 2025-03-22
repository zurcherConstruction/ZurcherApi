const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/isAuth");
const { isAdmin, isOwner, allowRoles } = require("../middleware/byRol");
const {
  getAllStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
} = require("../controllers/User/adminController");



router.use(verifyToken);

// Rutas de gestión de usuarios (solo owner)
router.get("/staff", isOwner, getAllStaff);
router.post("/staff", isOwner, createStaff);
router.put("/staff/:id", isOwner, updateStaff);
router.delete("/staff/:id", isOwner, deactivateStaff);




module.exports = router;
