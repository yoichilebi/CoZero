// js/insights.js
// This file will contain JavaScript specific to the Insights page.
// For example, Chart.js initialization for insightPieChart and insightLineChart,
// or any dynamic loading of insight data.

document.addEventListener('DOMContentLoaded', () => {
    console.log("Insights page JavaScript loaded.");

    // Example Chart.js Pie Chart (Category Breakdown)
    const insightPieCtx = document.getElementById('insightPieChart');
    if (insightPieCtx) {
        new Chart(insightPieCtx, {
            type: 'pie',
            data: {
                labels: ['Transportation', 'Household', 'Food & Diet', 'Home Energy Usage', 'Consumption & Lifestyle'],
                datasets: [{
                    data: [112.5, 60, 45, 20, 12.5], // Example data
                    backgroundColor: [
                        'rgba(45, 212, 191, 0.8)', // Cyan/Teal
                        'rgba(0, 230, 230, 0.8)',  // Electric Cyan
                        'rgba(110, 231, 183, 0.8)',// Brighter Green
                        'rgba(96, 165, 250, 0.8)', // Bright Blue
                        'rgba(239, 68, 68, 0.8)'   // Vibrant Red
                    ],
                    borderColor: [
                        '#1F2937', // Dark background border
                        '#1F2937',
                        '#1F2937',
                        '#1F2937',
                        '#1F2937'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0', // Light text for dark mode legend
                            font: {
                                family: 'Inter',
                                size: 12
                            }
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
                                    label += context.parsed + ' kg CO2e';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // Light mode specific chart colors for pie chart
        const applyLightModePieChartColors = () => {
            const chart = Chart.getChart('insightPieChart');
            if (chart) {
                if (document.body.classList.contains('light-mode')) {
                    chart.data.datasets[0].backgroundColor = [
                        'rgba(255, 107, 107, 0.8)', // Coral
                        'rgba(204, 0, 0, 0.8)',    // Darker Red
                        'rgba(255, 165, 0, 0.8)',  // Orange
                        'rgba(147, 197, 253, 0.8)',// Light Blue
                        'rgba(248, 113, 113, 0.8)' // Lighter Red
                    ];
                    chart.data.datasets[0].borderColor = [
                        '#FFFFFF', // Light background border
                        '#FFFFFF',
                        '#FFFFFF',
                        '#FFFFFF',
                        '#FFFFFF'
                    ];
                    chart.options.plugins.legend.labels.color = '#333333'; // Dark text for light mode legend
                } else {
                    chart.data.datasets[0].backgroundColor = [
                        'rgba(45, 212, 191, 0.8)', // Cyan/Teal
                        'rgba(0, 230, 230, 0.8)',  // Electric Cyan
                        'rgba(110, 231, 183, 0.8)',// Brighter Green
                        'rgba(96, 165, 250, 0.8)', // Bright Blue
                        'rgba(239, 68, 68, 0.8)'   // Vibrant Red
                    ];
                    chart.data.datasets[0].borderColor = [
                        '#1F2937', // Dark background border
                        '#1F2937',
                        '#1F2937',
                        '#1F2937',
                        '#1F2937'
                    ];
                    chart.options.plugins.legend.labels.color = '#e0e0e0'; // Light text for dark mode legend
                }
                chart.update();
            }
        };

        // Listen for theme changes to update chart colors
        const observer = new MutationObserver(() => {
            applyLightModePieChartColors();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Initial call to set correct chart colors based on current theme
        applyLightModePieChartColors();
    }

    // Example Chart.js Line Chart (Historical Trends)
    const insightLineCtx = document.getElementById('insightLineChart');
    if (insightLineCtx) {
        new Chart(insightLineCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Monthly Emissions (kg CO2e)',
                    data: [300, 280, 270, 260, 255, 250], // Example data
                    borderColor: 'rgba(0, 230, 230, 1)', // Electric Cyan
                    backgroundColor: 'rgba(0, 230, 230, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0', // Light text for dark mode legend
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + ' kg CO2e';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#D1D5DB' // Light grey for x-axis labels
                        },
                        grid: {
                            color: 'rgba(55, 65, 81, 0.5)' // Darker grid lines
                        }
                    },
                    y: {
                        ticks: {
                            color: '#D1D5DB' // Light grey for y-axis labels
                        },
                        grid: {
                            color: 'rgba(55, 65, 81, 0.5)' // Darker grid lines
                        }
                    }
                }
            }
        });

        // Light mode specific chart colors for line chart
        const applyLightModeLineChartColors = () => {
            const chart = Chart.getChart('insightLineChart');
            if (chart) {
                if (document.body.classList.contains('light-mode')) {
                    chart.data.datasets[0].borderColor = 'rgba(255, 107, 107, 1)'; // Coral
                    chart.data.datasets[0].backgroundColor = 'rgba(255, 107, 107, 0.2)';
                    chart.options.plugins.legend.labels.color = '#333333'; // Dark text for light mode legend
                    chart.options.scales.x.ticks.color = '#374151'; // Dark grey for x-axis labels
                    chart.options.scales.x.grid.color = 'rgba(209, 213, 219, 0.5)'; // Lighter grid lines
                    chart.options.scales.y.ticks.color = '#374151'; // Dark grey for y-axis labels
                    chart.options.scales.y.grid.color = 'rgba(209, 213, 219, 0.5)'; // Lighter grid lines
                } else {
                    chart.data.datasets[0].borderColor = 'rgba(0, 230, 230, 1)'; // Electric Cyan
                    chart.data.datasets[0].backgroundColor = 'rgba(0, 230, 230, 0.2)';
                    chart.options.plugins.legend.labels.color = '#e0e0e0'; // Light text for dark mode legend
                    chart.options.scales.x.ticks.color = '#D1D5DB'; // Light grey for x-axis labels
                    chart.options.scales.x.grid.color = 'rgba(55, 65, 81, 0.5)'; // Darker grid lines
                    chart.options.scales.y.ticks.color = '#D1D5DB'; // Light grey for y-axis labels
                    chart.options.scales.y.grid.color = 'rgba(55, 65, 81, 0.5)'; // Darker grid lines
                }
                chart.update();
            }
        };

        // Listen for theme changes to update chart colors
        const observerLine = new MutationObserver(() => {
            applyLightModeLineChartColors();
        });
        observerLine.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Initial call to set correct chart colors based on current theme
        applyLightModeLineChartColors();
    }
});