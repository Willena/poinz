/**
 * A user sets his username.
 */

const schema = {
  allOf: [
    {
      $ref: 'command'
    },
    {
      properties: {
        payload: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              format: 'username'
            }
          },
          required: ['username'],
          additionalProperties: false
        }
      }
    }
  ]
};

const setUsernameCommandHandler = {
  schema,
  fn: (pushEvent, room, command, userId, authenticatedUser) => {
    if (authenticatedUser && authenticatedUser !== command.payload.username) {
      return;
      //throw new Error('Cannot change username when authenticated via proxy');
    }
    pushEvent('usernameSet', command.payload);
  }
};

export default setUsernameCommandHandler;
