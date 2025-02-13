/**
 * Middleware for role-based access control.
 *
 * This middleware checks if the user's role, extracted from the decoded token in the request,
 * is allowed for the specific action. If the role is allowed, the request is passed to the next
 * middleware/handler. If not, a 403 Forbidden response is sent.
 *
 * @param {string[]} roles - An array of roles allowed to access the action.
 * @param {string} failureMessage - Error message to show if user not allowed to access
 * @returns {function} - Express middleware function.
 */
module.exports.allowedRoles = (roles = [], failureMessage) => {
    return (req, res, next) => {
        const role = req?.decoded?.role;
        if (roles.includes(role)) {
            next(); // Role allowed, proceed
        } else {
            res.status(403).send({
                success: false,
                message: failureMessage || `Access denied. ${role || 'This user'} is not allowed to access this resource`
            });
        }
    };
};
