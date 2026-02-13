// Configuration
let GEMINI_API_KEY = localStorage.getItem('Gemini_API_Key') || '';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

// Global variables
let websiteData = {
    pages: [],
    css: '',
    js: ''
};
let editor = null;
let enhancedPromptText = '';

// Check API key on load
window.addEventListener('DOMContentLoaded', function() {
    if (!GEMINI_API_KEY) {
        const apiKey = prompt('Gemini API Key enter karein:\n\nAPI key kaise milegi:\n1. https://aistudio.google.com/app/apikey par jao\n2. "Create API Key" click karo\n3. API key copy karo');
        if (apiKey && apiKey.trim()) {
            GEMINI_API_KEY = apiKey.trim();
            localStorage.setItem('gemini_api_key', GEMINI_API_KEY);
            alert('API key save ho gayi! Ab website generate kar sakte ho.');
        } else {
            alert('API key required hai. Page refresh karke dobara try karein.');
        }
    }
    
    // Load saved website data if exists
    const savedData = localStorage.getItem('website_data');
    if (savedData) {
        try {
            websiteData = JSON.parse(savedData);
            if (websiteData.pages && websiteData.pages.length > 0) {
                displayWebsite();
                document.getElementById('step3').style.display = 'block';
            }
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
});

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('codeEditor'), {
        value: '',
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true }
    });
});

// Step 1: Enhance Prompt
async function enhancePrompt() {
    const userPrompt = document.getElementById('userPrompt').value.trim();
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const websiteImage = document.getElementById('websiteImage').files[0];

    if (!userPrompt && !websiteUrl && !websiteImage) {
        alert('Pehle apna idea, website URL, ya image enter karein!');
        return;
    }

    showLoader('Prompt enhance ho raha hai...');

    try {
        let promptText = userPrompt;

        // If URL provided, add to prompt
        if (websiteUrl) {
            promptText += `\n\nReference Website URL: ${websiteUrl}\nAnalyze this website and create a similar but improved version.`;
        }

        // If image provided, convert to base64
        if (websiteImage) {
            const base64Image = await fileToBase64(websiteImage);

            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Analyze this website screenshot and describe it in detail for recreation. Include: layout structure, color scheme, sections, navigation style, content areas, design elements, typography, and any special features you can see. Then enhance it with modern improvements.\n\nUser's additional requirements: ${userPrompt || 'Create an improved version'}`
                            },
                            {
                                inline_data: {
                                    mime_type: websiteImage.type,
                                    data: base64Image.split(',')[1]
                                }
                            }
                        ]
                    }]
                })
            });

            const data = await response.json();
            if (!response.ok || !data.candidates || !data.candidates[0]) {
                throw new Error(data.error?.message || 'API request failed');
            }
            enhancedPromptText = data.candidates[0].content.parts[0].text;
        } else {
            // Text-only prompt enhancement
            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a prompt enhancement expert for FRONTEND web development.\n\nEnhance this website idea with detailed specifications:\n${promptText}\n\nIMPORTANT RULES:\n- Focus ONLY on frontend features (HTML, CSS, JavaScript)\n- DO NOT mention: backend, server, database, API, PHP, Node.js, authentication, user accounts\n- Specify: layout structure, color schemes, sections, UI components, animations, responsive design\n- Include: specific page names needed, content for each section, design style (modern/minimal/corporate etc)\n- Mention: which icons, images, forms, interactive elements to include\n\nProvide a clear, detailed frontend-only specification.`
                        }]
                    }]
                })
            });

            const data = await response.json();
            if (!response.ok || !data.candidates || !data.candidates[0]) {
                throw new Error(data.error?.message || 'API request failed');
            }
            enhancedPromptText = data.candidates[0].content.parts[0].text;
        }

        document.getElementById('enhancedPrompt').textContent = enhancedPromptText;
        document.getElementById('step2').style.display = 'block';
        document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message + '\n\nKripya API key check karein!');
    } finally {
        hideLoader();
    }
}

// Copy enhanced prompt
function copyPrompt() {
    const promptText = document.getElementById('enhancedPrompt').innerText;
    navigator.clipboard.writeText(promptText).then(() => {
        alert('Prompt copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Step 2: Generate Website
async function generateWebsite() {
    showLoader('Website generate ho rahi hai... Thoda wait karein...');

    // Get updated prompt text from editable div
    enhancedPromptText = document.getElementById('enhancedPrompt').innerText;

    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an expert FRONTEND web developer. Generate a PREMIUM, PROFESSIONAL multi-page website based on this requirement:

${enhancedPromptText}

CRITICAL REQUIREMENTS:
- Implement EVERYTHING mentioned in the requirement above
- Generate AT LEAST 4-6 separate HTML pages: index.html, about.html, services.html, contact.html, portfolio.html, testimonials.html
- Add MORE pages based on requirement (gallery.html, blog.html, pricing.html, team.html, etc)
- Each page MUST be complete with full HTML structure
- Each page MUST have inline CSS in <style> tags with PREMIUM modern design
- Each page MUST have inline JavaScript in <script> tags for interactivity
- All pages MUST have identical sticky navigation menu linking to ALL pages
- Use Font Awesome CDN: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css
- Use Unsplash images: https://source.unsplash.com/800x600/?keyword
- Make fully responsive with mobile-first design
- ABSOLUTELY NO backend code, NO PHP, NO server-side code, NO database mentions

PREMIUM FEATURES TO ADD:
- Hero section with gradient background and call-to-action buttons
- Smooth scroll animations and fade-in effects
- Hover effects on all interactive elements
- Image galleries with lightbox effect (pure JavaScript)
- Contact forms with client-side validation and success messages
- Testimonial carousel/slider (pure JavaScript)
- Pricing tables with hover effects
- Team member cards with social media links
- Footer with social media icons and links
- Mobile hamburger menu (pure JavaScript)
- Scroll-to-top button
- Loading animations
- Modern color gradients and shadows
- Professional typography
- Stats/counter section with animations
- FAQ accordion section
- Newsletter signup form
- Google Maps embed (if location mentioned)

DESIGN STYLE:
- Use modern color schemes (gradients, vibrant colors)
- Add box-shadows and border-radius for depth
- Use CSS Grid and Flexbox for layouts
- Add smooth transitions (0.3s ease)
- Professional spacing and padding
- Consistent design across all pages

Return ONLY this JSON format (no markdown, no extra text):
{
  "pages": [
    {"name": "index.html", "content": "COMPLETE HTML CODE"},
    {"name": "about.html", "content": "COMPLETE HTML CODE"},
    {"name": "services.html", "content": "COMPLETE HTML CODE"},
    {"name": "contact.html", "content": "COMPLETE HTML CODE"},
    {"name": "portfolio.html", "content": "COMPLETE HTML CODE"}
  ],
  "css": "",
  "js": ""
}`
                    }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok || !data.candidates || !data.candidates[0]) {
            throw new Error(data.error?.message || 'API request failed');
        }

        let websiteCode = data.candidates[0].content.parts[0].text;

        // Extract JSON from response
        if (websiteCode.includes('```json')) {
            websiteCode = websiteCode.split('```json')[1].split('```')[0].trim();
        } else if (websiteCode.includes('```')) {
            websiteCode = websiteCode.split('```')[1].split('```')[0].trim();
        }

        try {
            websiteData = JSON.parse(websiteCode);

            // Force multiple pages if only one page generated
            if (websiteData.pages && websiteData.pages.length === 1) {
                const basePage = websiteData.pages[0].content;
                websiteData.pages = [
                    { name: 'index.html', content: basePage },
                    { name: 'about.html', content: basePage.replace(/<title>.*?<\/title>/, '<title>About Us</title>').replace(/<h1>.*?<\/h1>/, '<h1>About Us</h1>') },
                    { name: 'services.html', content: basePage.replace(/<title>.*?<\/title>/, '<title>Services</title>').replace(/<h1>.*?<\/h1>/, '<h1>Our Services</h1>') },
                    { name: 'contact.html', content: basePage.replace(/<title>.*?<\/title>/, '<title>Contact</title>').replace(/<h1>.*?<\/h1>/, '<h1>Contact Us</h1>') }
                ];
            }
        } catch (e) {
            // If JSON parsing fails, create default structure
            websiteData = {
                pages: [
                    {
                        name: 'index.html',
                        content: generateFallbackWebsite(enhancedPromptText)
                    }
                ],
                css: '',
                js: ''
            };
        }

        // Ensure pages exist
        if (!websiteData.pages || websiteData.pages.length === 0) {
            websiteData.pages = [{
                name: 'index.html',
                content: generateFallbackWebsite(enhancedPromptText)
            }];
        }

        displayWebsite();
        
        // Save to localStorage
        localStorage.setItem('website_data', JSON.stringify(websiteData));

    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message + '\n\nKripya API key check karein!');
    } finally {
        hideLoader();
    }
}

// Modify Website
async function modifyWebsite() {
    const modifyPrompt = document.getElementById('modifyPrompt').value.trim();

    if (!modifyPrompt) {
        alert('Pehle modification details enter karein!');
        return;
    }

    showLoader('Website modify ho rahi hai...');

    try {
        const currentPageIndex = document.getElementById('pageSelector').value;
        const currentPage = websiteData.pages[currentPageIndex];

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a frontend web developer. Modify this HTML page EXACTLY as requested by the user.

Current HTML Code:
${currentPage.content}

User's Modification Request: ${modifyPrompt}

CRITICAL INSTRUCTIONS:
- Read the user request CAREFULLY and implement EXACTLY what they asked
- If user says "change color to blue", change the color to blue
- If user says "add contact form", add a working contact form
- If user says "remove section", remove that section
- If user says "make navbar sticky", make navbar position: sticky
- DO NOT add features user didn't ask for
- DO NOT remove features user didn't mention
- Keep the same HTML structure unless user asks to change it
- Keep all CDN links (Font Awesome, etc) intact
- Return ONLY the complete modified HTML code
- NO explanations, NO markdown, ONLY HTML code
- Make sure the code is error-free and works properly

IMPLEMENT THE USER REQUEST EXACTLY AS STATED.`
                    }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok || !data.candidates || !data.candidates[0]) {
            throw new Error(data.error?.message || 'API request failed');
        }

        let modifiedCode = data.candidates[0].content.parts[0].text;

        // Extract HTML from response
        if (modifiedCode.includes('```html')) {
            modifiedCode = modifiedCode.split('```html')[1].split('```')[0].trim();
        } else if (modifiedCode.includes('```')) {
            modifiedCode = modifiedCode.split('```')[1].split('```')[0].trim();
        }

        // Update the page
        websiteData.pages[currentPageIndex].content = modifiedCode;

        // Refresh display
        switchPage();
        updateEditor('html');
        
        // Save to localStorage
        localStorage.setItem('website_data', JSON.stringify(websiteData));
        
        alert('Website successfully modify ho gayi!');
        document.getElementById('modifyPrompt').value = '';

    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        hideLoader();
    }
}

// Generate fallback website if AI fails
function generateFallbackWebsite(prompt) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
        }
        nav {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        nav ul {
            list-style: none;
            display: flex;
            gap: 2rem;
        }
        nav a {
            color: white;
            text-decoration: none;
            font-weight: 500;
            transition: opacity 0.3s;
        }
        nav a:hover { opacity: 0.8; }
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 20px;
            text-align: center;
        }
        .hero h1 {
            font-size: 3em;
            margin-bottom: 20px;
            animation: fadeInUp 1s;
        }
        .hero p {
            font-size: 1.3em;
            margin-bottom: 30px;
            animation: fadeInUp 1s 0.2s backwards;
        }
        .btn {
            display: inline-block;
            padding: 15px 40px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            transition: transform 0.3s;
            animation: fadeInUp 1s 0.4s backwards;
        }
        .btn:hover { transform: translateY(-3px); }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 20px;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        .feature-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }
        .feature-card:hover {
            transform: translateY(-10px);
        }
        .feature-card i {
            font-size: 3em;
            color: #667eea;
            margin-bottom: 20px;
        }
        .feature-card h3 {
            margin-bottom: 15px;
            color: #333;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        .gallery img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            border-radius: 10px;
            transition: transform 0.3s;
        }
        .gallery img:hover {
            transform: scale(1.05);
        }
        footer {
            background: #333;
            color: white;
            text-align: center;
            padding: 30px;
            margin-top: 60px;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <nav>
        <ul>
            <li><a href="index.html"><i class="fas fa-home"></i> Home</a></li>
            <li><a href="about.html"><i class="fas fa-info-circle"></i> About</a></li>
            <li><a href="services.html"><i class="fas fa-cogs"></i> Services</a></li>
            <li><a href="contact.html"><i class="fas fa-envelope"></i> Contact</a></li>
        </ul>
    </nav>

    <div class="hero">
        <h1><i class="fas fa-rocket"></i> Welcome to Our Website</h1>
        <p>${prompt.substring(0, 150)}</p>
        <a href="#features" class="btn">Explore More</a>
    </div>

    <div class="container" id="features">
        <h2 style="text-align: center; font-size: 2.5em; margin-bottom: 20px;">Our Features</h2>
        <div class="features">
            <div class="feature-card">
                <i class="fas fa-star"></i>
                <h3>Premium Quality</h3>
                <p>High-quality services tailored to your needs</p>
            </div>
            <div class="feature-card">
                <i class="fas fa-bolt"></i>
                <h3>Fast Performance</h3>
                <p>Lightning-fast delivery and execution</p>
            </div>
            <div class="feature-card">
                <i class="fas fa-shield-alt"></i>
                <h3>Secure & Safe</h3>
                <p>Your data is protected with top security</p>
            </div>
        </div>

        <h2 style="text-align: center; font-size: 2.5em; margin: 60px 0 20px;">Gallery</h2>
        <div class="gallery">
            <img src="https://source.unsplash.com/800x600/?business,1" alt="Image 1">
            <img src="https://source.unsplash.com/800x600/?technology,2" alt="Image 2">
            <img src="https://source.unsplash.com/800x600/?office,3" alt="Image 3">
            <img src="https://source.unsplash.com/800x600/?team,4" alt="Image 4">
        </div>
    </div>

    <footer>
        <p><i class="fas fa-heart"></i> Made with AI Website Generator</p>
        <p>&copy; 2024 All Rights Reserved</p>
    </footer>

    <script>
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    </script>
</body>
</html>`;
}

// Display generated website
function displayWebsite() {
    document.getElementById('step3').style.display = 'block';
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });

    // Show modify button
    document.getElementById('modifyBtn').style.display = 'flex';

    // Populate page selector
    const pageSelector = document.getElementById('pageSelector');
    pageSelector.innerHTML = '';
    websiteData.pages.forEach((page, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = page.name;
        pageSelector.appendChild(option);
    });

    // Display pages list
    const pagesList = document.getElementById('pagesList');
    pagesList.innerHTML = '';
    websiteData.pages.forEach((page, index) => {
        const card = document.createElement('div');
        card.className = 'page-card';
        card.innerHTML = `
            <h3><i class="fas fa-file-code"></i> ${page.name}</h3>
            <p>Click to view in preview</p>
        `;
        card.onclick = () => {
            pageSelector.value = index;
            switchPage();
            switchTab('preview');
        };
        pagesList.appendChild(card);
    });

    // Load first page
    switchPage();
    updateEditor('html');
}

// Switch between pages in preview
function switchPage() {
    const index = document.getElementById('pageSelector').value;
    const page = websiteData.pages[index];
    const preview = document.getElementById('preview');

    const blob = new Blob([page.content], { type: 'text/html' });
    preview.src = URL.createObjectURL(blob);
}

// Switch between tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Switch file in editor
function switchFile() {
    const fileType = document.getElementById('fileSelector').value;
    updateEditor(fileType);
}

// Update editor content
function updateEditor(fileType) {
    if (!editor) return;

    let content = '';
    let language = 'html';

    if (fileType === 'html') {
        const index = document.getElementById('pageSelector').value;
        content = websiteData.pages[index].content;
        language = 'html';
    } else if (fileType === 'css') {
        content = websiteData.css || '/* No shared CSS */';
        language = 'css';
    } else if (fileType === 'js') {
        content = websiteData.js || '// No shared JavaScript';
        language = 'javascript';
    }

    monaco.editor.setModelLanguage(editor.getModel(), language);
    editor.setValue(content);
}

// Update preview from editor
function updatePreview() {
    const fileType = document.getElementById('fileSelector').value;
    const content = editor.getValue();

    if (fileType === 'html') {
        const index = document.getElementById('pageSelector').value;
        websiteData.pages[index].content = content;
        switchPage();
    } else if (fileType === 'css') {
        websiteData.css = content;
    } else if (fileType === 'js') {
        websiteData.js = content;
    }
}

// Download website
function downloadWebsite() {
    // Download each page as separate file
    websiteData.pages.forEach(page => {
        const blob = new Blob([page.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = page.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Download CSS if exists
    if (websiteData.css && websiteData.css.trim()) {
        const blob = new Blob([websiteData.css], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'style.css';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Download JS if exists
    if (websiteData.js && websiteData.js.trim()) {
        const blob = new Blob([websiteData.js], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    alert(`${websiteData.pages.length} files download ho rahi hain!`);
}

// Loader functions
function showLoader(text) {
    document.getElementById('loaderText').textContent = text;
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// Reset Generator - Nayi website banane ke liye
function resetGenerator() {
    if (confirm('Nayi website banani hai? Current website ka data clear ho jayega.')) {
        // Reset all data
        websiteData = {
            pages: [],
            css: '',
            js: ''
        };
        enhancedPromptText = '';
        
        // Clear localStorage
        localStorage.removeItem('website_data');

        // Clear inputs
        document.getElementById('userPrompt').value = '';
        document.getElementById('websiteUrl').value = '';
        document.getElementById('websiteImage').value = '';
        document.getElementById('modifyPrompt').value = '';
        document.getElementById('enhancedPrompt').textContent = '';

        // Hide steps
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step3').style.display = 'none';
        document.getElementById('modifyBtn').style.display = 'none';

        // Scroll to top
        document.getElementById('step1').scrollIntoView({ behavior: 'smooth' });

        alert('Ready! Nayi website banao.');
    }
}
