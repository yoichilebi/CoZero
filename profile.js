// js/profile.js

// Import necessary Firebase modular SDK functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    orderBy,
    getDocs,
    deleteDoc, // Import deleteDoc for deleting a single document
    writeBatch // Import writeBatch for batch operations
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase configuration (MUST be the same as in activity.js and insights.js)
const firebaseConfig = {
    apiKey: "AIzaSyA2ydl9-68gA-_3UXpxEJY6CfvTmCMPsLo",
    authDomain: "cozero-tracker.firebaseapp.com",
    projectId: "cozero-tracker",
    storageBucket: "cozero-tracker.firebasestorage.app",
    messagingSenderId: "178790925784",
    appId: "1:178790925784:web:f3b6d1a9e1eeadee5adead",
    measurementId: "G-PQEWJ0RVCW"
};

// Initialize Firebase services
let app;
if (!firebase.apps.length) {
    app = initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}

const auth = getAuth(app);
const db = getFirestore(app);


document.addEventListener('DOMContentLoaded', () => {

    // Get references to all necessary profile elements based on profile.html IDs
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileEmail = document.getElementById('profileEmail');
    const userAvatar = document.getElementById('user-avatar'); // Correct ID from your HTML
    const memberSinceDate = document.getElementById('memberSinceDate');
    const totalActivitiesCount = document.getElementById('totalActivitiesCount');
    const overallCarbonFootprint = document.getElementById('overallCarbonFootprint');
    const avgMonthlyCarbon = document.getElementById('avgMonthlyCarbon');
    const highestImpactCategory = document.getElementById('highestImpactCategory');
    const personalizedTipsContainer = document.getElementById('personalizedTipsContainer');
    const noTipsMessage = document.getElementById('noTipsMessage');

    // Get references for header/dropdown/theme elements (from previous integrations)
    const profileUsername = document.getElementById("profileUsername"); // For header username display
    const profileDropdownButton = document.getElementById('profileDropdownButton');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutButton = document.getElementById("logoutButton");
    const themeToggle = document.getElementById('theme-toggle'); // Ensure this ID is correct in your HTML
    const accountSettingsButton = document.getElementById('accountSettingsButton'); // If you add this button later

    // New element for data management (Print button)
    const printReportButton = document.getElementById('printReportButton'); // Now the only button in data management
    const printableReportArea = document.getElementById('printableReportArea');

    // New: Reference for the Delete Account button
    const deleteAccountButton = document.getElementById('deleteAccountButton');


    // --- User Authentication State & Data Fetching ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            let userData = {}; // Initialize userData
            let activities = []; // To store all user activities

            // Fetch user profile data from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                userData = userDocSnap.data();
                // Update user info section using correct IDs
                if (profileDisplayName) profileDisplayName.textContent = userData.username || user.displayName || 'User Name';
                if (profileEmail) profileEmail.textContent = userData.email || user.email;
                if (userAvatar) userAvatar.src = userData.profilePictureUrl || 'https://via.placeholder.com/100?text=User'; // Default if no photo

                // Member Since Date
                if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
                    const date = userData.createdAt.toDate();
                    if (memberSinceDate) {
                        memberSinceDate.textContent = date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                } else if (memberSinceDate) {
                    memberSinceDate.textContent = 'N/A'; // Fallback if data is missing or not a Timestamp
                }
            } else {
                console.log("No user data found in Firestore for this user. Displaying basic info.");
                if (profileDisplayName) profileDisplayName.textContent = user.displayName || 'New User';
                if (profileEmail) profileEmail.textContent = user.email;
                if (memberSinceDate) memberSinceDate.textContent = 'Just Joined!'; // Fallback for new users
                if (userAvatar) userAvatar.src = 'https://via.placeholder.com/100?text=User';
            }

            // --- Update Header Username ---
            if (profileUsername) {
                profileUsername.textContent = userData.username || user.displayName || user.email.split('@')[0];
            }

            // Fetch and display activity statistics
            const activitiesCollectionRef = collection(db, 'users', user.uid, 'activities');
            const q = query(activitiesCollectionRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            let totalActivities = 0;
            let overallCarbon = 0;
            const monthlyCarbon = {}; // { 'YYYY-MM': carbonTotal }
            const categoryCarbon = {}; // { 'category': carbonTotal }

            querySnapshot.forEach((doc) => {
                totalActivities++;
                const activity = doc.data();
                const carbonValue = parseFloat(activity.carbonFootprint || 0);
                overallCarbon += carbonValue;

                // Store raw activity for export/print
                activities.push({ id: doc.id, ...activity });

                // For monthly carbon
                if (activity.timestamp) {
                    const date = activity.timestamp.toDate();
                    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    monthlyCarbon[yearMonth] = (monthlyCarbon[yearMonth] || 0) + carbonValue;
                }

                // For highest impact category
                const category = activity.category || 'Uncategorized';
                categoryCarbon[category] = (categoryCarbon[category] || 0) + carbonValue;
            });

            if (totalActivitiesCount) totalActivitiesCount.textContent = totalActivities;
            if (overallCarbonFootprint) overallCarbonFootprint.textContent = `${overallCarbon.toFixed(2)} kg CO2e`;

            const numMonths = Object.keys(monthlyCarbon).length;
            const avgMonthly = numMonths > 0 ? overallCarbon / numMonths : 0;
            if (avgMonthlyCarbon) avgMonthlyCarbon.textContent = `${avgMonthly.toFixed(2)} kg CO2e`;

            let highestImpactCategoryVal = 'N/A';
            let maxCarbon = 0;
            for (const category in categoryCarbon) {
                if (categoryCarbon[category] > maxCarbon) {
                    maxCarbon = categoryCarbon[category];
                    highestImpactCategoryVal = category;
                }
            }
            if (highestImpactCategory) highestImpactCategory.textContent = capitalizeFirstLetter(highestImpactCategoryVal);

            // --- Personalized Tips ---
            if (personalizedTipsContainer) personalizedTipsContainer.innerHTML = ''; // Clear existing tips

            let hasTips = false;

            // 1. Monthly Comparison Tip with Progress Bar
            const currentDate = new Date();
            const currentMonthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

            const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const prevMonthStr = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;

            const currentMonthCarbon = monthlyCarbon[currentMonthStr] || 0;
            const prevMonthCarbon = monthlyCarbon[prevMonthStr] || 0;

            let comparisonMessage = '';
            let progressBarHtml = '';
            let percentageChange = 0;
            let progressClass = ''; // Class for progress bar color (reduction, increase, stable)

            if (totalActivities > 0 && numMonths >= 2) { // Only show if at least two months of data
                if (prevMonthCarbon > 0 && currentMonthCarbon < prevMonthCarbon) {
                    const reduction = prevMonthCarbon - currentMonthCarbon;
                    percentageChange = (reduction / prevMonthCarbon) * 100;
                    percentageChange = Math.min(percentageChange, 100);
                    comparisonMessage = `<p>Your carbon footprint this month (${currentMonthCarbon.toFixed(2)} kg CO2e) is <strong>${percentageChange.toFixed(1)}% lower</strong> than last month (${prevMonthCarbon.toFixed(2)} kg CO2e)! Keep up the great work!</p>`;
                    progressClass = 'reduction';
                } else if (prevMonthCarbon > 0 && currentMonthCarbon > prevMonthCarbon) {
                    const increase = currentMonthCarbon - prevMonthCarbon;
                    percentageChange = (increase / prevMonthCarbon) * 100;
                    percentageChange = Math.min(percentageChange, 100);
                    comparisonMessage = `<p>Your carbon footprint this month (${currentMonthCarbon.toFixed(2)} kg CO2e) is <strong>${percentageChange.toFixed(1)}% higher</strong> than last month (${prevMonthCarbon.toFixed(2)} kg CO2e). Let's look for areas to reduce!</p>`;
                    progressClass = 'increase';
                } else if (totalActivities > 0) {
                    comparisonMessage = `<p>Your carbon footprint this month (${currentMonthCarbon.toFixed(2)} kg CO2e) is <strong>about the same</strong> as last month (${prevMonthCarbon.toFixed(2)} kg CO2e). Consistency is key!</p>`;
                    progressClass = 'stable';
                    percentageChange = 50;
                }

                // Construct the progress bar HTML
                if (progressClass !== '' && personalizedTipsContainer) {
                    const progressBarWidth = (progressClass === 'reduction' || progressClass === 'increase') ? `${percentageChange}%` : '50%';
                    progressBarHtml = `
                        <div class="progress-bar-container">
                            <div class="progress-bar ${progressClass}" style="width: ${progressBarWidth};"></div>
                        </div>
                    `;
                    personalizedTipsContainer.innerHTML += `
                        <div class="tip-card">
                            <h4>Monthly Footprint Comparison</h4>
                            ${comparisonMessage}
                            ${progressBarHtml}
                        </div>
                    `;
                    hasTips = true;
                }
            }

            if (totalActivities === 0 && personalizedTipsContainer) {
                 personalizedTipsContainer.innerHTML += `
                    <div class="tip-card">
                        <h4>Start Tracking!</h4>
                        <p>Log your first activity in the "Activity Log" to begin seeing your carbon footprint and get personalized tips!</p>
                    </div>
                `;
                hasTips = true;
            }
            if (highestImpactCategoryVal !== 'N/A' && maxCarbon > 0 && totalActivities > 0 && personalizedTipsContainer) {
                let categoryTip = '';
                if (highestImpactCategoryVal === 'Transportation') {
                    categoryTip = 'Consider carpooling, biking, or public transport more often.';
                } else if (highestImpactCategoryVal === 'Food & Diet') {
                    categoryTip = 'Try incorporating more plant-based meals and reduce consumption of red meat.';
                } else if (highestImpactCategoryVal === 'Home Energy Usage') {
                    categoryTip = 'Remember to unplug electronics, switch to LED bulbs, and consider energy-efficient appliances.';
                } else if (highestImpactCategoryVal === 'Household') {
                    categoryTip = 'Look into reducing waste and recycling more. Choosing sustainable products can also help.';
                } else if (highestImpactCategoryVal === 'Consumption & Lifestyle') {
                    categoryTip = 'Think about reducing unnecessary purchases and opting for sustainable alternatives for products you need.';
                } else {
                    categoryTip = 'Keep tracking all your activities for more specific recommendations on how to reduce your impact in this area.';
                }
                personalizedTipsContainer.innerHTML += `
                    <div class="tip-card">
                        <h4>Focus Area: ${capitalizeFirstLetter(highestImpactCategoryVal)}</h4>
                        <p>${categoryTip}</p>
                    </div>
                `;
                hasTips = true;
            }

            if (totalActivities > 0 && !hasTips && personalizedTipsContainer) {
                 personalizedTipsContainer.innerHTML += `
                    <div class="tip-card">
                        <h4>Your Journey Continues!</h4>
                        <p>You've logged activities and are on your way to understanding your carbon footprint. Keep tracking for deeper insights!</p>
                    </div>
                `;
                hasTips = true;
            }

            if (noTipsMessage) {
                if (!hasTips) {
                    noTipsMessage.style.display = 'block';
                } else {
                    noTipsMessage.style.display = 'none';
                }
            }

            // --- Data for Print function ---
            // These variables are now available from the onAuthStateChanged scope
            const reportData = {
                user: user,
                userData: userData,
                totalActivities: totalActivities,
                overallCarbon: overallCarbon,
                avgMonthlyCarbon: avgMonthly,
                highestImpactCategory: highestImpactCategoryVal,
                monthlyCarbonBreakdown: monthlyCarbon,
                categoryCarbonBreakdown: categoryCarbon,
                activities: activities // All detailed activities
            };

            // Call print function
            setupPrintReport(reportData);


        } else {
            // User is signed out or not logged in, redirect to login page
            console.log("No user logged in. Redirecting to login page...");
            window.location.href = 'index.html';
        }
    });

    // --- Helper function to capitalize first letter ---
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // New: Account Settings Button Functionality (if applicable)
    if (accountSettingsButton) {
        accountSettingsButton.addEventListener('click', () => {
            window.location.href = 'account-settings.html'; // Navigates to the new settings page
        });
    }

    // Logout Button Functionality
    if (logoutButton) {
        logoutButton.addEventListener("click", (e) => {
            e.preventDefault();
            signOut(auth)
                .then(() => {
                    console.log("✅ User signed out successfully.");
                    window.location.href = "index.html";
                })
                .catch((error) => {
                    console.error("❌ Error signing out:", error);
                });
        });
    }

    // Profile dropdown toggle logic
    if (profileDropdownButton) {
        profileDropdownButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (profileDropdown) profileDropdown.classList.toggle('show');
        });
    }

    // Close dropdown when clicking anywhere outside of it
    document.addEventListener('click', (event) => {
        if (profileDropdown && profileDropdownButton) {
            if (!profileDropdownButton.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.classList.remove('show');
            }
        }
    });

    // Theme Toggle functionality
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.classList.add(savedTheme + '-mode');
            themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
        } else {
            document.body.classList.add('light-mode');
            themeToggle.textContent = '🌙';
        }

        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('light-mode')) {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '🌙';
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '☀️';
            }
        });
    }


    // --- Print Report Button Functionality ---
    function setupPrintReport(reportData) {
        if (printReportButton && printableReportArea) {
            printReportButton.addEventListener('click', () => {
                const user = auth.currentUser;
                if (!user) {
                    alert('You must be logged in to print a report.');
                    window.location.href = 'index.html';
                    return;
                }

                try {
                    printReportButton.textContent = 'Preparing Report...';
                    printReportButton.disabled = true;

                    // 1. Generate Report HTML content
                    let reportHtml = `
                        <h1>CoZero Carbon Footprint Report</h1>
                        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>Generated for:</strong> ${reportData.userData.username || user.displayName || user.email}</p>
                        <p><strong>Member Since:</strong> ${reportData.userData.createdAt ? reportData.userData.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>

                        <h2>Overall Summary</h2>
                        <div class="stat-item">
                            <h3>Total Activities Logged</h3>
                            <p>${reportData.totalActivities}</p>
                        </div>
                        <div class="stat-item">
                            <h3>Overall Carbon Footprint</h3>
                            <p>${reportData.overallCarbon.toFixed(2)} kg CO2e</p>
                        </div>
                        <div class="stat-item">
                            <h3>Average Monthly Carbon</h3>
                            <p>${reportData.avgMonthlyCarbon.toFixed(2)} kg CO2e</p>
                        </div>
                        <div class="stat-item">
                            <h3>Highest Impact Category</h3>
                            <p>${capitalizeFirstLetter(reportData.highestImpactCategory)}</p>
                        </div>

                        <h2>Carbon Footprint by Category</h2>
                        <ul>
                    `;
                    // Sort categories by carbon footprint for readability
                    const sortedCategoryCarbon = Object.entries(reportData.categoryCarbonBreakdown)
                        .sort(([, a], [, b]) => b - a);

                    sortedCategoryCarbon.forEach(([category, carbon]) => {
                        reportHtml += `<li><strong>${capitalizeFirstLetter(category)}:</strong> ${carbon.toFixed(2)} kg CO2e</li>`;
                    });
                    reportHtml += `</ul>`;

                    reportHtml += `<h2>Monthly Breakdown</h2><ul>`;
                    // Sort months chronologically
                    const sortedMonthlyCarbon = Object.entries(reportData.monthlyCarbonBreakdown)
                        .sort(([monthA], [monthB]) => monthA.localeCompare(monthB));

                    sortedMonthlyCarbon.forEach(([month, carbon]) => {
                        reportHtml += `<li><strong>${month}:</strong> ${carbon.toFixed(2)} kg CO2e</li>`;
                    });
                    reportHtml += `</ul>`;

                    reportHtml += `<h2>Detailed Activity Log</h2><ul>`;
                    // Sort activities by timestamp ascending for chronological list
                    const sortedActivities = [...reportData.activities].sort((a, b) => {
                        const dateA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate() : new Date(0);
                        const dateB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate() : new Date(0);
                        return dateA - dateB;
                    });

                    if (sortedActivities.length > 0) {
                        sortedActivities.forEach(activity => {
                            const date = activity.timestamp && typeof activity.timestamp.toDate === 'function' ?
                                activity.timestamp.toDate().toLocaleDateString('en-US') : 'N/A';
                            const time = activity.timestamp && typeof activity.timestamp.toDate === 'function' ?
                                activity.timestamp.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                            reportHtml += `
                                <li class="activity-item">
                                    <strong>${date} ${time}</strong>: ${activity.description || 'No description'} (${capitalizeFirstLetter(activity.category || 'N/A')}): ${parseFloat(activity.carbonFootprint || 0).toFixed(2)} kg CO2e
                                </li>
                            `;
                        });
                    } else {
                        reportHtml += `<li>No activities logged yet.</li>`;
                    }
                    reportHtml += `</ul>`;


                    // 2. Insert HTML into the hidden area
                    printableReportArea.innerHTML = reportHtml;

                    // 3. Trigger Print
                    window.print();

                } catch (error) {
                    console.error("Error generating printable report:", error);
                    alert('Failed to generate report. Please try again. Error: ' + error.message);
                } finally {
                    // Re-enable button and restore text after print dialog is closed (or cancelled)
                    // Use a timeout to ensure print dialog has time to open/close
                    setTimeout(() => {
                        printReportButton.textContent = 'Print Report';
                        printReportButton.disabled = false;
                        printableReportArea.innerHTML = ''; // Clear the content
                    }, 500);
                }
            });
        }
    }


    // --- Delete Account Functionality ---
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', async () => {
            const user = auth.currentUser;

            if (!user) {
                alert('No user is currently logged in.');
                window.location.href = 'index.html'; // Redirect if no user
                return;
            }

            const confirmation = confirm('Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.');

            if (confirmation) {
                try {
                    deleteAccountButton.textContent = 'Deleting...';
                    deleteAccountButton.disabled = true;

                    // 1. Delete all user activities from Firestore subcollection
                    const activitiesCollectionRef = collection(db, 'users', user.uid, 'activities');
                    const activitySnapshot = await getDocs(activitiesCollectionRef);

                    // Use a batch write for efficiency if there are many activities
                    const batch = writeBatch(db);
                    activitySnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log("✅ All user activities deleted from Firestore.");

                    // 2. Delete the user's main document from the 'users' collection
                    const userDocRef = doc(db, 'users', user.uid);
                    await deleteDoc(userDocRef);
                    console.log("✅ User document deleted from Firestore.");

                    // 3. Delete the Firebase Authentication user
                    await deleteUser(user);
                    console.log("✅ Firebase Authentication user deleted.");

                    alert('Your account and all associated data have been successfully deleted.');
                    window.location.href = 'index.html'; // Redirect to login/home page
                } catch (error) {
                    console.error('❌ Error deleting account and data:', error);
                    if (error.code === 'auth/requires-recent-login') {
                        alert('This action requires a recent login. Please log in again to delete your account.');
                        // Optionally, redirect to login to re-authenticate
                        signOut(auth).then(() => {
                            window.location.href = 'index.html';
                        });
                    } else {
                        alert('Failed to delete account. Please try again. Error: ' + error.message);
                    }
                } finally {
                    deleteAccountButton.textContent = 'Delete Account';
                    deleteAccountButton.disabled = false;
                }
            }
        });
    }

}); // End of DOMContentLoaded