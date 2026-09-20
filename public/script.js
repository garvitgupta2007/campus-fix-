let currentUser = null;
let complaints = [];

const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

/* =========================
   AUTH
========================= */

function showAuth() {
  $("authView").classList.remove("hidden");
  $("appView").classList.add("hidden");
}

function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");

  updateUserUI();
  showPage("dashboard");
}

function updateUserUI() {
  if (!currentUser) return;

  $("sideName").textContent = currentUser.name;
  $("sideEmail").textContent = currentUser.email;
  $("avatar").textContent = currentUser.name.charAt(0).toUpperCase();

  if (currentUser.role === "admin") {
    $("adminNav").classList.remove("hidden");
    $("complaintNavText").textContent = "All Complaints";
    $("complaintsHeading").textContent = "All complaints";
  } else {
    $("adminNav").classList.add("hidden");
    $("complaintNavText").textContent = "My Complaints";
    $("complaintsHeading").textContent = "My complaints";
  }
}

/* =========================
   LOGIN
========================= */

$("loginForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  const errorBox = $("loginError");
  const button = this.querySelector("button[type='submit']");

  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "Signing in...";

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    console.log("LOGIN SUCCESS:", data);

    currentUser = data.user;

    showApp();

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Login →";
  }
});

/* =========================
   REGISTER
========================= */

$("registerForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const errorBox = $("registerError");
  const button = this.querySelector("button[type='submit']");

  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "Creating...";

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: $("regName").value.trim(),
        email: $("regEmail").value.trim(),
        password: $("regPassword").value
      })
    });

    currentUser = data.user;

    showApp();

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Create account →";
  }
});

/* =========================
   AUTH TABS
========================= */

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((x) => {
      x.classList.remove("active");
    });

    tab.classList.add("active");

    if (tab.dataset.auth === "login") {
      $("loginForm").classList.remove("hidden");
      $("registerForm").classList.add("hidden");
    } else {
      $("loginForm").classList.add("hidden");
      $("registerForm").classList.remove("hidden");
    }
  });
});

/* =========================
   LOGOUT
========================= */

$("logoutBtn").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", {
      method: "POST"
    });
  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  complaints = [];

  showAuth();

  $("loginPassword").value = "";
});

/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active-page");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  const page = $(pageName);

  if (!page) return;

  page.classList.add("active-page");

  const nav = document.querySelector(
    `.nav-item[data-page="${pageName}"]`
  );

  if (nav) nav.classList.add("active");

  const titles = {
    dashboard: currentUser?.role === "admin"
      ? "Admin dashboard"
      : "Good morning 👋",
    raise: "Report an issue",
    complaints: currentUser?.role === "admin"
      ? "All complaints"
      : "My complaints",
    map: "Campus fault map",
    admin: "Maintenance control panel"
  };

  $("page-title").textContent = titles[pageName] || "CampusFix";

  if (pageName === "dashboard") {
    loadStats();
    loadComplaints();
  }

  if (pageName === "complaints") {
    loadComplaints();
  }

  if (pageName === "admin" && currentUser?.role === "admin") {
    loadAdminComplaints();
  }
}

/* =========================
   STATS
========================= */

async function loadStats() {
  try {
    const data = await api("/api/stats");

    $("totalCount").textContent = data.stats.total;
    $("progressCount").textContent = data.stats.inProgress;
    $("resolvedCount").textContent = data.stats.resolved;
    $("priorityCount").textContent = data.stats.highPriority;

    renderCategories(data.categories);

  } catch (error) {
    console.error("STATS ERROR:", error);
  }
}

function renderCategories(categories) {
  const container = $("categoryBars");

  if (!container) return;

  const entries = Object.entries(categories);

  if (!entries.length) {
    container.innerHTML = "<p>No complaints yet.</p>";
    return;
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  container.innerHTML = entries
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => {
      const percentage = Math.round((count / total) * 100);

      return `
        <div>
          <label>${escapeHtml(category)} <b>${percentage}%</b></label>
          <div class="bar">
            <i style="width:${percentage}%"></i>
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   COMPLAINTS
========================= */

async function loadComplaints() {
  try {
    const search = $("search")?.value || "";
    const status = $("statusFilter")?.value || "All Status";

    const params = new URLSearchParams();

    if (search) params.set("q", search);
    if (status !== "All Status") params.set("status", status);

    const data = await api(
      `/api/complaints?${params.toString()}`
    );

    complaints = data.complaints || [];

    renderRecentComplaints();
    renderAllComplaints();

  } catch (error) {
    console.error("COMPLAINT ERROR:", error);
  }
}

function renderRecentComplaints() {
  const container = $("recent-list");

  if (!container) return;

  const recent = complaints.slice(0, 5);

  if (!recent.length) {
    container.innerHTML = `
      <div class="empty-state">
        No complaints submitted yet.
      </div>
    `;
    return;
  }

  container.innerHTML = recent
    .map(complaintCard)
    .join("");
}

function renderAllComplaints() {
  const container = $("all-list");

  if (!container) return;

  if (!complaints.length) {
    container.innerHTML = `
      <div class="empty-state">
        No complaints found.
      </div>
    `;
    return;
  }

  container.innerHTML = complaints
    .map(complaintCard)
    .join("");
}

function complaintCard(c) {
  return `
    <div class="complaint-item">
      <div>
        <b>${escapeHtml(c.title)}</b>
        <p>
          ${escapeHtml(c.category)}
          • ${escapeHtml(c.location)}
        </p>
        <small>
          ${escapeHtml(c.description)}
        </small>
      </div>

      <div class="complaint-meta">
        <span class="status">${escapeHtml(c.status)}</span>
        <span>${escapeHtml(c.priority)}</span>
        ${
          currentUser?.role === "admin"
            ? `<small>By: ${escapeHtml(c.studentName)}</small>`
            : ""
        }
      </div>
    </div>
  `;
}

/* =========================
   ADMIN
========================= */

async function loadAdminComplaints() {
  try {
    const data = await api("/api/complaints");

    complaints = data.complaints || [];

    const container = $("admin-list");

    if (!complaints.length) {
      container.innerHTML = `
        <div class="empty-state">
          No complaints available.
        </div>
      `;
      return;
    }

    container.innerHTML = complaints
      .map(adminComplaintCard)
      .join("");

  } catch (error) {
    console.error("ADMIN ERROR:", error);
  }
}

function adminComplaintCard(c) {
  return `
    <div class="complaint-item admin-complaint">
      <div>
        <b>${escapeHtml(c.title)}</b>
        <p>
          ${escapeHtml(c.category)}
          • ${escapeHtml(c.location)}
        </p>
        <small>
          Reported by ${escapeHtml(c.studentName)}
        </small>
      </div>

      <div>
        <select
          onchange="updateComplaint('${c.id}', this.value)"
        >
          ${[
            "Submitted",
            "Under Review",
            "Assigned",
            "In Progress",
            "Resolved",
            "Closed"
          ]
          .map(status => `
            <option
              ${status === c.status ? "selected" : ""}
            >
              ${status}
            </option>
          `)
          .join("")}
        </select>
      </div>
    </div>
  `;
}

async function updateComplaint(id, status) {
  try {
    await api(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status
      })
    });

    showToast("Complaint status updated ✓");

    await loadAdminComplaints();
    await loadStats();

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   SUBMIT COMPLAINT
========================= */

$("complaintForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const button = this.querySelector("button[type='submit']");
  const errorBox = $("complaintError");

  errorBox.textContent = "";

  const formData = new FormData();

  formData.append("title", $("title").value.trim());
  formData.append("category", $("category").value);
  formData.append("location", $("location").value.trim());
  formData.append("priority", $("priority").value);
  formData.append("description", $("description").value.trim());

  const photo = $("photo").files[0];

  if (photo) {
    formData.append("photo", photo);
  }

  button.disabled = true;
  button.textContent = "Submitting...";

  try {
    await api("/api/complaints", {
      method: "POST",
      body: formData
    });

    this.reset();

    showToast("Complaint submitted successfully ✓");

    await loadStats();

    showPage("complaints");

  } catch (error) {
    console.error("SUBMIT ERROR:", error);
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Submit Complaint →";
  }
});

/* =========================
   SEARCH / FILTER
========================= */

$("search").addEventListener("input", () => {
  loadComplaints();
});

$("statusFilter").addEventListener("change", () => {
  loadComplaints();
});

/* =========================
   TOAST
========================= */

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================
   SECURITY / HTML ESCAPE
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   START APPLICATION
========================= */

async function boot() {
  try {
    const data = await api("/api/me");

    if (data.user) {
      currentUser = data.user;
      showApp();
    } else {
      showAuth();
    }

  } catch (error) {
    console.error("BOOT ERROR:", error);
    showAuth();
  }
}

boot();
