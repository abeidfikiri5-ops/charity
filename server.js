
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const pool = require("./db");

const app = express();

const PORT = process.env.PORT || 5000;
const JWT_SECRET =
    process.env.JWT_SECRET || "change-this-secret-in-render";

app.use(cors());
app.use(express.json());

/* =========================
   HELPER FUNCTIONS
========================= */

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    const token = header.substring(7);

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

/* =========================
   HEALTH CHECK
========================= */

app.get(
    "/api/health",
    asyncRoute(async (req, res) => {
        await pool.query("SELECT 1");

        res.json({
            success: true,
            message: "MUST Charity Management System is running.",
            database: "connected"
        });
    })
);

/* =========================
   AUTHENTICATION
========================= */

/* REGISTER */

app.post(
    "/api/auth/register",
    asyncRoute(async (req, res) => {
        const {
            full_name,
            email,
            password,
            role
        } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const allowedRoles = [
            "Donor",
            "Recipient",
            "University Supervisor"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "This role cannot register publicly."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users
            (full_name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, email, role, created_at`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash,
                role
            ]
        );

        const user = result.rows[0];

        const token = createToken(user);

        res.status(201).json({
            success: true,
            message: "Registration successful.",
            token,
            user
        });
    })
);

/* LOGIN */

app.post(
    "/api/auth/login",
    asyncRoute(async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `SELECT id, full_name, email, password_hash, role, created_at
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        delete user.password_hash;

        const token = createToken(user);

        res.json({
            success: true,
            message: "Login successful.",
            token,
            user
        });
    })
);

/* CURRENT USER */

app.get(
    "/api/auth/me",
    authenticate,
    asyncRoute(async (req, res) => {
        const result = await pool.query(
            `SELECT id, full_name, email, role, created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    })
);

/* =========================
   USERS
   ADMIN ONLY
========================= */

app.get(
    "/api/users",
    authenticate,
    allowRoles("Admin"),
    asyncRoute(async (req, res) => {
        const result = await pool.query(
            `SELECT id, full_name, email, role, created_at
             FROM users
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            users: result.rows
        });
    })
);

app.post(
    "/api/users",
    authenticate,
    allowRoles("Admin"),
    asyncRoute(async (req, res) => {
        const {
            full_name,
            email,
            password,
            role
        } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const allowedRoles = [
            "Admin",
            "Accountant",
            "University Supervisor",
            "Donor",
            "Recipient"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users
            (full_name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, email, role, created_at`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash,
                role
            ]
        );

        res.status(201).json({
            success: true,
            message: "User created successfully.",
            user: result.rows[0]
        });
    })
);

app.put(
    "/api/users/:id",
    authenticate,
    allowRoles("Admin"),
    asyncRoute(async (req, res) => {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const {
            full_name,
            email,
            password,
            role
        } = req.body;

        if (!full_name || !email || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email and role are required."
            });
        }

        const allowedRoles = [
            "Admin",
            "Accountant",
            "University Supervisor",
            "Donor",
            "Recipient"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let result;

        if (password && password.length > 0) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must contain at least 6 characters."
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            result = await pool.query(
                `UPDATE users
                 SET full_name = $1,
                     email = $2,
                     password_hash = $3,
                     role = $4
                 WHERE id = $5
                 RETURNING id, full_name, email, role, created_at`,
                [
                    full_name.trim(),
                    normalizedEmail,
                    passwordHash,
                    role,
                    userId
                ]
            );
        } else {
            result = await pool.query(
                `UPDATE users
                 SET full_name = $1,
                     email = $2,
                     role = $3
                 WHERE id = $4
                 RETURNING id, full_name, email, role, created_at`,
                [
                    full_name.trim(),
                    normalizedEmail,
                    role,
                    userId
                ]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            message: "User updated successfully.",
            user: result.rows[0]
        });
    })
);

app.delete(
    "/api/users/:id",
    authenticate,
    allowRoles("Admin"),
    asyncRoute(async (req, res) => {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account."
            });
        }

        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 RETURNING id",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            message: "User deleted successfully."
        });
    })
);

/* =========================
   DONATIONS
========================= */

app.get(
    "/api/donations",
    authenticate,
    asyncRoute(async (req, res) => {
        let result;

        if (req.user.role === "Donor") {
            result = await pool.query(
                `SELECT
                    d.id,
                    d.donor_id,
                    u.full_name AS donor_name,
                    u.email AS donor_email,
                    d.amount,
                    d.description,
                    d.donation_date,
                    d.created_at
                 FROM donations d
                 JOIN users u ON u.id = d.donor_id
                 WHERE d.donor_id = $1
                 ORDER BY d.id DESC`,
                [req.user.id]
            );
        } else {
            result = await pool.query(
                `SELECT
                    d.id,
                    d.donor_id,
                    u.full_name AS donor_name,
                    u.email AS donor_email,
                    d.amount,
                    d.description,
                    d.donation_date,
                    d.created_at
                 FROM donations d
                 JOIN users u ON u.id = d.donor_id
                 ORDER BY d.id DESC`
            );
        }

        res.json({
            success: true,
            donations: result.rows
        });
    })
);

app.post(
    "/api/donations",
    authenticate,
    allowRoles("Admin", "Donor"),
    asyncRoute(async (req, res) => {
        const {
            donor_id,
            amount,
            description,
            donation_date
        } = req.body;

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Donation amount must be greater than zero."
            });
        }

        let donorId;

        if (req.user.role === "Donor") {
            donorId = req.user.id;
        } else {
            donorId = Number(donor_id);
        }

        if (!Number.isInteger(donorId)) {
            return res.status(400).json({
                success: false,
                message: "A valid donor is required."
            });
        }

        const donorCheck = await pool.query(
            `SELECT id FROM users
             WHERE id = $1 AND role = 'Donor'`,
            [donorId]
        );

        if (donorCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected donor does not exist."
            });
        }

        const result = await pool.query(
            `INSERT INTO donations
            (donor_id, amount, description, donation_date)
            VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE))
            RETURNING *`,
            [
                donorId,
                numericAmount,
                description || "",
                donation_date || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Donation created successfully.",
            donation: result.rows[0]
        });
    })
);

app.put(
    "/api/donations/:id",
    authenticate,
    allowRoles("Admin", "Donor"),
    asyncRoute(async (req, res) => {
        const donationId = Number(req.params.id);

        const {
            amount,
            description,
            donation_date
        } = req.body;

        const numericAmount = Number(amount);

        if (!Number.isInteger(donationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid donation ID."
            });
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Donation amount must be greater than zero."
            });
        }

        let result;

        if (req.user.role === "Donor") {
            result = await pool.query(
                `UPDATE donations
                 SET amount = $1,
                     description = $2,
                     donation_date = COALESCE($3, donation_date)
                 WHERE id = $4
                   AND donor_id = $5
                 RETURNING *`,
                [
                    numericAmount,
                    description || "",
                    donation_date || null,
                    donationId,
                    req.user.id
                ]
            );
        } else {
            result = await pool.query(
                `UPDATE donations
                 SET amount = $1,
                     description = $2,
                     donation_date = COALESCE($3, donation_date)
                 WHERE id = $4
                 RETURNING *`,
                [
                    numericAmount,
                    description || "",
                    donation_date || null,
                    donationId
                ]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Donation not found or you do not have permission."
            });
        }

        res.json({
            success: true,
            message: "Donation updated successfully.",
            donation: result.rows[0]
        });
    })
);

app.delete(
    "/api/donations/:id",
    authenticate,
    allowRoles("Admin", "Donor"),
    asyncRoute(async (req, res) => {
        const donationId = Number(req.params.id);

        let result;

        if (req.user.role === "Donor") {
            result = await pool.query(
                `DELETE FROM donations
                 WHERE id = $1 AND donor_id = $2
                 RETURNING id`,
                [donationId, req.user.id]
            );
        } else {
            result = await pool.query(
                `DELETE FROM donations
                 WHERE id = $1
                 RETURNING id`,
                [donationId]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Donation not found or you do not have permission."
            });
        }

        res.json({
            success: true,
            message: "Donation deleted successfully."
        });
    })
);

/* =========================
   EXPENDITURES
========================= */

app.get(
    "/api/expenditures",
    authenticate,
    asyncRoute(async (req, res) => {
        const result = await pool.query(
            `SELECT
                e.id,
                e.amount,
                e.description,
                e.expenditure_date,
                e.created_by,
                u.full_name AS created_by_name,
                e.created_at
             FROM expenditures e
             JOIN users u ON u.id = e.created_by
             ORDER BY e.id DESC`
        );

        res.json({
            success: true,
            expenditures: result.rows
        });
    })
);

app.post(
    "/api/expenditures",
    authenticate,
    allowRoles("Admin", "Accountant"),
    asyncRoute(async (req, res) => {
        const {
            amount,
            description,
            expenditure_date
        } = req.body;

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Expenditure amount must be greater than zero."
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Expenditure description is required."
            });
        }

        const result = await pool.query(
            `INSERT INTO expenditures
            (amount, description, expenditure_date, created_by)
            VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4)
            RETURNING *`,
            [
                numericAmount,
                description.trim(),
                expenditure_date || null,
                req.user.id
            ]
        );

        res.status(201).json({
            success: true,
            message: "Expenditure created successfully.",
            expenditure: result.rows[0]
        });
    })
);

app.put(
    "/api/expenditures/:id",
    authenticate,
    allowRoles("Admin", "Accountant"),
    asyncRoute(async (req, res) => {
        const expenditureId = Number(req.params.id);

        const {
            amount,
            description,
            expenditure_date
        } = req.body;

        const numericAmount = Number(amount);

        if (!Number.isInteger(expenditureId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expenditure ID."
            });
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Expenditure amount must be greater than zero."
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Description is required."
            });
        }

        const result = await pool.query(
            `UPDATE expenditures
             SET amount = $1,
                 description = $2,
                 expenditure_date = COALESCE($3, expenditure_date)
             WHERE id = $4
             RETURNING *`,
            [
                numericAmount,
                description.trim(),
                expenditure_date || null,
                expenditureId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Expenditure not found."
            });
        }

        res.json({
            success: true,
            message: "Expenditure updated successfully.",
            expenditure: result.rows[0]
        });
    })
);

app.delete(
    "/api/expenditures/:id",
    authenticate,
    allowRoles("Admin", "Accountant"),
    asyncRoute(async (req, res) => {
        const expenditureId = Number(req.params.id);

        const result = await pool.query(
            `DELETE FROM expenditures
             WHERE id = $1
             RETURNING id`,
            [expenditureId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Expenditure not found."
            });
        }

        res.json({
            success: true,
            message: "Expenditure deleted successfully."
        });
    })
);

/* =========================
   RECIPIENT REQUESTS
========================= */

app.get(
    "/api/requests",
    authenticate,
    asyncRoute(async (req, res) => {
        let result;

        if (req.user.role === "Recipient") {
            result = await pool.query(
                `SELECT
                    r.id,
                    r.recipient_id,
                    u.full_name AS recipient_name,
                    r.title,
                    r.description,
                    r.amount_requested,
                    r.status,
                    r.reviewed_by,
                    rv.full_name AS reviewer_name,
                    r.reviewed_at,
                    r.created_at
                 FROM recipient_requests r
                 JOIN users u ON u.id = r.recipient_id
                 LEFT JOIN users rv ON rv.id = r.reviewed_by
                 WHERE r.recipient_id = $1
                 ORDER BY r.id DESC`,
                [req.user.id]
            );
        } else {
            result = await pool.query(
                `SELECT
                    r.id,
                    r.recipient_id,
                    u.full_name AS recipient_name,
                    r.title,
                    r.description,
                    r.amount_requested,
                    r.status,
                    r.reviewed_by,
                    rv.full_name AS reviewer_name,
                    r.reviewed_at,
                    r.created_at
                 FROM recipient_requests r
                 JOIN users u ON u.id = r.recipient_id
                 LEFT JOIN users rv ON rv.id = r.reviewed_by
                 ORDER BY r.id DESC`
            );
        }

        res.json({
            success: true,
            requests: result.rows
        });
    })
);

app.post(
    "/api/requests",
    authenticate,
    allowRoles("Recipient"),
    asyncRoute(async (req, res) => {
        const {
            title,
            description,
            amount_requested
        } = req.body;

        const numericAmount = Number(amount_requested);

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Request title is required."
            });
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Requested amount must be greater than zero."
            });
        }

        const result = await pool.query(
            `INSERT INTO recipient_requests
            (recipient_id, title, description, amount_requested)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                req.user.id,
                title.trim(),
                description || "",
                numericAmount
            ]
        );

        res.status(201).json({
            success: true,
            message: "Request submitted successfully.",
            request: result.rows[0]
        });
    })
);

app.put(
    "/api/requests/:id",
    authenticate,
    allowRoles("Recipient"),
    asyncRoute(async (req, res) => {
        const requestId = Number(req.params.id);

        const {
            title,
            description,
            amount_requested
        } = req.body;

        const numericAmount = Number(amount_requested);

        const result = await pool.query(
            `UPDATE recipient_requests
             SET title = $1,
                 description = $2,
                 amount_requested = $3
             WHERE id = $4
               AND recipient_id = $5
               AND status = 'Pending'
             RETURNING *`,
            [
                title,
                description || "",
                numericAmount,
                requestId,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Request not found, already reviewed, or not yours."
            });
        }

        res.json({
            success: true,
            message: "Request updated successfully.",
            request: result.rows[0]
        });
    })
);

app.delete(
    "/api/requests/:id",
    authenticate,
    allowRoles("Recipient"),
    asyncRoute(async (req, res) => {
        const requestId = Number(req.params.id);

        const result = await pool.query(
            `DELETE FROM recipient_requests
             WHERE id = $1
               AND recipient_id = $2
               AND status = 'Pending'
             RETURNING id`,
            [
                requestId,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Request cannot be deleted."
            });
        }

        res.json({
            success: true,
            message: "Request deleted successfully."
        });
    })
);

/* APPROVE / REJECT REQUEST */

app.patch(
    "/api/requests/:id/status",
    authenticate,
    allowRoles("Admin", "University Supervisor"),
    asyncRoute(async (req, res) => {
        const requestId = Number(req.params.id);

        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Approved or Rejected."
            });
        }

        const result = await pool.query(
            `UPDATE recipient_requests
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [
                status,
                req.user.id,
                requestId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Request not found."
            });
        }

        res.json({
            success: true,
            message: `Request ${status.toLowerCase()} successfully.`,
            request: result.rows[0]
        });
    })
);

/* =========================
   CONTACTS
========================= */

app.get(
    "/api/contacts",
    authenticate,
    asyncRoute(async (req, res) => {
        let result;

        if (req.user.role === "Admin" ||
            req.user.role === "Accountant" ||
            req.user.role === "University Supervisor") {

            result = await pool.query(
                `SELECT
                    c.id,
                    c.sender_id,
                    u.full_name AS sender_name,
                    u.email AS sender_email,
                    c.subject,
                    c.message,
                    c.reply,
                    c.replied_by,
                    r.full_name AS replied_by_name,
                    c.created_at,
                    c.replied_at
                 FROM contacts c
                 JOIN users u ON u.id = c.sender_id
                 LEFT JOIN users r ON r.id = c.replied_by
                 ORDER BY c.id DESC`
            );
        } else {
            result = await pool.query(
                `SELECT
                    c.id,
                    c.sender_id,
                    u.full_name AS sender_name,
                    u.email AS sender_email,
                    c.subject,
                    c.message,
                    c.reply,
                    c.replied_by,
                    r.full_name AS replied_by_name,
                    c.created_at,
                    c.replied_at
                 FROM contacts c
                 JOIN users u ON u.id = c.sender_id
                 LEFT JOIN users r ON r.id = c.replied_by
                 WHERE c.sender_id = $1
                 ORDER BY c.id DESC`,
                [req.user.id]
            );
        }

        res.json({
            success: true,
            contacts: result.rows
        });
    })
);

app.post(
    "/api/contacts",
    authenticate,
    asyncRoute(async (req, res) => {
        const {
            subject,
            message
        } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Subject and message are required."
            });
        }

        const result = await pool.query(
            `INSERT INTO contacts
            (sender_id, subject, message)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                req.user.id,
                subject.trim(),
                message.trim()
            ]
        );

        res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            contact: result.rows[0]
        });
    })
);

app.patch(
    "/api/contacts/:id/reply",
    authenticate,
    allowRoles(
        "Admin",
        "Accountant",
        "University Supervisor"
    ),
    asyncRoute(async (req, res) => {
        const contactId = Number(req.params.id);

        const { reply } = req.body;

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                success: false,
                message: "Reply is required."
            });
        }

        const result = await pool.query(
            `UPDATE contacts
             SET reply = $1,
                 replied_by = $2,
                 replied_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [
                reply.trim(),
                req.user.id,
                contactId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Message not found."
            });
        }

        res.json({
            success: true,
            message: "Reply sent successfully.",
            contact: result.rows[0]
        });
    })
);

/* =========================
   DASHBOARD
========================= */

app.get(
    "/api/dashboard",
    authenticate,
    asyncRoute(async (req, res) => {
        const donationResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM donations`
        );

        const expenditureResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM expenditures`
        );

        const pendingResult = await pool.query(
            `SELECT COUNT(*) AS total
             FROM recipient_requests
             WHERE status = 'Pending'`
        );

        const usersResult = await pool.query(
            `SELECT COUNT(*) AS total
             FROM users`
        );

        const totalDonations =
            Number(donationResult.rows[0].total || 0);

        const totalExpenditures =
            Number(expenditureResult.rows[0].total || 0);

        const pendingRequests =
            Number(pendingResult.rows[0].total || 0);

        const totalUsers =
            Number(usersResult.rows[0].total || 0);

        res.json({
            success: true,
            dashboard: {
                totalDonations,
                totalExpenditures,
                availableBalance:
                    totalDonations - totalExpenditures,
                pendingRequests,
                totalUsers
            }
        });
    })
);

/* =========================
   FRONTEND
========================= */

app.use(
    express.static(
        path.join(__dirname, "frontend")
    )
);

app.get(
    /^(?!\/api).*/,
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "frontend",
                "index.html"
            )
        );
    }
);

/* =========================
   API 404
========================= */

app.use(
    "/api",
    (req, res) => {
        res.status(404).json({
            success: false,
            message: "API endpoint not found."
        });
    }
);

/* =========================
   ERROR HANDLER
========================= */

app.use(
    (err, req, res, next) => {
        console.error(err);

        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "This record already exists."
            });
        }

        if (err.code === "23503") {
            return res.status(400).json({
                success: false,
                message:
                    "This operation cannot be completed because the record is being used elsewhere."
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
);

/* =========================
   START SERVER
========================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `MUST Charity server running on port ${PORT}`
        );
    }
);
