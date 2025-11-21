// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/EduConsent.sol";
import "../contracts/EduIdentity.sol";
import "../contracts/EduToken.sol";

contract EduConsentTest is Test {
    EduConsent consent;
    EduIdentity identity;
    EduToken token;

    address student = address(0xA11CE);
    address otherStudent = address(0xB0B);
    address requester = address(0xC001);
    address otherRequester = address(0xD00D);

    string constant STUDENT_HANDLE = "alex_cs";
    string constant STUDENT_NAME = "Alex Cioc";
    string constant UNIVERSITY = "Maastricht University";
    uint16 constant ENROLLMENT_YEAR = 2024;
    string constant STUDENT_EMAIL = "alex@example.com";
    string constant STUDENT_CID = "ipfs://student-alex";

    string constant OTHER_HANDLE = "bob_cs";
    string constant OTHER_NAME = "Bob Smith";
    string constant OTHER_EMAIL = "bob@example.com";
    string constant OTHER_CID = "ipfs://student-bob";

    function setUp() public {
        identity = new EduIdentity();
        token = new EduToken();
        consent = new EduConsent(address(identity), address(token));

        token.setConsentContract(address(consent));

        // Register student
        vm.prank(student);
        identity.registerStudent(
            STUDENT_HANDLE,
            STUDENT_NAME,
            UNIVERSITY,
            ENROLLMENT_YEAR,
            keccak256(abi.encodePacked(STUDENT_EMAIL)),
            STUDENT_CID
        );

        // Register other student
        vm.prank(otherStudent);
        identity.registerStudent(
            OTHER_HANDLE,
            OTHER_NAME,
            UNIVERSITY,
            ENROLLMENT_YEAR,
            keccak256(abi.encodePacked(OTHER_EMAIL)),
            OTHER_CID
        );

        // Register requester
        vm.prank(requester);
        identity.registerRequester(
            "CoolJobs",
            "Job marketplace",
            "https://cool.jobs"
        );

        // Register other requester
        vm.prank(otherRequester);
        identity.registerRequester(
            "DataBuddy",
            "Alt requester",
            "https://data.buddy"
        );
    }

    function test_GrantsConsentStoresRecordAndMintsRewards() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        EduConsent.Consent memory record = consent.getConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        );

        assertTrue(record.exists);
        assertTrue(record.active);
        assertEq(record.owner, student);
        assertEq(record.requester, requester);

        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward);
    }

    function test_RequiresCallerToBeRegisteredStudent() public {
        vm.prank(requester);
        vm.expectRevert(EduConsent.NotAStudent.selector);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);
    }

    function test_RequiresRequesterToBeRegistered() public {
        vm.prank(student);
        vm.expectRevert(EduConsent.NotARegisteredRequester.selector);
        consent.setConsent(address(0xBAD), EduConsent.DataType.BasicProfile, 30);
    }

    function test_ValidatesDurationBounds() public {
        vm.startPrank(student);

        vm.expectRevert(EduConsent.InvalidDuration.selector);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 0);

        vm.expectRevert(EduConsent.InvalidDuration.selector);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 366);

        vm.stopPrank();
    }

    function test_RevokesConsentAndBlocksRepeatRevocation() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.prank(student);
        consent.revokeConsent(requester, EduConsent.DataType.BasicProfile);

        EduConsent.Consent memory record = consent.getConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        );
        assertFalse(record.active);

        vm.prank(student);
        vm.expectRevert(EduConsent.AlreadyRevoked.selector);
        consent.revokeConsent(requester, EduConsent.DataType.BasicProfile);
    }

    function test_PreventsNonOwnersFromRevoking() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.prank(otherStudent);
        vm.expectRevert(EduConsent.ConsentDoesNotExist.selector);
        consent.revokeConsent(requester, EduConsent.DataType.BasicProfile);
    }

    function test_RejectsRevokingNonExistentConsent() public {
        vm.prank(student);
        vm.expectRevert(EduConsent.ConsentDoesNotExist.selector);
        consent.revokeConsent(requester, EduConsent.DataType.BasicProfile);
    }

    function test_ReportsValidConsentOnlyBeforeExpiry() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 1);

        assertTrue(consent.hasValidConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        ));

        // Fast forward 2 days
        vm.warp(block.timestamp + 2 days);

        assertFalse(consent.hasValidConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        ));
    }

    function test_AllowsRegisteredRequestersWithConsentToAccessData() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.prank(requester);
        string memory profileCid = consent.accessDataAndLog(
            student,
            EduConsent.DataType.BasicProfile
        );

        assertEq(profileCid, STUDENT_CID);
    }

    function test_BlocksAccessWhenConsentIsMissing() public {
        vm.prank(requester);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
    }

    function test_BlocksNonRequesterFromAccessingData() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.prank(otherStudent);
        vm.expectRevert(EduConsent.NotARegisteredRequester.selector);
        consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
    }

    function test_UpdatesConsentDurationAndReissuesRewards() public {
        vm.startPrank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 5);

        EduConsent.Consent memory firstRecord = consent.getConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        );
        uint64 firstExpiry = firstRecord.expiresAt;

        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 10);
        vm.stopPrank();

        EduConsent.Consent memory updatedRecord = consent.getConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        );

        assertGt(updatedRecord.expiresAt, firstExpiry);

        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward * 2);
    }

    function test_EmitsConsentGrantedEvent() public {
        vm.expectEmit(true, true, false, true);
        emit EduConsent.ConsentGranted(
            student,
            requester,
            EduConsent.DataType.BasicProfile,
            uint64(block.timestamp + 30 days)
        );

        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);
    }

    function test_EmitsConsentRevokedEvent() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.expectEmit(true, true, false, true);
        emit EduConsent.ConsentRevoked(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        );

        vm.prank(student);
        consent.revokeConsent(requester, EduConsent.DataType.BasicProfile);
    }

    function test_EmitsAccessAttemptEvent() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.expectEmit(true, true, true, false);
        emit EduConsent.AccessAttempt(
            student,
            requester,
            EduConsent.DataType.BasicProfile,
            uint64(block.timestamp),
            true
        );

        vm.prank(requester);
        consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
    }

    function test_EmitsDataAccessedEvent() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.expectEmit(true, true, true, false);
        emit EduConsent.DataAccessed(
            student,
            requester,
            EduConsent.DataType.BasicProfile,
            uint64(block.timestamp),
            STUDENT_CID
        );

        vm.prank(requester);
        consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
    }

    function test_HandlesMultipleDataTypes() public {
        vm.startPrank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);
        consent.setConsent(requester, EduConsent.DataType.AcademicRecord, 30);
        consent.setConsent(requester, EduConsent.DataType.SocialProfile, 30);
        vm.stopPrank();

        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.BasicProfile));
        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.AcademicRecord));
        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.SocialProfile));

        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward * 3);
    }

    function test_HandlesMultipleRequestersForSameStudent() public {
        vm.startPrank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);
        consent.setConsent(otherRequester, EduConsent.DataType.BasicProfile, 30);
        vm.stopPrank();

        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.BasicProfile));
        assertTrue(consent.hasValidConsent(student, otherRequester, EduConsent.DataType.BasicProfile));

        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward * 2);
    }

    function test_AllowsDifferentStudentsToGrantConsentToSameRequester() public {
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        vm.prank(otherStudent);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 30);

        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.BasicProfile));
        assertTrue(consent.hasValidConsent(otherStudent, requester, EduConsent.DataType.BasicProfile));

        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward);
        assertEq(token.balanceOf(otherStudent), reward);
    }

    function test_EmitsAccessAttemptEventOnFailedAccess() public {
        vm.expectEmit(true, true, true, false);
        emit EduConsent.AccessAttempt(
            student,
            requester,
            EduConsent.DataType.BasicProfile,
            uint64(block.timestamp),
            false
        );

        vm.prank(requester);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
    }

    // ============================================
    // BATCH CONSENT TESTS
    // ============================================

    function test_SetConsentBatch_GrantsMultipleConsents() public {
        address[] memory requesters = new address[](2);
        requesters[0] = requester;
        requesters[1] = otherRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](2);
        dataTypes[0] = EduConsent.DataType.BasicProfile;
        dataTypes[1] = EduConsent.DataType.AcademicRecord;

        uint16[] memory durations = new uint16[](2);
        durations[0] = 30;
        durations[1] = 60;

        vm.prank(student);
        consent.setConsentBatch(requesters, dataTypes, durations);

        // Verify both consents exist and are active
        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.BasicProfile));
        assertTrue(consent.hasValidConsent(student, otherRequester, EduConsent.DataType.AcademicRecord));

        // Verify student received tokens for both consents
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward * 2);
    }

    function test_SetConsentBatch_GrantsThreeConsentsToSameRequester() public {
        address[] memory requesters = new address[](3);
        requesters[0] = requester;
        requesters[1] = requester;
        requesters[2] = requester;

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

        // Verify all three consents exist
        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.BasicProfile));
        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.AcademicRecord));
        assertTrue(consent.hasValidConsent(student, requester, EduConsent.DataType.SocialProfile));

        // Verify correct expiration times
        EduConsent.Consent memory consent1 = consent.getConsent(student, requester, EduConsent.DataType.BasicProfile);
        EduConsent.Consent memory consent2 = consent.getConsent(student, requester, EduConsent.DataType.AcademicRecord);
        EduConsent.Consent memory consent3 = consent.getConsent(student, requester, EduConsent.DataType.SocialProfile);

        assertEq(consent1.expiresAt, uint64(block.timestamp + 30 days));
        assertEq(consent2.expiresAt, uint64(block.timestamp + 60 days));
        assertEq(consent3.expiresAt, uint64(block.timestamp + 90 days));

        // Verify student received tokens for all three consents
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward * 3);
    }

    function test_SetConsentBatch_RevertsIfNotStudent() public {
        address[] memory requesters = new address[](1);
        requesters[0] = requester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](1);
        dataTypes[0] = EduConsent.DataType.BasicProfile;

        uint16[] memory durations = new uint16[](1);
        durations[0] = 30;

        vm.prank(requester); // Requester trying to grant consent
        vm.expectRevert(EduConsent.NotAStudent.selector);
        consent.setConsentBatch(requesters, dataTypes, durations);
    }

    function test_SetConsentBatch_RevertsIfRequesterNotRegistered() public {
        address unregisteredRequester = address(0xBAD);

        address[] memory requesters = new address[](1);
        requesters[0] = unregisteredRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](1);
        dataTypes[0] = EduConsent.DataType.BasicProfile;

        uint16[] memory durations = new uint16[](1);
        durations[0] = 30;

        vm.prank(student);
        vm.expectRevert(EduConsent.NotARegisteredRequester.selector);
        consent.setConsentBatch(requesters, dataTypes, durations);
    }

    function test_SetConsentBatch_RevertsIfArrayLengthMismatch() public {
        address[] memory requesters = new address[](2);
        requesters[0] = requester;
        requesters[1] = otherRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](1);
        dataTypes[0] = EduConsent.DataType.BasicProfile;

        uint16[] memory durations = new uint16[](2);
        durations[0] = 30;
        durations[1] = 60;

        vm.prank(student);
        vm.expectRevert(EduConsent.InvalidDuration.selector);
        consent.setConsentBatch(requesters, dataTypes, durations);
    }

    function test_SetConsentBatch_RevertsIfInvalidDuration() public {
        address[] memory requesters = new address[](2);
        requesters[0] = requester;
        requesters[1] = otherRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](2);
        dataTypes[0] = EduConsent.DataType.BasicProfile;
        dataTypes[1] = EduConsent.DataType.AcademicRecord;

        uint16[] memory durations = new uint16[](2);
        durations[0] = 30;
        durations[1] = 400; // Invalid: > 365

        vm.prank(student);
        vm.expectRevert(EduConsent.InvalidDuration.selector);
        consent.setConsentBatch(requesters, dataTypes, durations);
    }

    function test_SetConsentBatch_EmitsEventsForAllConsents() public {
        address[] memory requesters = new address[](2);
        requesters[0] = requester;
        requesters[1] = otherRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](2);
        dataTypes[0] = EduConsent.DataType.BasicProfile;
        dataTypes[1] = EduConsent.DataType.AcademicRecord;

        uint16[] memory durations = new uint16[](2);
        durations[0] = 30;
        durations[1] = 60;

        // Expect first consent event
        vm.expectEmit(true, true, false, true);
        emit EduConsent.ConsentGranted(
            student,
            requester,
            EduConsent.DataType.BasicProfile,
            uint64(block.timestamp + 30 days)
        );

        // Expect second consent event
        vm.expectEmit(true, true, false, true);
        emit EduConsent.ConsentGranted(
            student,
            otherRequester,
            EduConsent.DataType.AcademicRecord,
            uint64(block.timestamp + 60 days)
        );

        vm.prank(student);
        consent.setConsentBatch(requesters, dataTypes, durations);
    }

    function test_SetConsentBatch_UpdatesExistingConsents() public {
        // First grant consent individually
        vm.prank(student);
        consent.setConsent(requester, EduConsent.DataType.BasicProfile, 10);

        uint256 initialBalance = token.balanceOf(student);

        // Now update via batch
        address[] memory requesters = new address[](2);
        requesters[0] = requester;
        requesters[1] = otherRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](2);
        dataTypes[0] = EduConsent.DataType.BasicProfile; // Update existing
        dataTypes[1] = EduConsent.DataType.AcademicRecord; // New consent

        uint16[] memory durations = new uint16[](2);
        durations[0] = 60; // Extended duration
        durations[1] = 30;

        vm.prank(student);
        consent.setConsentBatch(requesters, dataTypes, durations);

        // Verify consent was updated
        EduConsent.Consent memory updatedConsent = consent.getConsent(
            student,
            requester,
            EduConsent.DataType.BasicProfile
        );
        assertEq(updatedConsent.expiresAt, uint64(block.timestamp + 60 days));

        // Verify student received tokens for both (update still gives reward)
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), initialBalance + (reward * 2));
    }

    function test_SetConsentBatch_AllowsBothRequestersToAccessAfterBatch() public {
        address[] memory requesters = new address[](2);
        requesters[0] = requester;
        requesters[1] = otherRequester;

        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](2);
        dataTypes[0] = EduConsent.DataType.BasicProfile;
        dataTypes[1] = EduConsent.DataType.BasicProfile;

        uint16[] memory durations = new uint16[](2);
        durations[0] = 30;
        durations[1] = 30;

        vm.prank(student);
        consent.setConsentBatch(requesters, dataTypes, durations);

        // Both requesters should be able to access
        vm.prank(requester);
        string memory cid1 = consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
        assertEq(cid1, STUDENT_CID);

        vm.prank(otherRequester);
        string memory cid2 = consent.accessDataAndLog(student, EduConsent.DataType.BasicProfile);
        assertEq(cid2, STUDENT_CID);
    }

    function test_SetConsentBatch_HandlesEmptyArray() public {
        address[] memory requesters = new address[](0);
        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](0);
        uint16[] memory durations = new uint16[](0);

        vm.prank(student);
        consent.setConsentBatch(requesters, dataTypes, durations);

        // Should not revert, just do nothing
        assertEq(token.balanceOf(student), 0);
    }

    function test_SetConsentBatch_HandlesLargeBatch() public {
        uint256 batchSize = 10;
        address[] memory requesters = new address[](batchSize);
        EduConsent.DataType[] memory dataTypes = new EduConsent.DataType[](batchSize);
        uint16[] memory durations = new uint16[](batchSize);

        // Prepare batch - alternate between two requesters and different data types
        for (uint256 i = 0; i < batchSize; i++) {
            requesters[i] = (i % 2 == 0) ? requester : otherRequester;
            dataTypes[i] = EduConsent.DataType(i % 3); // Cycle through data types
            durations[i] = uint16(30 + (i * 10)); // Varying durations
        }

        vm.prank(student);
        consent.setConsentBatch(requesters, dataTypes, durations);

        // Verify all consents were created
        for (uint256 i = 0; i < batchSize; i++) {
            assertTrue(consent.hasValidConsent(student, requesters[i], dataTypes[i]));
        }

        // Verify student received tokens for all
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student), reward * batchSize);
    }
}

