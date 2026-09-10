
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(40) NOT NULL
        CHECK (role IN (
            'Admin',
            'Accountant',
            'University Supervisor',
            'Donor',
            'Recipient'
        )),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    donor_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    amount NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    description TEXT DEFAULT '',
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenditures (
    id SERIAL PRIMARY KEY,

    amount NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    description TEXT NOT NULL,

    expenditure_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_by INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipient_requests (
    id SERIAL PRIMARY KEY,

    recipient_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    title VARCHAR(200) NOT NULL,

    description TEXT DEFAULT '',

    amount_requested NUMERIC(14,2) NOT NULL
        CHECK (amount_requested > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN (
            'Pending',
            'Approved',
            'Rejected'
        )),

    reviewed_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    reviewed_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,

    sender_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    subject VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    reply TEXT NULL,

    replied_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    replied_at TIMESTAMP NULL
);


CREATE INDEX IF NOT EXISTS idx_donations_donor
    ON donations(donor_id);

CREATE INDEX IF NOT EXISTS idx_expenditures_created_by
    ON expenditures(created_by);

CREATE INDEX IF NOT EXISTS idx_requests_recipient
    ON recipient_requests(recipient_id);

CREATE INDEX IF NOT EXISTS idx_requests_status
    ON recipient_requests(status);

CREATE INDEX IF NOT EXISTS idx_contacts_sender
    ON contacts(sender_id);
