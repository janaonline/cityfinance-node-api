
# Cityfinance

A brief description of what this project does and who it's for


![Logo](https://cityfinance.in/assets/M%20FIGMA/city-finance-ranking.png)


## Tech Stack

**Server:** Node, ExpressJs, Mongodb, Redis


## Install and Setup

1. Git clone the repository:
   ```bash
   git clone https://github.com/janaonline/citifinance-node-api.git
   ```
2. Change to the project directory:
   ```bash 
   cd citifinance-node-api
   ```
3. Switch to the desired branch:
   ```bash 
   git checkout <branch-name>
   ```
4. Install project dependencies:
   ```bash 
   npm install`
   ```
5. Update environment configuration in the `.env` file.

6. Start the Node.js application using PM2:
   ```bash 
   pm2 start server.js --name <service-name>
   ```

### Nginx Configuration

create virtual file for both backend and frontend

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`API_KEY`

`ANOTHER_API_KEY`
