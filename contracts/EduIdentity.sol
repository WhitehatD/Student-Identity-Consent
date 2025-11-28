// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EduIdentity
 * @notice Manages student and requester app identities on-chain
 * @dev Optimized with custom errors for reduced gas costs
 */
contract EduIdentity {
    // Custom errors for gas optimization
    error AlreadyRegistered();
    error HandleCannotBeEmpty();
    error DisplayNameCannotBeEmpty();
    error InvalidEnrollmentYear();
    error NotAStudent();
    error StudentNotRegistered();
    error NameCannotBeEmpty();
    error RequesterNotRegistered();

    enum Role {
        None,
        Student,
        Requester
    }

    struct StudentProfile {
        bool registered;
        string handle;           // e.g. "alex_cs"
        string displayName;      // "Alex Cioc"
        string university;       // "Maastricht University"
        uint16 enrollmentYear;   // e.g. 2023
        bytes32 emailHash;       // keccak256(email)
        string profileCid;       // database pointer with full profile
    }

    struct RequesterProfile {
        bool registered;
        string name;             // e.g. CoolJobs or CoursePortal
        string description;      // short description
        string appUri;           // website/app link
    }

    mapping(address => Role) public roles;
    mapping(address => StudentProfile) public students;
    mapping(address => RequesterProfile) public requesters;

    // Events
    event StudentRegistered(address indexed student, string handle, bytes32 emailHash);
    event StudentProfileUpdated(address indexed student, string newProfileCid);
    event RequesterRegistered(address indexed requester, string name);
    event EmailVerified(address indexed student, bytes32 emailHash);

    /**
     * @notice Register a new student profile
     */
    function registerStudent(
        string calldata handle,
        string calldata displayName,
        string calldata university,
        uint16 enrollmentYear,
        bytes32 emailHash,
        string calldata profileCid
    ) external {
        if (roles[msg.sender] != Role.None) revert AlreadyRegistered();
        if (bytes(handle).length == 0) revert HandleCannotBeEmpty();
        if (bytes(displayName).length == 0) revert DisplayNameCannotBeEmpty();
        if (enrollmentYear == 0) revert InvalidEnrollmentYear();

        roles[msg.sender] = Role.Student;
        students[msg.sender] = StudentProfile({
            registered: true,
            handle: handle,
            displayName: displayName,
            university: university,
            enrollmentYear: enrollmentYear,
            emailHash: emailHash,
            profileCid: profileCid
        });

        emit StudentRegistered(msg.sender, handle, emailHash);
    }

    /**
     * @notice Update student's profile CID (pointer to database data)
     */
    function updateStudentProfileCid(string calldata newCid) external {
        if (roles[msg.sender] != Role.Student) revert NotAStudent();
        if (!students[msg.sender].registered) revert StudentNotRegistered();

        students[msg.sender].profileCid = newCid;
        emit StudentProfileUpdated(msg.sender, newCid);
    }

    /**
     * @notice Register a new requester app
     */
    function registerRequester(
        string calldata name,
        string calldata description,
        string calldata appUri
    ) external {
        if (roles[msg.sender] != Role.None) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert NameCannotBeEmpty();

        roles[msg.sender] = Role.Requester;
        requesters[msg.sender] = RequesterProfile({
            registered: true,
            name: name,
            description: description,
            appUri: appUri
        });

        emit RequesterRegistered(msg.sender, name);
    }

    /**
     * @notice Get student profile
     */
    function getStudentProfile(address student) external view returns (StudentProfile memory) {
        if (!students[student].registered) revert StudentNotRegistered();
        return students[student];
    }

    /**
     * @notice Get requester profile
     */
    function getRequesterProfile(address requester) external view returns (RequesterProfile memory) {
        if (!requesters[requester].registered) revert RequesterNotRegistered();
        return requesters[requester];
    }

    /**
     * @notice Check if address is a student
     */
    function isStudent(address addr) external view returns (bool) {
        return roles[addr] == Role.Student;
    }

    /**
     * @notice Check if address is a requester
     */
    function isRequester(address addr) external view returns (bool) {
        return roles[addr] == Role.Requester;
    }

    /**
     * @notice Verify email ownership without revealing the actual email
     * @param student Address of the student
     * @param emailToVerify Plain text email to verify (hashed on-chain)
     * @return bool True if the provided email matches the stored hash
     */
    function verifyEmail(address student, string calldata emailToVerify) external view returns (bool) {
        if (!students[student].registered) revert StudentNotRegistered();
        bytes32 providedHash = keccak256(abi.encodePacked(emailToVerify));
        return students[student].emailHash == providedHash;
    }

    /**
     * @notice Helper function to compute email hash off-chain before registration
     * @param email The email to hash
     * @return bytes32 The keccak256 hash of the email
     */
    function computeEmailHash(string calldata email) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(email));
    }
}

