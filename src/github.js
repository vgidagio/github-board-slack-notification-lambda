const got = require('got');

// Mine
const {
  getAllProjectContentUrls,
  getSlackWebhooksForProjectContentUrl
} = require('./data');
const getMessage = require('./message-template');
const GitHub = require('./github/index');


// Env
const { GITHUB_WEBHOOK_SECRET, GITHUB_TOKEN, GITHUB_ORG } = process.env;
const gitHub = new GitHub({
  webhookSecret: GITHUB_WEBHOOK_SECRET,
  authToken: GITHUB_TOKEN,
  org: GITHUB_ORG,
});

exports.webhook = async (event, context, callback) => {
  const gitHubEvent = event.headers['X-GitHub-Event'];
  const signature = event.headers['X-Hub-Signature'];
  const payload = event.body;

  try {
    await gitHub.validateEvent(gitHubEvent, payload, signature);
  } catch (e) {
    callback(
      new Error('X-Hub-Signature and Calculated Signature do not match.')
    );
    throw e;
  }

  const body = JSON.parse(payload);
  const { sender, action } = body;

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
  const { data: project } = await gitHub.request(project_content_url);
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
  const oldStatus = await gitHub.request('GET /projects/columns/{column_id}', { column_id: old_column_id });
  const newStatus = await gitHub.request('GET /projects/columns/{column_id}', { column_id });
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
    const { data: issue } = await gitHub.request(content_url);
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
    for (let i = 0; i < slackWebhooks.length; i++) {
      const slackWebhookUrl = slackWebhooks[i];
      await got.post(slackWebhookUrl, { json: slackMessage });
      console.log('Slack message sent on webhook:', slackWebhookUrl);
    }
  } catch (err) {
    console.log('Could not send message to Slack.');1
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


exports.projects = async (event, context, callback) => {
  try {
    let repo = false;
    if (event.queryStringParameters && event.queryStringParameters.repo) {
      repo = event.queryStringParameters.repo;
    }
    const projects = Boolean(repo)
      ? await gitHub.fetchRepoProjects(repo)
      : await gitHub.fetchOrgProjects();
    const abbrProjects = projects.map(({name, url}) => `${name} - ${url}`);
    const body = { abbrProjects };
    const response = {
      statusCode: 200,
      body: JSON.stringify(body),
    };
    callback(null, response);
  } catch(e) {
    console.log(e);
    callback(new Error(e));
  }
}
