const db = require('../db/memcache');
const defaultState = {
  team: [],
  show: false
};
const getResultWithoutScores = (result) => {
  if (!result) { return defaultState; }
  /*
  * For players who just joined or player, if `Show` has been
  * clicked already, they should also see others' scores.
  */
  if (result.show) { return result; }

  let { team, show } = result;
  return {
    team: team.map(player => Object.assign({}, player, { score: null })),
    show
  };
};

const isRoomEmpty = (io, currentRoom) => {
  // the doc for socket.io sucks, just found the answer on
  // https://stackoverflow.com/a/35527764/2798001
  //
  // io.sockets.adapter.rooms[room].length: All connected clients in specific room
  // Object.keys(io.sockets.connected).length: All connected clients
  //
  // if there are no any connections in specific room, io.sockets.adapter.rooms[room]
  // will be `undefined`.
  return !io.sockets.adapter.rooms[currentRoom];
};

module.exports = (socket, io) => {
  console.log(`Client '${socket.id}' connected`);
  let currentRoom = null;

  socket.on('join', (room = '') => {
    currentRoom = room.toLowerCase();
    console.log(`Client '${socket.id}' joined room '${currentRoom}'`);

    socket.join(currentRoom, () => {
      db.get(currentRoom).then(result => {
        if (!result) {
          console.log(`New room '${currentRoom}' created`);
          result = defaultState;
        }
        db.set(currentRoom, result);
        io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
      });
    });
  });

  socket.on('play', (player) => {
    db.get(currentRoom).then(result => {
      if (!result) { return; }

      if (typeof player !== 'object') player = { name: player };
      console.log(`Client '${socket.id}' starts playing in room '${currentRoom}' under the name '${player.name}'`);
      result.team.push(Object.assign(player, {
        id: socket.id,
        score: null,
        voted: false
      }));

      db.set(currentRoom, result);
      io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
    });
  });

  socket.on('vote', (score) => {
    db.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' voted`);
      let votingPlayer = result.team.find(item => item.id === socket.id);
      votingPlayer.score = score;
      votingPlayer.voted = true;

      const action = {
        type: 'vote',
        playerId: votingPlayer.id
      };

      db.set(currentRoom, result);
      io.in(currentRoom).emit('stateUpdate', { ...getResultWithoutScores(result), action });
    });
  });

  socket.on('show', () => {
    db.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' showed the result`);
      result.show = true;

      const action = {
        type: 'show',
        playerId: socket.id
      };

      db.set(currentRoom, result);
      io.in(currentRoom).emit('stateUpdate', { ...result, action });
    });
  });

  socket.on('clear', () => {
    db.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' cleared the result`);
      result.team.forEach(item => {
        item.score = null;
        item.voted = false;
      });
      result.show = false;

      const action = {
        type: 'clear',
        playerId: socket.id
      };

      db.set(currentRoom, result);
      // the boolean is used for clients to indicate it's clear action,
      // then the local state `myScore` could be cleared.
      io.in(currentRoom).emit('stateUpdate', { ...result, action }, true);
    });
  });

  socket.on('disconnect', () => {
    db.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' disconnected`);
      result.team = result.team.filter(item => item.id !== socket.id);

      if (isRoomEmpty(io, currentRoom)) {
        console.log(`All clients of room '${currentRoom}' disconnected, deleting the room`);
        result = defaultState;
        db.del(currentRoom);
      } else {
        db.set(currentRoom, result);
      }

      socket.to(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
    });
  });
}
