const form = document.getElementById('upload-form');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    messageDiv.innerHTML = 'Processing... please wait!';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'obfuscated-code.zip'; // You can name this based on the original file
            link.click();
            messageDiv.innerHTML = 'Your file has been obfuscated and downloaded!';
        } else {
            messageDiv.innerHTML = 'Error in processing your file. Please try again.';
        }
    } catch (error) {
        messageDiv.innerHTML = 'An error occurred. Please try again later.';
    }
});
