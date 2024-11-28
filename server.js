const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const cors = require('cors');
const unzipper = require('unzipper'); // Library to handle ZIP extraction
const archiver = require('archiver'); // Library to zip files

const app = express();
const port = 3000;

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// CORS configuration
app.use(cors());

// Set up file upload handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Serve the frontend (HTML) for the user to upload files
app.use(express.static('public'));

// Function to recursively obfuscate JavaScript files in a directory
function obfuscateFilesRecursively(dirPath, outputDirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const outputFilePath = path.join(outputDirPath, file);

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // If it's a directory, create the corresponding folder in outputDir and recurse
            if (!fs.existsSync(outputFilePath)) {
                fs.mkdirSync(outputFilePath);
            }
            obfuscateFilesRecursively(fullPath, outputFilePath); // Recurse into subdirectory
        } else if (path.extname(file) === '.js') {
            // Only obfuscate .js files
            const fileContent = fs.readFileSync(fullPath, 'utf8');

            // Obfuscate with all necessary settings
            const obfuscatedCode = JavaScriptObfuscator.obfuscate(fileContent, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 1,
                debugProtection: true,
                debugProtectionInterval: 1000,
                disableConsoleOutput: true,
                domainLock: [],
                forceTransformStrings: [],
                identifierNamesGenerator: 'hexadecimal',
                identifiersPrefix: '',
                selfDefending: true,
                simplify: true,
                stringArray: true,
                stringArrayCallsTransform: true,
                stringArrayCallsTransformThreshold: 0.5,
                stringArrayThreshold: 0.75,
            }).getObfuscatedCode();

            // Save the obfuscated code in the corresponding directory
            fs.writeFileSync(outputFilePath, obfuscatedCode, 'utf8');
        }
    });
}

// Route for handling ZIP file upload, extracting, obfuscating, and zipping
app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = path.join(uploadsDir, req.file.filename);

    // Handle the ZIP file
    if (path.extname(req.file.filename) === '.zip') {
        // Extract the ZIP file to a temporary directory
        fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: uploadsDir }))
            .on('close', () => {
                // Now we process the files inside the ZIP
                const tempExtractDir = path.join(uploadsDir, path.basename(req.file.filename, '.zip'));

                // Create the output directory if it doesn't exist
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir);
                }

                // Recursively obfuscate files in the extracted directory
                obfuscateFilesRecursively(tempExtractDir, outputDir);

                // Create a ZIP archive of the obfuscated files
                const outputZip = fs.createWriteStream(path.join(outputDir, 'obfuscated_files.zip'));
                const archive = archiver('zip', { zlib: { level: 9 } });

                outputZip.on('close', () => {
                    // Send the ZIP file back to the user
                    res.download(path.join(outputDir, 'obfuscated_files.zip'), 'obfuscated_files.zip', (err) => {
                        if (err) {
                            console.log('Error sending file:', err);
                            return res.status(500).send('Error sending the file.');
                        }

                        // Clean up: Remove original and obfuscated files
                        fs.unlinkSync(filePath); // Remove the uploaded zip file
                        fs.rmdirSync(tempExtractDir, { recursive: true }); // Remove extracted files
                    });
                });

                archive.pipe(outputZip);
                archive.directory(outputDir, false); // Add the entire output directory to the zip
                archive.finalize();
            });
    } else {
        return res.status(400).send('Please upload a ZIP file.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
