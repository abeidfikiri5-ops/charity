/* =====================================================
   MUST CHARITY & EXPENDITURE MANAGEMENT SYSTEM
   FRONTEND VERSION

   This version uses localStorage.
   Later we will replace the localStorage functions
   with the real Node.js + PostgreSQL API.
===================================================== */


/* =====================================================
   DEFAULT USERS
===================================================== */

const DEFAULT_USERS = [

    {
        id: 1,
        name: "System Administrator",
        email: "admin@mustcharity.com",
        password: "Admin@12345",
        role: "admin"
    },

    {
        id: 2,
        name: "Accountant User",
        email: "accountant@mustcharity.com",
        password: "Accountant@123",
        role: "accountant"
    },

    {
        id: 3,
        name: "University Supervisor",
        email: "supervisor@mustcharity.com",
        password: "Supervisor@123",
        role: "supervisor"
    },

    {
        id: 4,
        name: "Donor User",
        email: "donor@mustcharity.com",
        password: "Donor@123",
        role: "donor"
    },

    {
        id: 5,
        name: "Recipient User",
        email: "recipient@mustcharity.com",
        password: "Recipient@123",
        role: "recipient"
    }

];


/* =====================================================
   APPLICATION DATA
===================================================== */

let users =
    JSON.parse(localStorage.getItem("must_users"))
    || DEFAULT_USERS;

let donations =
    JSON.parse(localStorage.getItem("must_donations"))
    || [];

let expenditures =
    JSON.parse(localStorage.getItem("must_expenditures"))
    || [];

let requests =
    JSON.parse(localStorage.getItem("must_requests"))
    || [];

let contacts =
    JSON.parse(localStorage.getItem("must_contacts"))
    || [];

let currentUser =
    JSON.parse(localStorage.getItem("must_current_user"))
    || null;


/* =====================================================
   SAVE DATA
===================================================== */

function saveData() {

    localStorage.setItem(
        "must_users",
        JSON.stringify(users)
    );

    localStorage.setItem(
        "must_donations",
        JSON.stringify(donations)
    );

    localStorage.setItem(
        "must_expenditures",
        JSON.stringify(expenditures)
    );

    localStorage.setItem(
        "must_requests",
        JSON.stringify(requests)
    );

    localStorage.setItem(
        "must_contacts",
        JSON.stringify(contacts)
    );
}


/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function generateId(array) {

    if (array.length === 0) {
        return 1;
    }

    return Math.max(
        ...array.map(item => Number(item.id))
    ) + 1;
}


function formatMoney(amount) {

    return "TZS " +
        Number(amount || 0).toLocaleString(
            "en-TZ",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
}


function formatDate(date) {

    return new Date(date).toLocaleString(
        "en-TZ"
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


/* =====================================================
   AUTHENTICATION
===================================================== */

const loginTab =
    document.getElementById("loginTab");

const registerTab =
    document.getElementById("registerTab");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");


loginTab.addEventListener("click", function () {

    loginTab.classList.add("active");

    registerTab.classList.remove("active");

    loginForm.classList.remove("hidden");

    registerForm.classList.add("hidden");

});


registerTab.addEventListener("click", function () {

    registerTab.classList.add("active");

    loginTab.classList.remove("active");

    registerForm.classList.remove("hidden");

    loginForm.classList.add("hidden");

});


/* =====================================================
   LOGIN
===================================================== */

loginForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const email =
            document.getElementById(
                "loginEmail"
            ).value
            .trim()
            .toLowerCase();

        const password =
            document.getElementById(
                "loginPassword"
            ).value;


        const user =
            users.find(
                item =>
                    item.email.toLowerCase()
                    === email
                    &&
                    item.password === password
            );


        if (!user) {

            document.getElementById(
                "loginMessage"
            ).textContent =
                "Invalid email or password.";

            document.getElementById(
                "loginMessage"
            ).className =
                "message error-message";

            return;
        }


        currentUser = user;

        localStorage.setItem(
            "must_current_user",
            JSON.stringify(currentUser)
        );


        document.getElementById(
            "loginMessage"
        ).textContent = "";


        showApplication();

        showToast(
            "Login successful."
        );

    }
);


/* =====================================================
   REGISTER
===================================================== */

registerForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const name =
            document.getElementById(
                "registerName"
            ).value.trim();

        const email =
            document.getElementById(
                "registerEmail"
            ).value
            .trim()
            .toLowerCase();

        const password =
            document.getElementById(
                "registerPassword"
            ).value;

        const role =
            document.getElementById(
                "registerRole"
            ).value;


        if (
            !name ||
            !email ||
            !password ||
            !role
        ) {

            showRegisterMessage(
                "Please fill all fields.",
                true
            );

            return;
        }


        const existingUser =
            users.find(
                user =>
                    user.email.toLowerCase()
                    === email
            );


        if (existingUser) {

            showRegisterMessage(
                "This email is already registered.",
                true
            );

            return;
        }


        const newUser = {

            id: generateId(users),

            name: name,

            email: email,

            password: password,

            role: role

        };


        users.push(newUser);

        saveData();


        showRegisterMessage(
            "Account created successfully.",
            false
        );


        document.getElementById(
            "registerForm"
        ).reset();


        showToast(
            "Account created successfully."
        );

    }
);


function showRegisterMessage(
    message,
    error
) {

    const element =
        document.getElementById(
            "registerMessage"
        );

    element.textContent = message;

    element.className =
        error
            ? "message error-message"
            : "message success-message";
}


/* =====================================================
   SHOW APPLICATION
===================================================== */

function showApplication() {

    document.getElementById(
        "authSection"
    ).classList.add("hidden");


    document.getElementById(
        "appSection"
    ).classList.remove("hidden");


    document.getElementById(
        "currentUserName"
    ).textContent =
        currentUser.name;


    document.getElementById(
        "currentRole"
    ).textContent =
        currentUser.role.toUpperCase();


    configurePermissions();

    updateDashboard();

    showPage("dashboardPage");

}


/* =====================================================
   LOGOUT
===================================================== */

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        function () {

            currentUser = null;

            localStorage.removeItem(
                "must_current_user"
            );

            document
                .getElementById(
                    "appSection"
                )
                .classList.add("hidden");


            document
                .getElementById(
                    "authSection"
                )
                .classList.remove("hidden");


            loginForm.reset();

            showToast(
                "You have logged out."
            );

        }
    );


/* =====================================================
   SIDEBAR NAVIGATION
===================================================== */

document
    .querySelectorAll(".menu-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const page =
                    this.dataset.page;

                showPage(page);

            }
        );

    });


function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.add("hidden");

        });


    const page =
        document.getElementById(pageId);


    if (page) {

        page.classList.remove("hidden");

    }


    document
        .querySelectorAll(".menu-btn")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

            if (
                button.dataset.page
                === pageId
            ) {

                button.classList.add(
                    "active"
                );

            }

        });


    if (pageId === "donationsPage") {

        renderDonations();

    }

    if (pageId === "expenditurePage") {

        renderExpenditures();

    }

    if (pageId === "requestsPage") {

        renderRequests();

    }

    if (pageId === "contactsPage") {

        renderContacts();

    }

    if (pageId === "usersPage") {

        renderUsers();

    }

    if (pageId === "dashboardPage") {

        updateDashboard();

    }

}


/* =====================================================
   ROLE PERMISSIONS
===================================================== */

function configurePermissions() {

    const role =
        currentUser.role;


    const usersMenu =
        document.getElementById(
            "usersMenu"
        );


    if (role === "admin") {

        usersMenu.classList.remove(
            "hidden"
        );

    } else {

        usersMenu.classList.add(
            "hidden"
        );

    }


    const permissionInfo =
        document.getElementById(
            "permissionInfo"
        );


    let permissions = [];


    if (role === "admin") {

        permissions = [
            "Manage all users",
            "Create donations",
            "View donations",
            "Update donations",
            "Delete donations",
            "Manage expenditures",
            "Manage recipient requests",
            "Manage contacts",
            "Download PDF",
            "Download Excel"
        ];

    }


    if (role === "accountant") {

        permissions = [
            "View donations",
            "Create expenditures",
            "View expenditures",
            "Update expenditures",
            "Delete expenditures",
            "View recipient requests",
            "Reply to supervisors",
            "Download PDF",
            "Download Excel"
        ];

    }


    if (role === "supervisor") {

        permissions = [
            "View donations",
            "View expenditures",
            "View recipient requests",
            "Contact Admin",
            "Contact Accountant",
            "View replies",
            "Download PDF",
            "Download Excel"
        ];

    }


    if (role === "donor") {

        permissions = [
            "Create donations",
            "View own donations",
            "View donation information",
            "Download PDF",
            "Download Excel"
        ];

    }


    if (role === "recipient") {

        permissions = [
            "Create assistance request",
            "View own requests",
            "Update pending request",
            "Delete pending request",
            "View request result",
            "Download PDF",
            "Download Excel"
        ];

    }


    permissionInfo.innerHTML =
        "<ul>" +
        permissions
            .map(
                permission =>
                    `<li>${escapeHTML(permission)}</li>`
            )
            .join("") +
        "</ul>";

}


/* =====================================================
   DASHBOARD
===================================================== */

function updateDashboard() {

    const totalDonation =
        donations.reduce(
            (sum, donation) =>
                sum + Number(donation.amount),
            0
        );


    const totalExpenditure =
        expenditures.reduce(
            (sum, expenditure) =>
                sum + Number(expenditure.amount),
            0
        );


    const balance =
        totalDonation -
        totalExpenditure;


    const pending =
        requests.filter(
            request =>
                request.status === "Pending"
        ).length;


    document.getElementById(
        "totalDonation"
    ).textContent =
        formatMoney(totalDonation);


    document.getElementById(
        "totalExpenditure"
    ).textContent =
        formatMoney(totalExpenditure);


    document.getElementById(
        "availableBalance"
    ).textContent =
        formatMoney(balance);


    document.getElementById(
        "pendingRequests"
    ).textContent =
        pending;

}


/* =====================================================
   DONATION FORM
===================================================== */

document
    .getElementById(
        "addDonationBtn"
    )
    .addEventListener(
        "click",
        function () {

            openDonationForm();

        }
    );


document
    .getElementById(
        "cancelDonation"
    )
    .addEventListener(
        "click",
        function () {

            closeDonationForm();

        }
    );


function openDonationForm(donation = null) {

    const container =
        document.getElementById(
            "donationFormContainer"
        );


    container.classList.remove(
        "hidden"
    );


    if (donation) {

        document.getElementById(
            "donationFormTitle"
        ).textContent =
            "Update Donation";


        document.getElementById(
            "donationId"
        ).value =
            donation.id;


        document.getElementById(
            "donorName"
        ).value =
            donation.donor;


        document.getElementById(
            "donationAmount"
        ).value =
            donation.amount;


        document.getElementById(
            "donationPurpose"
        ).value =
            donation.purpose;

    } else {

        document.getElementById(
            "donationFormTitle"
        ).textContent =
            "Add Donation";


        document
            .getElementById(
                "donationForm"
            )
            .reset();


        document.getElementById(
            "donationId"
        ).value = "";

    }

}


function closeDonationForm() {

    document
        .getElementById(
            "donationFormContainer"
        )
        .classList.add("hidden");

}


/* =====================================================
   SAVE DONATION
===================================================== */

document
    .getElementById(
        "donationForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "donationId"
                ).value;


            const donor =
                document.getElementById(
                    "donorName"
                ).value.trim();


            const amount =
                Number(
                    document.getElementById(
                        "donationAmount"
                    ).value
                );


            const purpose =
                document.getElementById(
                    "donationPurpose"
                ).value.trim();


            if (
                !donor ||
                amount <= 0 ||
                !purpose
            ) {

                showToast(
                    "Please enter valid donation information."
                );

                return;

            }


            if (id) {

                const donation =
                    donations.find(
                        item =>
                            Number(item.id)
                            === Number(id)
                    );


                if (donation) {

                    donation.donor =
                        donor;

                    donation.amount =
                        amount;

                    donation.purpose =
                        purpose;

                }

                showToast(
                    "Donation updated."
                );

            } else {

                donations.push({

                    id: generateId(
                        donations
                    ),

                    donor: donor,

                    amount: amount,

                    purpose: purpose,

                    date: new Date().toISOString(),

                    createdBy:
                        currentUser.id

                });


                showToast(
                    "Donation created."
                );

            }


            saveData();

            closeDonationForm();

            renderDonations();

            updateDashboard();

        }
    );


/* =====================================================
   RENDER DONATIONS
===================================================== */

function renderDonations() {

    const body =
        document.getElementById(
            "donationTableBody"
        );


    let visibleDonations =
        donations;


    if (
        currentUser.role ===
        "donor"
    ) {

        visibleDonations =
            donations.filter(
                donation =>
                    donation.createdBy
                    === currentUser.id
            );

    }


    if (
        visibleDonations.length === 0
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No donation records found.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        visibleDonations
            .map(
                donation => {

                    let actions = "";


                    if (
                        currentUser.role
                        === "admin"
                    ) {

                        actions = `

                            <button
                                class="action-btn edit-btn"
                                onclick="editDonation(${donation.id})"
                            >
                                Edit
                            </button>

                            <button
                                class="action-btn delete-btn"
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
                                    donation.donor
                                )}
                            </td>

                            <td>
                                ${formatMoney(
                                    donation.amount
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    donation.purpose
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    donation.date
                                )}
                            </td>

                            <td>
                                ${actions}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


function editDonation(id) {

    const donation =
        donations.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (donation) {

        openDonationForm(
            donation
        );

    }

}


function deleteDonation(id) {

    if (
        !confirm(
            "Are you sure you want to delete this donation?"
        )
    ) {

        return;

    }


    donations =
        donations.filter(
            donation =>
                Number(donation.id)
                !== Number(id)
        );


    saveData();

    renderDonations();

    updateDashboard();

    showToast(
        "Donation deleted."
    );

}


/* =====================================================
   EXPENDITURE FORM
===================================================== */

document
    .getElementById(
        "addExpenditureBtn"
    )
    .addEventListener(
        "click",
        function () {

            if (
                currentUser.role !==
                "admin"
                &&
                currentUser.role !==
                "accountant"
            ) {

                showToast(
                    "You do not have permission to add expenditure."
                );

                return;

            }


            openExpenditureForm();

        }
    );


document
    .getElementById(
        "cancelExpenditure"
    )
    .addEventListener(
        "click",
        function () {

            closeExpenditureForm();

        }
    );


function openExpenditureForm(
    expenditure = null
) {

    const container =
        document.getElementById(
            "expenditureFormContainer"
        );


    container.classList.remove(
        "hidden"
    );


    if (expenditure) {

        document.getElementById(
            "expenditureFormTitle"
        ).textContent =
            "Update Expenditure";


        document.getElementById(
            "expenditureId"
        ).value =
            expenditure.id;


        document.getElementById(
            "expenditureTitle"
        ).value =
            expenditure.title;


        document.getElementById(
            "expenditureAmount"
        ).value =
            expenditure.amount;


        document.getElementById(
            "expenditureDescription"
        ).value =
            expenditure.description;

    } else {

        document.getElementById(
            "expenditureFormTitle"
        ).textContent =
            "Add Expenditure";


        document
            .getElementById(
                "expenditureForm"
            )
            .reset();


        document.getElementById(
            "expenditureId"
        ).value = "";

    }

}


function closeExpenditureForm() {

    document
        .getElementById(
            "expenditureFormContainer"
        )
        .classList.add("hidden");

}


/* =====================================================
   SAVE EXPENDITURE
===================================================== */

document
    .getElementById(
        "expenditureForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "expenditureId"
                ).value;


            const title =
                document.getElementById(
                    "expenditureTitle"
                ).value.trim();


            const amount =
                Number(
                    document.getElementById(
                        "expenditureAmount"
                    ).value
                );


            const description =
                document.getElementById(
                    "expenditureDescription"
                ).value.trim();


            if (
                !title ||
                amount <= 0 ||
                !description
            ) {

                showToast(
                    "Please enter valid expenditure information."
                );

                return;

            }


            if (id) {

                const expenditure =
                    expenditures.find(
                        item =>
                            Number(item.id)
                            === Number(id)
                    );


                if (expenditure) {

                    expenditure.title =
                        title;

                    expenditure.amount =
                        amount;

                    expenditure.description =
                        description;

                }

                showToast(
                    "Expenditure updated."
                );

            } else {

                expenditures.push({

                    id: generateId(
                        expenditures
                    ),

                    title: title,

                    amount: amount,

                    description:
                        description,

                    date:
                        new Date().toISOString(),

                    createdBy:
                        currentUser.id

                });


                showToast(
                    "Expenditure created."
                );

            }


            saveData();

            closeExpenditureForm();

            renderExpenditures();

            updateDashboard();

        }
    );


/* =====================================================
   RENDER EXPENDITURES
===================================================== */

function renderExpenditures() {

    const body =
        document.getElementById(
            "expenditureTableBody"
        );


    if (
        expenditures.length === 0
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No expenditure records found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        expenditures
            .map(
                expenditure => {

                    let actions = "";


                    if (
                        currentUser.role
                        === "admin"
                        ||
                        currentUser.role
                        === "accountant"
                    ) {

                        actions = `

                            <button
                                class="action-btn edit-btn"
                                onclick="editExpenditure(${expenditure.id})"
                            >
                                Edit
                            </button>

                            <button
                                class="action-btn delete-btn"
                                onclick="deleteExpenditure(${expenditure.id})"
                            >
                                Delete
                            </button>

                        `;

                    }


                    return `

                        <tr>

                            <td>
                                ${expenditure.id}
                            </td>

                            <td>
                                ${escapeHTML(
                                    expenditure.title
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    expenditure.description
                                )}
                            </td>

                            <td>
                                ${formatMoney(
                                    expenditure.amount
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    expenditure.date
                                )}
                            </td>

                            <td>
                                ${actions}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


function editExpenditure(id) {

    const expenditure =
        expenditures.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (expenditure) {

        openExpenditureForm(
            expenditure
        );

    }

}


function deleteExpenditure(id) {

    if (
        !confirm(
            "Are you sure you want to delete this expenditure?"
        )
    ) {

        return;

    }


    expenditures =
        expenditures.filter(
            expenditure =>
                Number(expenditure.id)
                !== Number(id)
        );


    saveData();

    renderExpenditures();

    updateDashboard();

    showToast(
        "Expenditure deleted."
    );

}


/* =====================================================
   RECIPIENT REQUEST FORM
===================================================== */

document
    .getElementById(
        "addRequestBtn"
    )
    .addEventListener(
        "click",
        function () {

            if (
                currentUser.role !==
                "recipient"
                &&
                currentUser.role !==
                "admin"
            ) {

                showToast(
                    "Only recipients can create requests."
                );

                return;

            }


            openRequestForm();

        }
    );


document
    .getElementById(
        "cancelRequest"
    )
    .addEventListener(
        "click",
        function () {

            closeRequestForm();

        }
    );


function openRequestForm(
    request = null
) {

    document
        .getElementById(
            "requestFormContainer"
        )
        .classList.remove(
            "hidden"
        );


    if (request) {

        document.getElementById(
            "requestId"
        ).value =
            request.id;


        document.getElementById(
            "requestRecipient"
        ).value =
            request.recipient;


        document.getElementById(
            "requestAmount"
        ).value =
            request.amount;


        document.getElementById(
            "requestReason"
        ).value =
            request.reason;

    } else {

        document
            .getElementById(
                "requestForm"
            )
            .reset();


        document.getElementById(
            "requestId"
        ).value = "";

    }

}


function closeRequestForm() {

    document
        .getElementById(
            "requestFormContainer"
        )
        .classList.add(
            "hidden"
        );

}


/* =====================================================
   SAVE REQUEST
===================================================== */

document
    .getElementById(
        "requestForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "requestId"
                ).value;


            const recipient =
                document.getElementById(
                    "requestRecipient"
                ).value.trim();


            const amount =
                Number(
                    document.getElementById(
                        "requestAmount"
                    ).value
                );


            const reason =
                document.getElementById(
                    "requestReason"
                ).value.trim();


            if (
                !recipient ||
                amount <= 0 ||
                !reason
            ) {

                showToast(
                    "Please enter valid request information."
                );

                return;

            }


            if (id) {

                const request =
                    requests.find(
                        item =>
                            Number(item.id)
                            === Number(id)
                    );


                if (request) {

                    request.recipient =
                        recipient;

                    request.amount =
                        amount;

                    request.reason =
                        reason;

                }

                showToast(
                    "Request updated."
                );

            } else {

                requests.push({

                    id: generateId(
                        requests
                    ),

                    recipient:
                        recipient,

                    amount:
                        amount,

                    reason:
                        reason,

                    status:
                        "Pending",

                    result:
                        "Waiting for review",

                    date:
                        new Date().toISOString(),

                    createdBy:
                        currentUser.id

                });


                showToast(
                    "Request submitted."
                );

            }


            saveData();

            closeRequestForm();

            renderRequests();

            updateDashboard();

        }
    );


/* =====================================================
   RENDER REQUESTS
===================================================== */

function renderRequests() {

    const body =
        document.getElementById(
            "requestTableBody"
        );


    let visibleRequests =
        requests;


    if (
        currentUser.role ===
        "recipient"
    ) {

        visibleRequests =
            requests.filter(
                request =>
                    request.createdBy
                    === currentUser.id
            );

    }


    if (
        visibleRequests.length === 0
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    No recipient requests found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        visibleRequests
            .map(
                request => {

                    let actions = "";


                    if (
                        currentUser.role
                        === "admin"
                    ) {

                        actions = `

                            <button
                                class="action-btn approve-btn"
                                onclick="approveRequest(${request.id})"
                            >
                                Approve
                            </button>

                            <button
                                class="action-btn reject-btn"
                                onclick="rejectRequest(${request.id})"
                            >
                                Reject
                            </button>

                            <button
                                class="action-btn delete-btn"
                                onclick="deleteRequest(${request.id})"
                            >
                                Delete
                            </button>

                        `;

                    }


                    if (
                        currentUser.role
                        === "recipient"
                        &&
                        request.status
                        === "Pending"
                    ) {

                        actions = `

                            <button
                                class="action-btn edit-btn"
                                onclick="editRequest(${request.id})"
                            >
                                Edit
                            </button>

                            <button
                                class="action-btn delete-btn"
                                onclick="deleteRequest(${request.id})"
                            >
                                Delete
                            </button>

                        `;

                    }


                    return `

                        <tr>

                            <td>
                                ${request.id}
                            </td>

                            <td>
                                ${escapeHTML(
                                    request.recipient
                                )}
                            </td>

                            <td>
                                ${formatMoney(
                                    request.amount
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    request.reason
                                )}
                            </td>

                            <td>

                                <span
                                    class="status ${request.status.toLowerCase()}"
                                >
                                    ${request.status}
                                </span>

                            </td>

                            <td>
                                ${escapeHTML(
                                    request.result
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    request.date
                                )}
                            </td>

                            <td>
                                ${actions}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


function editRequest(id) {

    const request =
        requests.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (request) {

        openRequestForm(
            request
        );

    }

}


function approveRequest(id) {

    const request =
        requests.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (!request) {
        return;
    }


    request.status =
        "Approved";


    request.result =
        "Request approved by Admin.";


    saveData();

    renderRequests();

    updateDashboard();

    showToast(
        "Request approved."
    );

}


function rejectRequest(id) {

    const request =
        requests.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (!request) {
        return;
    }


    request.status =
        "Rejected";


    request.result =
        "Request rejected by Admin.";


    saveData();

    renderRequests();

    updateDashboard();

    showToast(
        "Request rejected."
    );

}


function deleteRequest(id) {

    if (
        !confirm(
            "Are you sure you want to delete this request?"
        )
    ) {

        return;

    }


    requests =
        requests.filter(
            request =>
                Number(request.id)
                !== Number(id)
        );


    saveData();

    renderRequests();

    updateDashboard();

    showToast(
        "Request deleted."
    );

}


/* =====================================================
   CONTACT FORM
===================================================== */

document
    .getElementById(
        "addContactBtn"
    )
    .addEventListener(
        "click",
        function () {

            if (
                currentUser.role !==
                "supervisor"
            ) {

                showToast(
                    "Only University Supervisor can create messages."
                );

                return;

            }


            document
                .getElementById(
                    "contactFormContainer"
                )
                .classList.remove(
                    "hidden"
                );

        }
    );


document
    .getElementById(
        "cancelContact"
    )
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "contactFormContainer"
                )
                .classList.add(
                    "hidden"
                );

        }
    );


/* =====================================================
   SAVE CONTACT
===================================================== */

document
    .getElementById(
        "contactForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const recipient =
                document.getElementById(
                    "contactRecipient"
                ).value;


            const subject =
                document.getElementById(
                    "contactSubject"
                ).value.trim();


            const message =
                document.getElementById(
                    "contactMessage"
                ).value.trim();


            contacts.push({

                id: generateId(
                    contacts
                ),

                sender:
                    currentUser.name,

                senderId:
                    currentUser.id,

                recipient:
                    recipient,

                subject:
                    subject,

                message:
                    message,

                reply:
                    "",

                date:
                    new Date().toISOString()

            });


            saveData();

            document
                .getElementById(
                    "contactForm"
                )
                .reset();


            document
                .getElementById(
                    "contactFormContainer"
                )
                .classList.add(
                    "hidden"
                );


            renderContacts();

            showToast(
                "Message sent successfully."
            );

        }
    );


/* =====================================================
   RENDER CONTACTS
===================================================== */

function renderContacts() {

    const body =
        document.getElementById(
            "contactTableBody"
        );


    let visibleContacts =
        contacts;


    if (
        currentUser.role ===
        "supervisor"
    ) {

        visibleContacts =
            contacts.filter(
                contact =>
                    contact.senderId
                    === currentUser.id
            );

    }


    if (
        visibleContacts.length === 0
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    No messages found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        visibleContacts
            .map(
                contact => {

                    let actions = "";


                    if (
                        currentUser.role
                        === "admin"
                        &&
                        contact.recipient
                        === "Admin"
                    ) {

                        actions = `

                            <button
                                class="action-btn edit-btn"
                                onclick="replyContact(${contact.id})"
                            >
                                Reply
                            </button>

                        `;

                    }


                    if (
                        currentUser.role
                        === "accountant"
                        &&
                        contact.recipient
                        === "Accountant"
                    ) {

                        actions = `

                            <button
                                class="action-btn edit-btn"
                                onclick="replyContact(${contact.id})"
                            >
                                Reply
                            </button>

                        `;

                    }


                    return `

                        <tr>

                            <td>
                                ${contact.id}
                            </td>

                            <td>
                                ${escapeHTML(
                                    contact.sender
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    contact.recipient
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    contact.subject
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    contact.message
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    contact.reply
                                    || "No reply yet"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    contact.date
                                )}
                            </td>

                            <td>
                                ${actions}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   REPLY TO CONTACT
===================================================== */

function replyContact(id) {

    const contact =
        contacts.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (!contact) {
        return;
    }


    const reply =
        prompt(
            "Enter your reply:",
            contact.reply || ""
        );


    if (reply === null) {
        return;
    }


    contact.reply =
        reply.trim();


    saveData();

    renderContacts();

    showToast(
        "Reply saved."
    );

}


/* =====================================================
   USER MANAGEMENT
===================================================== */

document
    .getElementById(
        "addUserBtn"
    )
    .addEventListener(
        "click",
        function () {

            if (
                currentUser.role !==
                "admin"
            ) {

                showToast(
                    "Only Admin can manage users."
                );

                return;

            }


            openUserForm();

        }
    );


document
    .getElementById(
        "cancelUser"
    )
    .addEventListener(
        "click",
        function () {

            closeUserForm();

        }
    );


function openUserForm(user = null) {

    document
        .getElementById(
            "userFormContainer"
        )
        .classList.remove(
            "hidden"
        );


    if (user) {

        document.getElementById(
            "userFormTitle"
        ).textContent =
            "Update User";


        document.getElementById(
            "userId"
        ).value =
            user.id;


        document.getElementById(
            "userName"
        ).value =
            user.name;


        document.getElementById(
            "userEmail"
        ).value =
            user.email;


        document.getElementById(
            "userPassword"
        ).value = "";


        document.getElementById(
            "userRole"
        ).value =
            user.role;

    } else {

        document.getElementById(
            "userFormTitle"
        ).textContent =
            "Add User";


        document
            .getElementById(
                "userForm"
            )
            .reset();


        document.getElementById(
            "userId"
        ).value = "";

    }

}


function closeUserForm() {

    document
        .getElementById(
            "userFormContainer"
        )
        .classList.add(
            "hidden"
        );

}


/* =====================================================
   SAVE USER
===================================================== */

document
    .getElementById(
        "userForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "userId"
                ).value;


            const name =
                document.getElementById(
                    "userName"
                ).value.trim();


            const email =
                document.getElementById(
                    "userEmail"
                ).value
                .trim()
                .toLowerCase();


            const password =
                document.getElementById(
                    "userPassword"
                ).value;


            const role =
                document.getElementById(
                    "userRole"
                ).value;


            if (
                !name ||
                !email ||
                !role
            ) {

                showToast(
                    "Please fill all required fields."
                );

                return;

            }


            const duplicate =
                users.find(
                    user =>
                        user.email
                        === email
                        &&
                        Number(user.id)
                        !== Number(id)
                );


            if (duplicate) {

                showToast(
                    "This email is already used."
                );

                return;

            }


            if (id) {

                const user =
                    users.find(
                        item =>
                            Number(item.id)
                            === Number(id)
                    );


                if (user) {

                    user.name =
                        name;

                    user.email =
                        email;

                    user.role =
                        role;


                    if (password) {

                        user.password =
                            password;

                    }

                }

                showToast(
                    "User updated."
                );

            } else {

                if (!password) {

                    showToast(
                        "Password is required for a new user."
                    );

                    return;

                }


                users.push({

                    id:
                        generateId(
                            users
                        ),

                    name:
                        name,

                    email:
                        email,

                    password:
                        password,

                    role:
                        role

                });


                showToast(
                    "User created."
                );

            }


            saveData();

            closeUserForm();

            renderUsers();

        }
    );


/* =====================================================
   RENDER USERS
===================================================== */

function renderUsers() {

    const body =
        document.getElementById(
            "usersTableBody"
        );


    if (
        currentUser.role !==
        "admin"
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    Access denied.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        users
            .map(
                user => `

                    <tr>

                        <td>
                            ${user.id}
                        </td>

                        <td>
                            ${escapeHTML(
                                user.name
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

                            <button
                                class="action-btn edit-btn"
                                onclick="editUser(${user.id})"
                            >
                                Edit
                            </button>

                            <button
                                class="action-btn delete-btn"
                                onclick="deleteUser(${user.id})"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `
            )
            .join("");

}


function editUser(id) {

    const user =
        users.find(
            item =>
                Number(item.id)
                === Number(id)
        );


    if (user) {

        openUserForm(
            user
        );

    }

}


function deleteUser(id) {

    if (
        Number(id)
        === Number(currentUser.id)
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


    users =
        users.filter(
            user =>
                Number(user.id)
                !== Number(id)
        );


    saveData();

    renderUsers();

    showToast(
        "User deleted."
    );

}


/* =====================================================
   EXCEL EXPORT
===================================================== */

function exportTableToExcel(
    tableId,
    fileName
) {

    if (
        typeof XLSX ===
        "undefined"
    ) {

        showToast(
            "Excel library could not be loaded."
        );

        return;

    }


    const table =
        document.getElementById(
            tableId
        );


    const workbook =
        XLSX.utils.table_to_book(
            table,
            {
                sheet: "Data"
            }
        );


    XLSX.writeFile(
        workbook,
        fileName + ".xlsx"
    );


    showToast(
        "Excel file generated."
    );

}


/* =====================================================
   PDF EXPORT
===================================================== */

function exportTableToPDF(
    tableId,
    title
) {

    if (
        !window.jspdf
    ) {

        showToast(
            "PDF library could not be loaded."
        );

        return;

    }


    const {
        jsPDF
    } = window.jspdf;


    const pdf =
        new jsPDF(
            "landscape"
        );


    pdf.setFontSize(16);

    pdf.text(
        title,
        14,
        15
    );


    pdf.setFontSize(10);

    pdf.text(
        "MUST Charity & Expenditure Management System",
        14,
        22
    );


    pdf.autoTable({

        html:
            "#" + tableId,

        startY:
            28,

        styles: {
            fontSize: 8
        },

        headStyles: {
            fillColor: [23, 74, 126]
        }

    });


    pdf.save(
        title
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            ) + ".pdf"
    );


    showToast(
        "PDF file generated."
    );

}


/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

function initializeApplication() {

    /*
       Make sure default users are stored.
    */

    if (
        !localStorage.getItem(
            "must_users"
        )
    ) {

        saveData();

    }


    /*
       If a user was already logged in,
       open the application.
    */

    if (currentUser) {

        /*
           Verify that the stored user
           still exists.
        */

        const validUser =
            users.find(
                user =>
                    Number(user.id)
                    === Number(currentUser.id)
            );


        if (validUser) {

            currentUser =
                validUser;

            showApplication();

            return;

        }

    }


    /*
       Otherwise show login.
    */

    document
        .getElementById(
            "authSection"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "appSection"
        )
        .classList.add(
            "hidden"
        );

}


/* =====================================================
   START APPLICATION
===================================================== */

initializeApplication();
