const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET =
    process.env.JWT_SECRET || "charity-secret-key-change-me";

/* =========================
   AUTHENTICATION
========================= */

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

async function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = header.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        const result = await pool.query(
            `SELECT id, full_name, email, role, created_at
             FROM users
             WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists"
            });
        }

        req.user = result.rows[0];

        next();
    } catch (error) {
        console.error(error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action"
            });
        }

        next();
    };
}

/* =========================
   BASIC ROUTES
========================= */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MUST Charity & Expenditure server is working!"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "Server and PostgreSQL are connected!",
            databaseTime: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

/* =========================
   LOGIN
========================= */

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = createToken(user);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

/* =========================
   CURRENT USER
========================= */

app.get("/api/auth/me", authenticate, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

/* =========================
   USERS
========================= */

app.get(
    "/api/users",
    authenticate,
    allowRoles("Admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT id, full_name, email, role, created_at
                 FROM users
                 ORDER BY id DESC`
            );

            res.json({
                success: true,
                users: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to get users"
            });
        }
    }
);

app.post(
    "/api/users",
    authenticate,
    allowRoles("Admin"),
    async (req, res) => {
        try {
            const {
                full_name,
                email,
                password,
                role
            } = req.body;

            const allowedRoles = [
                "Admin",
                "Accountant",
                "University Supervisor",
                "Donor",
                "Recipient"
            ];

            if (!full_name || !email || !password || !role) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required"
                });
            }

            if (!allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
            }

            const existing = await pool.query(
                "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
                [email.trim()]
            );

            if (existing.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email already exists"
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
                    email.trim().toLowerCase(),
                    passwordHash,
                    role
                ]
            );

            res.status(201).json({
                success: true,
                message: "User created successfully",
                user: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to create user"
            });
        }
    }
);

app.put(
    "/api/users/:id",
    authenticate,
    allowRoles("Admin"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const {
                full_name,
                email,
                password,
                role
            } = req.body;

            const allowedRoles = [
                "Admin",
                "Accountant",
                "University Supervisor",
                "Donor",
                "Recipient"
            ];

            if (!full_name || !email || !role) {
                return res.status(400).json({
                    success: false,
                    message: "Name, email and role are required"
                });
            }

            if (!allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
            }

            let result;

            if (password) {
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
                        email.trim().toLowerCase(),
                        passwordHash,
                        role,
                        id
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
                        email.trim().toLowerCase(),
                        role,
                        id
                    ]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            res.json({
                success: true,
                message: "User updated successfully",
                user: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to update user"
            });
        }
    }
);

app.delete(
    "/api/users/:id",
    authenticate,
    allowRoles("Admin"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot delete your own account"
                });
            }

            const result = await pool.query(
                "DELETE FROM users WHERE id = $1 RETURNING id",
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            res.json({
                success: true,
                message: "User deleted successfully"
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to delete user"
            });
        }
    }
);

/* =========================
   DONATIONS
========================= */

app.get("/api/donations", authenticate, async (req, res) => {
    try {
        let result;

        if (req.user.role === "Donor") {
            result = await pool.query(
                `SELECT d.id,
                        d.donor_id,
                        u.full_name AS donor_name,
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
                `SELECT d.id,
                        d.donor_id,
                        u.full_name AS donor_name,
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
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get donations"
        });
    }
});

app.post(
    "/api/donations",
    authenticate,
    allowRoles("Admin", "Donor"),
    async (req, res) => {
        try {
            const {
                donor_id,
                amount,
                description,
                donation_date
            } = req.body;

            const donorId =
                req.user.role === "Donor"
                    ? req.user.id
                    : Number(donor_id);

            if (!donorId || !amount) {
                return res.status(400).json({
                    success: false,
                    message: "Donor and amount are required"
                });
            }

            const result = await pool.query(
                `INSERT INTO donations
                 (donor_id, amount, description, donation_date)
                 VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE))
                 RETURNING *`,
                [
                    donorId,
                    Number(amount),
                    description || "",
                    donation_date || null
                ]
            );

            res.status(201).json({
                success: true,
                message: "Donation created successfully",
                donation: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to create donation"
            });
        }
    }
);

app.put(
    "/api/donations/:id",
    authenticate,
    allowRoles("Admin", "Donor"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const {
                amount,
                description,
                donation_date
            } = req.body;

            if (!amount) {
                return res.status(400).json({
                    success: false,
                    message: "Amount is required"
                });
            }

            let result;

            if (req.user.role === "Donor") {
                result = await pool.query(
                    `UPDATE donations
                     SET amount = $1,
                         description = $2,
                         donation_date =
                             COALESCE($3::date, donation_date)
                     WHERE id = $4
                       AND donor_id = $5
                     RETURNING *`,
                    [
                        Number(amount),
                        description || "",
                        donation_date || null,
                        id,
                        req.user.id
                    ]
                );
            } else {
                result = await pool.query(
                    `UPDATE donations
                     SET amount = $1,
                         description = $2,
                         donation_date =
                             COALESCE($3::date, donation_date)
                     WHERE id = $4
                     RETURNING *`,
                    [
                        Number(amount),
                        description || "",
                        donation_date || null,
                        id
                    ]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Donation not found or not allowed"
                });
            }

            res.json({
                success: true,
                message: "Donation updated successfully",
                donation: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to update donation"
            });
        }
    }
);

app.delete(
    "/api/donations/:id",
    authenticate,
    allowRoles("Admin", "Donor"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            let result;

            if (req.user.role === "Donor") {
                result = await pool.query(
                    `DELETE FROM donations
                     WHERE id = $1
                       AND donor_id = $2
                     RETURNING id`,
                    [id, req.user.id]
                );
            } else {
                result = await pool.query(
                    `DELETE FROM donations
                     WHERE id = $1
                     RETURNING id`,
                    [id]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Donation not found or not allowed"
                });
            }

            res.json({
                success: true,
                message: "Donation deleted successfully"
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to delete donation"
            });
        }
    }
);

/* =========================
   EXPENDITURES
========================= */

app.get("/api/expenditures", authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.id,
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
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get expenditures"
        });
    }
});

app.post(
    "/api/expenditures",
    authenticate,
    allowRoles("Admin", "Accountant"),
    async (req, res) => {
        try {
            const {
                amount,
                description,
                expenditure_date
            } = req.body;

            if (!amount || !description) {
                return res.status(400).json({
                    success: false,
                    message: "Amount and description are required"
                });
            }

            const result = await pool.query(
                `INSERT INTO expenditures
                 (amount, description, expenditure_date, created_by)
                 VALUES (
                     $1,
                     $2,
                     COALESCE($3::date, CURRENT_DATE),
                     $4
                 )
                 RETURNING *`,
                [
                    Number(amount),
                    description,
                    expenditure_date || null,
                    req.user.id
                ]
            );

            res.status(201).json({
                success: true,
                message: "Expenditure created successfully",
                expenditure: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to create expenditure"
            });
        }
    }
);

app.put(
    "/api/expenditures/:id",
    authenticate,
    allowRoles("Admin", "Accountant"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const {
                amount,
                description,
                expenditure_date
            } = req.body;

            if (!amount || !description) {
                return res.status(400).json({
                    success: false,
                    message: "Amount and description are required"
                });
            }

            const result = await pool.query(
                `UPDATE expenditures
                 SET amount = $1,
                     description = $2,
                     expenditure_date =
                         COALESCE($3::date, expenditure_date)
                 WHERE id = $4
                 RETURNING *`,
                [
                    Number(amount),
                    description,
                    expenditure_date || null,
                    id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Expenditure not found"
                });
            }

            res.json({
                success: true,
                message: "Expenditure updated successfully",
                expenditure: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to update expenditure"
            });
        }
    }
);

app.delete(
    "/api/expenditures/:id",
    authenticate,
    allowRoles("Admin", "Accountant"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const result = await pool.query(
                "DELETE FROM expenditures WHERE id = $1 RETURNING id",
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Expenditure not found"
                });
            }

            res.json({
                success: true,
                message: "Expenditure deleted successfully"
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to delete expenditure"
            });
        }
    }
);

/* =========================
   RECIPIENT REQUESTS
========================= */

app.get("/api/requests", authenticate, async (req, res) => {
    try {
        let result;

        if (req.user.role === "Recipient") {
            result = await pool.query(
                `SELECT r.id,
                        r.recipient_id,
                        u.full_name AS recipient_name,
                        r.title,
                        r.description,
                        r.amount_requested,
                        r.status,
                        r.reviewed_by,
                        reviewer.full_name AS reviewer_name,
                        r.created_at,
                        r.updated_at
                 FROM recipient_requests r
                 JOIN users u
                   ON u.id = r.recipient_id
                 LEFT JOIN users reviewer
                   ON reviewer.id = r.reviewed_by
                 WHERE r.recipient_id = $1
                 ORDER BY r.id DESC`,
                [req.user.id]
            );
        } else {
            result = await pool.query(
                `SELECT r.id,
                        r.recipient_id,
                        u.full_name AS recipient_name,
                        r.title,
                        r.description,
                        r.amount_requested,
                        r.status,
                        r.reviewed_by,
                        reviewer.full_name AS reviewer_name,
                        r.created_at,
                        r.updated_at
                 FROM recipient_requests r
                 JOIN users u
                   ON u.id = r.recipient_id
                 LEFT JOIN users reviewer
                   ON reviewer.id = r.reviewed_by
                 ORDER BY r.id DESC`
            );
        }

        res.json({
            success: true,
            requests: result.rows
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get requests"
        });
    }
});

app.post(
    "/api/requests",
    authenticate,
    allowRoles("Recipient"),
    async (req, res) => {
        try {
            const {
                title,
                description,
                amount_requested
            } = req.body;

            if (!title || !description || !amount_requested) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Title, description and amount are required"
                });
            }

            const result = await pool.query(
                `INSERT INTO recipient_requests
                 (recipient_id, title, description, amount_requested)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    req.user.id,
                    title,
                    description,
                    Number(amount_requested)
                ]
            );

            res.status(201).json({
                success: true,
                message: "Request created successfully",
                request: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to create request"
            });
        }
    }
);

app.put(
    "/api/requests/:id",
    authenticate,
    allowRoles("Recipient"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const {
                title,
                description,
                amount_requested
            } = req.body;

            const result = await pool.query(
                `UPDATE recipient_requests
                 SET title = $1,
                     description = $2,
                     amount_requested = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4
                   AND recipient_id = $5
                   AND status = 'Pending'
                 RETURNING *`,
                [
                    title,
                    description,
                    Number(amount_requested),
                    id,
                    req.user.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Request not found or cannot be updated"
                });
            }

            res.json({
                success: true,
                message: "Request updated successfully",
                request: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to update request"
            });
        }
    }
);

app.delete(
    "/api/requests/:id",
    authenticate,
    allowRoles("Recipient", "Admin"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            let result;

            if (req.user.role === "Recipient") {
                result = await pool.query(
                    `DELETE FROM recipient_requests
                     WHERE id = $1
                       AND recipient_id = $2
                       AND status = 'Pending'
                     RETURNING id`,
                    [id, req.user.id]
                );
            } else {
                result = await pool.query(
                    `DELETE FROM recipient_requests
                     WHERE id = $1
                     RETURNING id`,
                    [id]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Request not found or cannot be deleted"
                });
            }

            res.json({
                success: true,
                message: "Request deleted successfully"
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to delete request"
            });
        }
    }
);

/* =========================
   APPROVE / REJECT REQUEST
========================= */

app.put(
    "/api/requests/:id/status",
    authenticate,
    allowRoles("Admin"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const { status } = req.body;

            const allowedStatuses = [
                "Approved",
                "Rejected"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Status must be Approved or Rejected"
                });
            }

            const result = await pool.query(
                `UPDATE recipient_requests
                 SET status = $1,
                     reviewed_by = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING *`,
                [
                    status,
                    req.user.id,
                    id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Request not found"
                });
            }

            res.json({
                success: true,
                message:
                    `Request ${status.toLowerCase()} successfully`,
                request: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Failed to update request status"
            });
        }
    }
);

/* =========================
   CONTACTS
========================= */

app.get("/api/contacts", authenticate, async (req, res) => {
    try {
        let result;

        if (
            req.user.role === "Admin" ||
            req.user.role === "Accountant"
        ) {
            result = await pool.query(
                `SELECT c.id,
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
                 JOIN users u
                   ON u.id = c.sender_id
                 LEFT JOIN users r
                   ON r.id = c.replied_by
                 ORDER BY c.id DESC`
            );
        } else {
            result = await pool.query(
                `SELECT c.id,
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
                 JOIN users u
                   ON u.id = c.sender_id
                 LEFT JOIN users r
                   ON r.id = c.replied_by
                 WHERE c.sender_id = $1
                 ORDER BY c.id DESC`,
                [req.user.id]
            );
        }

        res.json({
            success: true,
            contacts: result.rows
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get contacts"
        });
    }
});

app.post(
    "/api/contacts",
    authenticate,
    async (req, res) => {
        try {
            const {
                subject,
                message
            } = req.body;

            if (!subject || !message) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Subject and message are required"
                });
            }

            const result = await pool.query(
                `INSERT INTO contacts
                 (sender_id, subject, message)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [
                    req.user.id,
                    subject,
                    message
                ]
            );

            res.status(201).json({
                success: true,
                message: "Message sent successfully",
                contact: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to send message"
            });
        }
    }
);

app.put(
    "/api/contacts/:id/reply",
    authenticate,
    allowRoles("Admin", "Accountant"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const { reply } = req.body;

            if (!reply) {
                return res.status(400).json({
                    success: false,
                    message: "Reply is required"
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
                    reply,
                    req.user.id,
                    id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Contact message not found"
                });
            }

            res.json({
                success: true,
                message: "Reply sent successfully",
                contact: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to reply to contact"
            });
        }
    }
);

/* =========================
   DASHBOARD
========================= */

app.get(
    "/api/dashboard",
    authenticate,
    async (req, res) => {
        try {
            const users = await pool.query(
                "SELECT COUNT(*)::int AS total FROM users"
            );

            const donations = await pool.query(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM donations"
            );

            const expenditures = await pool.query(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM expenditures"
            );

            const requests = await pool.query(
                `SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER
                        (WHERE status = 'Pending')::int AS pending,
                    COUNT(*) FILTER
                        (WHERE status = 'Approved')::int AS approved,
                    COUNT(*) FILTER
                        (WHERE status = 'Rejected')::int AS rejected
                 FROM recipient_requests`
            );

            const contacts = await pool.query(
                `SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER
                        (WHERE reply IS NULL)::int AS unanswered
                 FROM contacts`
            );

            const totalDonations =
                Number(donations.rows[0].total);

            const totalExpenditures =
                Number(expenditures.rows[0].total);

            res.json({
                success: true,
                dashboard: {
                    total_users:
                        users.rows[0].total,

                    total_donations:
                        totalDonations,

                    total_expenditures:
                        totalExpenditures,

                    balance:
                        totalDonations -
                        totalExpenditures,

                    total_requests:
                        requests.rows[0].total,

                    pending_requests:
                        requests.rows[0].pending,

                    approved_requests:
                        requests.rows[0].approved,

                    rejected_requests:
                        requests.rows[0].rejected,

                    total_contacts:
                        contacts.rows[0].total,

                    unanswered_contacts:
                        contacts.rows[0].unanswered
                }
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to load dashboard"
            });
        }
    }
);

/* =========================
   SERVE FRONTEND
========================= */

app.use(
    express.static(
        path.join(__dirname, "frontend")
    )
);

/* =========================
   FRONTEND FALLBACK
========================= */

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "frontend",
            "index.html"
        )
    );
});

/* =========================
   API 404 HANDLER
========================= */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

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
