// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/EduIdentity.sol";

contract EduIdentityTest is Test {
    EduIdentity identity;

    address student = address(0xA11CE);
    address otherStudent = address(0xB0B);
    address requester = address(0xC001);

    string constant HANDLE = "alex_cs";
    string constant DISPLAY_NAME = "Alex Cioc";
    string constant UNIVERSITY = "Maastricht University";
    uint16 constant ENROLLMENT_YEAR = 2024;
    string constant EMAIL = "alex@example.com";
    string constant PROFILE_CID = "ipfs://student-alex";

    function setUp() public {
        identity = new EduIdentity();
    }

    function _getEmailHash(string memory email) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(email));
    }

    function _registerStudent(address addr) internal {
        vm.prank(addr);
        identity.registerStudent(
            HANDLE,
            DISPLAY_NAME,
            UNIVERSITY,
            ENROLLMENT_YEAR,
            _getEmailHash(EMAIL),
            PROFILE_CID
        );
    }

    function _registerRequester(address addr) internal {
        vm.prank(addr);
        identity.registerRequester(
            "CoolJobs",
            "Job marketplace",
            "https://cool.jobs"
        );
    }

    function test_RegistersStudentProfileAndStoresMetadata() public {
        vm.prank(student);
        identity.registerStudent(
            HANDLE,
            DISPLAY_NAME,
            UNIVERSITY,
            ENROLLMENT_YEAR,
            _getEmailHash(EMAIL),
            PROFILE_CID
        );

        EduIdentity.StudentProfile memory profile = identity.getStudentProfile(student);
        assertEq(profile.handle, HANDLE);
        assertEq(profile.displayName, DISPLAY_NAME);
        assertEq(profile.university, UNIVERSITY);
        assertEq(profile.enrollmentYear, ENROLLMENT_YEAR);
        assertEq(profile.emailHash, _getEmailHash(EMAIL));
        assertEq(profile.profileCid, PROFILE_CID);
        assertTrue(identity.isStudent(student));
    }

    function test_PreventsDuplicateStudentRegistrations() public {
        _registerStudent(student);

        vm.prank(student);
        vm.expectRevert(EduIdentity.AlreadyRegistered.selector);
        identity.registerStudent(
            "new_handle",
            DISPLAY_NAME,
            UNIVERSITY,
            ENROLLMENT_YEAR,
            _getEmailHash("duplicate@example.com"),
            "ipfs://new"
        );
    }

    function test_LetsStudentsUpdateProfileCids() public {
        _registerStudent(student);

        vm.prank(student);
        identity.updateStudentProfileCid("ipfs://student-alex-updated");

        EduIdentity.StudentProfile memory profile = identity.getStudentProfile(student);
        assertEq(profile.profileCid, "ipfs://student-alex-updated");
    }

    function test_BlocksNonStudentsFromUpdatingCids() public {
        _registerStudent(student);

        vm.prank(otherStudent);
        vm.expectRevert(EduIdentity.NotAStudent.selector);
        identity.updateStudentProfileCid("ipfs://blocked");
    }

    function test_RegistersRequesterApps() public {
        _registerRequester(requester);

        assertTrue(identity.isRequester(requester));

        EduIdentity.RequesterProfile memory profile = identity.getRequesterProfile(requester);
        assertEq(profile.name, "CoolJobs");
        assertEq(profile.description, "Job marketplace");
        assertEq(profile.appUri, "https://cool.jobs");
    }

    function test_GuardsDuplicateRequesterRegistrations() public {
        _registerRequester(requester);

        vm.prank(requester);
        vm.expectRevert(EduIdentity.AlreadyRegistered.selector);
        identity.registerRequester("DupRequester", "dup", "https://dup");
    }

    function test_ExposesStudentProfilesAndVerifiesEmailHashes() public {
        _registerStudent(student);

        EduIdentity.StudentProfile memory profile = identity.getStudentProfile(student);
        assertEq(profile.university, UNIVERSITY);

        assertTrue(identity.verifyEmail(student, EMAIL));
        assertFalse(identity.verifyEmail(student, "wrong@example.com"));
    }

    function test_RejectsEmptyHandle() public {
        vm.prank(student);
        vm.expectRevert(EduIdentity.HandleCannotBeEmpty.selector);
        identity.registerStudent(
            "",
            DISPLAY_NAME,
            UNIVERSITY,
            ENROLLMENT_YEAR,
            _getEmailHash(EMAIL),
            PROFILE_CID
        );
    }

    function test_RejectsEmptyDisplayName() public {
        vm.prank(student);
        vm.expectRevert(EduIdentity.DisplayNameCannotBeEmpty.selector);
        identity.registerStudent(
            HANDLE,
            "",
            UNIVERSITY,
            ENROLLMENT_YEAR,
            _getEmailHash(EMAIL),
            PROFILE_CID
        );
    }

    function test_RejectsInvalidEnrollmentYear() public {
        vm.prank(student);
        vm.expectRevert(EduIdentity.InvalidEnrollmentYear.selector);
        identity.registerStudent(
            HANDLE,
            DISPLAY_NAME,
            UNIVERSITY,
            0,
            _getEmailHash(EMAIL),
            PROFILE_CID
        );
    }

    function test_RejectsEmptyRequesterName() public {
        vm.prank(requester);
        vm.expectRevert(EduIdentity.NameCannotBeEmpty.selector);
        identity.registerRequester("", "desc", "https://app.com");
    }

    function test_ComputesEmailHash() public {
        bytes32 hash = identity.computeEmailHash(EMAIL);
        assertEq(hash, _getEmailHash(EMAIL));
    }
}

