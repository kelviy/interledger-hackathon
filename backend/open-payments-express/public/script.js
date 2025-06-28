const form = document.getElementById("inputForm");
const methodSelect = document.getElementById("method");
const urlInput = document.getElementById("url");
const bodyGroup = document.getElementById("bodyGroup");
const bodyTextarea = document.getElementById("body-json");
const responseTextarea = document.getElementById("response-json");
const responseContainer = document.getElementById("responseContainer");
const statusInfo = document.getElementById("statusInfo");

// Show/hide body textarea based on HTTP method
methodSelect.addEventListener("change", function () {
  const method = this.value;
  if (method === "GET" || method === "DELETE") {
    bodyGroup.style.display = "none";
  } else {
    bodyGroup.style.display = "block";
  }
});

document.getElementById("none").addEventListener("change", function () {
  urlInput.value = "";
  bodyTextarea.json_value = {};
});

document
  .getElementById("incoming_payment")
  .addEventListener("change", function () {
    urlInput.value = window.location.href + "api/create-incoming-payment";
    bodyTextarea.json_value = {
      senderWalletAddress: "",
      receiverWalletAddress: "",
      amount: "",
    };
  });

document.getElementById("quote").addEventListener("change", function () {
  urlInput.value = window.location.href + "api/create-quote";
  bodyTextarea.json_value = {
    senderWalletAddress: "",
    incomingPaymentUrl: "",
  };
});

document
  .getElementById("outgoing_payment_auth")
  .addEventListener("change", function () {
    urlInput.value = window.location.href + "api/outgoing-payment-auth";
    bodyTextarea.json_value = {
      senderWalletAddress: "",
      quoteId: "",
      receiveAmount: {
        value: "",
        assetCode: "",
        assetScale: 0,
      },
      debitAmount: {
        value: "",
        assetCode: "",
        assetScale: 0,
      },
      type: "once_off",
      payments: "1",
      redirectUrl: window.location.href,
      duration: "PT10M",
    };
  });

document
  .getElementById("outgoing_payment")
  .addEventListener("change", function () {
    urlInput.value = window.location.href + "api/outgoing-payment";
    bodyTextarea.json_value = {
      senderWalletAddress: "",
      interactRef: "",
      continueAccessToken: "",
      continueUri: "",
      quoteId: "",
    };
  });

document
  .getElementById("subscription_payment")
  .addEventListener("change", function () {
    urlInput.value = window.location.href + "api/subscription-payment";
    bodyTextarea.json_value = {
      receiverWalletAddress: "",
      manageUrl: "",
      previousToken: "",
    };
  });

// Form submission
const originalFormHandler = form.onsubmit;
form.onsubmit = async function (e) {
  e.preventDefault();

  const method = methodSelect.value;
  const url = urlInput.value;

  // Collect headers (existing functionality)
  const headers = { "Content-Type": "application/json" };

  // Handle request body
  let requestBody = bodyTextarea.json_value;

  console.log(">> request body");
  console.log(requestBody);

  // Show loading state
  statusInfo.innerHTML =
    '<span class="status-badge status-info">Loading...</span>';

  try {
    const config = {
      method: method,
      url: url,
      headers: headers,
    };

    config.timeout = 50000; // ms
    config.maxRedirects = 5;

    if (requestBody) {
      config.data = requestBody;
    }

    const startTime = Date.now();
    const response = await axios(config);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Display success response
    console.log("<< request response");
    console.log(response);

    const statusClass =
      response.status >= 200 && response.status < 300
        ? "status-success"
        : "status-error";
    statusInfo.innerHTML = `
            <span class="status-badge ${statusClass}">${response.status} ${response.statusText}</span>
            <span style="color: #a0aec0;">• ${duration}ms</span>
        `;

    responseTextarea.json_value = response.data;

    addToHistory(
      {
        method: method,
        url: url,
        headers: headers,
        data: requestBody,
      },
      {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      },
      duration
    );
  } catch (error) {
    // Display error response (existing error handling)
    console.log("!! error");
    console.log(error);

    statusInfo.innerHTML =
      '<span class="status-badge status-error">Error</span>';

    let errorData = null;

    if (error.response) {
      errorMessage = `${error.response.status} ${error.response.statusText}`;
      errorData = error.response.data;
      statusInfo.innerHTML = `<span class="status-badge status-error">${error.response.status} ${error.response.statusText}</span>`;
    }

    responseTextarea.json_value = errorData;
  }
};

// Request history functionality
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
let requestHistory = [];

// Load history from localStorage if available
function loadHistory() {
  const savedHistory = localStorage.getItem("responseHistory");
  if (savedHistory) {
    try {
      requestHistory = JSON.parse(savedHistory);
      updateHistoryUI();
    } catch (e) {
      console.error("Failed to parse history:", e);
      requestHistory = [];
    }
  }
}

// Save history to localStorage
function saveHistory() {
  try {
    localStorage.setItem("responseHistory", JSON.stringify(requestHistory));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

// Add a request to history
function addToHistory(request, response, duration) {
  const timestamp = new Date().toISOString();
  const historyItem = {
    id: Date.now(),
    method: request.method,
    url: request.url,
    status: response.status,
    statusText: response.statusText,
    duration: duration,
    timestamp: timestamp,
    request: request,
    response: response,
  };

  // Add to beginning of array (newest first)
  requestHistory.unshift(historyItem);

  // Limit history to 50 items
  if (requestHistory.length > 50) {
    requestHistory.pop();
  }

  saveHistory();
  updateHistoryUI();
}

// Update the history UI
function updateHistoryUI() {
  historyCount.textContent = requestHistory.length;

  if (requestHistory.length === 0) {
    historyList.innerHTML =
      '<div class="panel-empty">No request history yet</div>';
    return;
  }

  historyList.innerHTML = "";

  requestHistory.forEach((item) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.dataset.id = item.id;

    const statusClass =
      item.status >= 200 && item.status < 300
        ? "status-success"
        : "status-error";

    const date = new Date(item.timestamp);
    const timeString = date.toLocaleTimeString();
    const dateString = date.toLocaleDateString();

    historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-method">${item.method}</span>
                <span class="history-item-status ${statusClass}">${item.status} ${item.statusText}</span>
            </div>
            <div class="history-item-url">${item.url}</div>
            <div class="history-item-time">${timeString} ${dateString} • ${item.duration}ms</div>
        `;

    historyItem.addEventListener("click", () => {
      // Mark this item as active
      document.querySelectorAll(".history-item").forEach((el) => {
        el.classList.remove("active");
      });
      historyItem.classList.add("active");

      responseTextarea.json_value = item.response.data;
    });

    historyList.appendChild(historyItem);
  });
}

// Clear history
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all request history?")) {
    requestHistory = [];
    saveHistory();
    updateHistoryUI();
  }
});

// Load history on page load
loadHistory();

// check for interaction ref on page load
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const interactRef = params.get("interact_ref");
  const hash = params.get("hash") ?? "";

  if (interactRef) {
    addToHistory(
      {
        method: "GET",
        url: window.location.href,
        headers: "",
        data: { interactRef: interactRef, hash: hash },
      },
      {
        status: "200",
        statusText: "OK",
        data: { interactRef: interactRef, hash: hash },
        headers: "",
      },
      0
    );

    const url = new URL(window.location.href);
    url.searchParams.delete("interact_ref");
    url.searchParams.delete("hash");
    window.history.replaceState({}, document.title, url.pathname);
  }
});
