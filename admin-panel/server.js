const express = require('express');
const session = require('express-session');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = '';
        if (file.fieldname === 'logo') {
            uploadPath = path.join(__dirname, '../logo');
        } else if (file.fieldname === 'image') {
            uploadPath = path.join(__dirname, '../img');
        } else if (file.fieldname === 'newsImage') {
            uploadPath = path.join(__dirname, '../imgnews');
        } else {
            uploadPath = path.join(__dirname, 'public/uploads');
        }
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage
});

const app = express();
const PORT = process.env.PORT || 3000;

// Airlines data path
const airlinesPath = path.join(__dirname, 'airlines.json');

// Airlines logo upload config (to /logo)
const airlineLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../logo');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.floor(Math.random()*1e9) + ext;
        cb(null, uniqueName);
    }
});
const airlineLogoUpload = multer({ storage: airlineLogoStorage });

// Security Headers Middleware - Hide server info & add protection
app.use((req, res, next) => {
    // Hide server information
    res.removeHeader('X-Powered-By');
    res.setHeader('Server', 'Unknown');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// Request Validation Middleware - Block suspicious requests
app.use((req, res, next) => {
    // Check for common attack patterns
    const suspiciousPatterns = [
        /<script/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi
    ];
    
    const url = req.url;
    const userAgent = req.get('User-Agent') || '';
    
    // Block suspicious requests
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url) || pattern.test(userAgent)) {
            return res.status(403).json({ error: 'Access Denied' });
        }
    }
    
    // Require proper browser headers
    if (!req.get('User-Agent') || req.get('User-Agent').length < 10) {
        return res.status(403).json({ error: 'Invalid Request' });
    }
    
    next();
});

// CSRF Protection
const csrfTokens = new Map();

function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

function validateCSRF(req, res, next) {
    if (req.method === 'GET') {
        const token = generateCSRFToken();
        csrfTokens.set(req.sessionID, token);
        res.locals.csrfToken = token;
        return next();
    }
    
    const token = req.body._csrf;
    const storedToken = csrfTokens.get(req.sessionID);
    
    if (!token || !storedToken || token !== storedToken) {
        return res.status(403).json({ error: 'Invalid CSRF Token' });
    }
    
    next();
}

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
// Serve static files from logo, img, and imgnews directories
app.use('/logo', express.static(path.join(__dirname, '../logo')));
app.use('/img', express.static(path.join(__dirname, '../img')));
app.use('/imgnews', express.static(path.join(__dirname, '../imgnews')));

// Serve static HTML files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Session configuration - Fixed for Railway
app.use(session({
    secret: process.env.SESSION_SECRET || 'dgs-travel-secret-key-2024',
    resave: false,
    saveUninitialized: true, // Allow initial sessions
    cookie: { 
        secure: false, // Disable for Railway
        httpOnly: true,
        maxAge: 30 * 60 * 1000, // 30 minutes
        sameSite: 'lax' // Less strict
    },
    name: 'dgs.sid'
}));

// Handlebars setup
const hbs = engine({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: [
        path.join(__dirname, 'views/partials')
    ],
    helpers: {
        json: function(context) {
            return JSON.stringify(context);
        },
        add: function(a, b) {
            return a + b;
        },
        eq: function(a, b) {
            return a === b;
        }
    }
});

app.engine('handlebars', hbs);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Ensure partials directory exists
const partialsDir = path.join(__dirname, 'views/partials');
if (!fs.existsSync(partialsDir)) {
    fs.mkdirSync(partialsDir, { recursive: true });
}

// Ensure messages partial exists
const messagesPartialPath = path.join(partialsDir, 'messages.handlebars');
if (!fs.existsSync(messagesPartialPath)) {
    fs.writeFileSync(messagesPartialPath, 
        `{{#if messages}}
        {{#each messages}}
            <div class="alert alert-{{type}} alert-dismissible fade show" role="alert">
                {{message}}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        {{/each}}
        {{/if}}`
    );
}

// Authentication middleware - Enhanced security
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.authenticated) {
        return res.redirect('/admin/login');
    }
    
    // Check session age
    if (req.session.loginTime && (Date.now() - req.session.loginTime) > 30 * 60 * 1000) {
        req.session.destroy();
        return res.redirect('/admin/login');
    }
    
    next();
};


// Routes
// Airlines management page + JSON data
app.get('/admin/airlines', requireAuth, async (req, res) => {
    const wantsJson =
        req.query.format === 'json' ||
        req.headers.accept?.includes('application/json') ||
        req.xhr;

    if (wantsJson) {
        try {
            const data = await fs.readJson(airlinesPath);
            return res.json(data);
        } catch (e) {
            return res.json({ airlines: [] });
        }
    }

    return res.render('admin/airlines', {
        layout: 'admin',
        title: 'شركات الطيران'
    });
});
// Airlines API
app.get('/api/airlines', requireAuth, async (req, res) => {
    try {
        const data = await fs.readJson(airlinesPath);
        res.json(data);
    } catch (e) {
        res.json({ airlines: [] });
    }
});

app.post('/admin/airlines', requireAuth, airlineLogoUpload.single('airlineLogo'), async (req, res) => {
    try {
        const { airlineName } = req.body;
        const logoFile = req.file;
        if (!airlineName || !logoFile) return res.status(400).json({ error: 'الاسم أو اللوغو مفقود' });
        // Move logo to /logo folder (already uploaded)
        // Save to airlines.json
        let data = { airlines: [] };
        try { data = await fs.readJson(airlinesPath); } catch {}
        data.airlines.push({ name: airlineName, logo: logoFile.filename });
        await fs.writeJson(airlinesPath, data, { spaces: 2 });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'خطأ في رفع الشركة' });
    }
});

app.delete('/admin/airlines/:name', requireAuth, async (req, res) => {
    try {
        const name = req.params.name;
        let data = { airlines: [] };
        try { data = await fs.readJson(airlinesPath); } catch {}
        const idx = data.airlines.findIndex(a => a.name === name);
        if (idx === -1) return res.status(404).json({ error: 'الشركة غير موجودة' });
        // IMPORTANT:
        // Do not delete airline logo files here.
        // Logo deletion is handled only from the dedicated image management section.
        data.airlines.splice(idx, 1);
        await fs.writeJson(airlinesPath, data, { spaces: 2 });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'خطأ في حذف الشركة' });
    }
});
app.get('/admin', requireAuth, (req, res) => {
    try {
        const tickets = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
        let airlinesData = { airlines: [] };
        try {
            airlinesData = fs.readJsonSync(airlinesPath);
        } catch (error) {
            airlinesData = { airlines: [] };
        }

        res.render('admin/dashboard', {
            layout: 'admin',
            title: 'لوحة التحكم',
            tickets: tickets.data || [],
            airlines: airlinesData.airlines || []
        });
    } catch (err) {
        console.error('Error reading data.json:', err);
        res.status(500).send('حدث خطأ في قراءة البيانات');
    }
});

// Handle file uploads
app.post('/api/upload', requireAuth, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'newsImage', maxCount: 1 }
]), (req, res) => {
    try {
        const files = req.files;
        const result = {};

        if (files.logo) {
            result.logo = path.basename(files.logo[0].path);
        }
        if (files.image) {
            result.image = path.basename(files.image[0].path);
        }
        if (files.newsImage) {
            result.newsImage = path.basename(files.newsImage[0].path);
        }

        res.json({ success: true, files: result });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Handle ticket operations
const dataPath = path.join(__dirname, '../data.json');

// Helper function to read tickets
const readTickets = () => {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is invalid, return empty structure
        return { data: [] };
    }
};

// Helper function to save tickets
const saveTickets = (tickets) => {
    fs.writeFileSync(dataPath, JSON.stringify(tickets, null, 2), 'utf8');
};

const normalizeTripDates = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return [...new Set(value.map((date) => String(date).trim()).filter(Boolean))];
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return [...new Set(parsed.map((date) => String(date).trim()).filter(Boolean))];
            }
        } catch (e) {
            return [...new Set(trimmed.split(',').map((date) => date.trim()).filter(Boolean))];
        }
        return [...new Set(trimmed.split(',').map((date) => date.trim()).filter(Boolean))];
    }
    return [];
};

// Create new ticket
app.post('/api/tickets', requireAuth, (req, res) => {
    try {
        const tickets = readTickets();
        const normalizeSelectedClasses = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value.filter(Boolean);
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) return parsed.filter(Boolean);
                } catch (e) {
                    return value.trim() ? [value.trim()] : [];
                }
            }
            return [];
        };

        const selectedClasses = normalizeSelectedClasses(req.body.selectedClasses);
        const classPrices = req.body.classPrices || {};
        const classesToCreate = selectedClasses.length ? selectedClasses : [req.body.daraga || ''];
        const tripDates = normalizeTripDates(req.body.tripDates);
        const normalizedTripDates = tripDates.length ? tripDates : normalizeTripDates(req.body.date);
        const returnTripDates = normalizeTripDates(req.body.returnTripDates);
        const normalizedReturnTripDates = returnTripDates.length ? returnTripDates : normalizeTripDates(req.body.returnDate);

        const newTickets = classesToCreate
            .filter(Boolean)
            .map((travelClass) => {
                const classPrice = classPrices[travelClass] || {};
                return {
                    id: '',
                    arlinename: req.body.arlinename || '',
                    namecity: req.body.namecity || '',
                    citycodename: req.body.citycodename || '',
                    direction: req.body.direction || '',
                    directioncode: req.body.directioncode || '',
                    date: normalizedTripDates[0] || req.body.date || '',
                    tripDates: normalizedTripDates,
                    returnDate: normalizedReturnTripDates[0] || req.body.returnDate || '',
                    returnTripDates: normalizedReturnTripDates,
                    daraga: travelClass,
                    pricego: classPrice.pricego || req.body.pricego || '',
                    priceback: classPrice.priceback || req.body.priceback || '',
                    logo: req.body.logo || '',
                    img: req.body.img || ''
                };
            });

        if (!newTickets.length) {
            return res.status(400).json({ success: false, error: 'يرجى اختيار درجة سفر واحدة على الأقل' });
        }

        // Add new tickets to the beginning of the array
        tickets.data.unshift(...newTickets);
        saveTickets(tickets);
        
        res.json({ 
            success: true, 
            message: `تمت إضافة ${newTickets.length} تذكرة بنجاح`,
            tickets: newTickets
        });
    } catch (error) {
        console.error('Error adding ticket:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء إضافة التذكرة' });
    }
});

// Update ticket
app.put('/api/tickets/:id', requireAuth, (req, res) => {
    try {
        const tickets = readTickets();
        const id = parseInt(req.params.id);
        const normalizedBody = { ...req.body };
        const tripDates = normalizeTripDates(normalizedBody.tripDates);
        const fallbackTripDates = tripDates.length ? tripDates : normalizeTripDates(normalizedBody.date);
        if (fallbackTripDates.length) {
            normalizedBody.tripDates = fallbackTripDates;
            normalizedBody.date = fallbackTripDates[0];
        } else if (Object.prototype.hasOwnProperty.call(normalizedBody, 'tripDates')) {
            normalizedBody.tripDates = [];
            normalizedBody.date = normalizedBody.date || '';
        }

        const returnTripDates = normalizeTripDates(normalizedBody.returnTripDates);
        const fallbackReturnTripDates = returnTripDates.length ? returnTripDates : normalizeTripDates(normalizedBody.returnDate);
        if (fallbackReturnTripDates.length) {
            normalizedBody.returnTripDates = fallbackReturnTripDates;
            normalizedBody.returnDate = fallbackReturnTripDates[0];
        } else if (Object.prototype.hasOwnProperty.call(normalizedBody, 'returnTripDates')) {
            normalizedBody.returnTripDates = [];
            normalizedBody.returnDate = normalizedBody.returnDate || '';
        }
        
        if (id >= 0 && id < tickets.data.length) {
            const oldTicket = tickets.data[id];
            const updatedTicket = { ...oldTicket, ...normalizedBody };
            
            tickets.data[id] = updatedTicket;
            saveTickets(tickets);
            res.json({ success: true, message: 'تم تحديث التذكرة بنجاح' });
        } else {
            res.status(404).json({ success: false, error: 'التذكرة غير موجودة' });
        }
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحديث التذكرة' });
    }
});

// Helper function to delete file safely
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        return false;
    }
};

// Delete ticket
app.delete('/api/tickets/:id', requireAuth, (req, res) => {
    try {
        const tickets = readTickets();
        const id = parseInt(req.params.id);
        
        if (id >= 0 && id < tickets.data.length) {
            // Remove the ticket from the array
            tickets.data.splice(id, 1);
            saveTickets(tickets);
            
            res.json({ success: true, message: 'تم حذف التذكرة بنجاح' });
        } else {
            res.status(404).json({ success: false, error: 'التذكرة غير موجودة' });
        }
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف التذكرة' });
    }
});

app.get('/admin/images', requireAuth, (req, res) => {
    try {
        res.render('admin/images', {
            layout: 'admin',
            title: 'التحكم في الصور'
        });
    } catch (err) {
        console.error('Error rendering images page:', err);
        res.status(500).send('حدث خطأ في عرض الصفحة');
    }
});

app.get('/api/images/assets', requireAuth, (req, res) => {
    try {
        const tickets = readTickets();
        let airlinesData = { airlines: [] };
        try {
            airlinesData = fs.readJsonSync(airlinesPath);
        } catch (error) {
            airlinesData = { airlines: [] };
        }

        const logoDir = path.join(__dirname, '../logo');
        const imgDir = path.join(__dirname, '../img');

        const getImageFiles = (dirPath) => {
            if (!fs.existsSync(dirPath)) return [];
            return fs.readdirSync(dirPath).filter((fileName) => {
                const ext = path.extname(fileName).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            });
        };

        const logoFiles = getImageFiles(logoDir).map((fileName) => {
            const usedInTickets = (tickets.data || []).filter((t) => (t.logo || '').trim() === fileName).length;
            const usedInAirlines = (airlinesData.airlines || []).filter((a) => (a.logo || '').trim() === fileName).length;
            return {
                fileName,
                url: `/logo/${fileName}`,
                usedInTickets,
                usedInAirlines,
                totalUsage: usedInTickets + usedInAirlines
            };
        });

        const destinationFiles = getImageFiles(imgDir).map((fileName) => {
            const usedInTickets = (tickets.data || []).filter((t) => (t.img || '').trim() === fileName).length;
            return {
                fileName,
                url: `/img/${fileName}`,
                usedInTickets,
                totalUsage: usedInTickets
            };
        });

        res.json({
            success: true,
            logos: logoFiles,
            destinations: destinationFiles
        });
    } catch (error) {
        console.error('Error reading image assets:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء قراءة الصور' });
    }
});

app.delete('/api/images/assets', requireAuth, (req, res) => {
    try {
        const { type, fileName } = req.body || {};
        const normalizedType = (type || '').trim();
        const normalizedFileName = path.basename((fileName || '').trim());

        if (!normalizedType || !normalizedFileName) {
            return res.status(400).json({ success: false, error: 'البيانات غير مكتملة' });
        }

        if (!['logo', 'destination'].includes(normalizedType)) {
            return res.status(400).json({ success: false, error: 'نوع الصورة غير صالح' });
        }

        const targetDir = normalizedType === 'logo'
            ? path.join(__dirname, '../logo')
            : path.join(__dirname, '../img');
        const targetPath = path.join(targetDir, normalizedFileName);

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ success: false, error: 'الصورة غير موجودة' });
        }

        deleteFile(targetPath);
        return res.json({ success: true, message: 'تم حذف الصورة بنجاح' });
    } catch (error) {
        console.error('Error deleting image asset:', error);
        return res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف الصورة' });
    }
});

app.get('/admin/login', (req, res) => {
    const token = generateCSRFToken();
    csrfTokens.set(req.sessionID || 'login', token);
    res.render('admin/login', { 
        layout: false,
        csrfToken: token 
    });
});

app.post('/admin/login', (req, res) => {
    // Enhanced security - Use environment variables or encrypted config
    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || 'admin123';
    
    if (req.body.username === adminUsername && req.body.password === adminPassword) {
        req.session.authenticated = true;
        req.session.loginTime = Date.now();
        res.redirect('/admin');
    } else {
        // Generic error message - don't reveal what's wrong
        res.render('admin/login', { 
            layout: false, 
            error: 'بيانات الدخول غير صحيحة',
            csrfToken: generateCSRFToken()
        });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// API Route to get all tickets
app.get('/api/tickets', requireAuth, (req, res) => {
    try {
        const tickets = readTickets();
        res.json(tickets);
    } catch (error) {
        console.error('Error reading tickets:', error);
        res.status(500).json({ success: false, error: 'فشل في قراءة البيانات' });
    }
});

// API Route to count files in directory
app.get('/api/files-count/:folder', requireAuth, (req, res) => {
    try {
        const folder = req.params.folder;
        const folderPath = path.join(__dirname, '..', folder);
        
        if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath);
            const count = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            }).length;
            res.json({ count: count });
        } else {
            res.json({ count: 0 });
        }
    } catch (error) {
        console.error('Error counting files:', error);
        res.status(500).json({ count: 0 });
    }
});

// API Route to download folder as ZIP
app.get('/api/download-folder/:folder', requireAuth, (req, res) => {
    try {
        const folder = req.params.folder;
        const folderPath = path.join(__dirname, '..', folder);
        
        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ error: 'المجلد غير موجود' });
        }
        
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.attachment(folder + '.zip');
        archive.pipe(res);
        
        archive.directory(folderPath, false);
        archive.finalize();
        
    } catch (error) {
        console.error('Error downloading folder:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل المجلد' });
    }
});

// API Route to download all website data
app.get('/api/download-all-data', requireAuth, (req, res) => {
    try {
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.attachment('website-data-complete.zip');
        archive.pipe(res);
        
        // إضافة ملفات JSON
        archive.file(path.join(__dirname, '../data.json'), { name: 'data.json' });
        archive.file(path.join(__dirname, '../news.json'), { name: 'news.json' });
        
        // إضافة المجلدات
        const folders = ['img', 'imgnews', 'logo'];
        folders.forEach(folder => {
            const folderPath = path.join(__dirname, '..', folder);
            if (fs.existsSync(folderPath)) {
                archive.directory(folderPath, folder);
            }
        });
        
        archive.finalize();
        
    } catch (error) {
        console.error('Error downloading all data:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل كل البيانات' });
    }
});

// ============================================
// News Management Routes
// ============================================

const newsPath = path.join(__dirname, '../news.json');

// Helper function to read news
const readNews = () => {
    try {
        const data = fs.readFileSync(newsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is invalid, return empty structure
        return { news: [] };
    }
};

// Get backup/download page
app.get('/admin/backup', requireAuth, (req, res) => {
    try {
        res.render('admin/backup', {
            layout: 'admin',
            title: 'تحميل البيانات'
        });
    } catch (err) {
        console.error('Error rendering backup page:', err);
        res.status(500).send('حدث خطأ في عرض الصفحة');
    }
});

// API Route to get all news
app.get('/api/news', requireAuth, (req, res) => {
    try {
        const newsData = readNews();
        res.json(newsData);
    } catch (error) {
        console.error('Error reading news:', error);
        res.status(500).json({ success: false, error: 'فشل في قراءة بيانات الأخبار' });
    }
});

// Get news page
app.get('/admin/news', requireAuth, (req, res) => {
    try {
        const newsData = readNews();
        res.render('admin/news', {
            layout: 'admin',
            title: 'إدارة الأخبار',
            news: newsData.news || []
        });
    } catch (err) {
        console.error('Error reading news.json:', err);
        res.status(500).send('حدث خطأ في قراءة البيانات');
    }
});

// Create new news
app.post('/api/news', requireAuth, (req, res) => {
    try {
        const newsData = readNews();
        const newNews = {
            img: req.body.img || '',
            h1: req.body.h1 || '',
            p: req.body.p || ''
        };
        
        // Add new news to the beginning of the array
        newsData.news.unshift(newNews);
        fs.writeFileSync(newsPath, JSON.stringify(newsData, null, 2), 'utf8');
        
        res.json({ 
            success: true, 
            message: 'تمت إضافة الخبر بنجاح',
            news: newNews
        });
    } catch (error) {
        console.error('Error adding news:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء إضافة الخبر' });
    }
});

// Update news
app.put('/api/news/:id', requireAuth, (req, res) => {
    try {
        const newsData = readNews();
        const id = parseInt(req.params.id);
        
        if (id >= 0 && id < newsData.news.length) {
            const oldNews = newsData.news[id];
            const updatedNews = {
                img: req.body.img !== undefined ? req.body.img : oldNews.img,
                h1: req.body.h1 !== undefined ? req.body.h1 : oldNews.h1,
                p: req.body.p !== undefined ? req.body.p : oldNews.p
            };
            
            // If image changed, delete old image file
            if (oldNews.img && oldNews.img !== updatedNews.img && oldNews.img.trim() !== '') {
                const oldImgPath = path.join(__dirname, '../imgnews', oldNews.img);
                deleteFile(oldImgPath);
            }
            
            newsData.news[id] = updatedNews;
            fs.writeFileSync(newsPath, JSON.stringify(newsData, null, 2), 'utf8');
            res.json({ success: true, message: 'تم تحديث الخبر بنجاح' });
        } else {
            res.status(404).json({ success: false, error: 'الخبر غير موجود' });
        }
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحديث الخبر' });
    }
});

// Delete news
app.delete('/api/news/:id', requireAuth, (req, res) => {
    try {
        const newsData = readNews();
        const id = parseInt(req.params.id);
        
        if (id >= 0 && id < newsData.news.length) {
            const newsToDelete = newsData.news[id];
            
            // Delete associated image file
            if (newsToDelete.img && newsToDelete.img.trim() !== '') {
                const imgPath = path.join(__dirname, '../imgnews', newsToDelete.img);
                deleteFile(imgPath);
            }
            
            // Remove the news from the array
            newsData.news.splice(id, 1);
            fs.writeFileSync(newsPath, JSON.stringify(newsData, null, 2), 'utf8');
            
            res.json({ success: true, message: 'تم حذف الخبر والصورة المرتبطة به بنجاح' });
        } else {
            res.status(404).json({ success: false, error: 'الخبر غير موجود' });
        }
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف الخبر' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/admin`);
});
