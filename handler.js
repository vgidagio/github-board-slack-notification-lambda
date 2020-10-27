const got = require('got');
const { Webhooks } = require('@octokit/webhooks');
const { request: gitHubRequest } = require('@octokit/request');

// Mine
const getMessage = require('./message-template');
const {
  getAllProjectContentUrls,
  getSlackWebhooksForProjectContentUrl
} = require('./data');


// Env
const { GITHUB_WEBHOOK_SECRET, GITHUB_TOKEN } = process.env;

module.exports.notify = async (event, context, callback) => {
  const gitHubEvent = event.headers['X-GitHub-Event'];
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
      name: gitHubEvent,
      payload: payload,
      signature: signature,
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

  const { project_card, changes } = body;
  const {
    creator, note, column_id, content_url,
    project_url: project_content_url
  } = project_card;


  // Project information
  const { data: project } = await requestWithAuth(project_content_url);
  const projectUrl = project.html_url;
  const projectName = project.name;

  // Filter out un-configured
  const allProjectContentUrls = getAllProjectContentUrls();
  if (!allProjectContentUrls.includes(project_content_url)) {
    const message = `No webhook configured for ${projectName} with URL ${project_content_url}`;
    console.log(message);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ message }),
    };
    callback(null, response);
    return;
  }

  // Column information
  const old_column_id = changes.column_id.from;
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
    const { data: issue } = await requestWithAuth(content_url);
    subjectName = issue.title;
    subjectUrl = issue.html_url;
    authorName = issue.user.login;
    authorUrl = issue.user.html_url;
    authorAvatar = issue.user.avatar_url;
  } else {
    subjectName = note;
    subjectUrl = project.html_url;
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
    const slackWebhooks = getSlackWebhooksForProjectContentUrl(project_content_url);
    for(let i = 0; i < slackWebhooks.length; i++){
      const slackWebhookUrl = slackWebhooks[i];
      await got.post(slackWebhookUrl, { json: slackMessage });
      console.log('Slack message sent on webhook:', slackWebhookUrl);
    }
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
