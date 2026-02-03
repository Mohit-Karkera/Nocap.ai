
const API_KEY = "AIzaSyCyEup-uEZmSeNpROB3bIj3XCt0KcGgnAw";

async function testModel(modelName, version) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${API_KEY}`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
        });
        console.log(`${version}/${modelName}: ${response.status} ${response.statusText}`);
        return response.status;
    } catch (e) {
        console.log(`${version}/${modelName}: Error ${e.message}`);
        return 0;
    }
}

async function run() {
    const models = [
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    const versions = ["v1", "v1beta"];

    console.log("Testing models on both versions...");
    for (const v of versions) {
        for (const m of models) {
            await testModel(m, v);
        }
    }
}

run();
