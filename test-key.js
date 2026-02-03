
const API_KEY = "AIzaSyCyEup-uEZmSeNpROB3bIj3XCt0KcGgnAw";

async function testConnection() {
    const model = "gemini-2.5-flash"; // User suggestion
    console.log(`Testing Gemini Connection with ${model}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        console.log("Response Status:", response.status);

        if (!response.ok) {
            const text = await response.text();
            console.log("Error Body:", text);
        } else {
            const data = await response.json();
            console.log("Success! Data received.");
            console.log(data);
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}

testConnection();
