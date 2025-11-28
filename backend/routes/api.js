import express from 'express';
import pool from '../db.js';
import {
    hasValidConsent,
    checkMultipleConsents,
    getConsentDetails,
    identityContract
} from '../blockchain.js';
import {
    addresses as sharedAddresses,
    eduConsentAbi,
    eduIdentityAbi,
    eduTokenAbi,
} from '@student-identity-platform/shared';

const router = express.Router();

const DATA_TYPES = [
    { id: 0, name: 'BasicProfile', description: 'Name, handle, university, enrollment year' },
    { id: 1, name: 'AcademicRecord', description: 'Grades, transcripts, and course performance' },
    { id: 2, name: 'SocialProfile', description: 'Social connections, posts, and activities' }
];

/**
 * POST /api/wallets
 * Create a new wallet record and return a CID
 * This is called during student registration BEFORE the blockchain transaction
 */
router.post('/wallets', async (req, res) => {
    try {
        const { walletAddress, displayName } = req.body;

        // Validate input
        if (!walletAddress || !displayName) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'walletAddress and displayName are required'
            });
        }

        // Check if wallet already exists
        const existingWallet = await pool.query(
            'SELECT cid FROM wallet WHERE wallet_address = $1',
            [walletAddress]
        );

        if (existingWallet.rows.length > 0) {
            return res.status(409).json({
                error: 'Wallet already registered',
                cid: existingWallet.rows[0].cid
            });
        }

        // Generate a unique CID
        const cid = `cid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Insert the new wallet
        const result = await pool.query(
            'INSERT INTO wallet (wallet_address, cid, display_name) VALUES ($1, $2, $3) RETURNING *',
            [walletAddress, cid, displayName]
        );

        console.log(`✅ Created wallet record: ${walletAddress} -> ${cid}`);

        res.status(201).json({
            success: true,
            cid: cid,
            wallet: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating wallet:', error);

        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Duplicate entry',
                message: 'Wallet address or display name already exists'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/student-data/:cid
 * Fetch student's off-chain data
 * Requires requester address in headers for consent verification
 */
router.get('/student-data/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        const requesterAddress = req.headers['x-requester-address'];

        // Validate requester address
        if (!requesterAddress) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Requester address is required in headers (X-Requester-Address)'
            });
        }

        // Get student wallet address from CID
        const walletResult = await pool.query(
            'SELECT wallet_address, display_name FROM wallet WHERE cid = $1',
            [cid]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'No student with this CID exists'
            });
        }

        const studentAddress = walletResult.rows[0].wallet_address;
        const displayName = walletResult.rows[0].display_name;

        // Check consents for all three data types defined in the contract
        // 0: BasicProfile, 1: AcademicRecord, 2: SocialProfile
        const consents = await checkMultipleConsents(
            studentAddress,
            requesterAddress,
            [0, 1, 2]
        );

        console.log(`Consent check for ${requesterAddress} accessing ${studentAddress}:`, consents);

        // Prepare response data based on consents
        const responseData = {
            basicProfile: null,
            academicRecord: null,
            socialProfile: null
        };

        // If requester has consent for BasicProfile (0), include basic info
        if (consents[0]) {
            responseData.basicProfile = {
                displayName: displayName,
                walletAddress: studentAddress,
                cid: cid
            };
            console.log(`Granted access to BasicProfile`);
        } else {
            console.log(`No consent for BasicProfile`);
        }

        // If requester has consent for AcademicRecord (1), include grades and certificates
        if (consents[1]) {
            const gradesResult = await pool.query(`
                SELECT 
                    g.points,
                    g.added_at,
                    c.course_name,
                    c.description
                FROM grades g
                JOIN course c ON g.course_id = c.course_id
                WHERE g.wallet_cid = $1
                ORDER BY g.added_at DESC
            `, [cid]);

            const certificatesResult = await pool.query(`
                SELECT 
                    certificate_id,
                    certificate_name,
                    issuing_institution,
                    issue_date,
                    transcript_uri,
                    added_at
                FROM certificates
                WHERE wallet_cid = $1
                ORDER BY issue_date DESC
            `, [cid]);

            responseData.academicRecord = {
                grades: gradesResult.rows,
                certificates: certificatesResult.rows
            };
            console.log(`Granted access to AcademicRecord (${gradesResult.rows.length} grades, ${certificatesResult.rows.length} certificates)`);
        } else {
            console.log(`No consent for AcademicRecord`);
        }

        // If requester has consent for SocialProfile (2), include social data
        // Note: Currently no social data in database, but structure is ready
        if (consents[2]) {
            responseData.socialProfile = {
                message: 'Social profile data not yet implemented',
                friends: [],
                posts: []
            };
            console.log(`Granted access to SocialProfile`);
        } else {
            console.log(`No consent for SocialProfile`);
        }

        res.json({
            success: true,
            studentAddress: studentAddress,
            data: responseData,
            consents: consents
        });

    } catch (error) {
        console.error('Error fetching student data:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/data-types
 * Return the list of available data types
 */
router.get('/data-types', async (req, res) => {
    try {
        res.json({
            success: true,
            dataTypes: DATA_TYPES
        });
    } catch (error) {
        console.error('Error fetching data types:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/wallet/:address
 * Get wallet CID by address
 */
router.get('/wallet/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const result = await pool.query(
            'SELECT * FROM wallet WHERE wallet_address = $1',
            [address]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Wallet not found',
                message: 'No wallet with this address exists'
            });
        }

        res.json({
            success: true,
            wallet: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/blockchain/student/:address
 * Get student profile from blockchain
 */
router.get('/blockchain/student/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Check if address is a student
        const isStudent = await identityContract.isStudent(address);
        if (!isStudent) {
            return res.status(404).json({
                error: 'Not a student',
                message: 'Address is not registered as a student on the blockchain'
            });
        }

        // Get student profile from blockchain
        const profile = await identityContract.getStudentProfile(address);

        res.json({
            success: true,
            profile: {
                registered: profile.registered,
                handle: profile.handle,
                displayName: profile.displayName,
                university: profile.university,
                enrollmentYear: profile.enrollmentYear.toString(),
                emailHash: profile.emailHash,
                profileCid: profile.profileCid
            }
        });

    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/blockchain/requester/:address
 * Get requester profile from blockchain
 */
router.get('/blockchain/requester/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Check if address is a requester
        const isRequester = await identityContract.isRequester(address);
        if (!isRequester) {
            return res.status(404).json({
                error: 'Not a requester',
                message: 'Address is not registered as a requester on the blockchain'
            });
        }

        // Get requester profile from blockchain
        const profile = await identityContract.getRequesterProfile(address);

        res.json({
            success: true,
            profile: {
                registered: profile.registered,
                name: profile.name,
                description: profile.description,
                appUri: profile.appUri
            }
        });

    } catch (error) {
        console.error('Error fetching requester profile:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/blockchain/consent/:studentAddress/:requesterAddress/:dataType
 * Get detailed consent information from blockchain
 */
router.get('/blockchain/consent/:studentAddress/:requesterAddress/:dataType', async (req, res) => {
    try {
        const { studentAddress, requesterAddress, dataType } = req.params;

        // Validate dataType is 0, 1, or 2
        const dataTypeNum = parseInt(dataType);
        if (isNaN(dataTypeNum) || dataTypeNum < 0 || dataTypeNum > 2) {
            return res.status(400).json({
                error: 'Invalid data type',
                message: 'DataType must be 0 (BasicProfile), 1 (AcademicRecord), or 2 (SocialProfile)'
            });
        }

        // Get consent details from blockchain
        const consentDetails = await getConsentDetails(studentAddress, requesterAddress, dataTypeNum);

        if (!consentDetails || !consentDetails.exists) {
            return res.status(404).json({
                error: 'Consent not found',
                message: 'No consent exists for this combination'
            });
        }

        // Check if consent is currently valid
        const isValid = await hasValidConsent(studentAddress, requesterAddress, dataTypeNum);

        res.json({
            success: true,
            consent: {
                ...consentDetails,
                isCurrentlyValid: isValid,
                dataTypeName: DATA_TYPES[dataTypeNum].name
            }
        });

    } catch (error) {
        console.error('Error fetching consent details:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * POST /api/blockchain/check-consents
 * Check multiple consents at once
 * Body: { studentAddress, requesterAddress, dataTypes: [0, 1, 2] }
 */
router.post('/blockchain/check-consents', async (req, res) => {
    try {
        const { studentAddress, requesterAddress, dataTypes } = req.body;

        if (!studentAddress || !requesterAddress || !Array.isArray(dataTypes)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'studentAddress, requesterAddress, and dataTypes array are required'
            });
        }

        // Validate all dataTypes
        for (const dt of dataTypes) {
            if (typeof dt !== 'number' || dt < 0 || dt > 2) {
                return res.status(400).json({
                    error: 'Invalid data type',
                    message: 'All dataTypes must be 0, 1, or 2'
                });
            }
        }

        const consents = await checkMultipleConsents(studentAddress, requesterAddress, dataTypes);

        res.json({
            success: true,
            studentAddress,
            requesterAddress,
            consents
        });

    } catch (error) {
        console.error('Error checking consents:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/contracts/meta
 * Expose current contract addresses and ABIs for the frontend
 */
router.get('/contracts/meta', (req, res) => {
    res.json({
        success: true,
        addresses: sharedAddresses,
        abis: {
            eduIdentity: eduIdentityAbi,
            eduConsent: eduConsentAbi,
            eduToken: eduTokenAbi,
        },
        updatedAt: new Date().toISOString(),
    });
});

export default router;


