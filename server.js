// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const path = require('path');

// Route Imports
const authRoutes = require('./backend/routes/auth');
const profileRoutes = require('./backend/routes/profile');
const connectDB = require('./backend/config/db');

// Connect to Database
connectDB();

const app = express();

app.get('/favicon.ico', (req, res) => res.status(204).end());

const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'frontend', 'static', 'templates')));
app.use(express.static(path.join(__dirname, 'frontend', 'static')));
app.use('/images', express.static(path.join(__dirname, 'frontend', 'static', 'images')));

// Routes
app.use('/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Simple route to serve frontend pages
app.get('/:page', (req, res) => {
    const page = req.params.page.endsWith('.html') ? req.params.page : `${req.params.page}.html`;
    res.sendFile(path.join(__dirname, 'frontend', 'static', 'templates', page), (err) => {
        if (err) {
            console.log(err);
            res.status(404).send('Page not found');
        }
    });
});
app.get('/', (req, res) => {
    // Check for auth cookie for initial redirect
    const token = req.cookies.token;
    if (token) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'frontend', 'static', 'templates', 'login.html'));
});

// Socket.IO Chat Logic (Simplified)
const onlineUsers = {}; // Simple user-to-socket map
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user logs in (sends their userId)
    socket.on('registerUser', (userId) => {
        onlineUsers[userId] = socket.id;
        console.log(`User ${userId} registered with socket ${socket.id}`);
        // Notify others if needed (e.g., status update)
    });

    // Handle private messages
    socket.on('privateMessage', ({ recipientId, message }) => {
        const recipientSocketId = onlineUsers[recipientId];
        if (recipientSocketId) {
            // Emit message to the recipient
            io.to(recipientSocketId).emit('newMessage', {
                senderId: getUserIdFromSocket(socket.id), // You'd need a reverse lookup or a better system
                message: message,
                timestamp: new Date().toLocaleTimeString()
            });
            // Also send a confirmation/echo to the sender
            socket.emit('messageSent', { message: message });
        } else {
            // Recipient is offline, you'd save the message to DB here
            socket.emit('error', 'User is offline.');
        }
    });

    // Helper (simplified) - in a real app, use the auth middleware session data
    function getUserIdFromSocket(socketId) {
        return Object.keys(onlineUsers).find(key => onlineUsers[key] === socketId);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
        // Remove user from onlineUsers map
        for (const [userId, sockId] of Object.entries(onlineUsers)) {
            if (sockId === socket.id) {
                delete onlineUsers[userId];
                console.log(`User ${userId} disconnected.`);
                break;
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

// Add this in server.js or app.js **before your other routes**
app.get('/favicon.ico', (req, res) => res.status(204).end());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});