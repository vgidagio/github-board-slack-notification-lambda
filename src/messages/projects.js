const { escape, url } = require('./utils');
const projectToBlock = (project, isSubscribed, repo) => {
  const value = project.url + '--' + repo;
  let accessory = {
    type: 'button',
    text: {
      type: 'plain_text',
      text: 'Subscribe',
      emoji: true
    },
    style: 'primary',
    value,
    action_id: 'subscribe'
  };

  if (isSubscribed) {
    accessory = {
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Unsubscribe',
        emoji: true
      },
      style: 'danger',
      value,
      action_id: 'unsubscribe'
    };
  }
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: url(project.html_url, project.name)
    },
    accessory,
  }
}

module.exports.getListProjectsMessage = (projects, allSubscriptions, repo) => {
  const projectBlocks = projects.map((project) => {
    const isSubscribed = allSubscriptions.find(({ project_url }) => project_url === project.url);
    return projectToBlock(project, isSubscribed, repo)
  });
  const title = repo
    ? `Projects for *${escape(repo)}*`
    : `Projects for Organization`;

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: title
        }
      },
      {
        type: 'divider'
      },
      ...projectBlocks,
      {
        type: 'divider'
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Looks good, bye!',
              emoji: true
            },
            action_id: 'bye',
          }
        ]
      },
    ]
  }
}
