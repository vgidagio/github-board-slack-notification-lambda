const Slack = require('./slack/index');
const GitHub = require('./github/index');
const store = require('./data');
const { getListProjectsMessage } = require('./messages/projects');


const slack = new Slack({
  oauthToken: process.env.SLACK_OAUTH_TOKEN,
  verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
});

const gitHub = new GitHub({
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  authToken: process.env.GITHUB_TOKEN,
  org: process.env.GITHUB_ORG,
});

// Event handler
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

    await fn(channelId, project);

    const repoName = repo ? repo : 'org level';
    const notification = actionId === 'subscribe'
      ? `:bell: Subscribed to board <${project.html_url}|${project.name}> (${repoName})`
      : `:no_bell: Unsubscribed from board <${project.html_url}|${project.name}> (${repoName})`;

    const message = await getListMessage(channelId, repo);

    await bot.say(notification);
    await bot.replyPrivate({ ...message, replace_original: true });
  } catch(e) {
    console.error(e);
    await bot.replyPrivate({
      text: ':sad_cowboy: Could not perform action',
    });
  }
})
