// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/EduToken.sol";

contract EduTokenTest is Test {
    EduToken token;

    address owner = address(this);
    address consentContract = address(0xC001);
    address recipient = address(0xA11CE);

    function setUp() public {
        token = new EduToken();
    }

    function test_StartsWithZeroSupply() public {
        assertEq(token.totalSupply(), 0);
    }

    function test_AllowsSettingConsentContractOnce() public {
        token.setConsentContract(consentContract);
        assertEq(token.consentContract(), consentContract);

        vm.expectRevert(EduToken.AlreadySet.selector);
        token.setConsentContract(consentContract);
    }

    function test_RejectsZeroAddressForConsentContract() public {
        vm.expectRevert(EduToken.InvalidAddress.selector);
        token.setConsentContract(address(0));
    }

    function test_RestrictsMintingToConsentContract() public {
        vm.expectRevert(EduToken.NotConsentContract.selector);
        token.mintTo(recipient, 100 ether);

        token.setConsentContract(consentContract);

        vm.prank(consentContract);
        token.mintTo(recipient, 500 ether);

        assertEq(token.balanceOf(recipient), 500 ether);
        assertEq(token.totalSupply(), 500 ether);
    }

    function test_EmitsConsentContractSetEvent() public {
        vm.expectEmit(true, false, false, false);
        emit EduToken.ConsentContractSet(consentContract);
        token.setConsentContract(consentContract);
    }

    function test_MintsCorrectAmounts() public {
        token.setConsentContract(consentContract);

        vm.startPrank(consentContract);
        token.mintTo(recipient, 10 ether);
        assertEq(token.balanceOf(recipient), 10 ether);

        token.mintTo(recipient, 20 ether);
        assertEq(token.balanceOf(recipient), 30 ether);
        assertEq(token.totalSupply(), 30 ether);
        vm.stopPrank();
    }

    function test_HasCorrectTokenMetadata() public {
        assertEq(token.name(), "EduShare Token");
        assertEq(token.symbol(), "EDU");
        assertEq(token.decimals(), 18);
    }
}

