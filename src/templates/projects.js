const projectToBlock = (project, isSubscribed) => {
  let accessory = {
    type: 'button',
    text: {
      type: 'plain_text',
      text: 'Subscribe',
      emoji: true
    },
    style: 'primary',
    value: project.url,
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
      value: project.url,
      action_id: 'unsubscribe'
    };
  }
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${project.html_url}|${project.name}>`
    },
    accessory,
  }
}

module.exports.getListProjectsMessage = (projects, allSubscriptions) => {
  const projectBlocks = projects.map((project) => {
    const isSubscribed = allSubscriptions.find(({project_url}) => project_url === project.url);
    return projectToBlock(project, isSubscribed)
  });
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Projects'
        }
      },
      {
        type: "divider"
      },
      ...projectBlocks,
    ]
  }
}
