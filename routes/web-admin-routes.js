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
 *                 $ref: '#/definitions/trainerAdd'

 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.post(
  "/add-trailer",
  [
    body("name").not().isEmpty().trim().escape(),
    body("password").not().isEmpty().trim(),
    body("employeeId").not().isEmpty().trim().escape(),
    checkForErrors,
  ],
  webAdminController.addTrainer
);

router.get("/users", webAdminController.getTeamUsers);

router.get('/dashboard',webAdminController.getDashboardData)

router.get('/user/:userId/progress-data',webAdminController.getUserProgressData)
module.exports = router;
