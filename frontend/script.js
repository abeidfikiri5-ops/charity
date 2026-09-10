"use strict";

/* =========================================================
   MUST CHARITY MANAGEMENT SYSTEM
   Frontend JavaScript
========================================================= */

const API = "/api";

let token = localStorage.getItem("must_token") || "";
let currentUser = null;

let donations = [];
let expenditures = [];
let requests = [];
let contacts = [];
let users = [];


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMoney(value) {
    const number = Number(value || 0);

    return number.toLocaleString("en-TZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showToast(message) {
    const toast = $("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message;
    element.className = success
        ? "message success-message"
        : "message error-message";
}

function hideElement(id) {
    const element = $(id);

    if (element) {
        element.classList.add("hidden");
    }
}

function showElement(id) {
    const element = $(id);

    if (element) {
        element.classList.remove("hidden");
    }
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(endpoint, options = {}) {

    const headers = {
        ...(options.headers || {})
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {

        const response = await fetch(`${API}${endpoint}`, {
            ...options,
            headers
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {
            token = "";
            currentUser = null;

            localStorage.removeItem("must_token");
            localStorage.removeItem("must_user");

            showAuth();

            throw new Error(
                data.message || "Your session has expired. Please login again."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.message || `Request failed with status ${response.status}.`
            );
        }

        return data;

    } catch (error) {

        if (error instanceof TypeError) {
            throw new Error(
                "Unable to connect to the server."
            );
        }

        throw error;
    }
}


/* =========================================================
   AUTHENTICATION
========================================================= */

function showAuth() {

    showElement("authSection");
    hideElement("appSection");

    switchAuthTab("login");

    if ($("loginMessage")) {
        $("loginMessage").textContent = "";
    }

    if ($("registerMessage")) {
        $("registerMessage").textContent = "";
    }
}

function showApp() {

    hideElement("authSection");
    showElement("appSection");

    updateUserInformation();
    applyPermissions();

    showPage("dashboardPage");

    refreshAll();
}

function switchAuthTab(tab) {

    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    const loginTab = $("loginTab");
    const registerTab = $("registerTab");

    if (tab === "login") {

        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

    } else {

        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");

        loginTab.classList.remove("active");
        registerTab.classList.add("active");
    }
}


/* LOGIN */

async function login(event) {

    event.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    const message = $("loginMessage");

    showMessage(message, "Signing in...");

    try {

        const data = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        });

        token = data.token;
        currentUser = data.user;

        localStorage.setItem("must_token", token);
        localStorage.setItem(
            "must_user",
            JSON.stringify(currentUser)
        );

        $("loginForm").reset();

        showApp();

        showToast("Login successful.");

    } catch (error) {

        showMessage(
            message,
            error.message,
            false
        );
    }
}


/* REGISTER */

async function register(event) {

    event.preventDefault();

    const full_name = $("registerName").value.trim();
    const email = $("registerEmail").value.trim();
    const password = $("registerPassword").value;
    const role = $("registerRole").value;

    const message = $("registerMessage");

    showMessage(message, "Creating account...");

    try {

        const data = await apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                full_name,
                email,
                password,
                role
            })
        });

        token = data.token;
        currentUser = data.user;

        localStorage.setItem("must_token", token);
        localStorage.setItem(
            "must_user",
            JSON.stringify(currentUser)
        );

        $("registerForm").reset();

        showApp();

        showToast("Account created successfully.");

    } catch (error) {

        showMessage(
            message,
            error.message,
            false
        );
    }
}


/* LOGOUT */

function logout() {

    token = "";
    currentUser = null;

    localStorage.removeItem("must_token");
    localStorage.removeItem("must_user");

    showAuth();

    showToast("You have been logged out.");
}


/* CHECK CURRENT SESSION */

async function checkSession() {

    if (!token) {
        showAuth();
        return;
    }

    try {

        const data = await apiRequest("/auth/me");

        currentUser = data.user;

        localStorage.setItem(
            "must_user",
            JSON.stringify(currentUser)
        );

        showApp();

    } catch (error) {

        token = "";
        currentUser = null;

        localStorage.removeItem("must_token");
        localStorage.removeItem("must_user");

        showAuth();
    }
}


/* =========================================================
   USER INFORMATION AND PERMISSIONS
========================================================= */

function updateUserInformation() {

    if (!currentUser) return;

    $("currentUserName").textContent =
        currentUser.full_name || "User";

    $("currentRole").textContent =
        currentUser.role || "Role";

    const permissionInfo = $("permissionInfo");

    if (permissionInfo) {

        permissionInfo.textContent =
            `Logged in as ${currentUser.role}. Your available actions are based on your role.`;

        permissionInfo.className = "permission";
    }
}


function applyPermissions() {

    if (!currentUser) return;

    const role = currentUser.role;

    const menuButtons =
        document.querySelectorAll(".menu-btn");

    menuButtons.forEach(button => {

        const page = button.dataset.page;

        let allowed = true;

        if (page === "usersPage") {
            allowed = role === "Admin";
        }

        if (page === "expenditurePage") {
            allowed = [
                "Admin",
                "Accountant"
            ].includes(role);
        }

        if (page === "requestsPage") {
            allowed = true;
        }

        if (page === "donationsPage") {
            allowed = true;
        }

        if (page === "contactsPage") {
            allowed = true;
        }

        button.classList.toggle(
            "hidden",
            !allowed
        );
    });


    /* Donation button */

    const addDonationBtn =
        $("addDonationBtn");

    if (addDonationBtn) {

        addDonationBtn.classList.toggle(
            "hidden",
            ![
                "Admin",
                "Donor"
            ].includes(role)
        );
    }


    /* Expenditure button */

    const addExpenditureBtn =
        $("addExpenditureBtn");

    if (addExpenditureBtn) {

        addExpenditureBtn.classList.toggle(
            "hidden",
            ![
                "Admin",
                "Accountant"
            ].includes(role)
        );
    }


    /* Request button */

    const addRequestBtn =
        $("addRequestBtn");

    if (addRequestBtn) {

        addRequestBtn.classList.toggle(
            "hidden",
            role !== "Recipient"
        );
    }


    /* User button */

    const addUserBtn =
        $("addUserBtn");

    if (addUserBtn) {

        addUserBtn.classList.toggle(
            "hidden",
            role !== "Admin"
        );
    }


    /* Donor field */

    const donorFieldGroup =
        $("donorFieldGroup");

    if (donorFieldGroup) {

        donorFieldGroup.classList.toggle(
            "hidden",
            role === "Donor"
        );
    }
}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {
            page.classList.add("hidden");
        });

    const selectedPage = $(pageId);

    if (selectedPage) {
        selectedPage.classList.remove("hidden");
    }

    document
        .querySelectorAll(".menu-btn")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === pageId
            );
        });
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const data =
            await apiRequest("/dashboard");

        const dashboard =
            data.dashboard;

        $("totalDonation").textContent =
            formatMoney(
                dashboard.totalDonations
            );

        $("totalExpenditure").textContent =
            formatMoney(
                dashboard.totalExpenditures
            );

        $("availableBalance").textContent =
            formatMoney(
                dashboard.availableBalance
            );

        $("pendingRequests").textContent =
            dashboard.pendingRequests;

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );
    }
}


/* =========================================================
   DONATIONS
========================================================= */

async function loadDonations() {

    try {

        const data =
            await apiRequest("/donations");

        donations =
            data.donations || [];

        renderDonations();

    } catch (error) {

        console.error(
            "Donation loading error:",
            error
        );

        $("donationTableBody").innerHTML =
            `<tr>
                <td colspan="6">
                    ${escapeHTML(error.message)}
                </td>
            </tr>`;
    }
}


function renderDonations() {

    const body =
        $("donationTableBody");

    if (!body) return;

    if (donations.length === 0) {

        body.innerHTML =
            `<tr>
                <td colspan="6">
                    No donations found.
                </td>
            </tr>`;

        return;
    }

    body.innerHTML =
        donations.map(donation => {

            let actions = "";

            if (
                currentUser.role === "Admin" ||
                (
                    currentUser.role === "Donor" &&
                    Number(donation.donor_id) ===
                    Number(currentUser.id)
                )
            ) {

                actions = `
                    <button
                        class="action-button edit-button"
                        onclick="editDonation(${donation.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="action-button delete-button"
                        onclick="deleteDonation(${donation.id})"
                    >
                        Delete
                    </button>
                `;
            }

            return `
                <tr>

                    <td>
                        ${donation.id}
                    </td>

                    <td>
                        ${escapeHTML(
                            donation.donor_name
                        )}
                    </td>

                    <td>
                        ${formatMoney(
                            donation.amount
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            donation.description
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            donation.donation_date
                        )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;

        }).join("");
}


function openDonationForm(donation = null) {

    showElement(
        "donationFormContainer"
    );

    if (donation) {

        $("donationFormTitle").textContent =
            "Edit Donation";

        $("donationId").value =
            donation.id;

        $("donorName").value =
            donation.donor_name || "";

        $("donationAmount").value =
            donation.amount;

        $("donationPurpose").value =
            donation.description || "";

        $("donationDate").value =
            donation.donation_date || "";

    } else {

        $("donationFormTitle").textContent =
            "Add Donation";

        $("donationForm").reset();

        $("donationId").value = "";

        if (currentUser.role === "Donor") {

            $("donorName").value =
                currentUser.full_name;

            $("donorName").disabled = true;

        } else {

            $("donorName").disabled = false;
        }
    }
}


function closeDonationForm() {

    hideElement(
        "donationFormContainer"
    );

    $("donationForm").reset();

    $("donationId").value = "";

    $("donorName").disabled = false;
}


function editDonation(id) {

    const donation =
        donations.find(
            item => Number(item.id) === Number(id)
        );

    if (!donation) return;

    openDonationForm(donation);
}


async function saveDonation(event) {

    event.preventDefault();

    try {

        const id =
            $("donationId").value;

        const amount =
            Number($("donationAmount").value);

        const description =
            $("donationPurpose").value.trim();

        const donation_date =
            $("donationDate").value || null;

        const body = {
            amount,
            description,
            donation_date
        };

        if (!id) {

            if (currentUser.role === "Admin") {

                const donorValue =
                    $("donorName").value.trim();

                const donor =
                    users.find(user =>
                        user.role === "Donor" &&
                        (
                            String(user.id) === donorValue ||
                            user.email.toLowerCase() ===
                                donorValue.toLowerCase() ||
                            user.full_name.toLowerCase() ===
                                donorValue.toLowerCase()
                        )
                    );

                if (!donor) {

                    throw new Error(
                        "For Admin, enter an existing Donor ID, email or exact name."
                    );
                }

                body.donor_id =
                    donor.id;
            }

            await apiRequest(
                "/donations",
                {
                    method: "POST",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "Donation created successfully."
            );

        } else {

            await apiRequest(
                `/donations/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "Donation updated successfully."
            );
        }

        closeDonationForm();

        await loadDonations();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


async function deleteDonation(id) {

    if (
        !confirm(
            "Are you sure you want to delete this donation?"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/donations/${id}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "Donation deleted successfully."
        );

        await loadDonations();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


/* =========================================================
   EXPENDITURES
========================================================= */

async function loadExpenditures() {

    try {

        const data =
            await apiRequest("/expenditures");

        expenditures =
            data.expenditures || [];

        renderExpenditures();

    } catch (error) {

        console.error(
            "Expenditure loading error:",
            error
        );
    }
}


function splitExpenditureDescription(description) {

    const text =
        String(description || "");

    if (
        text.startsWith("Title: ")
    ) {

        const newline =
            text.indexOf("\n");

        if (newline !== -1) {

            return {
                title:
                    text.substring(
                        7,
                        newline
                    ),

                description:
                    text.substring(
                        newline + 1
                    )
            };
        }

        return {
            title:
                text.substring(7),

            description: ""
        };
    }

    return {
        title: "",
        description: text
    };
}


function renderExpenditures() {

    const body =
        $("expenditureTableBody");

    if (!body) return;

    if (expenditures.length === 0) {

        body.innerHTML =
            `<tr>
                <td colspan="7">
                    No expenditures found.
                </td>
            </tr>`;

        return;
    }

    body.innerHTML =
        expenditures.map(item => {

            const parsed =
                splitExpenditureDescription(
                    item.description
                );

            let actions = "";

            if (
                currentUser.role === "Admin" ||
                currentUser.role === "Accountant"
            ) {

                actions = `
                    <button
                        class="action-button edit-button"
                        onclick="editExpenditure(${item.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="action-button delete-button"
                        onclick="deleteExpenditure(${item.id})"
                    >
                        Delete
                    </button>
                `;
            }

            return `
                <tr>

                    <td>
                        ${item.id}
                    </td>

                    <td>
                        ${escapeHTML(
                            parsed.title
                        )}
                    </td>

                    <td>
                        ${formatMoney(
                            item.amount
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            parsed.description
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.expenditure_date
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.created_by_name
                        )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;

        }).join("");
}


function openExpenditureForm(item = null) {

    showElement(
        "expenditureFormContainer"
    );

    if (item) {

        const parsed =
            splitExpenditureDescription(
                item.description
            );

        $("expenditureFormTitle").textContent =
            "Edit Expenditure";

        $("expenditureId").value =
            item.id;

        $("expenditureTitle").value =
            parsed.title;

        $("expenditureAmount").value =
            item.amount;

        $("expenditureDescription").value =
            parsed.description;

        $("expenditureDate").value =
            item.expenditure_date || "";

    } else {

        $("expenditureFormTitle").textContent =
            "Add Expenditure";

        $("expenditureForm").reset();

        $("expenditureId").value = "";
    }
}


function closeExpenditureForm() {

    hideElement(
        "expenditureFormContainer"
    );

    $("expenditureForm").reset();

    $("expenditureId").value = "";
}


function editExpenditure(id) {

    const item =
        expenditures.find(
            row => Number(row.id) === Number(id)
        );

    if (!item) return;

    openExpenditureForm(item);
}


async function saveExpenditure(event) {

    event.preventDefault();

    try {

        const id =
            $("expenditureId").value;

        const title =
            $("expenditureTitle").value.trim();

        const amount =
            Number($("expenditureAmount").value);

        const description =
            $("expenditureDescription")
                .value
                .trim();

        const expenditure_date =
            $("expenditureDate").value || null;

        const combinedDescription =
            `Title: ${title}\n${description}`;

        const body = {
            amount,
            description:
                combinedDescription,
            expenditure_date
        };

        if (id) {

            await apiRequest(
                `/expenditures/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "Expenditure updated successfully."
            );

        } else {

            await apiRequest(
                "/expenditures",
                {
                    method: "POST",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "Expenditure created successfully."
            );
        }

        closeExpenditureForm();

        await loadExpenditures();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


async function deleteExpenditure(id) {

    if (
        !confirm(
            "Are you sure you want to delete this expenditure?"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/expenditures/${id}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "Expenditure deleted successfully."
        );

        await loadExpenditures();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


/* =========================================================
   RECIPIENT REQUESTS
========================================================= */

async function loadRequests() {

    try {

        const data =
            await apiRequest("/requests");

        requests =
            data.requests || [];

        renderRequests();

    } catch (error) {

        console.error(
            "Request loading error:",
            error
        );
    }
}


function renderRequests() {

    const body =
        $("requestTableBody");

    if (!body) return;

    if (requests.length === 0) {

        body.innerHTML =
            `<tr>
                <td colspan="7">
                    No requests found.
                </td>
            </tr>`;

        return;
    }

    body.innerHTML =
        requests.map(item => {

            let actions = "";

            if (
                currentUser.role === "Recipient" &&
                Number(item.recipient_id) ===
                    Number(currentUser.id) &&
                item.status === "Pending"
            ) {

                actions += `
                    <button
                        class="action-button edit-button"
                        onclick="editRequest(${item.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="action-button delete-button"
                        onclick="deleteRequest(${item.id})"
                    >
                        Delete
                    </button>
                `;
            }

            if (
                currentUser.role === "Admin" ||
                currentUser.role ===
                    "University Supervisor"
            ) {

                if (item.status === "Pending") {

                    actions += `
                        <button
                            class="action-button approve-button"
                            onclick="changeRequestStatus(${item.id}, 'Approved')"
                        >
                            Approve
                        </button>

                        <button
                            class="action-button reject-button"
                            onclick="changeRequestStatus(${item.id}, 'Rejected')"
                        >
                            Reject
                        </button>
                    `;
                }
            }

            return `
                <tr>

                    <td>
                        ${item.id}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.recipient_name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.title
                        )}
                    </td>

                    <td>
                        ${formatMoney(
                            item.amount_requested
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.status
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.created_at
                        )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;

        }).join("");
}


function openRequestForm(item = null) {

    showElement(
        "requestFormContainer"
    );

    if (item) {

        $("requestId").value =
            item.id;

        $("requestRecipient").value =
            item.title || "";

        $("requestAmount").value =
            item.amount_requested;

        $("requestReason").value =
            item.description || "";

    } else {

        $("requestForm").reset();

        $("requestId").value = "";
    }
}


function closeRequestForm() {

    hideElement(
        "requestFormContainer"
    );

    $("requestForm").reset();

    $("requestId").value = "";
}


function editRequest(id) {

    const item =
        requests.find(
            row => Number(row.id) === Number(id)
        );

    if (!item) return;

    openRequestForm(item);
}


async function saveRequest(event) {

    event.preventDefault();

    try {

        const id =
            $("requestId").value;

        const title =
            $("requestRecipient")
                .value
                .trim();

        const amount_requested =
            Number(
                $("requestAmount").value
            );

        const description =
            $("requestReason")
                .value
                .trim();

        const body = {
            title,
            amount_requested,
            description
        };

        if (id) {

            await apiRequest(
                `/requests/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "Request updated successfully."
            );

        } else {

            await apiRequest(
                "/requests",
                {
                    method: "POST",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "Request submitted successfully."
            );
        }

        closeRequestForm();

        await loadRequests();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


async function deleteRequest(id) {

    if (
        !confirm(
            "Are you sure you want to delete this request?"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/requests/${id}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "Request deleted successfully."
        );

        await loadRequests();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


async function changeRequestStatus(
    id,
    status
) {

    const action =
        status === "Approved"
            ? "approve"
            : "reject";

    if (
        !confirm(
            `Are you sure you want to ${action} this request?`
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/requests/${id}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    status
                })
            }
        );

        showToast(
            `Request ${status.toLowerCase()} successfully.`
        );

        await loadRequests();
        await loadDashboard();

    } catch (error) {

        showToast(error.message);
    }
}


/* =========================================================
   CONTACTS
========================================================= */

async function loadContacts() {

    try {

        const data =
            await apiRequest("/contacts");

        contacts =
            data.contacts || [];

        renderContacts();

    } catch (error) {

        console.error(
            "Contact loading error:",
            error
        );
    }
}


function renderContacts() {

    const body =
        $("contactTableBody");

    if (!body) return;

    if (contacts.length === 0) {

        body.innerHTML =
            `<tr>
                <td colspan="7">
                    No messages found.
                </td>
            </tr>`;

        return;
    }

    body.innerHTML =
        contacts.map(item => {

            let actions = "";

            if (
                [
                    "Admin",
                    "Accountant",
                    "University Supervisor"
                ].includes(currentUser.role)
            ) {

                actions = `
                    <button
                        class="action-button reply-button"
                        onclick="replyToContact(${item.id})"
                    >
                        Reply
                    </button>
                `;
            }

            return `
                <tr>

                    <td>
                        ${item.id}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.sender_name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.subject
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.message
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.reply || "No reply"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.created_at
                        )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;

        }).join("");
}


function openContactForm() {

    showElement(
        "contactFormContainer"
    );

    $("contactForm").reset();
}


function closeContactForm() {

    hideElement(
        "contactFormContainer"
    );

    $("contactForm").reset();
}


async function saveContact(event) {

    event.preventDefault();

    try {

        const subject =
            $("contactSubject")
                .value
                .trim();

        const message =
            $("contactMessage")
                .value
                .trim();

        await apiRequest(
            "/contacts",
            {
                method: "POST",
                body: JSON.stringify({
                    subject,
                    message
                })
            }
        );

        closeContactForm();

        showToast(
            "Message sent successfully."
        );

        await loadContacts();

    } catch (error) {

        showToast(error.message);
    }
}


async function replyToContact(id) {

    const reply =
        prompt("Enter your reply:");

    if (!reply || !reply.trim()) {
        return;
    }

    try {

        await apiRequest(
            `/contacts/${id}/reply`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    reply: reply.trim()
                })
            }
        );

        showToast(
            "Reply sent successfully."
        );

        await loadContacts();

    } catch (error) {

        showToast(error.message);
    }
}


/* =========================================================
   USERS
========================================================= */

async function loadUsers() {

    if (
        !currentUser ||
        currentUser.role !== "Admin"
    ) {
        return;
    }

    try {

        const data =
            await apiRequest("/users");

        users =
            data.users || [];

        renderUsers();

    } catch (error) {

        console.error(
            "User loading error:",
            error
        );
    }
}


function renderUsers() {

    const body =
        $("usersTableBody");

    if (!body) return;

    if (users.length === 0) {

        body.innerHTML =
            `<tr>
                <td colspan="6">
                    No users found.
                </td>
            </tr>`;

        return;
    }

    body.innerHTML =
        users.map(user => {

            return `
                <tr>

                    <td>
                        ${user.id}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.full_name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.email
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.role
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.created_at
                        )}
                    </td>

                    <td>

                        <button
                            class="action-button edit-button"
                            onclick="editUser(${user.id})"
                        >
                            Edit
                        </button>

                        <button
                            class="action-button delete-button"
                            onclick="deleteUser(${user.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;

        }).join("");
}


function openUserForm(user = null) {

    showElement(
        "userFormContainer"
    );

    if (user) {

        $("userFormTitle").textContent =
            "Edit User";

        $("userId").value =
            user.id;

        $("userName").value =
            user.full_name;

        $("userEmail").value =
            user.email;

        $("userPassword").value = "";

        $("userRole").value =
            user.role;

        $("userPassword").placeholder =
            "Leave empty to keep current password";

    } else {

        $("userFormTitle").textContent =
            "Add User";

        $("userForm").reset();

        $("userId").value = "";

        $("userPassword").placeholder =
            "Required for new users";
    }
}


function closeUserForm() {

    hideElement(
        "userFormContainer"
    );

    $("userForm").reset();

    $("userId").value = "";
}


function editUser(id) {

    const user =
        users.find(
            item => Number(item.id) === Number(id)
        );

    if (!user) return;

    openUserForm(user);
}


async function saveUser(event) {

    event.preventDefault();

    try {

        const id =
            $("userId").value;

        const full_name =
            $("userName")
                .value
                .trim();

        const email =
            $("userEmail")
                .value
                .trim();

        const password =
            $("userPassword").value;

        const role =
            $("userRole").value;

        if (!id && !password) {

            throw new Error(
                "Password is required for a new user."
            );
        }

        const body = {
            full_name,
            email,
            role
        };

        if (password) {
            body.password = password;
        }

        if (id) {

            await apiRequest(
                `/users/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "User updated successfully."
            );

        } else {

            await apiRequest(
                "/users",
                {
                    method: "POST",
                    body: JSON.stringify(body)
                }
            );

            showToast(
                "User created successfully."
            );
        }

        closeUserForm();

        await loadUsers();

    } catch (error) {

        showToast(error.message);
    }
}


async function deleteUser(id) {

    if (
        Number(id) === Number(currentUser.id)
    ) {

        showToast(
            "You cannot delete your own account."
        );

        return;
    }

    if (
        !confirm(
            "Are you sure you want to delete this user?"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/users/${id}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "User deleted successfully."
        );

        await loadUsers();

    } catch (error) {

        showToast(error.message);
    }
}


/* =========================================================
   REFRESH EVERYTHING
========================================================= */

async function refreshAll() {

    await loadDashboard();

    await Promise.all([
        loadDonations(),
        loadExpenditures(),
        loadRequests(),
        loadContacts(),
        loadUsers()
    ]);
}


/* =========================================================
   EXPORT FUNCTIONS
========================================================= */

function exportTableToExcel(
    tableId,
    filename
) {

    if (
        typeof XLSX === "undefined"
    ) {

        showToast(
            "Excel library is not available."
        );

        return;
    }

    const table =
        $(tableId);

    if (!table) return;

    const workbook =
        XLSX.utils.table_to_book(
            table,
            { sheet: "Data" }
        );

    XLSX.writeFile(
        workbook,
        filename
    );
}


function exportTableToPDF(
    tableId,
    title,
    filename
) {

    if (
        typeof window.jspdf === "undefined"
    ) {

        showToast(
            "PDF library is not available."
        );

        return;
    }

    const table =
        $(tableId);

    if (!table) return;

    const {
        jsPDF
    } = window.jspdf;

    const doc =
        new jsPDF("landscape");

    doc.text(
        title,
        14,
        15
    );

    const rows = [];

    const headers =
        table.querySelectorAll(
            "thead th"
        );

    const headerValues =
        Array.from(headers)
            .map(th =>
                th.textContent.trim()
            );

    table.querySelectorAll(
        "tbody tr"
    ).forEach(tr => {

        const cells =
            tr.querySelectorAll("td");

        if (!cells.length) return;

        rows.push(
            Array.from(cells)
                .map(td =>
                    td.textContent.trim()
                )
        );
    });

    if (
        typeof doc.autoTable === "function"
    ) {

        doc.autoTable({
            head: [headerValues],
            body: rows,
            startY: 22
        });

    } else {

        let y = 30;

        rows.forEach(row => {

            doc.text(
                row.join(" | "),
                10,
                y
            );

            y += 8;

            if (y > 190) {

                doc.addPage();

                y = 20;
            }
        });
    }

    doc.save(filename);
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
