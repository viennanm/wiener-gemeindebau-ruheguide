#!/usr/bin/env node
/**
 * scripts/take_visual_qa_screenshots.js
 *
 * Steuert Google Chrome headless über das Chrome DevTools Protocol (CDP)
 * mittels nativer Node.js WebSockets, um alle erforderlichen Screenshots
 * für die visuelle Abnahme von Phase 6 zu erfassen.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(BASE_DIR, 'reports', 'screenshots', 'phase6');

const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = process.env.DEBUG_PORT || 9222;
const APP_URL = process.env.APP_URL || `http://127.0.0.1:3002/`;
const USER_DATA_DIR = path.join('/tmp', `chrome-qa-${Date.now()}`);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  return await res.json();
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
    this.isOpen = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        this.isOpen = true;
        resolve();
      };
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const fullPath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    console.log(`✓ Screenshot gespeichert: ${filename} (${buffer.length} Bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('Starte Google Chrome headless auf Port', DEBUG_PORT, '...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--window-size=1280,900'
  ]);

  let connected = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (version && version.webSocketDebuggerUrl) {
        connected = true;
        break;
      }
    } catch (_) {}
  }

  if (!connected) {
    throw new Error('Konnte keine Verbindung zu Chrome aufbauen.');
  }

  console.log('Ermittle verfügbaren Tab...');
  let target = null;
  const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  if (Array.isArray(list) && list.length > 0) {
    target = list.find(t => t.type === 'page') || list[0];
  }
  if (!target || !target.webSocketDebuggerUrl) {
    target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(APP_URL)}`, { method: 'PUT' })).json();
  }
  console.log('Verbinde mit Tab:', target.title || target.url);
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: APP_URL });

  console.log('Warte auf Datenladen (1.776 Gemeindebauten)...');
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const text = await cdp.eval('document.body.innerText');
    if (text && text.includes('1.776 Gemeindebauten geladen')) {
      console.log('✓ 1.776 Gemeindebauten erfolgreich geladen!');
      break;
    }
  }

  // 1. Desktop Gesamtansicht (1280x900)
  await cdp.setViewport(1280, 900, false);
  await sleep(500);
  await cdp.captureScreenshot('01_desktop_gesamtansicht.png');

  // 2. Umfeldfilter im Detail (Filterbereich mit aktiven Auswahlen)
  console.log('Wähle Umfeldfilter aus...');
  await cdp.eval(`(() => {
    const s1 = document.getElementById('umfeld-dichte-select');
    if (s1) { s1.value = 'MEDIUM'; s1.dispatchEvent(new Event('change', { bubbles: true })); }
    const s2 = document.getElementById('umfeld-entwicklung-select');
    if (s2) { s2.value = 'WACHSEND'; s2.dispatchEvent(new Event('change', { bubbles: true })); }
    const s3 = document.getElementById('umfeld-pensionsbezug-select');
    if (s3) { s3.value = '15_TO_20'; s3.dispatchEvent(new Event('change', { bubbles: true })); }
    const filterSection = document.getElementById('umfeld-dichte-select');
    if (filterSection) filterSection.scrollIntoView({ behavior: 'instant', block: 'center' });
  })()`);
  await sleep(600);
  const countAfterFilter = await cdp.eval(`(() => {
    const el = document.querySelector('main');
    return el ? el.innerText.match(/\\d+ ANLAGEN GEFILTERT/)?.[0] : null;
  })()`);
  console.log('Filter-Ergebniszähler:', countAfterFilter);
  await cdp.captureScreenshot('02_umfeldfilter_aktive_auswahl.png');

  // Filter wieder zurücksetzen
  await cdp.eval(`(() => {
    const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Demografie-Filter zurücksetzen'));
    if (resetBtn) resetBtn.click();
    window.scrollTo(0, 0);
  })()`);
  await sleep(500);

  // 3. Detailansicht & Umfeldstatistik (Desktop) - Öffne ersten Bau
  console.log('Öffne Detailansicht...');
  await cdp.eval(`(() => {
    const card = document.querySelector('[id^="gemeindebau-card-"]');
    if (card) card.click();
  })()`);
  await sleep(700);

  // Scrolle im Modal zum Umfeldbereich
  await cdp.eval(`(() => {
    const umfeldSection = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Umfeld & Bevölkerung'));
    if (umfeldSection) {
      umfeldSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('03_detailansicht_umfeldstatistik.png');

  // 4. Methodik-Akkordeon aufklappen und nach unten scrollen
  console.log('Klappe Methodik & Datenquelle auf...');
  await cdp.eval(`(() => {
    const methodBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Methodik & Datenquelle'));
    if (methodBtn) {
      methodBtn.click();
    }
  })()`);
  await sleep(600);
  await cdp.eval(`(() => {
    const methodBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Methodik & Datenquelle'));
    if (methodBtn) {
      methodBtn.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('04_detailansicht_methodik_akkordeon.png');

  // Schließe Modal
  await cdp.eval(`(() => {
    const closeBtn = document.querySelector('button[aria-label="Schließen"]');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(500);

  // 5. Stark wachsendes Gebiet: Robert-Uhlir-Hof (gb-18926) suchen und öffnen
  console.log('Suche stark wachsendes Gebiet (Robert-Uhlir-Hof)...');
  await cdp.eval(`(() => {
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.value = 'Robert-Uhlir-Hof';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(600);
  await cdp.eval(`(() => {
    const card = document.getElementById('gemeindebau-card-gb-18926') || document.querySelector('[id^="gemeindebau-card-"]');
    if (card) card.click();
  })()`);
  await sleep(700);
  await cdp.eval(`(() => {
    const umfeldSection = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Umfeld & Bevölkerung'));
    if (umfeldSection) umfeldSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('05_stark_wachsendes_gebiet.png');

  // Schließe Modal
  await cdp.eval(`(() => {
    const closeBtn = document.querySelector('button[aria-label="Schließen"]');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(500);

  // 6. Rückläufiges Gebiet: Fischerstiege 1-7 (gb-19041) suchen und öffnen
  console.log('Suche rückläufiges Gebiet (Fischerstiege 1-7)...');
  await cdp.eval(`(() => {
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.value = 'Fischerstiege 1-7';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(600);
  await cdp.eval(`(() => {
    const card = document.getElementById('gemeindebau-card-gb-19041') || document.querySelector('[id^="gemeindebau-card-"]');
    if (card) card.click();
  })()`);
  await sleep(700);
  await cdp.eval(`(() => {
    const umfeldSection = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Umfeld & Bevölkerung'));
    if (umfeldSection) umfeldSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('06_ruecklaeufiges_gebiet.png');

  // Schließe Modal
  await cdp.eval(`(() => {
    const closeBtn = document.querySelector('button[aria-label="Schließen"]');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(500);

  // 7. Hohe Dichte Gebiet: Negerlegasse 4 (256.4 Pers/ha) suchen und öffnen
  console.log('Suche Gebiet mit hoher Dichte (Negerlegasse 4)...');
  await cdp.eval(`(() => {
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.value = 'Negerlegasse 4';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(600);
  await cdp.eval(`(() => {
    const card = document.getElementById('gemeindebau-card-gb-18665') || document.getElementById('gemeindebau-card-gb-19174') || document.querySelector('[id^="gemeindebau-card-"]');
    if (card) card.click();
  })()`);
  await sleep(700);
  await cdp.eval(`(() => {
    const umfeldSection = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Umfeld & Bevölkerung'));
    if (umfeldSection) umfeldSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('07_hohe_dichte_gebiet.png');

  // 8. Mobile Darstellung (390 x 844) auf Negerlegasse 4
  console.log('Wechsle zu mobiler Ansicht (390 x 844)...');
  await cdp.setViewport(390, 844, true);
  await sleep(600);
  await cdp.eval(`(() => {
    const umfeldSection = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Umfeld & Bevölkerung'));
    if (umfeldSection) umfeldSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('08_mobile_detailansicht.png');

  // Schließe Modal auf Mobile
  await cdp.eval(`(() => {
    const closeBtn = document.querySelector('button[aria-label="Schließen"]');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(500);

  // 9. Seniorenmodus / Große Schrift aktiv (Desktop)
  console.log('Prüfe Seniorenmodus / Große Schrift...');
  await cdp.setViewport(1280, 900, false);
  await cdp.eval(`(() => {
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(500);
  await cdp.eval(`(() => {
    const card = document.querySelector('[id^="gemeindebau-card-"]');
    if (card) card.click();
  })()`);
  await sleep(700);
  await cdp.eval(`(() => {
    const umfeldSection = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Umfeld & Bevölkerung'));
    if (umfeldSection) umfeldSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await sleep(600);
  await cdp.captureScreenshot('09_seniorenmodus_vergleich.png');

  // Schließe Modal
  await cdp.eval(`(() => {
    const closeBtn = document.querySelector('button[aria-label="Schließen"]');
    if (closeBtn) closeBtn.click();
  })()`);

  cdp.close();
  chromeProcess.kill();
  console.log('Alle Screenshots erfolgreich erstellt!');
}

main().catch((err) => {
  console.error('Fehler bei der Screenshot-Erstellung:', err);
  process.exit(1);
});

