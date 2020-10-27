module.exports = ({
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

                    // Mover
                    moverName,
                    moverUrl,
                    moverAvatar,
                  }) =>
  ({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${subjectType} _<${subjectUrl}|${subjectName}>_ moved\n\n
*${fromColName}* -> *${toColName}*\n\n
Moved by <${moverUrl}|${moverName}>`,
        },
        accessory: {
          type: 'image',
          image_url: moverAvatar,
          alt_text: 'mover avatar'
        },
      },

      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `On Board <${projectUrl}|${projectName}>`,
          }
        ]
      },

      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: `See ${subjectType}`,
            },
            url: subjectUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: `See Board`,
            },
            url: projectUrl
          }
        ]
      }
    ]
  });
