const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Hugging Face API configuration
const HF_API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct";
const HF_API_KEY = ""; // Replace with your Hugging Face API key

// Route for analyzing text
app.post('/api/analyze', async (req, res) => {
    const { content } = req.body;

    // Validate input
    if (!content) {
        return res.status(400).json({ message: 'Content is missing!' });
    }

    try {
        // Send the request to the Hugging Face Inference API
        const response = await axios.post(
            HF_API_URL,
            { inputs: content },
            {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`
                }
            }
        );

        // Parse the response
        if (response.status === 200) {
            const result = response.data;
            return res.json({ output: result[0]?.generated_text || "No generated text found" });
        } else {
            return res.status(response.status).json({ message: `API error: ${response.data}` });
        }
    } catch (error) {
        return res.status(500).json({ message: `Error occurred: ${error.message}` });
    }
});

// Run the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
