const CronJob = require("cron").CronJob;
const {emailTrigger} =  require('./stateEmail')
// const cronJob = new CronJob(
//   "0 0 10,14 * * *",
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


