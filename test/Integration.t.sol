// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/EduConsent.sol";
import "../contracts/EduIdentity.sol";
import "../contracts/EduToken.sol";

contract IntegrationTest is Test {
    EduConsent consent;
    EduIdentity identity;
    EduToken token;

    address student1 = address(0xA11CE);
    address student2 = address(0xB0B);
    address requester1 = address(0xC001);
    address requester2 = address(0xD00D);

    function setUp() public {
        identity = new EduIdentity();
        token = new EduToken();
        consent = new EduConsent(address(identity), address(token));

        token.setConsentContract(address(consent));

        // Register students
        vm.prank(student1);
        identity.registerStudent(
            "alice",
            "Alice Wonder",
            "Maastricht University",
            2024,
            keccak256(abi.encodePacked("alice@example.com")),
            "ipfs://alice"
        );

        vm.prank(student2);
        identity.registerStudent(
            "bob",
            "Bob Builder",
            "Maastricht University",
            2023,
            keccak256(abi.encodePacked("bob@example.com")),
            "ipfs://bob"
        );

        // Register requesters
        vm.prank(requester1);
        identity.registerRequester(
            "JobPortal",
            "Find your dream job",
            "https://jobs.com"
        );

        vm.prank(requester2);
        identity.registerRequester(
            "ResearchDB",
            "Academic research platform",
            "https://research.edu"
        );
    }

    function test_CompleteWorkflow() public {
        // Student grants consent to requester
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        // Verify consent was created
        assertTrue(consent.hasValidConsent(
            student1,
            requester1,
            EduConsent.DataType.BasicProfile
        ));

        // Verify student received reward
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student1), reward);

        // Requester accesses data
        vm.prank(requester1);
        string memory cid = consent.accessDataAndLog(
            student1,
            EduConsent.DataType.BasicProfile
        );
        assertEq(cid, "ipfs://alice");

        // Student revokes consent
        vm.prank(student1);
        consent.revokeConsent(requester1, EduConsent.DataType.BasicProfile);

        // Verify consent is revoked
        assertFalse(consent.hasValidConsent(
            student1,
            requester1,
            EduConsent.DataType.BasicProfile
        ));

        // Verify access is now blocked
        vm.prank(requester1);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);
    }

    function test_MultipleStudentsAndRequesters() public {
        // Both students grant consent to both requesters
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        vm.prank(student1);
        consent.setConsent(requester2, EduConsent.DataType.AcademicRecord, 60);

        vm.prank(student2);
        consent.setConsent(requester1, EduConsent.DataType.SocialProfile, 90);

        vm.prank(student2);
        consent.setConsent(requester2, EduConsent.DataType.BasicProfile, 30);

        // Verify all consents exist
        assertTrue(consent.hasValidConsent(student1, requester1, EduConsent.DataType.BasicProfile));
        assertTrue(consent.hasValidConsent(student1, requester2, EduConsent.DataType.AcademicRecord));
        assertTrue(consent.hasValidConsent(student2, requester1, EduConsent.DataType.SocialProfile));
        assertTrue(consent.hasValidConsent(student2, requester2, EduConsent.DataType.BasicProfile));

        // Verify rewards distributed correctly
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student1), reward * 2);
        assertEq(token.balanceOf(student2), reward * 2);

        // Verify total supply
        assertEq(token.totalSupply(), reward * 4);
    }

    function test_StudentUpdatesProfileAfterGrantingConsent() public {
        // Student grants consent
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        // Student updates profile
        vm.prank(student1);
        identity.updateStudentProfileCid("ipfs://alice-updated");

        // Requester accesses updated data
        vm.prank(requester1);
        string memory cid = consent.accessDataAndLog(
            student1,
            EduConsent.DataType.BasicProfile
        );
        assertEq(cid, "ipfs://alice-updated");
    }

    function test_ConsentExpirationWorkflow() public {
        // Student grants 1-day consent
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 1);

        // Requester can access immediately
        vm.prank(requester1);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);

        // Fast forward 2 days
        vm.warp(block.timestamp + 2 days);

        // Access is now denied
        vm.prank(requester1);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);

        // Student can grant new consent
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        // Access works again
        vm.prank(requester1);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);
    }

    function test_ConsentUpdateExtendsDuration() public {
        // Initial consent for 5 days
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 5);

        EduConsent.Consent memory firstConsent = consent.getConsent(
            student1,
            requester1,
            EduConsent.DataType.BasicProfile
        );

        // Fast forward 4 days
        vm.warp(block.timestamp + 4 days);

        // Still valid
        assertTrue(consent.hasValidConsent(
            student1,
            requester1,
            EduConsent.DataType.BasicProfile
        ));

        // Update consent to 30 days from now
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        EduConsent.Consent memory updatedConsent = consent.getConsent(
            student1,
            requester1,
            EduConsent.DataType.BasicProfile
        );

        // New expiry is later
        assertGt(updatedConsent.expiresAt, firstConsent.expiresAt);

        // Student received another reward
        uint256 reward = consent.REWARD_PER_CONSENT();
        assertEq(token.balanceOf(student1), reward * 2);
    }

    function test_IsolationBetweenDataTypes() public {
        // Student grants consent for BasicProfile only
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        // Can access BasicProfile
        vm.prank(requester1);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);

        // Cannot access AcademicRecord
        vm.prank(requester1);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student1, EduConsent.DataType.AcademicRecord);

        // Cannot access SocialProfile
        vm.prank(requester1);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student1, EduConsent.DataType.SocialProfile);
    }

    function test_IsolationBetweenRequesters() public {
        // Student grants consent to requester1
        vm.prank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);

        // requester1 can access
        vm.prank(requester1);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);

        // requester2 cannot access
        vm.prank(requester2);
        vm.expectRevert(EduConsent.NoValidConsent.selector);
        consent.accessDataAndLog(student1, EduConsent.DataType.BasicProfile);
    }

    function test_TokenBalancesAccumulateCorrectly() public {
        uint256 reward = consent.REWARD_PER_CONSENT();

        // Student1 grants 3 different consents
        vm.startPrank(student1);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);
        assertEq(token.balanceOf(student1), reward);

        consent.setConsent(requester1, EduConsent.DataType.AcademicRecord, 30);
        assertEq(token.balanceOf(student1), reward * 2);

        consent.setConsent(requester2, EduConsent.DataType.BasicProfile, 30);
        assertEq(token.balanceOf(student1), reward * 3);
        vm.stopPrank();

        // Student2 grants 2 consents
        vm.startPrank(student2);
        consent.setConsent(requester1, EduConsent.DataType.BasicProfile, 30);
        assertEq(token.balanceOf(student2), reward);

        consent.setConsent(requester2, EduConsent.DataType.SocialProfile, 30);
        assertEq(token.balanceOf(student2), reward * 2);
        vm.stopPrank();

        // Verify total supply
        assertEq(token.totalSupply(), reward * 5);
    }
}

