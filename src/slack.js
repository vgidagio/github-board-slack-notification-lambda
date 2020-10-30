// Include the serverless-slack bot framework
const Slack = require('./slack/index');
const GitHub = require('./github/index');
const store = require('./data');
const { getListProjectsMessage } = require('./templates/projects');

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

const onListProjects = async (channelId, repo, bot) => {
  try {
    const projects = Boolean(repo)
      ? await gitHub.fetchRepoProjects(repo)
      : await gitHub.fetchOrgProjects();
    const allSubscriptions = await store.getSubscriptionsForChannelId(channelId);
    const message = getListProjectsMessage(projects, allSubscriptions);
    await bot.reply(message);
  } catch (e) {
    await bot.replyPrivate({
      text: ':sad_cowboy: Could not fetch the projects',
    });
  }
}

const onUnsubscribeAction = async (channelId, projectUrl, bot) => {
  try {
    const project = await gitHub.fetchProject(projectUrl);
    await store.removeSubscription({
      channel_id: channelId,
      project_url: projectUrl,
    });
    const confirmation =
      `\n⚠️️ Unsubscribed this channel from board <${project.html_url}|${project.name}>!`;

    // Reply
    await bot.reply({ text: confirmation }, false);
  } catch (e) {
    console.error(e);
    await bot.replyPrivate({
      text: ':sad_cowboy: Could not subscribe to project',
    });
  }
}

const onSubscribeAction = async (channelId, projectUrl, bot) => {
  try {
    const project = await gitHub.fetchProject(projectUrl);
    await store.addSubscription({
      channel_id: channelId,
      project_url: projectUrl,
      project
    });
    const confirmation =
      `\n:tada: Subscribed this channel to board <${project.html_url}|${project.name}>!`;

    // Reply
    const c = await bot.reply({
      text: confirmation,
      replace_original: true,
    });
    console.log('c:', c);
  } catch (e) {
    console.error(e);
    await bot.replyPrivate({
      text: ':sad_cowboy: Could not subscribe to project',
    });
  }
}

slack.on('slash_command', async (msg, bot) => {
  const { text, command } = msg;
  const channelId = msg.channel_id;
  switch (command) {
    case '/list-projects':
      await onListProjects(channelId, text, bot);
      break;
    case '/subscribe-project':
      //await onSubscribeAction(channelId, text, bot);
      break;
    default:
      return await bot.replyPrivate({
        text: `:wave: received *${command}*, with\nParams: *${text}*`
      });
  }

  console.log('Replied to slack');
});

slack.on('block_actions', async (msg, bot) => {
  console.log('msg:', msg);
  const action = msg.actions[0];
  const actionId = action.action_id;

  if (actionId !== 'subscribe' && actionId !== 'unsubscribe') {
    return await bot.replyPrivate({
      text: `:wave: Received block_action *${action}*`
    });
  }

  const projectUrl = action.value;
  const channelId = msg.channel.id;
  switch(actionId) {
    case 'subscribe':
      await onSubscribeAction(channelId, projectUrl, bot);
      break;
    case 'unsubscribe':
      await onUnsubscribeAction(channelId, projectUrl, bot);
      break;
  }
})
