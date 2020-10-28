// Include the serverless-slack bot framework
const Slack = require('./slack/index');
const GitHub = require('./github/index');
const store = require('./data');

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

// Env
const gitHub = new GitHub({
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  authToken: process.env.GITHUB_TOKEN,
  org: process.env.GITHUB_ORG,
});

// The function that AWS Lambda will call
exports.handler = slack.handler.bind(slack);

slack.on('slash_command', async (msg, bot) => {
  console.log('msg:', msg);
  const { text, command } = msg;
  switch(command) {
    case '/list-projects':
      const repo = text;
      try {
        const projects = Boolean(repo)
          ? await gitHub.fetchRepoProjects(repo)
          : await gitHub.fetchOrgProjects();
        const abbrProjects = projects
          .map(({name, url}) => `${name} - ${url}`);
        const message = [
          ':raised_hands: Projects',
          ...abbrProjects
        ].join('\n');

        await bot.replyPrivate({
          text: message
        });
      } catch(e) {
        await bot.replyPrivate({
          text: ':sad_cowboy: Could not fetch the projects',
        });
      }
      break;
    case '/subscribe-project':

      const storeProjects = await store.getAllProjectContentUrls();
      console.log('storeProjects:', storeProjects);

      const projectUrl = text;
      try {
        const project = await gitHub.fetchProject(projectUrl);
        const reply = await bot.say({
          text: `Subscribed this channel to board <${project.html_url}|${project.name}> with url ${projectUrl}.\n` +
            `You will start receiving notifications here :tada:`,
        });
        console.log('slack reply:', reply);

        const addReply = await store.addAssoc(msg.channel_name, projectUrl);
        console.log('addReply:', addReply);
      } catch(e) {
        await bot.replyPrivate({
          text: ':sad_cowboy: Could not subscribe to project',
        });
      }
      break;
    default:
      return await bot.replyPrivate({
        text: `:wave: received *${command}*, with\nParams: *${text}*`
      });
  }

  console.log('Replied to slack');
});
