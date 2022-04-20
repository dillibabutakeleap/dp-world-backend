const express = require("express");
const router = express.Router();
const userController = require("../controllers/user-controller");

/**
 * @swagger
 * /user:
 *    get:
 *      tags:
 *        - User Management
 *      summary: API used to get loggedIn user details. Or get user details by userId passed in the
 *              query parameter which is applicable only for ADMIN user role, users.
 *      produces:
 *          - application/json
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: false
 *            type: Bearer accessToken
 *
 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.get("/user", userController.getUserDetails);

/**
 * @swagger
 * /user/{userId}/completion-certificate:
 *    get:
 *      tags:
 *        - User Management
 *      summary: API used to get loggedIn user details. Or get user details by userId passed in the
 *              query parameter which is applicable only for ADMIN user role, users.
 *      produces:
 *          - application/json
 *      parameters:
 *          - name: Authorization
 *            description: accessToken from login API.
 *            required: false
 *            type: Bearer accessToken
 *          - in: path
 *            name: userId
 *            description: userId of the user to generate the certificate.
 *            required: true
 *            schema:
 *              type: string
 *
 *      responses:
 *          200:
 *              description: returns user object
 *              schema:
 *                 $ref: '#/definitions/LoginResponse'
 *
 */
router.get("/user", userController.getUserDetails);

router.get(
  "/user/:userId/completion-certificate",
  userController.getUserCompletionCertificate
);

router;
module.exports = router;
