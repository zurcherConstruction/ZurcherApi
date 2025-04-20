const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");
const {
  getAllStaff,
  createStaff,
  updateStaff,
  deactivateOrDeleteStaff,
} = require("../controllers/User/adminController");

// All routes require authentication
router.use(verifyToken);

// Staff management routes with role-based access
router.get("/staff", allowRoles(['admin', 'recept', 'owner', 'worker']), getAllStaff);
router.post("/staff", allowRoles(['owner']), createStaff); // Restrict staff creation to owner only
router.put("/staff/:id", allowRoles(['owner']), updateStaff);
router.post("/staff/:id/deactivate", allowRoles(['owner']), deactivateOrDeleteStaff);
router.delete("/staff/:id", allowRoles(['owner']), deactivateOrDeleteStaff);

module.exports = router;
