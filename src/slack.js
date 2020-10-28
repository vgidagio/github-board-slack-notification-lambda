// Include the serverless-slack bot framework
const Slack = require('./slack/index');

const options = {
  oauthTableName: process.env.SLACK_OAUTH_TABLE_NAME,
  installRedirect: process.env.SLACK_INSTALL_REDIRECT,
  verificationToken: process.env.SLACK_VERIFICATION_TOKEN,

  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  clientScopes: process.env.SLACK_CLIENT_SCOPES,

  ignoreBots: true,
};

const slack = new Slack(options);

// The function that AWS Lambda will call
exports.handler = slack.handler.bind(slack);

slack.on('slash_command', (msg, bot) => {
  console.log('msg:', msg);
  // ephemeral reply
  bot.replyPrivate({
    text: ':wave:'
  });
});
