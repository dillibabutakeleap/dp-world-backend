const express = require("express");
const gameController = require("../controllers/game-controller");
const { validateAuthorization } = require("../utils/auth-validation");
const router = express.Router();
const { body } = require("express-validator");
const { checkForErrors } = require("../utils/validation-errors-checker");



/**
 * @swagger
 * /game/modules:
 *    post:
 *      tags:
 *        - Game Management
 *      summary: API to get all available game modules
 *      produces:
 *          - application/json
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.get(
  "/modules",

  gameController.getGameModules
);

router.get("/modules/:moduleId", gameController.getModuleById);

/**
 * @swagger
 * definitions:
 *   UpdateUserCompletedGameLevel:
 *     properties:
 *       employeeId:
 *          type: string
 *       levelId:
 *          type: string
 *       spentTimeInSec:
 *          type: integer
 */

/**
 * @swagger
 * /game//update-user-game-level-status:
 *    post:
 *      tags:
 *        - Game Management
 *      summary: API to update user game completion status
 *      produces:
 *          - application/json
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *          - name: Model
 *            description: Request Body
 *            in: body
 *            required: true
 *            schema:
 *                 $ref: '#/definitions/UpdateUserCompletedGameLevel'
 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.post(
  "/update-user-game-level-status",
  [
    body("employeeId").not().isEmpty(),
    body("levelId").not().isEmpty(),
    checkForErrors,
  ],
  gameController.updateUserGameLevelStatus
);

router.get(
  "/user-recently-completed-levels",
  gameController.getRecentlyCompletedLevels
);

module.exports = router;
