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
router.get("/staff", allowRoles(['admin', 'recept', 'owner', 'worker']), getAllStaff);
router.post("/staff", allowRoles(['admin', 'recept', 'owner']),createStaff);
router.put("/staff/:id", allowRoles(['admin', 'recept', 'owner']), updateStaff);
router.delete("/staff/:id", allowRoles(['admin', 'recept', 'owner']), deactivateStaff);




module.exports = router;
