const CronJob = require("cron").CronJob;
const {emailTrigger} =  require('./stateEmail');
const { frFormFreeze } = require('./frFormFreeze');

//  frFormFreeze("hi you cron is executed successfully!");

const cronJob = new CronJob(
  "0 0 10 * * 1",
 async () => {
    // console.log("CronnJOB", cluster.isMaster);
    
    // if (cluster.isMaster === true) {
      console.log(`Cron started.`);
      await emailTrigger();
    // }
  },
  () => {
    console.log("CRON COMPLETED");
  },
  true /* Start the job right now */,
  "Asia/Kolkata" /* Time zone of this job. */
);  

const frFormFreezes = new CronJob(
  "00 10 12,05 * * *",
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


