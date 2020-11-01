const EventEmitter = require('events');
const qs = require('querystring');
const Client = require('./client');


class Slack extends EventEmitter {
  options;

  constructor(options = {
    oauthToken: null,
    verificationToken: null,
    ignoreBots: true,
  }) {
    super();
    this.options = options;
  }


  handler(event, context, callback) {
    if (event.httpMethod === 'POST') {
      this.event(event, context, callback);
    }
  }


  async event(event, context, callback) {
    // console.log('event:', JSON.stringify(event));
    let payload = event.body;
    if (payload.charAt(0) === '{') {
      payload = JSON.parse(payload);
    } else {
      payload = qs.parse(payload);
    }

    if (payload.payload) {
      payload = JSON.parse(payload.payload);
    }

    // console.log('payload:', payload);

    // Verification Token
    const verificationToken = this.options.verificationToken;
    if (verificationToken && verificationToken !== payload.token) {
      return context.fail('[401] Unauthorized');
    }

    // Events API challenge
    if (payload.challenge) {
      const response = {
        statusCode: 200,
        body: payload.challenge
      };
      return callback(null, response);
    } else {
      const response = {
        statusCode: 200,
        body: null
      };
      callback(null, response);
    }

    // Ignore Bot Messages
    if (!this.options.ignoreBots || !(payload.event || payload).bot_id) {
      const auth = this.options.oauthToken;
      this.notify(payload, auth);
    }
  }


  notify(payload, auth) {
    let events = ['*'];
    let bot = new Client(auth, payload);

    // notify incoming message by type
    if (payload.type) events.push(payload.type);

    // notify event triggered by event type
    if (payload.event) events.push('event', payload.event.type);

    // notify slash command by command
    if (payload.command) events.push('slash_command', payload.command);

    // notify webhook triggered by trigger word
    if (payload.trigger_word) events.push('webhook', payload.trigger_word);

    // notify message button triggered by callback_id
    if (payload.callback_id) events.push('interactive_message', payload.callback_id);

    // trigger all events
    events.forEach(name => this.emit(name, payload, bot, this.store));
  }
}

module.exports = Slack;
