const got = require('got');
const qs = require('querystring');

class Client {

  static async install(options, payload) {
    const { clientId, clientSecret } = options;
    const message = {
      code: payload.code,
      client_id: clientId,
      client_secret: clientSecret,
    };
    const { body } = await got.post(
      'https://slack.com/api/oauth.v2.access',
      {
        form: message,
        responseType: 'json'
      }
    );

    if (!body.ok) {
      throw new Error('Token error: ' + body.error);
    }

    return body;
  }


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
      token: this.token,
      channel: this.channel
    };


    const targetUrl = endPoint.match(/^http/i)
        ? endPoint
        : `https://slack.com/api/${endPoint}`
    console.log('targetUrl:', targetUrl);
    console.log('message:', message);

    const response = await got.post(
      targetUrl,
      {
        json: message,
        responseType: 'json'
      }
    );
    return response.body;
  }


  /**
   * Response Url
   *
   * @return {String} the payload's response url
   */
  get response_url() {
    if (this.payload) {
      return this.payload.response_url;
    }
  }


  /**
   * Channel
   *
   * @return {String} the payload's channel
   */
  get channel() {
    let payload = this.payload, event = payload.event, auth = this.auth;
    // Slash Commands
    if (payload.channel_id) return payload.channel_id;

    // Interactive Messages
    else if (payload.channel) return payload.channel.id;

    // Events API
    else if (event && event.channel) return event.channel;
    else if (event && event.item) return event.item.channel;
  }


  /**
   * API Token
   *
   * @return {String} the team's API token
   */
  get token() {
    const auth = this.auth;
    return auth.bot
      ? auth.bot.bot_access_token
      : auth.access_token;
  }


  /**
   * Send Reply
   *
   * @param {object} message - The message to reply with
   * @param {boolean} ephemeral - Flag to make the message ephemeral
   * @return {Promise} A promise with the API response
   */
  reply(message, ephemeral) {
    // invalid ephemeral requests
    if (!this.response_url && ephemeral) {
      return Promise.reject('Message can\'t be private');

      // slash commands and interactive messages
    } else if (this.response_url) {
      if (!ephemeral) message.response_type = 'in_channel';
      console.log('here!');
      return this.send(this.response_url, message);

      // incoming webhooks
    } else if (this.auth.incoming_webhook && !this.channel && !message.channel) {
      return this.send(this.auth.incoming_webhook.url, message);

      // fallback
    } else {
      return this.say(message);
    }
  }


  /**
   * Send Private Reply
   *
   * @param {object} message - The message to reply with
   * @return {Promise} A promise with the API response
   */
  replyPrivate(message) {
    return this.reply(message, true);
  }


  /**
   * Send Message
   *
   * @param {object} message - The message to post
   * @return {Promise} A promise with the API result
   */
  say(message) {
    return this.send('chat.postMessage', message);
  }
}


module.exports = Client;
