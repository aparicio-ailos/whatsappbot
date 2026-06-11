import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import mongoose from 'mongoose';
import { MongoStore } from 'wwebjs-mongo';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { startCountdown } from './newaction.js';

const { Client, RemoteAuth } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log('✅ Connected to MongoDB');

const store = new MongoStore({ mongoose });
const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300_000,
  }),
  puppeteer: {
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: ['--no-sandbox'],
  },
});

// Load command modules
const commands = new Map();
const modulesPath = path.join(__dirname, 'modules');
const moduleFiles = fs
  .readdirSync(modulesPath)
  .filter(file => file.endsWith('.js'));

for (const file of moduleFiles) {
  const module = await import(`./modules/${file}`);
  if (module.default?.name && module.default?.execute) {
    commands.set(module.default.name, module.default);
    console.log(`✅ Loaded command: ${module.default.name}`);
  } else {
    console.warn(`⚠️ Skipped invalid module: ${file}`);
  }
}

// Event listeners
client.on('qr', qr => {
  console.log('📲 Scan this QR code:');
  qrcode.generate(qr, { small: true });
});

let isReady = false;
let isAuthenticated = false;

client.on('authenticated', () => {
  if (!isAuthenticated) {
    console.log('🔐 Authenticated!');
    isAuthenticated = true;
  }
});

client.on('auth_failure', message =>
  console.error('❌ Authentication failure:', message)
);
const NUMERO_BLOQUEADO = '5547984400667@c.us';
client.on('message', async message => {
  console.log(message.body);
  try {
    if (message.author === NUMERO_BLOQUEADO) {
      await message.delete(false);
      console.log(`❌ delete`);
    }
  } catch (error) {
    console.error(`❌ Error executing ${command}:`, error);
  }
});

client.initialize();

startCountdown().catch(console.error);
