var _ = require('lodash'),
    ntlmUtil = require('httpntlm').ntlm,

    STATES = {
        INITIALIZED: 'INITIALIZED',
        AUTH_DEMANDED: 'AUTH_DEMANDED',
        T1_MSG_CREATED: 'T1_MSG_CREATED',
        T3_MSG_CREATED: 'T3_MSG_CREATED'
    },

    _debug = _.noop || console.log.bind(console, 'ntlm-debug:');

module.exports = {
    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    init: function (item, run, cursor, done) {
        _debug('initializing.. ', this.toJSON());
        this._state = STATES.INITIALIZED;
        _debug('initialized.. ', this.toJSON());
        done(null);
    },

    /**
     * Verifies whether the request has correct NTLM credentials.
     *
     * @param {Item} item
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    pre: function (item, run, cursor, done) {
        _debug('pre-verification...', this.toJSON());
        if (!this._state) {
            _debug('pre-verification failed!', this.toJSON());
            return done(null, false);
        }
        _debug('pre-verification successful', this.toJSON());
        done(null, true);
    },

    /**
     * Verifies whether the no auth succeeded. (Which means, does nothing.)
     *
     * @param {Item} item
     * @param {Response} response
     * @param {Run} run
     * @param {Cursor} cursor
     * @param done
     */
    post: function (item, response, run, cursor, done) {
        _debug('post-verification...', this.toJSON());
        if (response.code !== 401 && response.code !== 403) {
            _debug('response code is non 4xx, not performing auth', this.toJSON(), response.code);
            return done(null, true);
        }

        var auth = this,
            typeOneMessage,
            typeTwoMessage,
            typeThreeMessage;

        _debug('entering the state machine...', auth._state);
        if (auth._state === STATES.INITIALIZED) {
            _debug('state is initialized');

            if (!(response.headers.get('www-authenticate') === 'NTLM' || response.headers.get('www-authenticate') === 'Negotiate')) {
                _debug('no auth was demanded, just exiting without replay');
                return done(null, true);
            }

            // Create a type 1 message to send to the server
            typeOneMessage = ntlmUtil.createType1Message({
                domain: auth.domain,
                workstation: auth.workstation || ''
            });

            _debug('type 1 msg created..', typeOneMessage.toString());

            // Add the type 1 message as the auth header
            item.request.upsertHeader({
                key: 'Authorization',
                value: typeOneMessage
            });

            _debug('added t1 msg to request', item.request.headers.toJSON());

            // Update the state
            auth._state = STATES.T1_MSG_CREATED;

            _debug('replaying.. current state is:', auth._state);

            // ask runtime to replay the request
            return done(null, false);
        } else if (auth._state = STATES.T1_MSG_CREATED) {
            _debug('state is t1 msg created');

            // At this point, we can assume that the type 1 message was sent to the server
            typeTwoMessage = ntlmUtil.parseType2Message(response.headers.get('www-authenticate') || '');

            _debug('parsed t2 msg', typeTwoMessage && typeTwoMessage.toString());

            if (!typeTwoMessage) {
                _debug('whoops, t2 msg was invalid', typeTwoMessage);
                return done(new Error('ntlm: server did not correctly process authentication request'));
            }

            _debug('creating t3 msg...');
            typeThreeMessage = ntlmUtil.createType3Message(typeTwoMessage, {
                domain: auth.domain,
                workstation: auth.workstation || '',
                username: auth.username,
                password: auth.password
            });

            _debug('created t3 msg', typeThreeMessage && typeThreeMessage.toString());

            // Now create the type 3 message, and add it to the request
            item.request.upsertHeader({
                key: 'Authorization',
                value: typeThreeMessage
            });

            _debug('added t3 msg to request', item.request.headers.toJSON());

            auth._state = STATES.T3_MSG_CREATED;

            _debug('replaying.. current state is:', auth._state);

            // ask runtime to replay the request
            return done(null, false);
        } else if (auth._state === STATES.T3_MSG_CREATED) {
            // Means we have tried to authenticate, so we should stop here without worrying about anything
            _debug('auth is done, moving on');
            return done(null, true);
        } else {
            // We are in an undefined state
            _debug('wtf, we are in an invalid state', this.toJSON());
            done(null, true);
        }
    }
};
