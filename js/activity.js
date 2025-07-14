// js/activity.js

// Import the Firebase modular SDK functions directly
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    addDoc, 
    deleteDoc, 
    orderBy, 
    query, 
    serverTimestamp, // serverTimestamp is now imported from firestore
    getDocs // Import getDocs for collection queries
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase configuration (ensure this is correct and matches what you use elsewhere)
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// No need for a global 'currentUser' variable if we always access auth.currentUser
// or pass user.uid explicitly after onAuthStateChanged.

document.addEventListener('DOMContentLoaded', async () => {
    console.log("activity.js: DOMContentLoaded event fired. Starting script.");

    const profileDropdownButton = document.getElementById('profileDropdownButton');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const profileUsername = document.getElementById('profileUsername');

    console.log("activity.js: Setting up onAuthStateChanged listener.");
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ onAuthStateChanged: User IS signed in. User UID:", user.uid, "Email:", user.email);

            // Fetch user data from Firestore to get the username
            const userDocRef = doc(db, "users", user.uid);
            console.log("activity.js: Attempting to fetch user document from path:", `users/${user.uid}`);

            try {
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    console.log("✅ Firestore: User document EXISTS. Data:", userData);
                    // Use the 'username' field from Firestore
                    profileUsername.textContent = userData.username || user.email || "User";
                    if (!userData.username) {
                        console.warn("⚠️ Firestore: 'username' field is missing or empty in user document. Displaying email or 'User'.");
                    }
                    
                    // Fetch activities and setup listeners only if a user is authenticated and has a doc
                    fetchActivities(user.uid);
                    setupWeeklyMonthlyListeners(user.uid);

                    // Set initial date inputs to current date/week/month
                    const today = new Date();
                    const todayISO = today.toISOString().split('T')[0];
                    document.getElementById('activityDate').value = todayISO;
                    document.getElementById('currentDateDisplay').textContent = "Today";

                    const currentWeekInfo = getWeekNumber(today);
                    document.getElementById('weekSelector').value = `${currentWeekInfo.year}-W${String(currentWeekInfo.week).padStart(2, '0')}`;
                    document.getElementById('selectedWeekDisplay').textContent = `Week ${currentWeekInfo.week}, ${currentWeekInfo.year}`;

                    document.getElementById('monthSelector').value = today.toISOString().slice(0, 7);
                    document.getElementById('selectedMonthDisplay').textContent = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

                } else {
                    console.warn("⚠️ Firestore: User document DOES NOT EXIST for UID:", user.uid);
                    // If no Firestore doc, fall back to email or generic "Unknown"
                    profileUsername.textContent = user.email || "Unknown User (no doc)";
                }
            } catch (error) {
                console.error("❌ Firestore Error fetching user document:", error);
                profileUsername.textContent = "Error (check console)"; // Indicate error on UI
            }
        } else {
            console.warn("⚠️ onAuthStateChanged: No user is signed in. Redirecting to login.html.");
            profileUsername.textContent = "Guest";
            alert("You need to be logged in to view this page. Redirecting to login.");
            window.location.href = "login.html";
        }
    });

    // --- Profile Dropdown & Logout ---
    if (profileDropdownButton) {
        profileDropdownButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent document click from closing it immediately
            profileDropdown.classList.toggle('show');
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth); // Use modular signOut
                console.log("User logged out successfully.");
                alert("Logged out successfully!");
                window.location.href = "login.html"; // Redirect to login after logout
            } catch (error) {
                console.error("Error logging out:", error.message);
                alert("Error logging out: " + error.message);
            }
        });
    }

    // Close the dropdown if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (!event.target.matches('.profile-button, .profile-button *')) {
            if (profileDropdown && profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        }
    });

    // --- Date Inputs ---
    const activityDateInput = document.getElementById('activityDate');
    const weekSelector = document.getElementById('weekSelector');
    const monthSelector = document.getElementById('monthSelector');
    const currentDateDisplay = document.getElementById('currentDateDisplay');

    activityDateInput.addEventListener('change', (event) => {
        currentDateDisplay.textContent = new Date(event.target.value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        // Re-fetch activities for the selected date, using current user's UID
        if (auth.currentUser) fetchActivities(auth.currentUser.uid);
    });

    // --- Category and Form Fields Toggling ---
    const activityCategory = document.getElementById('activityCategory');
    const transportationFields = document.getElementById('transportationFields');
    const householdFields = document.getElementById('householdFields');
    const foodFields = document.getElementById('foodFields');
    const energyFields = document.getElementById('energyFields');
    const lifestyleFields = document.getElementById('lifestyleFields');
    const fuelTypeGroup = document.getElementById('fuelTypeGroup');
    const transportMode = document.getElementById('transportMode');

    const allCategoryFields = [transportationFields, householdFields, foodFields, energyFields, lifestyleFields];

    function toggleCategoryFields() {
        allCategoryFields.forEach(field => field.classList.remove('active'));
        const selectedCategory = activityCategory.value;
        switch (selectedCategory) {
            case 'transportation':
                transportationFields.classList.add('active');
                toggleFuelTypeField(); // Check initially for car/motorcycle
                break;
            case 'household':
                householdFields.classList.add('active');
                break;
            case 'food':
                foodFields.classList.add('active');
                break;
            case 'energy':
                energyFields.classList.add('active');
                break;
            case 'lifestyle':
                lifestyleFields.classList.add('active');
                break;
        }
    }

    function toggleFuelTypeField() {
        if (transportMode.value === 'car' || transportMode.value === 'motorcycle') {
            fuelTypeGroup.style.display = 'block';
        } else {
            fuelTypeGroup.style.display = 'none';
        }
    }

    activityCategory.addEventListener('change', toggleCategoryFields);
    transportMode.addEventListener('change', toggleFuelTypeField);

    // Initial call to set up fields based on default selection
    toggleCategoryFields();

    // --- Log Activity Button ---
    const logActivityButton = document.getElementById('logActivityButton');
    if (logActivityButton) {
        logActivityButton.addEventListener('click', logActivity);
    }

    // --- Chart Variables ---
    let dailyCarbonPieChart;
    let weeklyCarbonBarChart;
    let monthlyCarbonBarChart;

    // --- Functions for Logging and Displaying Activities ---

    async function logActivity() {
        // Access auth.currentUser directly for the current user
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to log activities.");
            console.error("logActivity: No user logged in.");
            return;
        }

        const date = document.getElementById('activityDate').value;
        const category = document.getElementById('activityCategory').value;
        let carbonFootprint = 0;
        const activityData = {
            date: date,
            category: category,
            timestamp: serverTimestamp() // Use the directly imported serverTimestamp
        };

        // --- Carbon Footprint Calculation (Simplified Examples) ---
        // These are example values; you'd replace them with more accurate calculations.
        switch (category) {
            case 'transportation':
                const transportModeVal = transportMode.value;
                const transportDistance = parseFloat(document.getElementById('transportDistance').value);
                if (isNaN(transportDistance) || transportDistance <= 0) {
                    alert("Please enter a valid distance for transportation.");
                    return;
                }
                let fuelTypeVal = '';
                if (transportModeVal === 'car' || transportModeVal === 'motorcycle') {
                    fuelTypeVal = document.getElementById('fuelType').value;
                }

                activityData.mode = transportModeVal;
                activityData.distance = transportDistance;
                if (fuelTypeVal) activityData.fuelType = fuelTypeVal;

                // Example Emission Factors (kg CO2e per unit) - These are placeholders!
                const emissionFactors = {
                    car: { gasoline: 0.2, diesel: 0.25, electric: 0.05, hybrid: 0.15 }, // kg CO2e/km
                    motorcycle: { gasoline: 0.15, diesel: 0.2 },
                    bus: 0.05, // per passenger-km
                    train: 0.03, // per passenger-km
                    taxi: 0.18, // per passenger-km
                    air: 0.1, // per passenger-km
                    walk_cycle: 0 // No direct emissions
                };

                if (transportModeVal === 'car' || transportModeVal === 'motorcycle') {
                    carbonFootprint = transportDistance * (emissionFactors[transportModeVal][fuelTypeVal] || 0);
                } else if (emissionFactors[transportModeVal]) {
                    carbonFootprint = transportDistance * emissionFactors[transportModeVal];
                } else {
                    carbonFootprint = 0;
                }
                break;

            case 'household':
                const numAdults = parseInt(document.getElementById('numAdults').value) || 0;
                const numChildren = parseInt(document.getElementById('numChildren').value) || 0;
                const houseSize = document.getElementById('houseSize').value;
                const primaryEnergySource = document.getElementById('primaryEnergySource').value;

                activityData.numAdults = numAdults;
                activityData.numChildren = numChildren;
                activityData.houseSize = houseSize;
                activityData.primaryEnergySource = primaryEnergySource;

                // Very simplified estimation
                const householdFactors = {
                    small: 0.5, medium: 1.0, large: 1.5 // base factor
                };
                const energyFactors = {
                    electricity: 0.3, gas: 0.2, solar: 0.05, unknown: 0.25
                };
                carbonFootprint = (householdFactors[houseSize] || 0) +
                                (numAdults * 0.1) + (numChildren * 0.05) +
                                (energyFactors[primaryEnergySource] || 0); // per day, in kg CO2e
                break;

            case 'food':
                const mealType = document.getElementById('mealType').value;
                const foodWaste = document.getElementById('foodWaste').value;

                activityData.mealType = mealType;
                activityData.foodWaste = foodWaste;

                // Simplified factors (kg CO2e per meal/day equivalent)
                const foodFactors = {
                    'meat-heavy': 3.0, 'poultry-pork': 1.5, 'fish': 1.0, 'vegetarian': 0.8, 'vegan': 0.5
                };
                const wasteImpact = { 'none': 0, 'small': 0.1, 'medium': 0.3, 'large': 0.5 };
                carbonFootprint = (foodFactors[mealType] || 0) + (wasteImpact[foodWaste] || 0); // per day
                break;

            case 'energy':
                const electricityUsage = document.getElementById('electricityUsage').value;
                const showerDuration = document.getElementById('showerDuration').value;
                const wasteRecycled = document.getElementById('wasteRecycled').value;
                const wasteGeneral = parseFloat(document.getElementById('wasteGeneral').value) || 0;

                activityData.electricityUsage = electricityUsage;
                activityData.showerDuration = showerDuration;
                activityData.wasteRecycled = wasteRecycled;
                activityData.wasteGeneral = wasteGeneral;

                // Simplified factors
                const electricityFactors = { low: 0.5, medium: 1.5, high: 3.0 }; // kg CO2e/day
                const showerFactors = { short: 0.1, medium: 0.2, long: 0.4 };
                const recyclingImpact = { none: 0.5, some: 0.2, most: 0.05 }; // reduction factor
                carbonFootprint = (electricityFactors[electricityUsage] || 0) +
                                (showerFactors[showerDuration] || 0) +
                                (wasteGeneral * 0.5) - // 0.5 kg CO2e per kg waste (example)
                                (wasteGeneral * (recyclingImpact[wasteRecycled] || 0)); // Reduction from recycling
                break;

            case 'lifestyle':
                const itemType = document.getElementById('itemType').value;
                const packagingWaste = document.getElementById('packagingWaste').value;

                activityData.itemType = itemType;
                activityData.packagingWaste = packagingWaste;

                // Very rough estimation based on typical item impact
                // This would ideally require a more complex lookup or user input
                const itemCarbon = 2.0; // Placeholder for an average item
                const packagingFactors = { none: 0, minimal: 0.1, moderate: 0.5, excessive: 1.0 };
                carbonFootprint = itemCarbon + (packagingFactors[packagingWaste] || 0);
                break;
        }

        activityData.carbonFootprint = parseFloat(carbonFootprint.toFixed(2));

        // --- Save to Firestore ---
        try {
            // Use collection and addDoc from modular SDK
            await addDoc(collection(db, 'users', user.uid, 'activities'), activityData);
            alert('Activity logged successfully!');
            console.log("Activity saved:", activityData);
            fetchActivities(user.uid); // Re-fetch to update lists and charts
        } catch (error) {
            console.error("Error logging activity:", error);
            alert("Failed to log activity: " + error.message);
        }
    }

    async function fetchActivities(userId) {
        if (!userId) {
            console.warn("fetchActivities: No user ID provided. Cannot fetch activities.");
            return;
        }
        console.log("fetchActivities: Fetching activities for user:", userId);
        try {
            // Use query, collection, and getDocs from modular SDK
            const activitiesColRef = collection(db, 'users', userId, 'activities');
            const q = query(activitiesColRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q); // Use getDocs for collection query
            const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("fetchActivities: Fetched activities:", activities.length);
            displayActivities(activities);
            updateDailySummary(activities);
            // Re-call summary functions to ensure they are updated with newly fetched activities
            const today = new Date();
            const currentWeek = getWeekNumber(today);
            const currentMonth = today.toISOString().slice(0, 7);
            updateWeeklySummary(userId, currentWeek.year, currentWeek.week, activities);
            updateMonthlySummary(userId, currentMonth, activities);
        } catch (error) {
            console.error("Error fetching activities:", error);
            alert("Failed to load activities: " + error.message);
        }
    }

    function displayActivities(activities) {
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = ''; // Clear existing list

        if (activities.length === 0) {
            activityList.innerHTML = '<li class="no-activities">No activities logged yet.</li>';
            return;
        }

        activities.forEach(activity => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${activity.date} - ${capitalizeFirstLetter(activity.category)}: <strong>${activity.carbonFootprint.toFixed(2)} kg CO2e</strong></span>
                <button class="delete-activity-btn" data-id="${activity.id}" data-date="${activity.date}">Delete</button>
            `;
            activityList.appendChild(li);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-activity-btn').forEach(button => {
            button.addEventListener('click', deleteActivity);
        });
    }

    async function deleteActivity(event) {
        // Access auth.currentUser directly for the current user
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to delete activities.");
            return;
        }
        const activityId = event.target.dataset.id;
        const activityDate = event.target.dataset.date; // Get date for potential daily chart update trigger

        if (confirm("Are you sure you want to delete this activity?")) {
            try {
                // Use doc and deleteDoc from modular SDK
                await deleteDoc(doc(db, 'users', user.uid, 'activities', activityId));
                alert('Activity deleted successfully!');
                console.log("Activity deleted:", activityId);
                fetchActivities(user.uid); // Re-fetch to update everything
            } catch (error) {
                console.error("Error deleting activity:", error);
                alert("Failed to delete activity: " + error.message);
            }
        }
    }

    // --- Daily Carbon Summary ---
    function updateDailySummary(activities) {
        const dailyCarbonTotalElem = document.getElementById('dailyCarbonTotal');
        const currentDateDisplayElem = document.getElementById('currentDateDisplay');
        const todayISO = new Date().toISOString().split('T')[0];

        // currentDateDisplayElem.textContent is now handled when user is logged in (initial setup)
        // If you want it to always reflect the date input, you can update this.
        // For now, it updates on initial load and when activityDateInput changes.

        const dailyActivities = activities.filter(activity => activity.date === todayISO);
        const totalCarbon = dailyActivities.reduce((sum, activity) => sum + (activity.carbonFootprint || 0), 0);
        dailyCarbonTotalElem.textContent = `${totalCarbon.toFixed(2)} kg CO2e`;

        // Prepare data for daily pie chart
        const categoryTotals = dailyActivities.reduce((acc, activity) => {
            acc[activity.category] = (acc[activity.category] || 0) + (activity.carbonFootprint || 0);
            return acc;
        }, {});

        updatePieChart(dailyCarbonPieChart, 'dailyCarbonPieChart', categoryTotals);
    }

    // --- Weekly Carbon Summary ---
    function setupWeeklyMonthlyListeners(userId) {
        const weekSelector = document.getElementById('weekSelector');
        weekSelector.addEventListener('change', (event) => {
            const [year, weekNum] = event.target.value.split('-W').map(Number);
            updateWeeklySummary(userId, year, weekNum);
        });

        const monthSelector = document.getElementById('monthSelector');
        monthSelector.addEventListener('change', (event) => {
            const selectedMonth = event.target.value; // e.g., "YYYY-MM"
            updateMonthlySummary(userId, selectedMonth);
        });
    }

    async function updateWeeklySummary(userId, year, weekNum, activities = null) {
        const weeklyCarbonTotalElem = document.getElementById('weeklyCarbonTotal');
        const selectedWeekDisplayElem = document.getElementById('selectedWeekDisplay');
        const weeklyCategoryBreakdown = document.getElementById('weeklyCategoryBreakdown');

        let activitiesToUse = activities;
        if (!activitiesToUse) {
            console.log("updateWeeklySummary: Activities not provided, fetching from Firestore.");
            const activitiesColRef = collection(db, 'users', userId, 'activities');
            const snapshot = await getDocs(activitiesColRef); // Fetch all to filter client-side
            activitiesToUse = snapshot.docs.map(doc => doc.data());
        }

        const startOfWeek = getDateOfISOWeek(weekNum, year);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Sunday)

        selectedWeekDisplayElem.textContent = `Week ${weekNum}, ${year}`;

        const weeklyActivities = activitiesToUse.filter(activity => {
            const activityDate = new Date(activity.date); // Assuming activity.date is 'YYYY-MM-DD'
            return activityDate >= startOfWeek && activityDate <= endOfWeek;
        });

        const totalCarbon = weeklyActivities.reduce((sum, activity) => sum + (activity.carbonFootprint || 0), 0);
        weeklyCarbonTotalElem.textContent = `${totalCarbon.toFixed(2)} kg CO2e`;

        const categoryTotals = weeklyActivities.reduce((acc, activity) => {
            acc[activity.category] = (acc[activity.category] || 0) + (activity.carbonFootprint || 0);
            return acc;
        }, {});

        updateCategoryBreakdown(weeklyCategoryBreakdown, categoryTotals);
        updateBarChart(weeklyCarbonBarChart, 'weeklyCarbonBarChart', categoryTotals);
    }

    async function updateMonthlySummary(userId, monthYear, activities = null) {
        const monthlyCarbonTotalElem = document.getElementById('monthlyCarbonTotal');
        const selectedMonthDisplayElem = document.getElementById('selectedMonthDisplay');
        const monthlyCategoryBreakdown = document.getElementById('monthlyCategoryBreakdown');

        let activitiesToUse = activities;
        if (!activitiesToUse) {
            console.log("updateMonthlySummary: Activities not provided, fetching from Firestore.");
            const activitiesColRef = collection(db, 'users', userId, 'activities');
            const snapshot = await getDocs(activitiesColRef); // Fetch all to filter client-side
            activitiesToUse = snapshot.docs.map(doc => doc.data());
        }

        selectedMonthDisplayElem.textContent = new Date(`${monthYear}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' });

        const monthlyActivities = activitiesToUse.filter(activity => activity.date.startsWith(monthYear));

        const totalCarbon = monthlyActivities.reduce((sum, activity) => sum + (activity.carbonFootprint || 0), 0);
        monthlyCarbonTotalElem.textContent = `${totalCarbon.toFixed(2)} kg CO2e`;

        const categoryTotals = monthlyActivities.reduce((acc, activity) => {
            acc[activity.category] = (acc[activity.category] || 0) + (activity.carbonFootprint || 0);
            return acc;
        }, {});

        updateCategoryBreakdown(monthlyCategoryBreakdown, categoryTotals);
        updateBarChart(monthlyCarbonBarChart, 'monthlyCarbonBarChart', categoryTotals);
    }

    function updateCategoryBreakdown(ulElement, categoryTotals) {
        ulElement.innerHTML = '';
        const categories = ['transportation', 'household', 'food', 'energy', 'lifestyle'];
        categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `${capitalizeFirstLetter(category)}: <span>${(categoryTotals[category] || 0).toFixed(2)} kg CO2e</span>`;
            ulElement.appendChild(li);
        });
    }


    // --- Charting Functions ---
    function updatePieChart(chartInstance, canvasId, categoryTotals) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = data;
            chartInstance.update();
        } else {
            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9900'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: false,
                            text: 'Daily Carbon Footprint by Category'
                        }
                    }
                }
            });
            if (canvasId === 'dailyCarbonPieChart') dailyCarbonPieChart = chartInstance;
        }
    }

    function updateBarChart(chartInstance, canvasId, categoryTotals) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const labels = Object.keys(categoryTotals).map(capitalizeFirstLetter);
        const data = Object.values(categoryTotals);

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = data;
            chartInstance.update();
        } else {
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Carbon Footprint (kg CO2e)',
                        data: data,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: false,
                            text: 'Carbon Footprint by Category'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'kg CO2e'
                            }
                        }
                    }
                }
            });
            if (canvasId === 'weeklyCarbonBarChart') weeklyCarbonBarChart = chartInstance;
            if (canvasId === 'monthlyCarbonBarChart') monthlyCarbonBarChart = chartInstance;
        }
    }


    // --- Helper Functions ---

    // Function to get ISO week number (1-52 or 53)
    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Get first day of year
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calculate full weeks to the nearest Thursday
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNo };
    }

    // Function to get the date of the first day of a given ISO week
    function getDateOfISOWeek(w, y) {
        var simple = new Date(y, 0, 1 + (w - 1) * 7);
        var dow = simple.getDay();
        var ISOweekStart = simple;
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return ISOweekStart;
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

});