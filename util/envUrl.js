module.exports.FrontendHeaderHost ={
    Demo: `${process.env.DEMO_HOST_FRONTEND}`,
    Staging: `${process.env.STAGING_HOST}`,
    Prod: `${process.env.PROD_HOST}`,
}

module.exports.BackendHeaderHost ={
    Demo: `${process.env.DEMO_HOST_BACKEND}`,
    Staging: `${process.env.STAGING_HOST}`,
    Prod: `${process.env.PROD_HOST}`,
}