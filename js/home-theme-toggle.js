// js/home-theme-toggle.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("home-theme-toggle.js loaded and running."); // Debugging line

    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Function to set the theme based on localStorage or system preference
    const setTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
            if (themeToggleBtn) { // Ensure button exists before updating textContent
                themeToggleBtn.textContent = '🌙'; // Moon icon for dark mode
            }
        } else {
            body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            if (themeToggleBtn) { // Ensure button exists before updating textContent
                themeToggleBtn.textContent = '☀️'; // Sun icon for light mode
            }
        }
    };

    // Check for saved theme preference or system preference on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        // If no saved theme, check system preference and default to light if preferred
        setTheme('light');
    } else {
        // Default to dark mode if no preference is found
        setTheme('dark');
    }

    // Toggle theme on button click
    if (themeToggleBtn) { // Added a check to ensure the button exists before adding listener
        console.log("Theme toggle button found:", themeToggleBtn); // Debugging line
        themeToggleBtn.addEventListener('click', () => {
            console.log("Theme toggle button clicked!"); // Debugging line
            if (body.classList.contains('light-mode')) {
                setTheme('dark');
            } else {
                setTheme('light');
            }
        });
    } else {
        console.warn("Theme toggle button with ID 'theme-toggle' not found."); // Debugging line
    }


    // --- Profile Dropdown Functionality ---
    const profileDropdownButton = document.getElementById('profileDropdownButton');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileDropdownButton && profileDropdown) {
        profileDropdownButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevents the document click listener from immediately closing it
            profileDropdown.classList.toggle('show');
        });
    
        // Close dropdown if clicked outside
        document.addEventListener('click', (event) => {
            if (!profileDropdownButton.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }
});