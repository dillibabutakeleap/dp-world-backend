const express = require("express");
const webAdminController = require("../controllers/web-admin-controller");
const { body } = require("express-validator");
const { checkForErrors } = require("../utils/validation-errors-checker");

router = express();

router.post(
  "/add-user",
  [
    body("email").isEmail().normalizeEmail(),
    body("name").not().isEmpty().trim().escape(),
    checkForErrors,
  ],
  webAdminController.addUser
);

router.get("/users", webAdminController.getTeamUsers);
router.get(
  "/transfer-license/conditions",
  webAdminController.getTransferLicenseConditions
);

router.post(
  "/transfer-license",
  [body("teamUserId").not().isEmpty().trim().escape(), checkForErrors],
  webAdminController.transferUserLicense
);

router.get('/dashboard',webAdminController.getDashboardData)

router.get('/user/:userId/progress-data',webAdminController.getUserProgressData)
module.exports = router;
