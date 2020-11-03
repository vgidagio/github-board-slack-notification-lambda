const { escape, url } = require('./utils');

function getMessage(
  {
    // Subject: name or issue
    subjectType,
    subjectNumber,
    subjectName,
    subjectUrl,

    // Columns
    fromColName,
    toColName,

    // Project Board
    projectName,
    projectUrl,

    // Mover
    moverName,
    moverUrl,
    moverAvatar,
  }
) {
  const subjectTitle = Boolean(subjectNumber) ?
    `#${subjectNumber} ${subjectName}`
    : subjectName.substr(0, 20);

  const mainBlockText =
    `> *${url(subjectUrl, subjectTitle)}*\n` +
    `> _${escape(fromColName)}_ => _${escape(toColName)}_`;
  const contextBlockText =
    `${subjectType} moved by *${url(moverUrl, moverName)}* ` +
    `on *${url(projectUrl, projectName)}*`;

  const mainBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: mainBlockText,
    }
  };

  const contextBlock = {
    type: 'context',
    elements: [
      {
        type: 'image',
        image_url: moverAvatar,
        alt_text: 'mover avatar'
      },
      {
        type: 'mrkdwn',
        text: contextBlockText,
      }
    ]
  };

  return {
    blocks: [
      mainBlock,
      contextBlock,
    ]
  };
}

module.exports = getMessage;
