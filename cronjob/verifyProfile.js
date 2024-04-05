const User = require('../models/User');

/**
 * The function `updateVerifyProfile` updates the `isVerified2223` field for all users with the role
 * "ULB" to the specified value.
 * @param verify - The `verify` parameter in the `updateVerifyProfile` function is used to specify
 * whether a user's profile should be verified or not. It is a boolean value that determines the
 * verification status of the user's profile.
 */
async function updateVerifyProfile(verify, role) {
  try {
        await User.updateMany({ role: {$in: role}},
            { $set: { isVerified2223: verify } }
        );
  } catch (error) {
    throw new Error(`updateVerifyProfile:: ${error.message}`);
  }
}

module.exports.updateVerifyProfile = updateVerifyProfile