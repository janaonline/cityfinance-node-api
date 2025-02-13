














// function checkPassword(str) {
//     var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
//     return re.test(str);
// }

// function setPasswordHistory(user, passwordHash) {
//     if (
//         Array.isArray(user.passwordHistory) &&
//         user.passwordHistory.length < 3
//     ) {
//         user.passwordHistory.push(passwordHash);
//     } else {
//         user.passwordHistory.shift();
//         user.passwordHistory.push(passwordHash);
//     }
//     return user.passwordHistory;
// }

async function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}
