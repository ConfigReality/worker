// const {spawn} = require('child_process');
// const {fastify} = require('fastify');
const amqp = require('amqp');
const dotenv = require('dotenv');
const pg = require('pg');
const fastq = require('fastq');
const { Telegraf } = require('telegraf');
const { request } = require('undici')
const fs = require('fs');
const { mkdir } = require('fs/promises');
const { join } = require('path');
const { exec } = require('child_process');

const outDir = join(__dirname, 'photos')
const libDir = join(__dirname, 'lib')

dotenv.config();

const client = amqp.createConnection({
    url:process.env.QUEUE_CONNECTION_STRING,
})

const pgClient = new pg.Client({
    connectionString: process.env.PG_CONNECTION_STRING,
    keepAlive: true
});

pgClient.connect();
pgClient.on('error', (err) => {
    console.error('Database error', err)
    // reconnect
    process.exit(1)
})
const bot = new Telegraf(process.env.BOT_TOKEN);


function _promiseFromChildProcess(child) {
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}

const _execute = async (id) => {
    const source = `${outDir}/${id}/${id}.usdz`;
    await _promiseFromChildProcess(exec(
        `cd ${libDir} && chmod 777 HelloPhotogrammetry && ./HelloPhotogrammetry ${outDir}/${id}/ ${source}`,
        (error, stdout, stderr) => {
            if (error) {
                console.error(`error: ${error.message}`);
                return;
            }
                    
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        }
    ));
    return source;
}

const _downloadAndSave = async (id, imgs) => {
    const promises = imgs.map((img) => request(img));
    const responses = await Promise.all(promises);

    const dir = `${outDir}/${id}`;

    try { await mkdir(dir, { recursive: true }); }
    catch (e) { console.error(e) }

    for(let i = 0; i < responses.length; i++){
        const response = responses[i];
        const filename = imgs[i].split('/').pop();
        const file = fs.createWriteStream(`${dir}/${filename}`);
        response.body.pipe(file);
    };

    return responses;
}

const iQueue = fastq.promise(async function(task){
    console.log('Processing task', task);
    if(!task.imgs) {
        await bot.telegram.sendMessage(task.user_id, `No images found`);
        return task;
    };
    await _downloadAndSave(task.model_id, task.imgs);
    const model = await _execute(task.model_id);
    const modelMessage = await bot.telegram.sendDocument(task.user_id, { source: model });
    const linkModel = await bot.telegram.getFileLink(modelMessage.document.file_id);
    console.log(modelMessage);

    await pgClient.query(`UPDATE processing
        SET (status, model_url) = ('done', $2)
        WHERE id = $1;`, [task.id, linkModel]);
    
//     await bot.telegram.sendMessage(task.user_id, `Processing task ${JSON.stringify(task, null, 2)}`);

    return task;
}, 1);

client.on('ready', function(){
    // subscribe to the queue
    this.queue('processing', { autoDelete: false }, function(queue){
        console.log('Queue ' + queue.name + ' is open');
        queue.subscribe(async function(message, headers, deliveryInfo, messageObject){
            
            console.log('Got a message with routing key ' + deliveryInfo.routingKey);
            console.log('Got message: ' + message.data.toString());
            
            const data = message.data.toString();
            // retrieve the data from the database
            const select = await pgClient.query(`
                SELECT *
                FROM processing
                INNER JOIN models
                    ON processing.model_id = models.model_id
                INNER JOIN telegram_users
                    ON models.user_id = telegram_users.user_id
                WHERE processing.id = $1;
            `, [data]);

            console.log(select.rows[0]);

            // update the database
            await pgClient.query(`UPDATE processing
                SET status = 'processing'
                WHERE id = $1;`, [data]);

            iQueue.push(select.rows[0]);
        });
        queue.bind('#');
    });
    console.log('Connected to RabbitMQ');
})

client.on('error', function(e){
    console.log('Error from amqp: ', e);
});

// const HOST = process.env.HOST || '0.0.0.0';
// const PORT = process.env.PORT || 3000;

// const cloudflared = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

// cloudflared.stdout.on('data', (data) => {
//     console.log(`stdout: ${data}`);
// });

// cloudflared.stderr.on('data', (data) => {
//     console.error(`stderr: ${data}`);
// });

// cloudflared.on('close', (code) => {
//     console.log(`child process exited with code ${code}`);
// });

// const app = fastify();

// app.get('/', async (request, reply) => {
//     return {hello: 'world'};
// });

// app.listen({port: PORT, host: HOST}, (err, address) => {
//     if (err) {
//         console.error(err);
//         process.exit(1);
//     }
//     console.log(`Server listening at ${address}`);
// });