const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');  // Import CORS

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Enable CORS for your frontend URL (replace with your actual frontend URL)
const corsOptions = {
  origin: 'https://omechat-45sm.vercel.app',  // Your frontend URL
  methods: 'GET,POST',
  allowedHeaders: 'Content-Type,Authorization',
};

app.use(cors(corsOptions));  // Use CORS middleware with the specific options

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let waitingUsers = []; // Users waiting for a match

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('requestMatch', () => {
    // Add the user to the waiting list if they are not already waiting
    if (!socket.waiting && !waitingUsers.includes(socket)) {
      waitingUsers.push(socket);
      socket.waiting = true;
    }

    // If there are two users waiting, match them
    if (waitingUsers.length >= 2) {
      const user1 = waitingUsers.shift();
      const user2 = waitingUsers.shift();

      // Mark the users as connected and set their partners
      user1.partner = user2;
      user2.partner = user1;

      user1.emit('match', { message: 'You are now connected to a stranger!' });
      user2.emit('match', { message: 'You are now connected to a stranger!' });

      user1.on('message', (msg) => user2.emit('message', msg));
      user2.on('message', (msg) => user1.emit('message', msg));

      // Handle disconnection and next button logic
      user1.on('disconnect', () => {
        if (user1.partner) {
          user1.partner.emit('end', { message: 'Stranger disconnected.' });
          user1.partner.partner = null;
        }
        user1.waiting = false;
        user1.partner = null;
        waitingUsers = waitingUsers.filter(user => user !== user1);
      });

      user2.on('disconnect', () => {
        if (user2.partner) {
          user2.partner.emit('end', { message: 'Stranger disconnected.' });
          user2.partner.partner = null;
        }
        user2.waiting = false;
        user2.partner = null;
        waitingUsers = waitingUsers.filter(user => user !== user2);
      });
    }
  });

  // Handle Next button press (disconnect the imposter and innocent user, and reset)
  socket.on('nextRequest', () => {
    // If this user has a partner, treat them as the "imposter" (the one who presses next)
    if (socket.partner) {
      // Disconnect both the user and their partner
      socket.partner.emit('end', { message: 'Stranger disconnected.' });

      // Mark the partner as innocent, they won't reconnect unless they press next
      socket.partner.waiting = false; // The innocent user won't reconnect automatically

      // The user pressing next (imposter) should be treated as disconnected
      socket.partner.partner = null; // Disconnect the partner
    }

    // Reset this user's partner and re-add them to the waiting list
    socket.partner = null; // Mark this user as no longer connected
    socket.waiting = true; // Make the imposter wait for a new match

    waitingUsers.push(socket); // Add the imposter back into the waiting list

    // Try to match again if possible
    if (waitingUsers.length >= 2) {
      const user1 = waitingUsers.shift();
      const user2 = waitingUsers.shift();
      user1.partner = user2;
      user2.partner = user1;

      user1.emit('match', { message: 'You are now connected to a stranger!' });
      user2.emit('match', { message: 'You are now connected to a stranger!' });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.partner) {
      socket.partner.emit('end', { message: 'Stranger disconnected.' });
      socket.partner.partner = null;
    }
    waitingUsers = waitingUsers.filter(user => user !== socket);
    socket.waiting = false;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
