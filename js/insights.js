// js/insights.js

// Import the Firebase modular SDK functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc, // Import doc for getting a single document
    getDoc, // Import getDoc for getting a single document
    collection,
    query,
    orderBy,
    getDocs // Import getDocs for collection queries
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase configuration (MUST be the same as in activity.js)
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log("insights.js: DOMContentLoaded event fired. Starting script.");

    const profileDropdownButton = document.getElementById('profileDropdownButton');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const profileUsername = document.getElementById('profileUsername');

    // --- User Authentication and Data Fetching ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ onAuthStateChanged: User IS signed in. User UID:", user.uid);
            // Fetch user data from Firestore to get the username (similar to activity.js)
            const userDocRef = doc(db, "users", user.uid);
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    profileUsername.textContent = userData.username || user.email || "User";
                } else {
                    profileUsername.textContent = user.email || "Unknown User";
                }
            } catch (error) {
                console.error("❌ Firestore Error fetching user document:", error);
                profileUsername.textContent = "Error";
            }

            // Fetch and display insights for the logged-in user
            fetchAndDisplayInsights(user.uid);

        } else {
            console.warn("⚠️ onAuthStateChanged: No user is signed in. Redirecting to login.html.");
            profileUsername.textContent = "Guest";
            alert("You need to be logged in to view this page. Redirecting to login.");
            window.location.href = "login.html";
        }
    });

    // --- Profile Dropdown & Logout (Copied from activity.js for consistency) ---
    if (profileDropdownButton) {
        profileDropdownButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent document click from closing it immediately
            profileDropdown.classList.toggle('show');
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User logged out successfully.");
                alert("Logged out successfully!");
                window.location.href = "login.html";
            } catch (error) {
                console.error("Error logging out:", error.message);
                alert("Error logging out: " + error.message);
            }
        });
    }

    window.addEventListener('click', (event) => {
        if (!event.target.matches('.profile-button, .profile-button *')) {
            if (profileDropdown && profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        }
    });

    // --- Chart Instances (to be reused/updated) ---
    let insightPieChartInstance;
    let insightLineChartInstance;

    // --- Core Function to Fetch and Display Insights ---
    async function fetchAndDisplayInsights(userId) {
        if (!userId) {
            console.error("fetchAndDisplayInsights: No user ID provided.");
            return;
        }

        const totalMonthlyEmissionsElem = document.getElementById('totalMonthlyEmissions');
        const monthlyTrendSummaryElem = document.getElementById('monthlyTrendSummary');
        const mostImpactfulCategoryElem = document.getElementById('mostImpactfulCategory');
        const mostImpactfulCategoryPercentageElem = document.getElementById('mostImpactfulCategoryPercentage');
        const categoryBreakdownListElem = document.getElementById('categoryBreakdownList');
        const overallTrendSummaryElem = document.getElementById('overallTrendSummary');

        // Reset display while loading
        totalMonthlyEmissionsElem.textContent = "Loading...";
        monthlyTrendSummaryElem.textContent = "Loading...";
        mostImpactfulCategoryElem.textContent = "Loading...";
        mostImpactfulCategoryPercentageElem.textContent = "";
        categoryBreakdownListElem.innerHTML = '<li>Loading activities...</li>';
        overallTrendSummaryElem.textContent = "Loading historical data...";


        try {
            const activitiesColRef = collection(db, 'users', userId, 'activities');
            // Order by timestamp to get chronological data for trends
            const q = query(activitiesColRef, orderBy('timestamp', 'asc'));
            const snapshot = await getDocs(q);
            const allActivities = snapshot.docs.map(doc => doc.data());
            console.log("insights.js: Fetched", allActivities.length, "activities for insights.");

            if (allActivities.length === 0) {
                totalMonthlyEmissionsElem.textContent = "0.00 kg CO2e";
                monthlyTrendSummaryElem.textContent = "No activities logged yet.";
                mostImpactfulCategoryElem.textContent = "N/A";
                mostImpactfulCategoryPercentageElem.textContent = "";
                categoryBreakdownListElem.innerHTML = '<li class="no-activities">No activities to display.</li>';
                updatePieChart(insightPieChartInstance, 'insightPieChart', {});
                updateLineChart(insightLineChartInstance, 'insightLineChart', {});
                overallTrendSummaryElem.textContent = "No historical data available.";
                return;
            }

            // --- 1. Overall Carbon Footprint & Category Breakdown (Pie Chart) ---
            // "Overall Carbon Footprint" means total across ALL fetched activities for the user
            const overallCategoryTotals = allActivities.reduce((acc, activity) => {
                const category = activity.category || 'uncategorized'; // Fallback for missing category
                acc[category] = (acc[category] || 0) + (activity.carbonFootprint || 0);
                return acc;
            }, {});

            updateCategoryBreakdownList(categoryBreakdownListElem, overallCategoryTotals);
            insightPieChartInstance = updatePieChart(insightPieChartInstance, 'insightPieChart', overallCategoryTotals);

            // --- 2. Total Emissions This Month & Most Impactful Category ---
            const today = new Date();
            const currentMonthYear = today.toISOString().slice(0, 7); // "YYYY-MM"
            const lastMonthYear = getLastMonthYear(today);

            const currentMonthActivities = allActivities.filter(activity => activity.date && activity.date.startsWith(currentMonthYear));
            const lastMonthActivities = allActivities.filter(activity => activity.date && activity.date.startsWith(lastMonthYear));

            const currentMonthTotal = currentMonthActivities.reduce((sum, activity) => sum + (activity.carbonFootprint || 0), 0);
            const lastMonthTotal = lastMonthActivities.reduce((sum, activity) => sum + (activity.carbonFootprint || 0), 0);

            totalMonthlyEmissionsElem.textContent = `${currentMonthTotal.toFixed(2)} kg CO2e`;
            displayMonthlyTrend(currentMonthTotal, lastMonthTotal, monthlyTrendSummaryElem);

            const mostImpactful = getMostImpactfulCategory(currentMonthActivities);
            if (mostImpactful.category) {
                mostImpactfulCategoryElem.textContent = capitalizeFirstLetter(mostImpactful.category);
                mostImpactfulCategoryPercentageElem.textContent = `(${mostImpactful.percentage.toFixed(1)}% of this month's total)`;
            } else {
                mostImpactfulCategoryElem.textContent = "N/A";
                mostImpactfulCategoryPercentageElem.textContent = "";
            }

            // --- 3. Historical Trends (Line Chart) ---
            const monthlyTrendData = aggregateByMonth(allActivities);
            insightLineChartInstance = updateLineChart(insightLineChartInstance, 'insightLineChart', monthlyTrendData);
            displayOverallTrendSummary(monthlyTrendData, overallTrendSummaryElem);

        } catch (error) {
            console.error("❌ Error fetching or processing insights data:", error);
            totalMonthlyEmissionsElem.textContent = "Error loading data.";
            monthlyTrendSummaryElem.textContent = "Error.";
            mostImpactfulCategoryElem.textContent = "Error.";
            mostImpactfulCategoryPercentageElem.textContent = "";
            categoryBreakdownListElem.innerHTML = '<li class="error">Error loading activities.</li>';
            overallTrendSummaryElem.textContent = "Error loading historical data.";
        }
    }

    // --- Helper functions for data processing and display ---

    function updateCategoryBreakdownList(ulElement, categoryTotals) {
        ulElement.innerHTML = ''; // Clear existing list items
        const totalOverallCarbon = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

        if (totalOverallCarbon === 0) {
            ulElement.innerHTML = '<li class="no-activities">No carbon footprint data.</li>';
            return;
        }

        const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

        sortedCategories.forEach(([category, carbon]) => {
            const listItem = document.createElement('li');
            const percentage = (carbon / totalOverallCarbon) * 100;
            listItem.innerHTML = `${capitalizeFirstLetter(category)}: <span>${carbon.toFixed(2)} kg CO2e (${percentage.toFixed(1)}%)</span>`;
            ulElement.appendChild(listItem);
        });
    }

    function getMostImpactfulCategory(activities) {
        if (activities.length === 0) return { category: null, percentage: 0 };

        const categoryTotals = activities.reduce((acc, activity) => {
            acc[activity.category] = (acc[activity.category] || 0) + (activity.carbonFootprint || 0);
            return acc;
        }, {});

        let mostImpactful = { category: null, total: 0 };
        let overallTotal = 0;

        for (const category in categoryTotals) {
            overallTotal += categoryTotals[category];
            if (categoryTotals[category] > mostImpactful.total) {
                mostImpactful.total = categoryTotals[category];
                mostImpactful.category = category;
            }
        }

        if (overallTotal === 0) {
            return { category: null, percentage: 0 };
        }

        mostImpactful.percentage = (mostImpactful.total / overallTotal) * 100;
        return mostImpactful;
    }

    function getLastMonthYear(date) {
        const d = new Date(date);
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 7);
    }

    function displayMonthlyTrend(currentMonthTotal, lastMonthTotal, element) {
        if (currentMonthTotal === 0 && lastMonthTotal === 0) {
            element.textContent = "No data for this or last month.";
        } else if (lastMonthTotal === 0) {
            element.textContent = `First month of tracking!`;
        } else {
            const difference = currentMonthTotal - lastMonthTotal;
            const percentageChange = (difference / lastMonthTotal) * 100;

            if (difference > 0) {
                element.textContent = `📈 Up ${percentageChange.toFixed(1)}% from last month.`;
                element.style.color = 'red'; // Indicate increase
            } else if (difference < 0) {
                element.textContent = `📉 Down ${Math.abs(percentageChange).toFixed(1)}% from last month.`;
                element.style.color = 'green'; // Indicate decrease
            } else {
                element.textContent = `↔️ No change from last month.`;
                element.style.color = 'inherit';
            }
        }
    }

    function aggregateByMonth(activities) {
        const monthlyData = {};
        activities.forEach(activity => {
            if (activity.date && activity.carbonFootprint !== undefined) {
                const monthYear = activity.date.substring(0, 7); // YYYY-MM
                monthlyData[monthYear] = (monthlyData[monthYear] || 0) + activity.carbonFootprint;
            }
        });

        // Sort months chronologically
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, parseInt(monthNum) - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
            return monthName;
        });
        const data = sortedMonths.map(month => monthlyData[month]);

        return { labels, data };
    }

    function displayOverallTrendSummary(monthlyTrendData, element) {
        if (monthlyTrendData.data.length < 2) {
            element.textContent = "More data needed for trend analysis.";
            return;
        }

        const firstMonthAvg = monthlyTrendData.data[0];
        const lastMonthAvg = monthlyTrendData.data[monthlyTrendData.data.length - 1];

        if (firstMonthAvg === 0) { // Avoid division by zero
             element.textContent = "Historical data shows a total of 0.00 kg CO2e.";
             return;
        }

        const difference = lastMonthAvg - firstMonthAvg;
        const percentageChange = (difference / firstMonthAvg) * 100;

        let summary = "Overall trend: ";
        if (difference > 0) {
            summary += `📈 Increased by ${percentageChange.toFixed(1)}% from your first recorded month.`;
            element.style.color = 'red';
        } else if (difference < 0) {
            summary += `📉 Decreased by ${Math.abs(percentageChange).toFixed(1)}% from your first recorded month. Keep it up!`;
            element.style.color = 'green';
        } else {
            summary += `↔️ Remained stable.`;
            element.style.color = 'inherit';
        }
        element.textContent = summary;
    }


    // --- Charting Functions (Adapted from activity.js) ---

    const chartColors = {
        primary: 'rgb(75, 192, 192)',
        secondary: 'rgb(255, 99, 132)',
        tertiary: 'rgb(54, 162, 235)',
        quaternary: 'rgb(255, 205, 86)',
        quinary: 'rgb(153, 102, 255)',
        backgrounds: [
            'rgba(75, 192, 192, 0.6)', // Transportation
            'rgba(255, 159, 64, 0.6)', // Household (Orange)
            'rgba(255, 99, 132, 0.6)', // Food & Diet (Red)
            'rgba(54, 162, 235, 0.6)', // Home Energy (Blue)
            'rgba(153, 102, 255, 0.6)' // Consumption & Lifestyle (Purple)
        ],
        borders: [
            'rgb(75, 192, 192)',
            'rgb(255, 159, 64)',
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)'
        ],
        fontColorLight: '#444',
        fontColorDark: '#ddd',
        gridColorLight: '#eee',
        gridColorDark: '#333'
    };

    function getChartThemeColors() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        // Retrieve colors from CSS variables if available, otherwise use defaults
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color-primary').trim() || (isDarkMode ? '#D1D5DB' : '#1F2937');
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color-light').trim() || (isDarkMode ? '#374151' : '#E5E7EB');
        const tooltipBg = getComputedStyle(document.documentElement).getPropertyValue('--card-background-color').trim() || (isDarkMode ? '#1F2937' : '#FFFFFF');
        const tooltipBorder = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || (isDarkMode ? '#374151' : '#D1D5DB');

        return {
            fontColor: textColor,
            gridColor: gridColor,
            tooltipBg: tooltipBg,
            tooltipBorder: tooltipBorder,
            tooltipFont: textColor // Tooltip text color matches general text color
        };
    }


    function updatePieChart(chartInstance, canvasId, categoryTotals) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const themeColors = getChartThemeColors();

        const labels = Object.keys(categoryTotals).map(capitalizeFirstLetter);
        const dataValues = Object.values(categoryTotals);

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = dataValues;
            chartInstance.data.datasets[0].backgroundColor = chartColors.backgrounds;
            chartInstance.data.datasets[0].borderColor = chartColors.borders;
            chartInstance.options.plugins.legend.labels.color = themeColors.fontColor;
            chartInstance.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
            chartInstance.options.plugins.tooltip.borderColor = themeColors.tooltipBorder;
            chartInstance.options.plugins.tooltip.titleColor = themeColors.tooltipFont;
            chartInstance.options.plugins.tooltip.bodyColor = themeColors.tooltipFont;
            chartInstance.update();
        } else {
            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: chartColors.backgrounds,
                        borderColor: chartColors.borders,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: themeColors.fontColor // Dynamic font color
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed.toFixed(2) + ' kg CO2e';
                                    }
                                    return label;
                                }
                            },
                            backgroundColor: themeColors.tooltipBg, // Dynamic background
                            borderColor: themeColors.tooltipBorder, // Dynamic border
                            titleColor: themeColors.tooltipFont, // Dynamic title font
                            bodyColor: themeColors.tooltipFont // Dynamic body font
                        }
                    }
                }
            });
        }
        return chartInstance;
    }

    function updateLineChart(chartInstance, canvasId, monthlyTrendData) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const themeColors = getChartThemeColors();

        const labels = monthlyTrendData.labels;
        const dataValues = monthlyTrendData.data;

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = dataValues;
            chartInstance.options.scales.x.ticks.color = themeColors.fontColor;
            chartInstance.options.scales.y.ticks.color = themeColors.fontColor;
            chartInstance.options.scales.x.grid.color = themeColors.gridColor;
            chartInstance.options.scales.y.grid.color = themeColors.gridColor;
            chartInstance.options.plugins.legend.labels.color = themeColors.fontColor;
            chartInstance.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
            chartInstance.options.plugins.tooltip.borderColor = themeColors.tooltipBorder;
            chartInstance.options.plugins.tooltip.titleColor = themeColors.tooltipFont;
            chartInstance.options.plugins.tooltip.bodyColor = themeColors.tooltipFont;
            chartInstance.update();
        } else {
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Monthly Carbon Footprint (kg CO2e)',
                        data: dataValues,
                        borderColor: chartColors.primary,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month',
                                color: themeColors.fontColor
                            },
                            ticks: {
                                color: themeColors.fontColor
                            },
                            grid: {
                                color: themeColors.gridColor
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'CO2e (kg)',
                                color: themeColors.fontColor
                            },
                            beginAtZero: true,
                            ticks: {
                                color: themeColors.fontColor
                            },
                            grid: {
                                color: themeColors.gridColor
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: themeColors.fontColor
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kg CO2e`;
                                }
                            },
                            backgroundColor: themeColors.tooltipBg,
                            borderColor: themeColors.tooltipBorder,
                            titleColor: themeColors.tooltipFont,
                            bodyColor: themeColors.tooltipFont
                        }
                    }
                }
            });
        }
        return chartInstance;
    }

    // --- Helper Functions ---
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

});
