const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS configuration
app.use(cors());

// Set up file upload handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Serve the frontend (HTML) for the user to upload files
app.use(express.static('public'));

// Route for handling file upload and obfuscation
app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const obfuscatedPath = path.join(__dirname, 'uploads', 'obfuscated-' + req.file.filename);

    // Read the uploaded file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading file.');

        // Obfuscate the file content
        const obfuscatedCode = JavaScriptObfuscator.obfuscate(data).getObfuscatedCode();

        // Save the obfuscated code to a new file
        fs.writeFile(obfuscatedPath, obfuscatedCode, 'utf8', (err) => {
            if (err) return res.status(500).send('Error saving obfuscated file.');

            // Send the obfuscated file back to the user
            res.download(obfuscatedPath, 'obfuscated-' + req.file.filename, (err) => {
                if (err) return res.status(500).send('Error sending the file.');

                // Clean up the uploaded and obfuscated files
                fs.unlinkSync(filePath);
                fs.unlinkSync(obfuscatedPath);
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
