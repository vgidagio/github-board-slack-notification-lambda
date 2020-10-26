# Getting started

## Setup services

1. Setup serverless (including AWS)
2. Create a new Slack App
3. Configure a GitHub webhook (you will find out the url after you deploy the service)

## Configure it

1. Copy `serverless.yml.sample` into `serverless.yml` and change your vars in the 
environment section
 - `GITHUB_TOKEN` - Your personal GitHub token
 - `GITHUB_WEBHOOK_SECRET` - The secret you've configured on the webhook in GitHub

2. Copy `project-url-to-slack-webhook-url.js.sample` to `project-url-to-slack-webhook-url.js` and configure it

## Deploy it
```bash 
sls deploy
```

# Logs
```bash
sls logs -f notify
```                                   


# Local invocation
```
nvm use 10
sls invoke local -f notify -p ./fixtures/move.json
```

