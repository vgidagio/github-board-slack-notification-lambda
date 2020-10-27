// Include the serverless-slack bot framework
const Slack = require('./slack/index');

const options = {
  oauthTableName: process.env.SLACK_OAUTH_TABLE_NAME,
  installRedirect: process.env.SLACK_INSTALL_REDIRECT,
  verificationToken: process.env.SLACK_VERIFICATION_TOKEN,

  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_SIGNING_SECRET,

  ignoreBots: true,
};

const slack = new Slack(options);

// The function that AWS Lambda will call
//exports.handler = slack.handler.bind(slack);

exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event));
  callback(null,  {
    statusCode: 200,
    body: event,
  });
}


slack.on('/list-projects', (msg, bot) => {
  // ephemeral reply
  bot.replyPrivate({
    text: ':wave:'
  });
});

slack.on('/add-project', (msg, bot) => {
  console.log(msg);

  const message = {
    // selected button value
    text: msg.actions[0].value
  };

  // public reply
  bot.reply(message);
});
