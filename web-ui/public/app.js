const API_URL = window.location.origin; // Use same origin as the web server
// Get AUTH_SERVER_URL from meta tag or default
const AUTH_SERVER_URL = (() => {
  const metaTag = document.querySelector('meta[name="auth-server-url"]');
  if (metaTag) {
    return metaTag.getAttribute("content");
  }
  // Fallback: try to infer from current origin
  const origin = window.location.origin;
  if (origin.includes(":3001")) {
    return origin.replace(":3001", ":3000");
  }
  // Default fallback
  return "http://localhost:3000";
})();

let isProcessing = false;
let authStatus = null;
let lastJobDescription = null; // Store job description from resume updates

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");

  // Enter to send (Shift+Enter for new line)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Focus input on load
  input.focus();

  // Check auth status and update UI
  checkAuthStatus().then(() => {
    // Automatically load recommendations if user is authenticated
    if (
      authStatus &&
      authStatus.authenticated &&
      authStatus.user.hasGoogleToken &&
      authStatus.user.hasAIKey
    ) {
      loadRecommendedJobs();
    }

    // Check if we should reload recommendations after auth redirect
    if (sessionStorage.getItem("reloadRecommendations") === "true") {
      sessionStorage.removeItem("reloadRecommendations");
      setTimeout(() => {
        checkAuthStatus().then(() => {
          if (
            authStatus &&
            authStatus.authenticated &&
            authStatus.user.hasGoogleToken &&
            authStatus.user.hasAIKey
          ) {
            loadRecommendedJobs();
          }
        });
      }, 1000);
    }
  });
});

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: "include",
    });
    const data = await response.json();
    authStatus = data;
    updateSetupButtons(data);
  } catch (error) {
    console.error("Error checking auth status:", error);
  }
}

// Update setup buttons based on auth status
function updateSetupButtons(status) {
  const dataSourcesStatus = document.getElementById("dataSourcesStatus");
  const aiStatus = document.getElementById("aiStatus");

  if (status.authenticated) {
    // Update data sources status
    if (status.user.hasGoogleToken) {
      dataSourcesStatus.textContent = "✓ Connected";
      dataSourcesStatus.className = "btn-status connected";
      document.getElementById("setupDataSourcesBtn").classList.add("connected");
    } else {
      dataSourcesStatus.textContent = "Not connected";
      dataSourcesStatus.className = "btn-status";
    }

    // Update AI status
    if (status.user.hasAIKey) {
      aiStatus.textContent = `✓ ${status.user.aiProvider || "Not set"}`;
      aiStatus.className = "btn-status connected";
      document.getElementById("setupAIBtn").classList.add("connected");
    } else {
      aiStatus.textContent = "Not set";
      aiStatus.className = "btn-status";
    }

    // Load recommendations if both are set up
    if (status.user.hasGoogleToken && status.user.hasAIKey) {
      loadRecommendedJobs();
    }
  } else {
    dataSourcesStatus.textContent = "Login required";
    aiStatus.textContent = "Login required";
  }
}

// Setup Data Sources (Google OAuth)
function setupDataSources() {
  if (!authStatus || !authStatus.authenticated) {
    // Redirect to login first
    window.location.href = `${AUTH_SERVER_URL}/auth/google`;
    return;
  }

  const modal = document.getElementById("dataSourcesModal");
  modal.style.display = "block";

  // Update modal content
  updateDataSourcesModal();
}

// Update Data Sources Modal
function updateDataSourcesModal() {
  const googleDocsStatusText = document.getElementById("googleDocsStatusText");
  const connectGoogleBtn = document.getElementById("connectGoogleBtn");

  if (authStatus && authStatus.authenticated) {
    if (authStatus.user.hasGoogleToken) {
      googleDocsStatusText.textContent = "✓ Connected";
      googleDocsStatusText.className = "connected";
      connectGoogleBtn.textContent = "Reconnect Google Account";
      connectGoogleBtn.onclick = () => connectGoogle(true);
    } else {
      googleDocsStatusText.textContent = "Not connected";
      googleDocsStatusText.className = "";
      connectGoogleBtn.textContent = "Connect Google Account";
      connectGoogleBtn.onclick = () => connectGoogle();
    }
  }
}

// Connect Google Account
function connectGoogle(reconnect = false) {
  // Redirect to Google OAuth
  const redirectUrl = reconnect
    ? `${AUTH_SERVER_URL}/auth/google?prompt=consent`
    : `${AUTH_SERVER_URL}/auth/google`;

  // Store current URL to reload recommendations after auth
  sessionStorage.setItem("reloadRecommendations", "true");
  window.location.href = redirectUrl;
}

// Setup AI Provider
function setupAI() {
  if (!authStatus || !authStatus.authenticated) {
    // Redirect to login first
    window.location.href = `${AUTH_SERVER_URL}/auth/google`;
    return;
  }

  const modal = document.getElementById("aiModal");
  modal.style.display = "block";

  // Update modal content
  updateAIModal();
}

// Update AI Modal
function updateAIModal() {
  const providerSelect = document.getElementById("aiProvider");
  const currentProviderText = document.getElementById("currentProviderText");

  if (authStatus && authStatus.authenticated) {
    if (authStatus.user.aiProvider) {
      providerSelect.value = authStatus.user.aiProvider;
      currentProviderText.textContent = authStatus.user.aiProvider;
      currentProviderText.className = "connected";
    } else {
      currentProviderText.textContent = "Not set";
      currentProviderText.className = "";
    }
  }
}

// Handle provider change
function onProviderChange() {
  const provider = document.getElementById("aiProvider").value;
  const apiKeyInput = document.getElementById("aiApiKey");

  // Update placeholder based on provider
  if (provider === "anthropic") {
    apiKeyInput.placeholder = "Enter your Anthropic API key (sk-ant-...)";
  } else if (provider === "openai") {
    apiKeyInput.placeholder = "Enter your OpenAI API key (sk-...)";
  } else if (provider === "azure_openai") {
    apiKeyInput.placeholder = "Enter your Azure OpenAI API key";
  }
}

// Save AI Settings
async function saveAISettings() {
  const provider = document.getElementById("aiProvider").value;
  const apiKey = document.getElementById("aiApiKey").value.trim();

  if (!provider) {
    alert("Please select an AI provider");
    return;
  }

  if (!apiKey) {
    alert("Please enter your API key");
    return;
  }

  const saveBtn = document.getElementById("saveAIBtn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = "<span>💾</span> Saving...";

  try {
    const response = await fetch(`${API_URL}/api/settings/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        provider,
        apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save AI settings");
    }

    // Success
    alert("AI settings saved successfully!");
    closeModal("aiModal");

    // Refresh auth status and load recommendations
    await checkAuthStatus();
    if (
      authStatus &&
      authStatus.authenticated &&
      authStatus.user.hasGoogleToken &&
      authStatus.user.hasAIKey
    ) {
      loadRecommendedJobs();
    }

    // Clear input
    document.getElementById("aiApiKey").value = "";
  } catch (error) {
    console.error("Error saving AI settings:", error);
    alert(`Error: ${error.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = "<span>💾</span> Save AI Settings";
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "none";
}

// Close modal when clicking outside
window.onclick = function (event) {
  const dataSourcesModal = document.getElementById("dataSourcesModal");
  const aiModal = document.getElementById("aiModal");

  if (event.target === dataSourcesModal) {
    dataSourcesModal.style.display = "none";
  }
  if (event.target === aiModal) {
    aiModal.style.display = "none";
  }
};

// Send message to chatbot
async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();

  if (!message || isProcessing) return;

  // Check if user is authenticated
  if (!authStatus || !authStatus.authenticated) {
    alert('Please login first. Click "Setup Data Sources" to get started.');
    return;
  }

  // Check if data sources are set up
  if (!authStatus.user.hasGoogleToken) {
    alert(
      'Please connect your Google account first. Click "Setup Data Sources".',
    );
    return;
  }

  // Check if AI is set up
  if (!authStatus.user.hasAIKey) {
    alert('Please set up your AI provider first. Click "Setup AI".');
    return;
  }

  // Extract job description from message if it's a resume update command
  const jobDescMatch =
    message.match(/job description[:\s]+(.+)/i) ||
    message.match(/for this job[:\s]+(.+)/i) ||
    message.match(/JD[:\s]+(.+)/i) ||
    message.match(/create resume for[:\s]+(.+)/i) ||
    message.match(/update resume for[:\s]+(.+)/i);

  if (
    jobDescMatch &&
    (message.toLowerCase().includes("create") ||
      message.toLowerCase().includes("update"))
  ) {
    lastJobDescription = jobDescMatch[1].trim();
  }

  // Add user message to chat
  addMessage(message, "user");
  input.value = "";
  setStatus("Processing...", "loading");
  isProcessing = true;
  updateSendButton(false);

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to process request");
    }

    // Display response
    if (data.response) {
      addMessage(data.response, "bot");
    }

    if (data.status) {
      setStatus(data.status, "success");
    }

    if (data.error) {
      addMessage(`❌ Error: ${data.error}`, "bot");
      setStatus("Error occurred", "error");
    }

    // If resume was updated with a job description, show related jobs
    if (data.resumeUpdated && (data.jobDescription || lastJobDescription)) {
      const jobDesc = data.jobDescription || lastJobDescription;
      const location = data.location || undefined;
      setTimeout(() => {
        loadRelatedJobsForDescription(jobDesc, location);
      }, 2000); // Wait 2 seconds for resume processing to complete
    } else {
      // Otherwise, refresh general recommendations
      refreshRecommendationsAfterMessage();
    }
  } catch (error) {
    console.error("Error:", error);
    addMessage(`❌ Error: ${error.message}`, "bot");
    setStatus("Connection error", "error");
  } finally {
    isProcessing = false;
    updateSendButton(true);
    setStatus("");
  }
}

function addMessage(text, type) {
  const chatContainer = document.getElementById("chatContainer");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}-message`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  // Format the message (preserve line breaks, format URLs, etc.)
  const formattedText = formatMessage(text);
  contentDiv.innerHTML = formattedText;

  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatMessage(text) {
  // Escape HTML
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert URLs to links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(
    urlRegex,
    '<a href="$1" target="_blank" style="color: #667eea; text-decoration: underline;">$1</a>',
  );

  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, "<br>");

  // Format JSON-like content
  if (formatted.includes("{") && formatted.includes("}")) {
    try {
      const jsonMatch = formatted.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const jsonObj = JSON.parse(
          jsonStr.replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        );
        const prettyJson = JSON.stringify(jsonObj, null, 2);
        formatted = formatted.replace(
          jsonStr,
          `<pre><code>${prettyJson.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
        );
      }
    } catch (e) {
      // Not valid JSON, continue
    }
  }

  return formatted;
}

function setStatus(text, type = "") {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = text;
  statusDiv.className = `status ${type}`;
}

function updateSendButton(enabled) {
  const button = document.getElementById("sendButton");
  button.disabled = !enabled;
  if (enabled) {
    button.innerHTML =
      '<span>Send</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
  } else {
    button.innerHTML = "<span>Sending...</span>";
  }
}

function showTypingIndicator() {
  const chatContainer = document.getElementById("chatContainer");
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot-message";
  typingDiv.id = "typingIndicator";
  typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
  chatContainer.appendChild(typingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
    indicator.remove();
  }
}

// Automatically load recommended jobs based on user's application history
async function loadRecommendedJobs() {
  const container = document.getElementById("recommendationsContainer");
  const list = document.getElementById("recommendationsList");
  const count = document.getElementById("recommendationsCount");

  if (!authStatus || !authStatus.authenticated) {
    container.style.display = "none";
    return;
  }

  // Show loading state
  list.innerHTML =
    '<div class="loading-recommendations">🔍 Finding matching jobs...</div>';
  count.textContent = "Loading...";

  try {
    // Try to get recommendations from user's job description history first (most relevant)
    let response = await fetch(
      `${API_URL}/api/job-recommendations/from-history?limit=6`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      },
    );

    let data = await response.json();

    // If no history-based recommendations, try general recommendations
    if (
      !response.ok ||
      !data.recommendations ||
      data.recommendations.length === 0
    ) {
      response = await fetch(
        `${API_URL}/api/job-recommendations/recommended?limit=6`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );
      data = await response.json();
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to get recommendations");
    }

    const recommendations = data.recommendations || data.similarJobs || [];

    if (recommendations.length === 0) {
      list.innerHTML =
        '<div class="loading-recommendations">No recommendations available yet. Start chatting to get personalized job matches!</div>';
      count.textContent = "0 jobs";
    } else {
      displayRecommendations(recommendations);
      count.textContent = `${recommendations.length} job${recommendations.length !== 1 ? "s" : ""}`;

      // Reset header to default
      const header = document.querySelector(".recommendations-header h3");
      if (header) {
        header.textContent = "🎯 Recommended Jobs";
        header.style.color = "#1f2937"; // Reset color
      }
    }
  } catch (error) {
    console.error("Error loading recommendations:", error);
    list.innerHTML =
      '<div class="loading-recommendations">💡 Recommendations will appear here once you start using the resume agent.</div>';
    count.textContent = "Ready";
  }
}

// Load related jobs based on job description (after resume update)
async function loadRelatedJobsForDescription(jobDescription, location) {
  const container = document.getElementById("recommendationsContainer");
  const list = document.getElementById("recommendationsList");
  const count = document.getElementById("recommendationsCount");

  if (!authStatus || !authStatus.authenticated || !jobDescription) {
    return;
  }

  // Show loading state
  list.innerHTML =
    '<div class="loading-recommendations">🔍 Finding related jobs...</div>';
  count.textContent = "Loading...";

  try {
    // Build URL with location if available
    let url = `${API_URL}/api/job-recommendations/by-description?description=${encodeURIComponent(jobDescription)}&limit=6`;
    if (location) {
      url += `&location=${encodeURIComponent(location)}`;
    }

    // Get recommendations based on the job description
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get related jobs");
    }

    const recommendations = data.recommendations || [];

    if (recommendations.length === 0) {
      list.innerHTML =
        '<div class="loading-recommendations">💡 No related jobs found. Try a different job description!</div>';
      count.textContent = "0 jobs";
    } else {
      displayRecommendations(recommendations);
      count.textContent = `${recommendations.length} related job${recommendations.length !== 1 ? "s" : ""}`;

      // Update header to indicate these are related to the resume update
      const header = document.querySelector(".recommendations-header h3");
      if (header) {
        header.textContent = "🎯 Related Jobs (Based on your resume update)";
        header.style.color = "#667eea"; // Highlight it
      }
    }
  } catch (error) {
    console.error("Error loading related jobs:", error);
    // Fallback to general recommendations
    loadRecommendedJobs();
  }
}

// Refresh recommendations after user sends a message (they might be updating resume)
async function refreshRecommendationsAfterMessage() {
  // Wait a bit for resume processing, then refresh
  setTimeout(() => {
    if (
      authStatus &&
      authStatus.authenticated &&
      authStatus.user.hasGoogleToken &&
      authStatus.user.hasAIKey
    ) {
      loadRecommendedJobs();
    }
  }, 3000); // Refresh after 3 seconds
}

// Display job recommendations
function displayRecommendations(recommendations) {
  const list = document.getElementById("recommendationsList");
  const count = document.getElementById("recommendationsCount");

  if (recommendations.length === 0) {
    list.innerHTML =
      '<div class="loading-recommendations">💡 No recommendations yet. Start chatting with the resume agent to get personalized job matches!</div>';
    count.textContent = "0 jobs";
    return;
  }

  list.innerHTML = recommendations
    .map(
      (job) => `
        <div class="job-card" onclick="openJobLink('${job.url}', '${job.jobId}')">
            <div class="job-card-header">
                <div>
                    <h4 class="job-card-title">${escapeHtml(job.title)}</h4>
                    <p class="job-card-company">${escapeHtml(job.company)}</p>
                </div>
                <span class="job-card-match">${job.matchScore}% match</span>
            </div>
            <div class="job-card-details">
                ${job.location ? `<span class="job-card-location">📍 ${escapeHtml(job.location)}</span>` : ""}
                ${job.salary ? `<span class="job-card-salary">💰 ${escapeHtml(job.salary)}</span>` : ""}
            </div>
            ${job.description ? `<div class="job-card-description">${escapeHtml(job.description.substring(0, 150))}...</div>` : ""}
            ${
              job.reasons && job.reasons.length > 0
                ? `
                <div class="job-card-reasons">
                    <div class="job-card-reasons-title">Why this matches:</div>
                    <ul class="job-card-reasons-list">
                        ${job.reasons
                          .slice(0, 3)
                          .map((reason) => `<li>${escapeHtml(reason)}</li>`)
                          .join("")}
                    </ul>
                </div>
            `
                : ""
            }
            <div class="job-card-actions">
                <a href="${job.url}" target="_blank" class="job-card-link" onclick="event.stopPropagation(); trackJobClick('${job.jobId}')">
                    View Job →
                </a>
            </div>
        </div>
    `,
    )
    .join("");

  count.textContent = `${recommendations.length} job${recommendations.length !== 1 ? "s" : ""} found`;
}

// Open job link and track click
function openJobLink(url, jobId) {
  trackJobClick(jobId);
  window.open(url, "_blank");
}

// Track job click for revenue
async function trackJobClick(jobId) {
  try {
    await fetch(`${API_URL}/api/job-recommendations/${jobId}/click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({}),
    });
  } catch (error) {
    console.error("Error tracking job click:", error);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
