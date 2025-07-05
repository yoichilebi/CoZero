//
// theme-toggle.js
// Handles the logic for switching between light and dark modes.
//
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check if user has saved preference when the page loads
if (localStorage.getItem('theme') === 'light') {
    body.classList.add('light-mode');
    themeToggle.textContent = '☀️'; // Set icon for light mode
} else {
    // Optional: If no preference or preference is 'dark', ensure '🌙' icon is shown
    themeToggle.textContent = '🌙';
}

// Toggle light/dark mode when the button is clicked
themeToggle.addEventListener('click', () => {
    // Toggle the 'light-mode' class on the body
    body.classList.toggle('light-mode');

    // Update localStorage and button text based on the current mode
    if (body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '☀️'; // Change icon to sun for light mode
    } else {
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '🌙'; // Change icon to moon for dark mode
    }
});
