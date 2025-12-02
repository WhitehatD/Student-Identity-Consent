DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS wallet;

CREATE TABLE wallet (
    wallet_address VARCHAR(64) UNIQUE NOT NULL,
    cid VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE course (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populate courses so we can link grades to them
INSERT INTO course (course_name, description) VALUES
('Computer Science 101', 'Introduction to computer science, programming basics, and algorithms.'),
('Mathematics 101', 'Fundamentals of mathematics including algebra, calculus, and problem-solving.'),
('Physics 101', 'Basic concepts of physics, mechanics, and scientific principles.'),
('Blockchain Fundamentals', 'Understanding distributed ledgers and consensus mechanisms.'),
('Smart Contract Development', 'Building decentralized applications with Solidity.');

CREATE TABLE grades (
    wallet_cid VARCHAR(64) NOT NULL,
    course_id INT NOT NULL,
    points NUMERIC(5,2) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (wallet_cid, course_id),

    CONSTRAINT fk_wallet FOREIGN KEY(wallet_cid) REFERENCES wallet(cid) ON DELETE CASCADE,
    CONSTRAINT fk_course FOREIGN KEY(course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

CREATE TABLE certificates (
    certificate_id SERIAL PRIMARY KEY,
    wallet_cid VARCHAR(64) NOT NULL,
    certificate_name VARCHAR(100) NOT NULL,
    issuing_institution VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    transcript_uri VARCHAR(255),
    added_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_wallet_cert FOREIGN KEY(wallet_cid) REFERENCES wallet(cid) ON DELETE CASCADE
);
