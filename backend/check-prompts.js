import fetch from 'node-fetch';

async function checkPrompts() {
    try {
        const res = await fetch('http://localhost:5000/api/prompts');
        const data = await res.json();
        console.log(JSON.stringify(data.data.prompts[0], null, 2));
    } catch (err) {
        console.error(err);
    }
}

checkPrompts();
