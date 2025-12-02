import express from 'express';
import pool from '../db.js';
import {
    hasValidConsent,
    checkMultipleConsents,
    getConsentDetails,
    getConsentLogs,

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

router.post('/wallets', async (req, res) => {
    try {
        const { walletAddress, displayName } = req.body;

        if (!walletAddress || !displayName) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'walletAddress and displayName are required'
            });
        }

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

        const cid = `cid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const result = await pool.query(
            'INSERT INTO wallet (wallet_address, cid, display_name) VALUES ($1, $2, $3) RETURNING *',
            [walletAddress, cid, displayName]
        );

        console.log(`Created wallet record: ${walletAddress} -> ${cid}`);

        // --- SEED RANDOM DATA FOR NEW USER ---
        try {
            const coursesResult = await pool.query('SELECT course_id FROM course');
            const courses = coursesResult.rows;

            if (courses.length > 0) {
                const numGrades = Math.floor(Math.random() * 3) + 2;
                const shuffledCourses = courses.sort(() => 0.5 - Math.random()).slice(0, numGrades);

                for (const course of shuffledCourses) {
                    const points = (Math.random() * (100 - 60) + 60).toFixed(1);
                    await pool.query(
                        'INSERT INTO grades (wallet_cid, course_id, points) VALUES ($1, $2, $3)',
                        [cid, course.course_id, points]
                    );
                }
                console.log(`   - Seeded ${numGrades} random grades`);
            }

            const certNames = ['Bachelor of Science', 'Master of Arts', 'Certified Blockchain Developer', 'Data Science Professional'];
            const institutions = ['Tech University', 'State College', 'Crypto Academy', 'Global Institute'];

            const randomCert = certNames[Math.floor(Math.random() * certNames.length)];
            const randomInst = institutions[Math.floor(Math.random() * institutions.length)];
            const randomDate = new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0];

            await pool.query(
                'INSERT INTO certificates (wallet_cid, certificate_name, issuing_institution, issue_date, transcript_uri) VALUES ($1, $2, $3, $4, $5)',
                [cid, randomCert, randomInst, randomDate, `ipfs://Qm${Math.random().toString(36).substring(7)}`]
            );
            console.log(`   - Seeded 1 random certificate`);

        } catch (seedError) {
            console.error('Error seeding data:', seedError);
        }

        res.status(201).json({
            success: true,
            cid: cid,
            wallet: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating wallet:', error);

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

router.get('/student-data/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        const requesterAddress = req.headers['x-requester-address'];

        if (!requesterAddress) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Requester address is required in headers (X-Requester-Address)'
            });
        }

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

        const consents = await checkMultipleConsents(
            studentAddress,
            requesterAddress,
            [0, 1, 2]
        );

        console.log(`Consent check for ${requesterAddress} accessing ${studentAddress}:`, consents);

        const responseData = {
            basicProfile: null,
            academicRecord: null,
            socialProfile: null
        };

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

router.get('/blockchain/student/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const isStudent = await identityContract.isStudent(address);
        if (!isStudent) {
            return res.status(404).json({
                error: 'Not a student',
                message: 'Address is not registered as a student on the blockchain'
            });
        }

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

router.get('/blockchain/requester/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const isRequester = await identityContract.isRequester(address);
        if (!isRequester) {
            return res.status(404).json({
                error: 'Not a requester',
                message: 'Address is not registered as a requester on the blockchain'
            });
        }

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

router.get('/blockchain/role/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const role = await identityContract.roles(address);
        res.json({
            success: true,
            role: Number(role)
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

router.get('/blockchain/student/:address/consents', async (req, res) => {
    try {
        const { address } = req.params;
        const logs = await getConsentLogs(address);
        res.json({
            success: true,
            consents: logs
        });
    } catch (error) {
        console.error('Error fetching consent logs:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

router.get('/blockchain/consent/:studentAddress/:requesterAddress/:dataType', async (req, res) => {
    try {
        const { studentAddress, requesterAddress, dataType } = req.params;

        const dataTypeNum = parseInt(dataType);
        if (isNaN(dataTypeNum) || dataTypeNum < 0 || dataTypeNum > 2) {
            return res.status(400).json({
                error: 'Invalid data type',
                message: 'DataType must be 0 (BasicProfile), 1 (AcademicRecord), or 2 (SocialProfile)'
            });
        }

        const consentDetails = await getConsentDetails(studentAddress, requesterAddress, dataTypeNum);

        if (!consentDetails || !consentDetails.exists) {
            return res.status(404).json({
                error: 'Consent not found',
                message: 'No consent exists for this combination'
            });
        }

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

router.post('/blockchain/check-consents', async (req, res) => {
    try {
        const { studentAddress, requesterAddress, dataTypes } = req.body;

        if (!studentAddress || !requesterAddress || !Array.isArray(dataTypes)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'studentAddress, requesterAddress, and dataTypes array are required'
            });
        }

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
