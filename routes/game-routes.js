const express = require("express");
const gameController = require("../controllers/game-controller");
const { validateAuthorization } = require("../utils/auth-validation");
const router = express.Router();
const { body } = require("express-validator");
const { checkForErrors } = require("../utils/validation-errors-checker");

router.get(
  "/modules",

  gameController.getGameModules
);

router.get("/modules/:moduleId", gameController.getModuleById);

router.post(
  "/update-user-game-level-status",
  [
    body("employeeId").not().isEmpty(),
    checkForErrors,
  ],
  gameController.updateUserGameLevelStatus
);

router.get(
  "/user-recently-completed-levels",
  gameController.getRecentlyCompletedLevels
);

module.exports = router;
