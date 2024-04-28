const CronJob = require("cron").CronJob;
const {emailTrigger} =  require('./stateEmail');
const { frFormFreeze } = require('./frFormFreeze');
const {updateVerifyProfile} = require('./verifyProfile')
// const cronJob = new CronJob(
//   "0 0 10 * * 1",
//  async () => {
//     // console.log("CronnJOB", cluster.isMaster);
    
//     // if (cluster.isMaster === true) {
//       console.log(`Cron started.`);
//       await emailTrigger();
//     // }
//   },
//   () => {
//     console.log("CRON COMPLETED");
//   },
//   true /* Start the job right now */,
//   "Asia/Kolkata" /* Time zone of this job. */
// );  

const frFormFreezes = new CronJob(
  "00 00 23,05 * * *",
  async function () {
      // SS MM HH DD MM DOFW
      await frFormFreeze("hi you cron is executed successfully!");
  },
  function () {
      console.log("CRON COMPLETED");
  },
  true /* Start the job right now */,
  "Asia/Kolkata" /* Time zone of this job. */
);

const verifyProfile = new CronJob(
  "0 0 23 31 mar *",
  async function () {
    let rolesToDeactivate = ["ULB"];
    await updateVerifyProfile(false, rolesToDeactivate);
  },
  function () {
    console.log("CRON COMPLETED:: VerifyProfile");
  },
  true /* Start the job right now */,
  "Asia/Kolkata" /* Time zone of this job. */
);

