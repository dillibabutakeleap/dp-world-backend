const express = require("express");
const webAdminController = require("../controllers/web-admin-controller");
const { body } = require("express-validator");
const { checkForErrors } = require("../utils/validation-errors-checker");

router = express();
/**
 * @swagger
 * definitions:
 *   trainerAdd:
 *     properties:
 *       name:
 *          type: string
 *       email:
 *          type: string
 *       password:
 *          type: string
 *       employeeId:
 *          type: string
 */

/**
 * @swagger
 * /web-admin/add-user:
 *    post:
 *      tags:
 *        - Web Admin Management
 *      summary: API to add a trainer. This api is accessible only by the Web Admins.
 *      produces:
 *          - application/json
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/definitions/trainerAdd'
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *            in: header
 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.post(
  "/add-trainer",
  [
    body("name").not().isEmpty().trim().escape(),
    body("password").not().isEmpty().trim(),
    body("employeeId").not().isEmpty().trim().escape(),
    checkForErrors,
  ],
  webAdminController.addTrainer
);

router.get("/users", webAdminController.getTeamUsers);

router.get("/trainers", webAdminController.getTrainers);

/**
 * @swagger
 * /web-admin/dashboard:
 *    post:
 *      tags:
 *        - Web Admin Management
 *      summary: API to get dashboard data for admin panel.
 *      produces:
 *          - application/json
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: true
 *            type: Bearer accessToken
 *            in: header
 *      responses:
 *          200:
 *              description: returns dashboard object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.get("/dashboard", webAdminController.getDashboardData);
router.post(
  "/reset-trainer-password",
  [body("password").not().isEmpty(), body("trainerId").not().isEmpty()],
  webAdminController.resetTrainerPassword
);

router.get(
  "/user/:userId/progress-data",
  webAdminController.getUserProgressData
);
module.exports = router;
