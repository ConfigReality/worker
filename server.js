const {spawn} = require('child_process');
const {fastify} = require('fastify');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

const cloudflared = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

cloudflared.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

cloudflared.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

cloudflared.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});

const app = fastify();

app.get('/', async (request, reply) => {
    return {hello: 'world'};
});

app.listen({port: PORT, host: HOST}, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});