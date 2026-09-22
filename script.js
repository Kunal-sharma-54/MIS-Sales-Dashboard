const API_URL =
  "https://script.google.com/macros/s/AKfycbx_NFl3g8Kb8AIs8Z-yg8y3hNPmZHlMWxo6QfMU7MJ_X8PQyId-kuL1fIS6aZH2XgoSCA/exec";

// Get HTML elements
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const tableBody = document.getElementById("salesTableBody");

const searchInput = document.getElementById("searchInput");
const salesmanFilter = document.getElementById("salesmanFilter");
const materialCentreFilter = document.getElementById("materialCentreFilter");

const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

const refreshButton = document.getElementById("refreshButton");

const noData = document.getElementById("noData");

// Store all sales data
let allSalesData = [];

// Store sorting information
let sortColumn = null;
let sortAscending = true;

// Load data from Google Sheet
async function loadSalesData() {
  try {
    loading.textContent = "Loading sales data...";
    error.textContent = "";

    // Get data from Google Apps Script
    const response = await fetch(API_URL);

    // Check if request was successful
    if (!response.ok) {
      throw new Error("Failed to fetch sales data");
    }

    // Convert response into JavaScript data
    const data = await response.json();

    // Remove first row because it contains headings
    allSalesData = data.slice(1);

    // Show data in table
    displaySalesData(allSalesData);

    // Create filter options
    populateFilters(allSalesData);

    createSalesmanSummary(allSalesData);
    createSalesChart(allSalesData);
    // Hide loading message
    loading.textContent = "";
  } catch (err) {
    loading.textContent = "";

    error.textContent = "Unable to load sales data.";

    console.error(err);
  }
}

// Display data in table
function displaySalesData(data) {
  // Remove old rows
  tableBody.innerHTML = "";

  // Add every row
  data.forEach((row) => {
    const tr = document.createElement("tr");

    // Add data into table cells
    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
      <td>${row[4]}</td>
      <td>${row[7]}</td>
      <td>${row[8]}</td>
      <td>${row[10]}</td>
      <td>${row[11]}</td>
    `;

    // Add row to table
    tableBody.appendChild(tr);
  });
}

// Create filter dropdown options
function populateFilters(data) {
  // Reset salesman dropdown
  salesmanFilter.innerHTML = '<option value="">All Salesmen</option>';

  // Reset material centre dropdown
  materialCentreFilter.innerHTML =
    '<option value="">All Material Centres</option>';

  // Set stores unique values
  const salesmen = new Set();
  const materialCentres = new Set();

  // Read every row
  data.forEach((row) => {
    // Salesman = column C
    salesmen.add(row[2]);

    // Material Centre = column G
    materialCentres.add(row[6]);

    // Material Centre = column J
    materialCentres.add(row[9]);
  });

  // Add salesmen to dropdown
  salesmen.forEach((salesman) => {
    const option = document.createElement("option");

    option.value = salesman;
    option.textContent = salesman;

    salesmanFilter.appendChild(option);
  });

  // Add material centres to dropdown
  materialCentres.forEach((centre) => {
    // Ignore empty values
    if (centre === "" || centre === null) {
      return;
    }

    const option = document.createElement("option");

    option.value = centre;
    option.textContent = centre;

    materialCentreFilter.appendChild(option);
  });
}

// Convert sheet date into JavaScript date
function parseSheetDate(value) {
  const text = String(value).trim();

  // Check for DD-MM-YYYY format
  const parts = text.split("-");

  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    return new Date(year, month - 1, day);
  }

  // Try normal date format
  return new Date(value);
}

// Sort data
function sortData(columnIndex) {
  // If same column is clicked again
  if (sortColumn === columnIndex) {
    // Change ascending to descending
    sortAscending = !sortAscending;
  } else {
    // Store new column
    sortColumn = columnIndex;

    // Start with ascending order
    sortAscending = true;
  }

  // Sort the data
  allSalesData.sort((a, b) => {
    let valueA = a[columnIndex];
    let valueB = b[columnIndex];

    // Date sorting
    if (columnIndex === 0) {
      valueA = parseSheetDate(valueA);
      valueB = parseSheetDate(valueB);
    } else {
      // Number sorting
      valueA = Number(valueA);
      valueB = Number(valueB);
    }

    // A comes before B
    if (valueA < valueB) {
      return sortAscending ? -1 : 1;
    }

    // B comes before A
    if (valueA > valueB) {
      return sortAscending ? 1 : -1;
    }

    // Same value
    return 0;
  });

  // Apply filters again
  applyFilters();
}

// Search input
searchInput.addEventListener("input", applyFilters);

// Salesman filter
salesmanFilter.addEventListener("change", applyFilters);

// Material centre filter
materialCentreFilter.addEventListener("change", applyFilters);

// From date filter
fromDate.addEventListener("change", applyFilters);

// To date filter
toDate.addEventListener("change", applyFilters);

// Apply all filters
function applyFilters() {
  // Get search text
  const searchText = searchInput.value.toLowerCase();

  // Get selected salesman
  const selectedSalesman = salesmanFilter.value;

  // Get selected material centre
  const selectedCentre = materialCentreFilter.value;

  // Get selected dates
  const selectedFromDate = fromDate.value;

  const selectedToDate = toDate.value;

  // Filter data
  const filteredData = allSalesData.filter((row) => {
    // Particulars / customer
    const customer = String(row[3]).toLowerCase();

    // Item details
    const item = String(row[4]).toLowerCase();

    // Salesman
    const salesman = String(row[2]);

    // First material centre
    const centre1 = String(row[6]);

    // Second material centre
    const centre2 = String(row[9]);

    // Search condition
    const matchesSearch =
      customer.includes(searchText) || item.includes(searchText);

    // Salesman condition
    const matchesSalesman =
      selectedSalesman === "" || salesman === selectedSalesman;

    // Material centre condition
    const matchesCentre =
      selectedCentre === "" ||
      centre1 === selectedCentre ||
      centre2 === selectedCentre;

    // Get row date
    const rowDate = parseSheetDate(row[0]);

    // From date condition
    let matchesFromDate = true;

    if (selectedFromDate !== "") {
      const from = new Date(selectedFromDate);

      matchesFromDate = rowDate >= from;
    }

    // To date condition
    let matchesToDate = true;

    if (selectedToDate !== "") {
      const to = new Date(selectedToDate);

      // Include the complete To Date
      to.setHours(23, 59, 59, 999);

      matchesToDate = rowDate <= to;
    }

    // All conditions must be true
    return (
      matchesSearch &&
      matchesSalesman &&
      matchesCentre &&
      matchesFromDate &&
      matchesToDate
    );
  });

  // Show filtered data
  displaySalesData(filteredData);

  // Update salesman summary
  createSalesmanSummary(filteredData);

  // Update chart
  createSalesChart(filteredData);
}

// Date sorting
document.getElementById("dateHeader").addEventListener("click", () => {
  sortData(0);
});

// Quantity sorting
document.getElementById("qtyHeader").addEventListener("click", () => {
  sortData(7);
});

// Amount sorting
document.getElementById("amountHeader").addEventListener("click", () => {
  sortData(11);
});

// Create salesman summary
function createSalesmanSummary(data) {
  // Get summary container
  const summaryContainer = document.getElementById("summaryContainer");

  // Remove old summary cards
  summaryContainer.innerHTML = "";

  // Store salesman totals
  const summary = {};

  // Read every row
  data.forEach((row) => {
    // Get salesman name
    const salesman = String(row[2]);

    // Get quantity
    const qty = Number(row[7]) || 0;

    // Get amount
    const amount = Number(row[11]) || 0;

    // Create salesman if not available
    if (!summary[salesman]) {
      summary[salesman] = {
        totalQty: 0,
        totalAmount: 0,
      };
    }

    // Add quantity
    summary[salesman].totalQty += qty;

    // Add amount
    summary[salesman].totalAmount += amount;
  });

  // Create cards
  Object.entries(summary).forEach(([salesman, values]) => {
    const card = document.createElement("div");

    // Add CSS class
    card.className = "summary-card";

    // Add card content
    card.innerHTML = `
        <h3>${salesman}</h3>

        <p>
          <strong>Total Qty:</strong>
          ${values.totalQty}
        </p>

        <p>
          <strong>Total Amount:</strong>
          ₹${values.totalAmount.toFixed(2)}
        </p>
      `;

    // Add card to page
    summaryContainer.appendChild(card);
  });
}

// Refresh button
refreshButton.addEventListener("click", () => {
  loadSalesData();
});

// Load data when page opens
loadSalesData();

const addSaleButton = document.getElementById("addSaleButton");

const addSaleMessage = document.getElementById("addSaleMessage");

addSaleButton.addEventListener("click", async () => {
  const saleData = {
    date: document.getElementById("newDate").value,

    billNo: document.getElementById("newBillNo").value,

    salesman: document.getElementById("newSalesman").value,

    particulars: document.getElementById("newParticulars").value,

    item: document.getElementById("newItem").value,

    qty: document.getElementById("newQty").value,

    unit: document.getElementById("newUnit").value,

    price: document.getElementById("newPrice").value,

    amount: document.getElementById("newAmount").value,
  };

  if (
    !saleData.date ||
    !saleData.billNo ||
    !saleData.salesman ||
    !saleData.item
  ) {
    addSaleMessage.textContent = "Please fill the required fields.";

    return;
  }

  try {
    addSaleMessage.textContent = "Adding sale...";

    const response = await fetch(API_URL, {
      method: "POST",

      body: JSON.stringify(saleData),
    });

    const result = await response.json();

    if (result.success) {
      addSaleMessage.textContent = "Sale added successfully!";

      // Reload data from Google Sheet
      loadSalesData();

      // Clear form
      document.getElementById("newDate").value = "";
      document.getElementById("newBillNo").value = "";
      document.getElementById("newSalesman").value = "";
      document.getElementById("newParticulars").value = "";
      document.getElementById("newItem").value = "";
      document.getElementById("newQty").value = "";
      document.getElementById("newUnit").value = "";
      document.getElementById("newPrice").value = "";
      document.getElementById("newAmount").value = "";
    } else {
      addSaleMessage.textContent = "Unable to add sale.";
    }
  } catch (err) {
    addSaleMessage.textContent = "Error while adding sale.";

    console.error(err);
  }
});

let salesChart = null;

function createSalesChart(data) {
  const chartData = {};

  data.forEach((row) => {
    const salesman = String(row[2]);

    const amount = Number(row[11]) || 0;

    if (!chartData[salesman]) {
      chartData[salesman] = 0;
    }

    chartData[salesman] += amount;
  });

  const salesmen = Object.keys(chartData);

  const amounts = Object.values(chartData);

  const ctx = document.getElementById("salesChart");

  if (salesChart !== null) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: "bar",

    data: {
      labels: salesmen,

      datasets: [
        {
          label: "Total Sales Amount",

          data: amounts,
        },
      ],
    },

    options: {
      responsive: true,

      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function displaySalesData(data) {
  tableBody.innerHTML = "";

  if (data.length === 0) {
    noData.textContent = "No sales data found.";

    return;
  }

  noData.textContent = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
      <td>${row[4]}</td>
      <td>${row[7]}</td>
      <td>${row[8]}</td>
      <td>${row[10]}</td>
      <td>${row[11]}</td>
    `;

    tableBody.appendChild(tr);
  });
}