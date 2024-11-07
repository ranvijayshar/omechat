const socket = io();

const messages = document.getElementById('messages');
const input = document.getElementById('input');
const loading = document.getElementById('loading');
const nextButton = document.getElementById('next-button');

let chatHistory = []; // Array to store chat messages
let isConnected = false; // Track connection status

// Hide loading animation initially
loading.style.display = 'none'; 
input.disabled = true; // Disable input initially

// Function to display a message in the chat window
function displayMessage(text, isMine) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.classList.add('message');
    if (isMine) {
        msg.classList.add('my-message'); // Your own message on the right
    } else {
        msg.classList.add('stranger-message'); // Stranger's message on the left
    }
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

// Handle Next button click
nextButton.addEventListener('click', () => {
    loading.style.display = 'block'; // Show loading animation
    input.style.display = 'none'; // Hide input field
    nextButton.style.display = 'none'; // Hide Next button
    clearMessages(); // Clear messages on reconnect
    chatHistory = []; // Clear chat history to start fresh
    isConnected = false; // Reset connection status
    input.disabled = true; // Disable input
    socket.emit('nextRequest'); // Emit nextRequest to the server
});

// Listen for a match event to know the user has been paired
socket.on('match', (data) => {
    loading.style.display = 'none'; // Hide loading animation when connected
    input.style.display = 'block';  // Show input field
    input.disabled = false; // Enable input
    isConnected = true; // Set connection status

    // Display chat history
    chatHistory.forEach(message => {
        displayMessage(message.text, message.isMine);
    });

    // Optionally display the stranger's message if provided
    if (data.message) {
        displayMessage(data.message, false);
    }

    // Make sure the Next button is visible after a match
    nextButton.style.display = 'block';
});

// Listen for incoming messages from the stranger
socket.on('message', (data) => {
    const messageText = `Stranger: ${data}`;
    displayMessage(messageText, false);
    chatHistory.push({ text: messageText, isMine: false }); // Store in history
});

// Handle sending messages
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim() !== '' && isConnected) {
        const msg = input.value;
        socket.emit('message', msg);
        
        const messageText = `You: ${msg}`;
        displayMessage(messageText, true); // Display your own message
        chatHistory.push({ text: messageText, isMine: true }); // Store in history
        input.value = '';
    }
});

// Listen for end of chat
socket.on('end', (data) => {
    displayMessage(data.message, false);
    input.style.display = 'none'; // Hide input field until paired with new stranger
    nextButton.style.display = 'block'; // Show the next button
    isConnected = false; // Reset connection status
    input.disabled = true; // Disable input
});

// Function to clear messages
function clearMessages() {
    messages.innerHTML = ''; // Clear message history in the chat window
}

// Listen for disconnect event
socket.on('disconnect', () => {
    clearMessages(); // Clear messages when disconnected
    input.style.display = 'none'; // Hide input when disconnected
    nextButton.style.display = 'block'; // Show the next button when disconnected
    loading.style.display = 'none'; // Ensure loading is hidden on disconnect
    isConnected = false; // Reset connection status
    input.disabled = true; // Disable input
});
