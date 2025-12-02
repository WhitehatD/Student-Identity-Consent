--Gpt generated fake data
-- =========================================
-- DROP TABLES IF THEY EXIST (for fresh start)
-- =========================================
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS wallet;

-- =========================================
-- 1. WALLET TABLE
-- =========================================
CREATE TABLE wallet (
    wallet_address VARCHAR(64) UNIQUE NOT NULL,
    cid VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sample data
INSERT INTO wallet (wallet_address, cid, display_name) VALUES
('0xABC123DEF456', 'cid001', 'Alice'),
('0xDEF456ABC123', 'cid002', 'Bob'),
('0x123DEF456ABC', 'cid003', 'Charlie');

-- =========================================
-- 2. COURSE TABLE
-- =========================================
CREATE TABLE course (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sample data
INSERT INTO course (course_name, description) VALUES
('Computer Science 101', 'Introduction to computer science, programming basics, and algorithms.'),
('Mathematics 101', 'Fundamentals of mathematics including algebra, calculus, and problem-solving.'),
('Physics 101', 'Basic concepts of physics, mechanics, and scientific principles.');

-- =========================================
-- 3. GRADES TABLE
-- =========================================
CREATE TABLE grades (
    wallet_cid VARCHAR(64) NOT NULL,
    course_id INT NOT NULL,
    points NUMERIC(5,2) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (wallet_cid, course_id),

    CONSTRAINT fk_wallet FOREIGN KEY(wallet_cid) REFERENCES wallet(cid) ON DELETE CASCADE,
    CONSTRAINT fk_course FOREIGN KEY(course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- Sample data
INSERT INTO grades (wallet_cid, course_id, points) VALUES
('cid001', 1, 95.5),
('cid001', 2, 88.0),
('cid002', 1, 78.5),
('cid002', 3, 85.0),
('cid003', 2, 92.0),
('cid003', 3, 89.5);

-- =========================================
-- 4. CERTIFICATES TABLE
-- =========================================
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

-- Sample data
INSERT INTO certificates (wallet_cid, certificate_name, issuing_institution, issue_date, transcript_uri) VALUES
('cid001', 'Bachelor of Computer Science', 'ABC University', '2025-06-15', 'ipfs://QmAliceCS'),
('cid002', 'Bachelor of Mathematics', 'XYZ University', '2024-05-20', 'ipfs://QmBobMath'),
('cid003', 'Bachelor of Physics', 'LMN University', '2025-07-10', 'ipfs://QmCharliePhysics');
