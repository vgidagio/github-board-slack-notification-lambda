const got = require('got');
const { Webhooks } = require('@octokit/webhooks');
const { request: gitHubRequest } = require('@octokit/request');

// Mine
const getMessage = require('./message-template');
const projectUrlToSlackWebhookUrl = require('./project-url-to-slack-webhook-url');

// Env
const { GITHUB_WEBHOOK_SECRET, GITHUB_TOKEN } = process.env;

const sendToSlack = (slackWebhookUrl, message) =>
  got.post(slackWebhookUrl, { json: message })

module.exports.notify = async (event, context, callback) => {
  const githubEvent = event.headers['X-GitHub-Event'];
  const signature = event.headers['X-Hub-Signature'];
  const payload = event.body;
  const body = JSON.parse(payload);
  const { sender, action } = body;

  if (!GITHUB_WEBHOOK_SECRET) {
    callback(new Error('Missing GITHUB_WEBHOOK_SECRET'));
  }

  if (!GITHUB_TOKEN) {
    callback(new Error('Missing GITHUB_TOKEN'));
  }

  try {
    const webhooks = new Webhooks({
      secret: GITHUB_WEBHOOK_SECRET,
    });

    await webhooks.verifyAndReceive({
      name: githubEvent,
      signature: signature,
      payload: payload,
    });
  } catch (e) {
    callback(
      new Error('X-Hub-Signature and Calculated Signature do not match.')
    );
    throw e;
  }

  const requestWithAuth = gitHubRequest.defaults({
    headers: {
      authorization: `token ${GITHUB_TOKEN}`,
    },
    mediaType: {
      previews: [
        'inertia'
      ]
    }
  });

  if (action !== 'moved') {
    const message = `Action ${action} was not forwarded to Slack.`;
    console.log(message);
    console.log('Event details');
    console.log(event);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ message }),
    };
    callback(null, response);
    return;
  }

  const { creator, note, column_id, content_url, project_url } = body.project_card;


  // Project information
  const projectResponse = await requestWithAuth(project_url);
  const projectUrl = projectResponse.data.html_url;
  const projectName = projectResponse.data.name;

  // Filter out un-configured
  const allConfiguredProjects = Object.keys(projectUrlToSlackWebhookUrl);
  if (!allConfiguredProjects.includes(project_url)) {
    const message = `No webhook configured for ${projectName} with URL ${project_url}`;
    console.log(message);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ message }),
    };
    callback(null, response);
    return;
  }

  // Column information
  const old_column_id = body.changes.column_id.from;
  const oldStatus = await requestWithAuth('GET /projects/columns/{column_id}', { column_id: old_column_id });
  const newStatus = await requestWithAuth('GET /projects/columns/{column_id}', { column_id });
  const fromColName = oldStatus.data.name;
  const toColName = newStatus.data.name;

  // Author information: name, url, avatar
  let authorName = creator.login;
  let authorUrl = creator.html_url;
  let authorAvatar = creator.avatar_url;

  // Ticket / Note information: type, name, url, author
  const isIssue = !!content_url;
  const subjectType = isIssue ? 'Issue' : 'Note';
  let subjectName;
  let subjectUrl;

  if (isIssue) {
    const issueResponse = await requestWithAuth(content_url);
    const { data } = issueResponse;
    subjectName = data.title;
    subjectUrl = data.html_url;
    authorName = data.user.login;
    authorUrl = data.user.html_url;
    authorAvatar = data.user.avatar_url;
  } else {
    subjectName = note;
    subjectUrl = projectResponse.data.html_url;
  }

  // Mover information: name, url, avatar
  const moverName = sender.login;
  const moverUrl = sender.html_url;
  const moverAvatar = sender.avatar_url;

  const slackMessage = getMessage({
    // Subject: name or issue
    subjectType,
    subjectName,
    subjectUrl,

    // Columns
    fromColName,
    toColName,

    // Project Board
    projectName,
    projectUrl,

    // Author
    authorName,
    authorUrl,
    authorAvatar,

    // Mover
    moverName,
    moverUrl,
    moverAvatar,
  });

  try {
    Object.keys(projectUrlToSlackWebhookUrl)
      .filter(projectUrl => projectUrl === project_url)
      .forEach(projectUrl => {
        const slackWebhookUrl = projectUrlToSlackWebhookUrl[projectUrl];
        sendToSlack(slackWebhookUrl, slackMessage);
      });
  } catch (err) {
    console.log('Could not send message to slack.');
    console.log(err);
    callback(err);
  }


  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Event processed'
    }),
  };
  callback(null, response);
};
