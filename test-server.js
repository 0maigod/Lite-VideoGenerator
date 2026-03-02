async function test() {
    try {
        const response = await fetch('http://localhost:3002/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: { value: 'A quick sketch of a futuristic city' } })
        });
        const data = await response.json();
        if (data.success && data.results) {
            console.log("Success! Received models data:");
            for (const r of data.results) {
                console.log(`- Model: ${r.model} | Success: ${r.success} | Image Base64 length: ${r.data ? r.data.length : 0}`);
            }
        } else {
            console.error(data);
        }
    } catch (e) {
        console.error(e);
    }
}
test();
