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

const getListMessage = async (channelId, repo) => {
  const projects = Boolean(repo)
    ? await gitHub.fetchRepoProjects(repo)
    : await gitHub.fetchOrgProjects();
  const allSubscriptions = await store.getSubscriptionsForChannelId(channelId);
  return getListProjectsMessage(projects, allSubscriptions, repo);
}

const onListProjects = async (channelId, repo, bot) => {
  try {
    const message = await getListMessage(channelId, repo);
    await bot.replyPrivate(message);
  } catch (e) {
    console.error(e);
    await bot.replyPrivate({
      text: ':sad_cowboy: Could not fetch the projects',
    });
  }
}

const onUnsubscribeAction = async (channelId, project) => {
  return await store.removeSubscription({
    channel_id: channelId,
    project_url: project.url,
  });
}

const onSubscribeAction = async (channelId, project) => {
  return await store.addSubscription({
    channel_id: channelId,
    project_url: project.url,
    project
  });
}

slack.on('slash_command', async (msg, bot) => {
  const { channel_id: channelId, text: repo, command } = msg;
  if (command === '/list-projects') {
    await onListProjects(channelId, repo, bot);
  } else {
    await bot.replyPrivate({
      text: `:wave: received *${command}*`
    });
  }

  console.log('Replied to slack');
});

slack.on('block_actions', async (msg, bot) => {
  const action = msg.actions[0];
  const actionId = action.action_id;

  if (actionId === 'bye') {
    return await bot.replyPrivate({ delete_original: true });
  }

  if (actionId !== 'subscribe' && actionId !== 'unsubscribe') {
    return await bot.replyPrivate({
      text: `:wave: received block_action *${action}*`
    });
  }

  const projectUrl = action.value.split('--')[0];
  const repo = action.value.split('--')[1];
  const channelId = msg.channel.id;

  try {
    const project = await gitHub.fetchProject(projectUrl);
    const fn = actionId === 'subscribe'
      ? onSubscribeAction
      : onUnsubscribeAction;

    const response = await fn(channelId, project);
    console.log('response:', response);

    const repoName = repo ? repo : 'org level';
    const notification = actionId === 'subscribe'
      ? `:bell: Subscribed to board <${project.html_url}|${project.name}> (${repoName})`
      : `:no_bell: Unsubscribed from board <${project.html_url}|${project.name}> (${repoName})`;

    const message = await getListMessage(channelId, repo);
    console.log('message:', message);

    await bot.replyPrivate({ ...message, replace_original: true });
    await bot.say(notification);
  } catch(e) {
    console.error(e);
    await bot.replyPrivate({
      text: ':sad_cowboy: Could not perform action',
    });
  }
})
