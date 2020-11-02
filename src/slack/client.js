const got = require('got');

class Client {

  constructor(auth, payload) {
    this.auth = auth;
    this.payload = payload;
  }

  async send(endPoint, message) {
    // convert the string message to a message object
    if (typeof(message) === 'string') message = { text: message };

    // set defaults when available
    message = {
      ...message,
      channel: this.channel
    };

    // If it's a response_url it will be a full url
    const targetUrl = endPoint.match(/^http/i)
        ? endPoint
        : `https://slack.com/api/${endPoint}`


    const response = await got.post(
      targetUrl,
      {
        headers: {
          authorization: `Bearer ${this.auth}`
        },
        json: message,
      }
    );
    return response.body;
  }


  get response_url() {
    if (this.payload) {
      return this.payload.response_url;
    }
  }


  get channel() {
    let payload = this.payload, event = payload.event;
    // Slash Commands
    if (payload.channel_id) return payload.channel_id;

    // Interactive Messages
    else if (payload.channel) return payload.channel.id;

    // Events API
    else if (event && event.channel) return event.channel;
    else if (event && event.item) return event.item.channel;
  }


  async reply(message, ephemeral) {
    if (!this.response_url && ephemeral) {
      // invalid ephemeral requests
      return Promise.reject('Message can\'t be private');
    } else if (this.response_url) {
      // slash commands and interactive messages
      if (!ephemeral) message.response_type = 'in_channel';
      return await this.send(this.response_url, message);
    } else if (this.auth.incoming_webhook && !this.channel && !message.channel) {
      // incoming webhooks
      return await this.send(this.auth.incoming_webhook.url, message);
    } else {
      // fallback
      return await this.say(message);
    }
  }


  replyPrivate(message) {
    return this.reply(message, true);
  }


  say(message) {
    return this.send('chat.postMessage', message);
  }
}


module.exports = Client;
