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
app.get('/admin', requireAuth, (req, res) => {
    try {
        const tickets = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
        res.render('admin/dashboard', {
            layout: 'admin',
            title: 'لوحة التحكم',
            tickets: tickets.data || []
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

// Create new ticket
app.post('/api/tickets', requireAuth, (req, res) => {
    try {
        const tickets = readTickets();
        const newTicket = {
            id: '',
            arlinename: req.body.arlinename || '',
            namecity: req.body.namecity || '',
            citycodename: req.body.citycodename || '',
            direction: req.body.direction || '',
            directioncode: req.body.directioncode || '',
            date: req.body.date || '',
            daraga: req.body.daraga || '',
            daysfly: req.body.daysfly || '',
            pricego: req.body.pricego || '',
            priceback: req.body.priceback || '',
            logo: req.body.logo || '',
            img: req.body.img || ''
        };
        
        // Add new ticket to the beginning of the array
        tickets.data.unshift(newTicket);
        saveTickets(tickets);
        
        res.json({ 
            success: true, 
            message: 'تمت إضافة التذكرة بنجاح',
            ticket: newTicket
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
        
        if (id >= 0 && id < tickets.data.length) {
            const oldTicket = tickets.data[id];
            const updatedTicket = { ...oldTicket, ...req.body };
            
            // If logo changed, delete old logo file
            if (oldTicket.logo && oldTicket.logo !== updatedTicket.logo && oldTicket.logo.trim() !== '') {
                const oldLogoPath = path.join(__dirname, '../logo', oldTicket.logo);
                deleteFile(oldLogoPath);
            }
            
            // If image changed, delete old image file
            if (oldTicket.img && oldTicket.img !== updatedTicket.img && oldTicket.img.trim() !== '') {
                const oldImgPath = path.join(__dirname, '../img', oldTicket.img);
                deleteFile(oldImgPath);
            }
            
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
            const ticketToDelete = tickets.data[id];
            
            // Delete associated logo file
            if (ticketToDelete.logo && ticketToDelete.logo.trim() !== '') {
                const logoPath = path.join(__dirname, '../logo', ticketToDelete.logo);
                deleteFile(logoPath);
            }
            
            // Delete associated image file
            if (ticketToDelete.img && ticketToDelete.img.trim() !== '') {
                const imgPath = path.join(__dirname, '../img', ticketToDelete.img);
                deleteFile(imgPath);
            }
            
            // Remove the ticket from the array
            tickets.data.splice(id, 1);
            saveTickets(tickets);
            
            res.json({ success: true, message: 'تم حذف التذكرة والصور المرتبطة بها بنجاح' });
        } else {
            res.status(404).json({ success: false, error: 'التذكرة غير موجودة' });
        }
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف التذكرة' });
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
