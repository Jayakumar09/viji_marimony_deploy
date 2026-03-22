const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbPath = path.join(__dirname, 'profile.db');
const db = new sqlite3.Database(dbPath);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session setup
app.use(session({
    secret: 'vijayalakshmi-matrimony-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Initialize database and insert sample data
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT,
            gender TEXT,
            dateOfBirth TEXT,
            age INTEGER,
            bloodGroup TEXT,
            maritalStatus TEXT,
            religion TEXT,
            subCaste TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            pincode TEXT,
            education TEXT,
            occupation TEXT,
            company TEXT,
            annualIncome REAL,
            fatherName TEXT,
            fatherOccupation TEXT,
            motherName TEXT,
            motherOccupation TEXT,
            sisters INTEGER,
            marriedSisters INTEGER,
            familyType TEXT,
            familyStatus TEXT,
            profileImage TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profileId INTEGER,
            imagePath TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profileId) REFERENCES profiles (id)
        )
    `);

    // Insert sample data if no profiles exist
    db.get("SELECT COUNT(*) as count FROM profiles", (err, row) => {
        if (err) {
            console.error('Error checking profiles:', err);
            return;
        }
        
        if (row.count === 0) {
            const sampleProfile = {
                fullName: 'Dharsini Yuvaraj',
                gender: 'Female',
                dateOfBirth: '25/12/1998',
                age: 27,
                bloodGroup: 'O+',
                maritalStatus: 'Unmarried',
                religion: 'Hindu',
                subCaste: 'Vijayalakshmi',
                email: 'dharsini.yuvaraj@email.com',
                phone: '+91 98432 10567',
                address: '45 South Street, Gandhipuram',
                city: 'Coimbatore',
                state: 'Tamil Nadu',
                country: 'India',
                pincode: '641012',
                education: 'B.Com(CA)',
                occupation: 'Chartered Accountant',
                company: 'Deloitte India',
                annualIncome: 1500000,
                fatherName: 'Yuvaraj Kumar',
                fatherOccupation: 'Civil Engineer',
                motherName: 'Lakshmi Priya',
                motherOccupation: 'Housewife',
                sisters: 1,
                marriedSisters: 0,
                familyType: 'Nuclear',
                familyStatus: 'Upper Middle Class'
            };

            const columns = Object.keys(sampleProfile).join(', ');
            const placeholders = Object.keys(sampleProfile).map(() => '?').join(', ');
            const values = Object.values(sampleProfile);

            db.run(`INSERT INTO profiles (${columns}) VALUES (${placeholders})`, values, function(err) {
                if (err) {
                    console.error('Error inserting sample data:', err);
                } else {
                    console.log('Sample profile inserted successfully');
                }
            });
        }
    });
});

// Routes
app.get('/', (req, res) => {
    db.get('SELECT * FROM profiles LIMIT 1', (err, profile) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        
        if (profile) {
            db.all('SELECT * FROM gallery WHERE profileId = ? ORDER BY createdAt DESC', [profile.id], (err, gallery) => {
                if (err) {
                    console.error('Error fetching gallery:', err);
                    gallery = [];
                }
                res.render('profile', { 
                    profile, 
                    gallery: gallery || [],
                    currentDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                });
            });
        } else {
            res.render('profile', { profile: null, gallery: [] });
        }
    });
});

// API Routes for image upload
app.post('/api/upload/profile-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = '/uploads/' + req.file.filename;
    
    db.run('UPDATE profiles SET profileImage = ? WHERE id = 1', [imagePath], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, imagePath });
    });
});

app.post('/api/upload/gallery', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = '/uploads/' + req.file.filename;
    
    db.run('INSERT INTO gallery (profileId, imagePath) VALUES (1, ?)', [imagePath], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, imagePath, id: this.lastID });
    });
});

app.delete('/api/gallery/:id', (req, res) => {
    db.run('DELETE FROM gallery WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// PDF Generation with EXACT watermark parameters
app.get('/api/generate-pdf', async (req, res) => {
    const PDFDocument = require('pdfkit');
    
    db.get('SELECT * FROM profiles LIMIT 1', (err, profile) => {
        if (err || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        db.all('SELECT * FROM gallery WHERE profileId = ?', [profile.id], (err, gallery) => {
            if (err) {
                console.error('Error fetching gallery for PDF:', err);
                gallery = [];
            }

            // Create PDF with A4 size
            const doc = new PDFDocument({ 
                size: 'A4', 
                margin: 50,
                info: {
                    Title: 'Profile Details - Vijayalakshmi Boyar Matrimony',
                    Author: 'Vijayalakshmi Boyar Matrimony'
                }
            });
            
            const filename = `profile-${Date.now()}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            doc.pipe(res);
            
            // WATERMARK PARAMETERS
            const watermarkText = 'VIJAYALAKSHMI BOYAR MATRIMONY';
            const fontSize = 24;
            const opacity = 0.25;
            const scale = 0.7;
            const rotation = -45;
            const patternSpacing = 290;
            
            // Function to add TILE PATTERN watermark
            const addTilePatternWatermark = () => {
                doc.save();
                
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                
                for (let y = -100; y < pageHeight + 200; y += patternSpacing) {
                    for (let x = -100; x < pageWidth + 200; x += patternSpacing) {
                        doc.save();
                        
                        doc.translate(x + 100, y + 50);
                        doc.scale(scale);
                        doc.rotate(rotation);
                        
                        doc.fontSize(fontSize * scale)
                           .font('Helvetica-Bold');
                        
                        const textWidth = doc.widthOfString(watermarkText);
                        
                        doc.fillColor('#9e9e9e')
                           .fillOpacity(opacity)
                           .text(watermarkText, 0, 0, {
                               align: 'center',
                               width: textWidth + 20,
                               lineBreak: false,
                               ellipsis: false
                           });
                        
                        doc.restore();
                    }
                }
                
                doc.restore();
            };

            // PAGE 1
            addTilePatternWatermark();
            
            doc.fontSize(10)
               .fillColor('#666666')
               .font('Helvetica')
               .text('Generated by Vijayalakshmi Boyar Matrimony', 50, 30, { align: 'right' });
            
            doc.fontSize(28)
               .fillColor('#333333')
               .font('Helvetica-Bold')
               .text('Profile Details', { align: 'center' });
            
            doc.moveDown(2);
            
            // Personal Information
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('Personal Information');
            
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#333333')
               .font('Helvetica');
            
            const personalInfo = [
                `Full Name: ${profile.fullName}`,
                `Gender: ${profile.gender}`,
                `Date of Birth: ${profile.dateOfBirth}`,
                `Age: ${profile.age} years`,
                `Blood Group: ${profile.bloodGroup}`,
                `Marital Status: ${profile.maritalStatus}`,
                `Religion: ${profile.religion}`,
                `Sub Caste: ${profile.subCaste}`
            ];
            
            personalInfo.forEach(info => doc.text(info));
            doc.moveDown();
            
            // Contact Information
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('Contact Information');
            
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#333333')
               .font('Helvetica');
            
            const contactInfo = [
                `Email: ${profile.email}`,
                `Phone: ${profile.phone}`,
                `Address: ${profile.address}`,
                `City: ${profile.city}`,
                `State: ${profile.state}`,
                `Country: ${profile.country}`,
                `Pincode: ${profile.pincode}`
            ];
            
            contactInfo.forEach(info => doc.text(info));
            doc.moveDown();
            
            // Education & Career
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('Education & Career');
            
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#333333')
               .font('Helvetica');
            
            const educationInfo = [
                `Education: ${profile.education}`,
                `Occupation: ${profile.occupation}`,
                `Company: ${profile.company}`,
                `Annual Income: ₹ ${profile.annualIncome.toLocaleString('en-IN')}`
            ];
            
            educationInfo.forEach(info => doc.text(info));
            doc.moveDown();
            
            // Family Details
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('Family Details');
            
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#333333')
               .font('Helvetica');
            
            const familyInfo = [
                `Father Name: ${profile.fatherName}`,
                `Father Occupation: ${profile.fatherOccupation}`,
                `Mother Name: ${profile.motherName}`,
                `Mother Occupation: ${profile.motherOccupation}`,
                `Sisters: ${profile.sisters} (Married: ${profile.marriedSisters})`,
                `Family Type: ${profile.familyType}`,
                `Family Status: ${profile.familyStatus}`
            ];
            
            familyInfo.forEach(info => doc.text(info));
            doc.moveDown();
            
            // Physical Details
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('Physical Details');
            
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#666666')
               .font('Helvetica')
               .text('(Details to be added)');
            
            // Footer
            const currentDate = new Date();
            const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            doc.fontSize(10)
               .fillColor('#999999')
               .font('Helvetica')
               .text(
                   `Generated by Vijayalakshmi Boyar Matrimony  |  Page 1 of 2  |  ${dateStr}, ${timeStr}`,
                   50,
                   doc.page.height - 50,
                   { align: 'center' }
               );
            
            // PAGE 2
            doc.addPage();
            addTilePatternWatermark();
            
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('Gallery Photos', { align: 'center' });
            
            doc.moveDown();
            
            if (gallery && gallery.length > 0) {
                let y = 150;
                gallery.forEach((image, index) => {
                    if (index % 2 === 0 && index > 0) y += 150;
                    try {
                        const imagePath = path.join(__dirname, 'public', image.imagePath);
                        doc.image(imagePath, index % 2 === 0 ? 70 : 320, y, { width: 200, height: 150, fit: [200, 150] });
                    } catch (e) {
                        console.log('Could not load image:', image.imagePath);
                    }
                });
            } else {
                doc.fontSize(12).fillColor('#666666').text('No gallery images available');
            }
            
            doc.fontSize(10)
               .fillColor('#999999')
               .font('Helvetica')
               .text(
                   `Generated by Vijayalakshmi Boyar Matrimony  |  Page 2 of 2  |  ${dateStr}, ${timeStr}`,
                   50,
                   doc.page.height - 50,
                   { align: 'center' }
               );
            
            doc.end();
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`=================================`);
    console.log(`📋 WATERMARK PARAMETERS APPLIED:`);
    console.log(`   • Text: VIJAYALAKSHMI BOYAR MATRIMONY (SINGLE LINE)`);
    console.log(`   • Font Size: 24px`);
    console.log(`   • Opacity: 25%`);
    console.log(`   • Scale: ×0.7`);
    console.log(`   • Rotation: -45°`);
    console.log(`   • Pattern: Tile Pattern`);
    console.log(`   • Pattern Spacing: 290px`);
    console.log(`=================================`);
});

module.exports = app;