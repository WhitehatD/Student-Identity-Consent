# Contract Specifications

**Project:** Student Identity Platform  
**Version:** 1.0.0  
**Compiler:** Solidity ^0.8.24  
**License:** MIT

---

## Overview

This document provides detailed technical specifications for all three smart contracts in the Student Identity Platform.

---

## Table of Contents

1. [EduIdentity Contract](#eduidentity-contract)
2. [EduConsent Contract](#educonsent-contract)
3. [EduToken Contract](#edutoken-contract)
4. [Inter-Contract Communication](#inter-contract-communication)
5. [Gas Considerations](#gas-considerations)

---

## EduIdentity Contract

### Purpose

Manages decentralized identity registration for both students and data requesters. Stores minimal on-chain metadata with privacy-preserving features.

### State Variables

```solidity
enum Role { None, Student, Requester }

struct StudentProfile {
    bool registered;
    string handle;           // e.g. "alex_cs"
    string displayName;      // "Alex Cioc"
    string university;       // "Maastricht University"
    uint16 enrollmentYear;   // e.g. 2023
    bytes32 emailHash;       // keccak256(email)
    string profileCid;       // IPFS / off-chain JSON with full profile
}

struct RequesterProfile {
    bool registered;
    string name;             // e.g. "CoolJobs" or "CoursePortal"
    string description;      // short description
    string appUri;           // website/app link
}

mapping(address => Role) public roles;
mapping(address => StudentProfile) public students;
mapping(address => RequesterProfile) public requesters;
```

### Functions

#### registerStudent

```solidity
function registerStudent(
    string calldata handle,
    string calldata displayName,
    string calldata university,
    uint16 enrollmentYear,
    bytes32 emailHash,
    string calldata profileCid
) external
```

**Purpose:** Register a new student profile on-chain

**Access Control:** Anyone (but address can only register once)

**Requirements:**
- `roles[msg.sender] == Role.None` - Not already registered
- `handle` not empty
- `displayName` not empty
- `enrollmentYear > 0`

**State Changes:**
- Sets `roles[msg.sender] = Role.Student`
- Creates `StudentProfile` entry
- Emits `StudentRegistered` event

**Why Critical:** Foundation of the platform; students must register before granting consent. Prevents duplicate registrations and ensures data integrity.

---

#### registerRequester

```solidity
function registerRequester(
    string calldata name,
    string calldata description,
    string calldata appUri
) external
```

**Purpose:** Register a new requester application

**Access Control:** Anyone (but address can only register once)

**Requirements:**
- `roles[msg.sender] == Role.None` - Not already registered
- `name` not empty

**State Changes:**
- Sets `roles[msg.sender] = Role.Requester`
- Creates `RequesterProfile` entry
- Emits `RequesterRegistered` event

**Why Critical:** Ensures only registered applications can request data access. Provides transparency about who is requesting data.

---

#### updateStudentProfileCid

```solidity
function updateStudentProfileCid(string calldata newCid) external
```

**Purpose:** Update pointer to off-chain data

**Access Control:** Student role only, own profile only

**Requirements:**
- `roles[msg.sender] == Role.Student`
- Student is registered

**State Changes:**
- Updates `students[msg.sender].profileCid`
- Emits `StudentProfileUpdated` event

**Why Critical:** Allows students to update their data without revoking/re-granting consents. Keeps on-chain pointers current.

---

#### getStudentProfile

```solidity
function getStudentProfile(address student) external view returns (StudentProfile memory)
```

**Purpose:** Retrieve student profile data

**Access Control:** Anyone (view function)

**Requirements:**
- Student must be registered

**Returns:** Complete `StudentProfile` struct

**Why Critical:** Used by EduConsent to retrieve profile CID for data access. Public for transparency.

---

#### getRequesterProfile

```solidity
function getRequesterProfile(address requester) external view returns (RequesterProfile memory)
```

**Purpose:** Retrieve requester profile data

**Access Control:** Anyone (view function)

**Requirements:**
- Requester must be registered

**Returns:** Complete `RequesterProfile` struct

**Why Critical:** Allows students to research requesters before granting consent.

---

#### verifyEmail

```solidity
function verifyEmail(address student, string calldata emailToVerify) external view returns (bool)
```

**Purpose:** Verify email ownership without revealing the actual email

**Access Control:** Anyone (view function)

**Requirements:**
- Student must be registered

**Returns:** `true` if `keccak256(emailToVerify)` matches stored hash

**Why Critical:** Privacy-preserving verification. Critical for compliance and user privacy.

---

#### computeEmailHash

```solidity
function computeEmailHash(string calldata email) external pure returns (bytes32)
```

**Purpose:** Helper function to compute email hash off-chain before registration

**Access Control:** Anyone (pure function)

**Returns:** `keccak256(abi.encodePacked(email))`

**Why Critical:** Allows users to pre-compute hashes for privacy. Educational tool showing hash usage.

---

#### isStudent / isRequester

```solidity
function isStudent(address addr) external view returns (bool)
function isRequester(address addr) external view returns (bool)
```

**Purpose:** Check user role

**Access Control:** Anyone (view function)

**Returns:** Boolean indicating role

**Why Critical:** Used by EduConsent for access control validation.

---

### Events

```solidity
event StudentRegistered(address indexed student, string handle, bytes32 emailHash);
event StudentProfileUpdated(address indexed student, string newProfileCid);
event RequesterRegistered(address indexed requester, string name);
event EmailVerified(address indexed student, bytes32 emailHash);
```

**Why Events:** Provide off-chain indexing, audit trail, and real-time notifications.

---

### Security Considerations

1. **Privacy:**
   - ✅ Email stored as hash only
   - ✅ Actual data stored off-chain (only CID on-chain)
   - ✅ Verification possible without revealing email

2. **Access Control:**
   - ✅ One registration per address
   - ✅ Role-based permissions
   - ✅ Own profile updates only

3. **Input Validation:**
   - ✅ Non-empty string checks
   - ✅ Valid enrollment year
   - ✅ Duplicate prevention

4. **Vulnerabilities Mitigated:**
   - ✅ No reentrancy (no external calls)
   - ✅ No integer overflow (Solidity 0.8+)
   - ✅ No unauthorized access

---

## EduConsent Contract

### Purpose

Manages consent-based data sharing permissions with token rewards and complete audit logging.

### State Variables

```solidity
enum DataType {
    BasicProfile,      // handle, displayName, profileCid
    AcademicRecord,    // off-chain pointer to academic transcript
    SocialProfile      // friends, posts, etc.
}

struct Consent {
    bool exists;
    address owner;         // student
    address requester;     // requester app
    DataType dataType;
    uint64 expiresAt;      // unix timestamp
    bool active;
}

EduIdentity public identityContract;
EduToken public token;
mapping(bytes32 => Consent) public consents;
uint256 public constant REWARD_PER_CONSENT = 10 * 1e18; // 10 EDU tokens
```

### Key Design: Consent Key Generation

```solidity
function _key(address owner, address requester, DataType dataType) internal pure returns (bytes32) {
    return keccak256(abi.encode(owner, requester, dataType));
}
```

**Why:** Unique key per (student, requester, data type) combination. Allows:
- Same student to grant multiple requesters access
- Same student to grant same requester access to different data types
- Efficient O(1) lookup

---

### Functions

#### setConsent

```solidity
function setConsent(
    address requester,
    DataType dataType,
    uint16 durationDays
) external
```

**Purpose:** Grant or update consent for a requester to access specific data

**Access Control:** Student role only

**Requirements:**
- `msg.sender` is registered student
- `requester` is registered requester
- `durationDays` between 1 and 365

**State Changes:**
- Creates/updates consent record
- Mints `REWARD_PER_CONSENT` tokens to student
- Emits `ConsentGranted` event

**Why Critical:** Core value proposition - students control their data and earn rewards. Without reliable consent creation, the entire platform fails.

**Gas Optimization Note:** Could pack struct fields to save gas on storage.

---

#### revokeConsent

```solidity
function revokeConsent(address requester, DataType dataType) external
```

**Purpose:** Revoke previously granted consent

**Access Control:** Consent owner only

**Requirements:**
- Consent exists
- `msg.sender` is consent owner
- Consent is currently active

**State Changes:**
- Sets `consent.active = false`
- Emits `ConsentRevoked` event

**Why Critical:** Fundamental right to withdraw consent. Critical for GDPR compliance and user autonomy.

**Note:** Does NOT burn tokens. Tokens are rewards for granting consent, not payment for access.

---

#### accessDataAndLog

```solidity
function accessDataAndLog(
    address owner,
    DataType dataType
) external returns (string memory profileCid)
```

**Purpose:** Access data with consent check and complete audit logging

**Access Control:** Requester role only

**Requirements:**
- `msg.sender` is registered requester
- Valid consent exists (active, not expired)

**State Changes:**
- Emits `AccessAttempt` event (always, even if denied)
- Emits `DataAccessed` event (only if granted)

**Returns:** Profile CID (pointer to off-chain data)

**Why Critical:** 
- Enforces consent-based access control
- Provides complete audit trail (both successful and failed attempts)
- Returns only metadata, actual data remains off-chain

**Important:** This function does NOT transfer data ownership or tokens. It only validates permissions and returns a pointer.

---

#### hasValidConsent

```solidity
function hasValidConsent(
    address owner,
    address requester,
    DataType dataType
) public view returns (bool)
```

**Purpose:** Check if valid consent exists

**Access Control:** Anyone (view function)

**Requirements:** None

**Returns:** `true` if consent exists, is active, and not expired

**Why Critical:** Public verification of permissions. Used internally by `accessDataAndLog` and externally for UI/validation.

---

#### getConsent

```solidity
function getConsent(
    address owner,
    address requester,
    DataType dataType
) external view returns (Consent memory)
```

**Purpose:** Retrieve consent details

**Access Control:** Anyone (view function)

**Returns:** Complete `Consent` struct

**Why Critical:** Transparency - anyone can verify consent terms. Used for UI display and auditing.

---

### Events

```solidity
event ConsentGranted(
    address indexed owner,
    address indexed requester,
    DataType dataType,
    uint64 expiresAt
);

event ConsentRevoked(
    address indexed owner,
    address indexed requester,
    DataType dataType
);

event AccessAttempt(
    address indexed owner,
    address indexed requester,
    DataType indexed dataType,
    uint64 timestamp,
    bool granted
);

event DataAccessed(
    address indexed owner,
    address indexed requester,
    DataType indexed dataType,
    uint64 timestamp,
    string dataHash  // Hash of the accessed data for audit trail
);
```

**Why Events:** 
- Complete audit trail for compliance
- Real-time access monitoring
- Off-chain analytics and dashboards
- Immutable proof of access attempts

---

### Security Considerations

1. **Access Control:**
   - ✅ Only registered students can grant consent
   - ✅ Only consent owner can revoke
   - ✅ Only registered requesters can access data
   - ✅ Consent validation on every access

2. **Time-Bound Permissions:**
   - ✅ All consents have expiration dates
   - ✅ Automatic expiry checking
   - ✅ No manual cleanup required

3. **Audit Trail:**
   - ✅ All access attempts logged (granted and denied)
   - ✅ Timestamps for all operations
   - ✅ Data hash logging for forensics

4. **Token Security:**
   - ✅ Tokens minted only on consent grant
   - ✅ No tokens burned on revocation
   - ✅ Tokens don't grant access (consent does)

5. **Isolation:**
   - ✅ Per-data-type permissions
   - ✅ Per-requester permissions
   - ✅ No cross-contamination

6. **Vulnerabilities Mitigated:**
   - ✅ No reentrancy (checks-effects-interactions pattern)
   - ✅ No integer overflow (Solidity 0.8+)
   - ✅ No unauthorized minting (only this contract can call token.mintTo)

---

## EduToken Contract

### Purpose

ERC-20 token for rewarding students who share their data. Standard compliant with restricted minting.

### Inheritance

```solidity
contract EduToken is ERC20
```

Inherits from OpenZeppelin's ERC20 implementation (v5.1.0)

### State Variables

```solidity
address public consentContract;
```

**Why:** Only the consent contract should be able to mint tokens.

---

### Functions

#### Constructor

```solidity
constructor() ERC20("EduShare Token", "EDU") {
    // Start with zero supply; minting happens via EduConsent
}
```

**Purpose:** Initialize token with name and symbol, zero initial supply

**Why Zero Supply:** All tokens are earned through participation (consent granting). No pre-mine, no ICO.

---

#### setConsentContract

```solidity
function setConsentContract(address _consent) external
```

**Purpose:** Set the consent contract address (can only be set once)

**Access Control:** Anyone, but only works once

**Requirements:**
- `consentContract == address(0)` - Not yet set
- `_consent != address(0)` - Valid address

**State Changes:**
- Sets `consentContract`
- Emits `ConsentContractSet` event

**Why Critical:** Security measure to prevent unauthorized minting. One-time setup ensures immutability.

**Design Note:** Could use constructor parameter, but this allows deployment flexibility with Hardhat Ignition.

---

#### mintTo

```solidity
function mintTo(address to, uint256 amount) external onlyConsent
```

**Purpose:** Mint tokens to an address (only callable by consent contract)

**Access Control:** Consent contract only (`onlyConsent` modifier)

**Requirements:**
- `msg.sender == consentContract`

**State Changes:**
- Calls internal `_mint(to, amount)`
- Increases `totalSupply`
- Increases `balanceOf[to]`

**Why Critical:** Only way to create new tokens. Restriction ensures controlled, consent-based issuance.

---

### Modifiers

```solidity
modifier onlyConsent() {
    require(msg.sender == consentContract, "Not consent contract");
    _;
}
```

**Purpose:** Restrict function access to consent contract only

**Why Critical:** Prevents unauthorized token minting. Without this, anyone could inflate supply.

---

### Events

```solidity
event ConsentContractSet(address indexed consentContract);
```

Plus standard ERC-20 events:
- `Transfer(address indexed from, address indexed to, uint256 value)`
- `Approval(address indexed owner, address indexed spender, uint256 value)`

---

### Token Economics

| Property | Value | Rationale |
|----------|-------|-----------|
| **Name** | "EduShare Token" | Descriptive, education-focused |
| **Symbol** | "EDU" | Short, memorable |
| **Decimals** | 18 | Standard ERC-20 convention |
| **Initial Supply** | 0 | All tokens earned |
| **Minting** | 10 EDU per consent | Fixed reward rate |
| **Max Supply** | Unlimited | Scales with platform growth |
| **Burning** | Not implemented | Tokens are rewards, not consumed |
| **Transfer** | Freely transferable | Standard ERC-20 |

---

### Security Considerations

1. **Minting Control:**
   - ✅ Only consent contract can mint
   - ✅ One-time consent contract setup
   - ✅ No admin override

2. **Standard Compliance:**
   - ✅ Full ERC-20 compliance (OpenZeppelin)
   - ✅ Safe from known ERC-20 vulnerabilities
   - ✅ Standard wallet/exchange compatibility

3. **No Admin Privileges:**
   - ✅ No pause function
   - ✅ No blacklist
   - ✅ No supply cap changes
   - ✅ Fully decentralized

4. **Vulnerabilities Mitigated:**
   - ✅ No reentrancy (ERC-20 standard protection)
   - ✅ No integer overflow (Solidity 0.8+)
   - ✅ No unauthorized minting

---

## Inter-Contract Communication

### Initialization Flow

```
1. Deploy EduIdentity
2. Deploy EduToken
3. Deploy EduConsent(address(identity), address(token))
4. Call token.setConsentContract(address(consent))
```

**Critical:** Step 4 must happen before any consents can be granted.

---

### Consent Granting Flow

```
Student → EduConsent.setConsent()
  ├─→ EduIdentity.roles(msg.sender)     [Check student role]
  ├─→ EduIdentity.roles(requester)       [Check requester role]
  ├─→ Store consent record
  └─→ EduToken.mintTo(student, 10e18)   [Mint reward]
```

---

### Data Access Flow

```
Requester → EduConsent.accessDataAndLog()
  ├─→ EduIdentity.roles(msg.sender)      [Check requester role]
  ├─→ Check consent (exists, active, not expired)
  ├─→ EduIdentity.getStudentProfile()    [Get profile CID]
  └─→ Return profileCid (pointer to off-chain data)
```

---

## Gas Considerations

### Deployment Costs (Estimates)

| Contract | Size | Deployment Gas | Est. Cost (50 gwei, ETH=$3000) |
|----------|------|----------------|--------------------------------|
| EduIdentity | ~4 KB | ~1,500,000 | ~$225 |
| EduToken | ~2 KB | ~1,000,000 | ~$150 |
| EduConsent | ~5 KB | ~2,000,000 | ~$300 |
| **Total** | **~11 KB** | **~4,500,000** | **~$675** |

### Function Execution Costs (Estimates)

| Function | Gas Usage | Est. Cost (50 gwei, ETH=$3000) |
|----------|-----------|--------------------------------|
| `registerStudent()` | ~150,000 | ~$22.50 |
| `registerRequester()` | ~120,000 | ~$18.00 |
| `setConsent()` | ~150,000 | ~$22.50 |
| `revokeConsent()` | ~30,000 | ~$4.50 |
| `accessDataAndLog()` | ~80,000 | ~$12.00 |
| `updateStudentProfileCid()` | ~45,000 | ~$6.75 |
| View functions | 0 (off-chain) | $0.00 |

### Optimization Opportunities

1. **Custom Errors (Saves ~50 gas per revert)**
   ```solidity
   // Current: require(condition, "Error string");
   // Optimized: if (!condition) revert CustomError();
   ```

2. **Struct Packing**
   ```solidity
   // Current Consent struct: 6 storage slots
   // Optimized: Could pack to 3-4 slots
   ```

3. **Storage Caching**
   ```solidity
   // Cache storage reads in memory
   Consent memory consent = consents[key];
   ```

4. **Calldata vs Memory**
   ```solidity
   // Already using calldata for string parameters ✓
   ```

---

## Testing Requirements

### Unit Test Coverage

Each contract must test:
- ✅ All functions (happy paths)
- ✅ All access controls (unauthorized attempts)
- ✅ All error conditions (require statements)
- ✅ All events (emission and parameters)
- ✅ Edge cases (boundaries, limits)
- ✅ State changes (verify storage updates)

### Integration Test Coverage

- ✅ Complete workflows (register → consent → access → revoke)
- ✅ Multi-user scenarios
- ✅ Token accumulation and distribution
- ✅ Time-dependent logic (expiration)
- ✅ Cross-contract interactions

### Scalability Test Coverage

- ✅ 10, 50, 100, 500, 1000 users
- ✅ Gas usage measurements
- ✅ Performance degradation analysis
- ✅ Concurrent operations

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-21 | Initial release |

---

**End of Contract Specifications**

*These contracts provide a secure, privacy-preserving, and incentivized data sharing platform for educational institutions.*

