// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/EduConsent.sol";
import "../contracts/EduIdentity.sol";
import "../contracts/EduToken.sol";

/**
 * @title ScalabilityTest
 * @notice Tests system performance and gas usage with varying user counts
 * @dev Measures scalability from 10 to 1000 users
 */
contract ScalabilityTest is Test {
    EduConsent consent;
    EduIdentity identity;
    EduToken token;

    uint256 constant GAS_PRICE = 50 gwei;
    uint256 constant ETH_USD_PRICE = 3000; // Example ETH price

    event ScalabilityMetrics(
        uint256 indexed userCount,
        uint256 totalGasUsed,
        uint256 avgGasPerUser,
        uint256 timeElapsed,
        uint256 estimatedCostUSD
    );

    function setUp() public {
        identity = new EduIdentity();
        token = new EduToken();
        consent = new EduConsent(address(identity), address(token));
        token.setConsentContract(address(consent));
    }

    /**
     * @notice Test with 10 users (5 students, 5 requesters)
     */
    function test_Scalability_10Users() public {
        _testScenario(10, "Small Scale - 10 Users");
    }

    /**
     * @notice Test with 50 users (25 students, 25 requesters)
     */
    function test_Scalability_50Users() public {
        _testScenario(50, "Medium Scale - 50 Users");
    }

    /**
     * @notice Test with 100 users (50 students, 50 requesters)
     */
    function test_Scalability_100Users() public {
        _testScenario(100, "Large Scale - 100 Users");
    }

    /**
     * @notice Test with 500 users (250 students, 250 requesters)
     */
    function test_Scalability_500Users() public {
        _testScenario(500, "Enterprise Scale - 500 Users");
    }

    /**
     * @notice Test with 1000 users (500 students, 500 requesters)
     */
    function test_Scalability_1000Users() public {
        _testScenario(1000, "Large Enterprise - 1000 Users");
    }

    /**
     * @notice Core scalability test logic
     * @param userCount Total number of users to simulate
     * @param description Test description
     */
    function _testScenario(uint256 userCount, string memory description) internal {
        console.log("\n========================================");
        console.log(description);
        console.log("========================================");

        uint256 halfCount = userCount / 2;

        // Phase 1: Register Students
        console.log("\nPhase 1: Registering", halfCount, "students...");
        _registerStudents(halfCount);

        // Phase 2: Register Requesters
        console.log("\nPhase 2: Registering", halfCount, "requesters...");
        _registerRequesters(halfCount);

        // Phase 3: Create Consents
        console.log("\nPhase 3: Creating", halfCount, "consents...");
        _createConsents(halfCount);

        // Phase 4: Data Access
        uint256 accessCount = halfCount / 2;
        console.log("\nPhase 4: Performing", accessCount, "data accesses...");
        _performDataAccess(accessCount, halfCount);

        // Verify system state
        _verifySystemState(halfCount, halfCount, halfCount);

        console.log("\n========================================\n");
    }

    function _registerStudents(uint256 count) internal {
        uint256 gasStart = gasleft();

        for (uint256 i = 0; i < count; i++) {
            address student = address(uint160(i + 1000));
            vm.prank(student);
            identity.registerStudent(
                string(abi.encodePacked("student_", vm.toString(i))),
                string(abi.encodePacked("Student ", vm.toString(i))),
                "Maastricht University",
                2024,
                keccak256(abi.encodePacked("student", i, "@example.com")),
                string(abi.encodePacked("ipfs://student_", vm.toString(i)))
            );
        }

        uint256 gasUsed = gasStart - gasleft();
        console.log("  Student Registration Gas:", gasUsed);
        console.log("  Avg Gas per Student:", gasUsed / count);
    }

    function _registerRequesters(uint256 count) internal {
        uint256 gasStart = gasleft();

        for (uint256 i = 0; i < count; i++) {
            address requester = address(uint160(i + 2000));
            vm.prank(requester);
            identity.registerRequester(
                string(abi.encodePacked("Requester_", vm.toString(i))),
                "Data requester application",
                "https://example.com"
            );
        }

        uint256 gasUsed = gasStart - gasleft();
        console.log("  Requester Registration Gas:", gasUsed);
        console.log("  Avg Gas per Requester:", gasUsed / count);
    }

    function _createConsents(uint256 count) internal {
        uint256 gasStart = gasleft();

        for (uint256 i = 0; i < count; i++) {
            address student = address(uint160(i + 1000));
            address requester = address(uint160((i % count) + 2000));

            vm.prank(student);
            consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);
        }

        uint256 gasUsed = gasStart - gasleft();
        console.log("  Consent Creation Gas:", gasUsed);
        console.log("  Avg Gas per Consent:", gasUsed / count);
    }

    function _performDataAccess(uint256 accessCount, uint256 requesterCount) internal {
        uint256 gasStart = gasleft();

        for (uint256 i = 0; i < accessCount; i++) {
            address student = address(uint160(i + 1000));
            address requester = address(uint160((i % requesterCount) + 2000));

            vm.prank(requester);
            consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
        }

        uint256 gasUsed = gasStart - gasleft();
        console.log("  Data Access Gas:", gasUsed);
        console.log("  Avg Gas per Access:", gasUsed / accessCount);
    }

    /**
     * @notice Verify system integrity after scalability test
     */
    function _verifySystemState(
        uint256 studentCount,
        uint256 requesterCount,
        uint256 consentCount
    ) internal {
        // Verify token supply equals consents * reward
        uint256 expectedSupply = consentCount * consent.REWARD_PER_CONSENT();
        assertEq(token.totalSupply(), expectedSupply, "Token supply mismatch");

        // Verify first student can still be accessed
        address firstStudent = address(uint160(1000));
        EduIdentity.StudentProfile memory profile = identity.getStudentProfile(firstStudent);
        assertTrue(bytes(profile.handle).length > 0, "First student profile invalid");

        // Verify first requester can still be accessed
        address firstRequester = address(uint160(2000));
        EduIdentity.RequesterProfile memory reqProfile = identity.getRequesterProfile(firstRequester);
        assertTrue(bytes(reqProfile.name).length > 0, "First requester profile invalid");

        console.log("\n[VERIFICATION] System state verified successfully!");
    }

    /**
     * @notice Test concurrent consent operations
     */
    function test_ConcurrentOperations() public {
        uint256 userCount = 20;

        // Register users
        for (uint256 i = 0; i < userCount / 2; i++) {
            address student = address(uint160(i + 1000));
            vm.prank(student);
            identity.registerStudent(
                string(abi.encodePacked("student_", vm.toString(i))),
                "Student Name",
                "Maastricht University",
                2024,
                keccak256(abi.encodePacked("email", i)),
                "ipfs://cid"
            );
        }

        for (uint256 i = 0; i < userCount / 2; i++) {
            address requester = address(uint160(i + 2000));
            vm.prank(requester);
            identity.registerRequester("Requester", "Description", "https://example.com");
        }

        // Simulate concurrent operations: grants, revokes, and accesses
        uint256 gasStart = gasleft();

        // Multiple students grant consent to same requester
        for (uint256 i = 0; i < 5; i++) {
            address student = address(uint160(i + 1000));
            vm.prank(student);
            consent.setConsent(address(2000), EduConsent.DataType.BasicProfile, 30);
        }

        // Requester accesses multiple students' data
        for (uint256 i = 0; i < 5; i++) {
            address student = address(uint160(i + 1000));
            vm.prank(address(2000));
            consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
        }

        // Some students revoke consent
        for (uint256 i = 0; i < 2; i++) {
            address student = address(uint160(i + 1000));
            vm.prank(student);
            consent.revokeConsent(address(2000), EduConsent.DataType.BasicProfile);
        }

        uint256 gasUsed = gasStart - gasleft();

        console.log("\nConcurrent Operations Test:");
        console.log("  Total Gas Used:", gasUsed);
        console.log("  Operations Performed: 5 grants + 5 accesses + 2 revokes");
        console.log("  Avg Gas per Operation:", gasUsed / 12);
    }

    /**
     * @notice Test data type diversity scaling
     */
    function test_MultipleDataTypes() public {
        uint256 studentCount = 10;

        // Register students and requesters
        for (uint256 i = 0; i < studentCount; i++) {
            address student = address(uint160(i + 1000));
            vm.prank(student);
            identity.registerStudent(
                string(abi.encodePacked("student_", vm.toString(i))),
                "Student Name",
                "Maastricht University",
                2024,
                keccak256(abi.encodePacked("email", i)),
                "ipfs://cid"
            );
        }

        address requester = address(2000);
        vm.prank(requester);
        identity.registerRequester("Requester", "Description", "https://example.com");

        uint256 gasStart = gasleft();

        // Each student grants consent for all 3 data types
        for (uint256 i = 0; i < studentCount; i++) {
            address student = address(uint160(i + 1000));

            vm.startPrank(student);
            consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);
            consent.setConsent(requester, EduConsent.DataType.AcademicRecord, 30);
            consent.setConsent(requester, EduConsent.DataType.SocialProfile, 30);
            vm.stopPrank();
        }

        uint256 gasUsed = gasStart - gasleft();
        uint256 totalConsents = studentCount * 3;

        console.log("\nMultiple Data Types Test:");
        console.log("  Students:", studentCount);
        console.log("  Data Types per Student: 3");
        console.log("  Total Consents:", totalConsents);
        console.log("  Total Gas Used:", gasUsed);
        console.log("  Avg Gas per Consent:", gasUsed / totalConsents);

        // Verify token distribution
        uint256 expectedTokens = consent.REWARD_PER_CONSENT() * 3;
        assertEq(
            token.balanceOf(address(uint160(1000))),
            expectedTokens,
            "Token distribution incorrect"
        );
    }

    // ============================================
    // BATCH CONSENT SCALABILITY TESTS
    // ============================================

    /**
     * @notice Test batch consent with 10 students (3 consents each)
     */
    function test_BatchConsent_10Students() public {
        _testBatchScenario(10, "Batch Consent - 10 Students");
    }

    /**
     * @notice Test batch consent with 50 students (3 consents each)
     */
    function test_BatchConsent_50Students() public {
        _testBatchScenario(50, "Batch Consent - 50 Students");
    }

    /**
     * @notice Test batch consent with 100 students (3 consents each)
     */
    function test_BatchConsent_100Students() public {
        _testBatchScenario(100, "Batch Consent - 100 Students");
    }

    /**
     * @notice Test batch consent with 250 students (3 consents each)
     */
    function test_BatchConsent_250Students() public {
        _testBatchScenario(250, "Batch Consent - 250 Students");
    }

    /**
     * @notice Core batch scalability test logic
     * @param studentCount Number of students to test with
     * @param description Test description
     */
    function _testBatchScenario(uint256 studentCount, string memory description) internal {
        console.log("\n========================================");
        console.log(description);
        console.log("========================================");

        // Register students
        console.log("\nRegistering", studentCount, "students...");
        for (uint256 i = 0; i < studentCount; i++) {
            address student = address(uint160(i + 5000)); // Different range to avoid conflicts
            vm.prank(student);
            identity.registerStudent(
                string(abi.encodePacked("batch_student_", vm.toString(i))),
                string(abi.encodePacked("Batch Student ", vm.toString(i))),
                "Maastricht University",
                2024,
                keccak256(abi.encodePacked("batch_student", i, "@example.com")),
                string(abi.encodePacked("ipfs://batch_student_", vm.toString(i)))
            );
        }

        // Register 3 requesters
        console.log("Registering 3 requesters...");
        for (uint256 i = 0; i < 3; i++) {
            address requester = address(uint160(i + 6000));
            vm.prank(requester);
            identity.registerRequester(
                string(abi.encodePacked("BatchRequester_", vm.toString(i))),
                "Batch data requester",
                "https://batch-example.com"
            );
        }

        // Phase 1: Single consent operations (baseline)
        console.log("\n--- SINGLE CONSENT OPERATIONS (Baseline) ---");
        uint256 singleGasStart = gasleft();

        for (uint256 i = 0; i < studentCount; i++) {
            address student = address(uint160(i + 5000));

            vm.startPrank(student);
            consent.setConsent(address(6000), EduConsent.DataType.BasicProfile, 30);
            consent.setConsent(address(6001), EduConsent.DataType.AcademicRecord, 60);
            consent.setConsent(address(6002), EduConsent.DataType.SocialProfile, 90);
            vm.stopPrank();
        }

        uint256 singleGasUsed = singleGasStart - gasleft();
        uint256 totalSingleConsents = studentCount * 3;

        console.log("  Total Consents:", totalSingleConsents);
        console.log("  Total Gas Used:", singleGasUsed);
        console.log("  Avg Gas per Consent:", singleGasUsed / totalSingleConsents);

        // Clear state for batch test
        uint256 tokenBalanceSingle = token.totalSupply();

        // Phase 2: Batch consent operations (optimized)
        console.log("\n--- BATCH CONSENT OPERATIONS (Optimized) ---");

        // Register NEW students for batch test to avoid state conflicts
        for (uint256 i = 0; i < studentCount; i++) {
            address student = address(uint160(i + 7000)); // Different range
            vm.prank(student);
            identity.registerStudent(
                string(abi.encodePacked("batch2_student_", vm.toString(i))),
                string(abi.encodePacked("Batch2 Student ", vm.toString(i))),
                "Maastricht University",
                2024,
                keccak256(abi.encodePacked("batch2_student", i, "@example.com")),
                string(abi.encodePacked("ipfs://batch2_student_", vm.toString(i)))
            );
        }

        uint256 batchGasStart = gasleft();

        for (uint256 i = 0; i < studentCount; i++) {
            address student = address(uint160(i + 7000));

            // Prepare batch arrays
            address[] memory requesters = new address[](3);
            requesters[0] = address(6000);
            requesters[1] = address(6001);
            requesters[2] = address(6002);

            EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](3);
            dataTypes[0] = EduConsent.DataType.BasicProfile;
            dataTypes[1] = EduConsent.DataType.AcademicRecord;
            dataTypes[2] = EduConsent.DataType.SocialProfile;

            uint16[] memory durations = new uint16[](3);
            durations[0] = 30;
            durations[1] = 60;
            durations[2] = 90;

            vm.prank(student);
            consent.setConsentBatch(requesters, dataTypes, durations);
        }

        uint256 batchGasUsed = batchGasStart - gasleft();
        uint256 totalBatchConsents = studentCount * 3;

        console.log("  Total Consents:", totalBatchConsents);
        console.log("  Total Gas Used:", batchGasUsed);
        console.log("  Avg Gas per Consent:", batchGasUsed / totalBatchConsents);

        // Calculate savings
        uint256 gasSaved = singleGasUsed - batchGasUsed;
        uint256 percentSaved = (gasSaved * 100) / singleGasUsed;

        console.log("\n--- COMPARISON ---");
        console.log("  Gas Saved:", gasSaved);
        console.log("  Percentage Saved:", percentSaved, "%");
        console.log("  Single Avg:", singleGasUsed / totalSingleConsents, "gas");
        console.log("  Batch Avg:", batchGasUsed / totalBatchConsents, "gas");

        // Verify token distribution for both methods
        uint256 expectedTotalSupply = tokenBalanceSingle + (totalBatchConsents * consent.REWARD_PER_CONSENT());
        assertEq(token.totalSupply(), expectedTotalSupply, "Token supply mismatch");

        console.log("\n========================================\n");
    }

    /**
     * @notice Direct comparison test: Single vs Batch for same student
     */
    function test_BatchVsSingle_DirectComparison() public {
        console.log("\n========================================");
        console.log("DIRECT COMPARISON: Single vs Batch");
        console.log("========================================");

        // Register 1 student for single test
        address singleStudent = address(0x8000);
        vm.prank(singleStudent);
        identity.registerStudent(
            "single_student",
            "Single Student",
            "Maastricht University",
            2024,
            keccak256("single@example.com"),
            "ipfs://single"
        );

        // Register 1 student for batch test
        address batchStudent = address(0x8001);
        vm.prank(batchStudent);
        identity.registerStudent(
            "batch_student",
            "Batch Student",
            "Maastricht University",
            2024,
            keccak256("batch@example.com"),
            "ipfs://batch"
        );

        // Register 3 requesters
        for (uint256 i = 0; i < 3; i++) {
            address requester = address(uint160(i + 9000));
            vm.prank(requester);
            identity.registerRequester(
                string(abi.encodePacked("CompareRequester_", vm.toString(i))),
                "Comparison requester",
                "https://compare.com"
            );
        }

        // Test 1: Single consent operations
        console.log("\nTest 1: THREE INDIVIDUAL setConsent() CALLS");
        uint256 singleGasStart = gasleft();

        vm.startPrank(singleStudent);
        consent.setConsent(address(9000), EduConsent.DataType.BasicProfile, 30);
        consent.setConsent(address(9001), EduConsent.DataType.AcademicRecord, 60);
        consent.setConsent(address(9002), EduConsent.DataType.SocialProfile, 90);
        vm.stopPrank();

        uint256 singleGasUsed = singleGasStart - gasleft();

        console.log("  Gas Used:", singleGasUsed);
        console.log("  Avg per Consent:", singleGasUsed / 3);

        // Test 2: Batch consent operation
        console.log("\nTest 2: ONE setConsentBatch() CALL");
        uint256 batchGasStart = gasleft();

        address[] memory requesters = new address[](3);
        requesters[0] = address(9000);
        requesters[1] = address(9001);
        requesters[2] = address(9002);

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](3);
        dataTypes[0] = EduConsent.DataType.BasicProfile;
        dataTypes[1] = EduConsent.DataType.AcademicRecord;
        dataTypes[2] = EduConsent.DataType.SocialProfile;

        uint16[] memory durations = new uint16[](3);
        durations[0] = 30;
        durations[1] = 60;
        durations[2] = 90;

        vm.prank(batchStudent);
        consent.setConsentBatch(requesters, dataTypes, durations);

        uint256 batchGasUsed = batchGasStart - gasleft();

        console.log("  Gas Used:", batchGasUsed);
        console.log("  Avg per Consent:", batchGasUsed / 3);

        // Calculate savings
        uint256 gasSaved = singleGasUsed - batchGasUsed;
        uint256 percentSaved = (gasSaved * 100) / singleGasUsed;

        console.log("\n--- RESULTS ---");
        console.log("  Total Gas Saved:", gasSaved);
        console.log("  Percentage Saved:", percentSaved, "%");
        console.log("  Gas per Consent (Single):", singleGasUsed / 3);
        console.log("  Gas per Consent (Batch):", batchGasUsed / 3);
        console.log("  Difference per Consent:", (singleGasUsed / 3) - (batchGasUsed / 3));

        console.log("\n========================================\n");

        // Verify both students received correct tokens
        assertEq(token.balanceOf(singleStudent), consent.REWARD_PER_CONSENT() * 3);
        assertEq(token.balanceOf(batchStudent), consent.REWARD_PER_CONSENT() * 3);
    }

    /**
     * @notice Test batch operations with varying batch sizes
     */
    function test_BatchSizeComparison() public {
        console.log("\n========================================");
        console.log("BATCH SIZE COMPARISON");
        console.log("========================================");

        // Register requesters
        for (uint256 i = 0; i < 10; i++) {
            address requester = address(uint160(i + 10000));
            vm.prank(requester);
            identity.registerRequester(
                string(abi.encodePacked("SizeRequester_", vm.toString(i))),
                "Size test requester",
                "https://size.com"
            );
        }

        uint256[] memory batchSizes = new uint256[](5);
        batchSizes[0] = 1;
        batchSizes[1] = 2;
        batchSizes[2] = 3;
        batchSizes[3] = 5;
        batchSizes[4] = 10;

        for (uint256 s = 0; s < batchSizes.length; s++) {
            uint256 batchSize = batchSizes[s];

            // Register student for this batch size
            address student = address(uint160(11000 + s));
            vm.prank(student);
            identity.registerStudent(
                string(abi.encodePacked("size_student_", vm.toString(s))),
                "Size Student",
                "Maastricht University",
                2024,
                keccak256(abi.encodePacked("size", s)),
                "ipfs://size"
            );

            // Prepare batch arrays
            address[] memory requesters = new address[](batchSize);
            EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](batchSize);
            uint16[] memory durations = new uint16[](batchSize);

            for (uint256 i = 0; i < batchSize; i++) {
                requesters[i] = address(uint160(10000 + i));
                dataTypes[i] = EduConsent.DataType(i % 3);
                durations[i] = 30;
            }

            // Measure gas
            uint256 gasStart = gasleft();
            vm.prank(student);
            consent.setConsentBatch(requesters, dataTypes, durations);
            uint256 gasUsed = gasStart - gasleft();

            console.log("\nBatch Size:", batchSize);
            console.log("  Total Gas:", gasUsed);
            console.log("  Gas per Consent:", gasUsed / batchSize);
        }

        console.log("\n========================================\n");
    }
}

