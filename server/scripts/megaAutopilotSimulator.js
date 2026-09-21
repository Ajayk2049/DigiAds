/**
 * DigiAds Mega Autopilot Load Test Harness
 * 
 * Fleet Target: Automatic discovery of all approved venues & active devices
 * Compatible with: Local Dev (.env.dev) and Linux Production VPS (.env.prod)
 * 
 * Usage:
 *   node scripts/megaAutopilotSimulator.js
 *   node scripts/megaAutopilotSimulator.js --env=prod
 *   node scripts/megaAutopilotSimulator.js --duration=180
 *   node scripts/megaAutopilotSimulator.js --mongo-uri="mongodb://..."
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

// Dynamic environment resolution (--env=prod or --env=dev or process.env.NODE_ENV)
const cliArgs = process.argv.slice(2);
const envArg = cliArgs.find(a => a.startsWith('--env='));
const envFileArg = cliArgs.find(a => a.startsWith('--env-file='));

let envPath = null;
if (envFileArg) {
  envPath = path.resolve(envFileArg.split('=')[1]);
} else if (envArg) {
  const chosen = envArg.split('=')[1];
  envPath = path.join(__dirname, chosen === 'prod' ? '../config/.env.prod' : '../config/.env.dev');
} else if (fs.existsSync(path.join(__dirname, '../config/.env.prod')) && !fs.existsSync(path.join(__dirname, '../config/.env.dev'))) {
  // VPS Production default (only .env.prod exists)
  envPath = path.join(__dirname, '../config/.env.prod');
} else if (fs.existsSync(path.join(__dirname, '../config/.env.dev'))) {
  // Local Dev default
  envPath = path.join(__dirname, '../config/.env.dev');
} else if (fs.existsSync(path.join(__dirname, '../config/.env.prod'))) {
  envPath = path.join(__dirname, '../config/.env.prod');
}

if (envPath && fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const axios = require('axios');

const config = require('../config/config');
const Device = require('../models/Device');
const Menu = require('../models/Menu');
const Order = require('../models/Order');
const HostApplication = require('../models/HostApplication');

// Constants & Ports (Dynamic for Local Dev or Linux VPS)
const SERVER_HTTP_PORT = process.env.PORT || config.port || 4000;
const SERVER_GRPC_PORT = process.env.GRPC_PORT || config.grpcPort || 50051;
const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret || 'dev_jwt_secret_key_12345!';
const API_BASE = `http://127.0.0.1:${SERVER_HTTP_PORT}/api/v1`;

const mongoUriArg = cliArgs.find(a => a.startsWith('--mongo-uri='));
const TARGET_MONGO_URI = mongoUriArg ? mongoUriArg.split('=')[1] : (process.env.MONGO_URI || config.mongoUri);

// Cross-Platform Media Directory Resolution
function resolveMediaDir(preferred, fallbacks) {
  if (preferred && fs.existsSync(preferred)) return preferred;
  for (const fb of fallbacks) {
    if (fb && fs.existsSync(fb)) {
      try {
        const files = fs.readdirSync(fb);
        if (files.length > 0) return fb;
      } catch (_) {}
    }
  }
  return preferred;
}

const foodDirArg = cliArgs.find(a => a.startsWith('--food-dir='));
const adImgsArg = cliArgs.find(a => a.startsWith('--ad-images-dir='));
const adVidsArg = cliArgs.find(a => a.startsWith('--ad-videos-dir='));

const FOOD_MENU_DIR = resolveMediaDir(
  foodDirArg ? foodDirArg.split('=')[1] : (process.env.FOOD_MENU_DIR || 'C:\\Users\\Ajay\\Downloads\\Food menu'),
  [
    path.join(__dirname, 'test-assets/food-menu'),
    path.join(__dirname, 'test-media/food-menu'),
    path.join(__dirname, '../uploads/menu'),
    path.join(__dirname, '../uploads/platform-ads/platform')
  ]
);

const AD_IMAGES_DIR = resolveMediaDir(
  adImgsArg ? adImgsArg.split('=')[1] : (process.env.AD_IMAGES_DIR || 'C:\\Users\\Ajay\\Downloads\\images'),
  [
    path.join(__dirname, 'test-assets/ad-images'),
    path.join(__dirname, 'test-media/ad-images'),
    path.join(__dirname, '../uploads/platform-ads/platform'),
    path.join(__dirname, '../uploads/ads')
  ]
);

const AD_VIDEOS_DIR = resolveMediaDir(
  adVidsArg ? adVidsArg.split('=')[1] : (process.env.AD_VIDEOS_DIR || 'C:\\Users\\Ajay\\Downloads\\Videos'),
  [
    path.join(__dirname, 'test-assets/ad-videos'),
    path.join(__dirname, 'test-media/ad-videos'),
    path.join(__dirname, '../uploads/platform-ads/platform'),
    path.join(__dirname, '../uploads/ads')
  ]
);

let allAdImageFiles = [];
let allAdVideoFiles = [];
if (fs.existsSync(AD_IMAGES_DIR)) {
  allAdImageFiles = fs.readdirSync(AD_IMAGES_DIR)
    .filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()))
    .map(f => path.join(AD_IMAGES_DIR, f));
}
if (fs.existsSync(AD_VIDEOS_DIR)) {
  allAdVideoFiles = fs.readdirSync(AD_VIDEOS_DIR)
    .filter(f => ['.mp4', '.mov', '.webm'].includes(path.extname(f).toLowerCase()))
    .map(f => path.join(AD_VIDEOS_DIR, f));
}

// dynamically generate lightweight synthetic test assets so ad upload and BullMQ transcoding pipelines can be exercised.
if (allAdVideoFiles.length === 0) {
  try {
    const fallbackVidDir = path.join(__dirname, 'test-media/ad-videos');
    if (!fs.existsSync(fallbackVidDir)) fs.mkdirSync(fallbackVidDir, { recursive: true });
    const syntheticVid = path.join(fallbackVidDir, 'synthetic_test_ad.mp4');
    if (!fs.existsSync(syntheticVid)) {
      require('child_process').execSync(`ffmpeg -y -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -c:v libx264 -pix_fmt yuv420p -c:a aac "${syntheticVid}"`, { stdio: 'ignore' });
    }
    if (fs.existsSync(syntheticVid)) {
      allAdVideoFiles.push(syntheticVid);
      console.log(`Generated synthetic test video asset for VPS pipeline testing: ${syntheticVid}`);
    }
  } catch (err) {
    // FFmpeg not found or skipped
  }
}

if (allAdImageFiles.length === 0) {
  try {
    const fallbackImgDir = path.join(__dirname, 'test-media/ad-images');
    if (!fs.existsSync(fallbackImgDir)) fs.mkdirSync(fallbackImgDir, { recursive: true });
    const syntheticImg = path.join(fallbackImgDir, 'synthetic_test_ad.png');
    if (!fs.existsSync(syntheticImg)) {
      const sharp = require('sharp');
      sharp({
        create: {
          width: 1280,
          height: 720,
          channels: 4,
          background: { r: 59, g: 130, b: 246, alpha: 1 }
        }
      }).png().toFile(syntheticImg).then(() => {
        allAdImageFiles.push(syntheticImg);
      }).catch(() => {});
    } else {
      allAdImageFiles.push(syntheticImg);
    }
  } catch (err) {}
}

// Load gRPC Protos
const deviceProtoPkg = protoLoader.loadSync(path.join(__dirname, '../protos/device.proto'), {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const orderProtoPkg = protoLoader.loadSync(path.join(__dirname, '../protos/order.proto'), {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});

const deviceProto = grpc.loadPackageDefinition(deviceProtoPkg).device;
const orderProto = grpc.loadPackageDefinition(orderProtoPkg).order;

const grpcClientOptions = {
  'grpc.keepalive_time_ms': 15000,
  'grpc.keepalive_timeout_ms': 5000
};

// Global State
const state = {
  venues: [],            // HostApplication docs
  devices: [],           // device docs
  tablets: [],           // tablet objects
  screens: [],           // screen objects
  activeSockets: 0,
  activeTabletSockets: 0,
  activeScreenSockets: 0,
  totalHeartbeats: 0,
  totalImpressions: 0,
  
  // Media Ingestion
  menuImagesUploaded: 0,
  menusUpdated: 0,
  adImagesUploaded: 0,
  adVideosUploaded: 0,
  transcodeJobsQueued: 0,
  lastAdUpload: 'Initial bootstrap',

  // Food Ordering
  ordersPlaced: 0,
  ordersCooking: 0,
  ordersServed: 0,
  ordersPaid: 0,
  revenuePaidPaise: 0,
  activeOrders: [],      // In-flight orders transitioning states

  healthLatencyMs: 0,
  running: true,
  venuesMenu: new Map(), // hostApplicationId -> MenuItem[]
  venuesMerchant: new Map(), // hostApplicationId -> merchantUserId

  // Hardware Metrics
  systemCpuPct: 0,
  processCpuPct: 0,
  eventLoopLagMs: 0
};

// Hardware Metrics Sampler
let prevCpus = os.cpus();
let prevProcCpu = process.cpuUsage();
let prevProcTime = Date.now();
let prevLoopTime = Date.now();

function updateHardwareMetrics() {
  // 1. System CPU %
  const currentCpus = os.cpus();
  let idleDelta = 0;
  let totalDelta = 0;
  for (let i = 0; i < currentCpus.length; i++) {
    const prev = prevCpus[i].times;
    const curr = currentCpus[i].times;
    const prevIdle = prev.idle;
    const currIdle = curr.idle;
    const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;
    idleDelta += (currIdle - prevIdle);
    totalDelta += (currTotal - prevTotal);
  }
  prevCpus = currentCpus;
  state.systemCpuPct = totalDelta === 0 ? 0 : Math.max(0, Math.min(100, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)));

  // 2. Process CPU %
  const currProcCpu = process.cpuUsage(prevProcCpu);
  const currProcTime = Date.now();
  const elapsedMs = currProcTime - prevProcTime;
  prevProcCpu = process.cpuUsage();
  prevProcTime = currProcTime;
  if (elapsedMs > 0) {
    const totalMicros = currProcCpu.user + currProcCpu.system;
    state.processCpuPct = Math.max(0, Math.min(100, Math.round((totalMicros / (elapsedMs * 1000 * os.cpus().length)) * 100)));
  }

  // 3. Event Loop Lag
  const now = Date.now();
  state.eventLoopLagMs = Math.max(0, now - prevLoopTime - 1000);
  prevLoopTime = now;
}

let grpcDeviceService = null;
let grpcOrderService = null;

function initGrpc() {
  const target = `127.0.0.1:${SERVER_GRPC_PORT}`;
  grpcDeviceService = new deviceProto.DeviceService(target, grpc.credentials.createInsecure(), grpcClientOptions);
  grpcOrderService = new orderProto.OrderService(target, grpc.credentials.createInsecure(), grpcClientOptions);
}

function getAdminToken() {
  return jwt.sign(
    { uid: 'sim_admin_loadtest', role: 'admin', roles: ['admin'] },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function getMerchantToken(merchantId) {
  return jwt.sign(
    { uid: merchantId, role: 'merchant', roles: ['merchant'] },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

// Health Probe
function probeHealth() {
  const start = Date.now();
  const req = http.get(`http://127.0.0.1:${SERVER_HTTP_PORT}/health`, { timeout: 3000 }, (res) => {
    state.healthLatencyMs = Date.now() - start;
    res.resume();
  });
  req.on('error', () => {
    state.healthLatencyMs = -1;
  });
}

// ============================================================================
// STAGE 1: Dynamic Multi-Venue Menu Ingestion with Real Food Photos
// ============================================================================
async function ingestMenusWithPhotos() {
  console.log(`\n--- STAGE 1: Ingesting Menus Across ${state.venues.length} Venues ---`);
  if (!fs.existsSync(FOOD_MENU_DIR)) {
    console.warn(`Food menu directory not found at: ${FOOD_MENU_DIR} (skipping new photo uploads, using existing menus)`);
    return;
  }

  const allFoodFiles = fs.readdirSync(FOOD_MENU_DIR)
    .filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()) && f !== '.png')
    .map(f => path.join(FOOD_MENU_DIR, f));

  if (allFoodFiles.length === 0) {
    console.warn('No valid food images found in Food menu folder.');
    return;
  }

  console.log(`Found ${allFoodFiles.length} authentic food images in ${FOOD_MENU_DIR}.`);

  for (let vIdx = 0; vIdx < state.venues.length; vIdx++) {
    const venue = state.venues[vIdx];
    const venueId = venue._id.toString();
    const merchantToken = getMerchantToken(venue.userId.toString());
    console.log(`[Venue ${vIdx + 1}/${state.venues.length}] Processing ${venue.outletName} (${venueId})...`);

    // Pick 4 diverse food images for this venue
    const selectedImages = [];
    for (let i = 0; i < 4; i++) {
      const file = allFoodFiles[(vIdx * 4 + i) % allFoodFiles.length];
      selectedImages.push(file);
    }

    const uploadedItems = [];
    for (const imgPath of selectedImages) {
      const filename = path.basename(imgPath);
      const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
      const stream = fs.createReadStream(imgPath);

      try {
        const uploadRes = await axios.post(`${API_BASE}/host/menu/upload-image`, stream, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-host-application-id': venueId,
            'x-filename': filename,
            'Authorization': `Bearer ${merchantToken}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        const uploadedUrl = uploadRes.data?.data?.url || uploadRes.data?.data?.imageUrl;
        if (uploadRes.data?.success && uploadedUrl) {
          state.menuImagesUploaded++;
          const imageUrl = uploadedUrl;
          uploadedItems.push({
            itemId: `ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: cleanName,
            description: `Freshly prepared chef special ${cleanName}.`,
            price: Math.floor(120 + Math.random() * 380),
            category: (uploadedItems.length % 2 === 0) ? 'Main Course' : 'Starters',
            isVeg: !cleanName.toLowerCase().includes('chicken') && !cleanName.toLowerCase().includes('mutton') && !cleanName.toLowerCase().includes('fish') && !cleanName.toLowerCase().includes('prawn'),
            isAvailable: true,
            imageUrl: imageUrl,
            rating: 4.8,
            prepTimeMinutes: 15
          });
        }
      } catch (err) {
        console.warn(`  x Failed uploading food image ${filename}:`, err.response?.data?.message || err.message);
      }
    }

    // Update venue's menu in DB
    if (uploadedItems.length > 0) {
      try {
        const existingMenu = await Menu.findOne({ hostApplicationId: venue._id });
        const currentItems = existingMenu?.items || [];
        const mergedItems = [...uploadedItems, ...currentItems.slice(0, 8)];

        await axios.post(`${API_BASE}/host/menu`, {
          hostApplicationId: venueId,
          items: mergedItems,
          categories: [
            { name: 'Starters', icon: 'fastfood' },
            { name: 'Main Course', icon: 'dinner' },
            { name: 'Dessert', icon: 'cookie' },
            { name: 'Beverages', icon: 'coffee' }
          ],
          shifts: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
          activeShift: 'Lunch',
          defaultGst: 5,
          defaultOtherCharges: 0
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
          }
        });

        state.venuesMenu.set(venueId, mergedItems);
        state.menusUpdated++;
        console.log(`  ✓ Updated menu for ${venue.outletName} with ${uploadedItems.length} fresh image dishes.`);
      } catch (menuErr) {
        console.warn(`  x Failed updating menu schema:`, menuErr.response?.data?.message || menuErr.message);
      }
    }
  }
}

// ============================================================================
// STAGE 2: Platform Ad Ingestion (Sharp Images & BullMQ Videos)
// ============================================================================
async function ingestPlatformAds() {
  console.log('\n--- STAGE 2: Ingesting Platform Ads (Images & Videos) ---');
  const adminToken = getAdminToken();

  // 1. Upload Platform Ad Images
  if (fs.existsSync(AD_IMAGES_DIR)) {
    const adImageFiles = fs.readdirSync(AD_IMAGES_DIR)
      .filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()))
      .slice(0, 3) // upload 3 test ad images
      .map(f => path.join(AD_IMAGES_DIR, f));

    for (const imgPath of adImageFiles) {
      const filename = path.basename(imgPath);
      console.log(`Uploading Platform Ad Image: ${filename}...`);
      try {
        const stream = fs.createReadStream(imgPath);
        const res = await axios.post(`${API_BASE}/admin/platform-ads/upload?filename=${encodeURIComponent(filename)}&adType=platform`, stream, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${adminToken}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        if (res.data?.success) {
          state.adImagesUploaded++;
          console.log(`  ✓ Ad image processed via Sharp -> ${res.data?.data?.mediaUrl}`);
        }
      } catch (err) {
        console.warn(`  x Error uploading ad image ${filename}:`, err.response?.data?.message || err.message);
      }
    }
  }

  // 2. Upload Platform Ad Videos
  if (fs.existsSync(AD_VIDEOS_DIR)) {
    const adVideoFiles = fs.readdirSync(AD_VIDEOS_DIR)
      .filter(f => ['.mp4', '.mov', '.webm'].includes(path.extname(f).toLowerCase()))
      .slice(0, 3) // upload 3 real commercials
      .map(f => path.join(AD_VIDEOS_DIR, f));

    for (const vidPath of adVideoFiles) {
      const filename = path.basename(vidPath);
      console.log(`Uploading Platform Ad Video: ${filename}...`);
      try {
        const stream = fs.createReadStream(vidPath);
        const res = await axios.post(`${API_BASE}/admin/platform-ads/upload?filename=${encodeURIComponent(filename)}&adType=platform`, stream, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${adminToken}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        if (res.data?.success) {
          state.adVideosUploaded++;
          state.transcodeJobsQueued++;
          console.log(`  ✓ Ad video enqueued into BullMQ -> ${res.data?.data?.mediaUrl} (Status: ${res.data?.data?.transcodeStatus})`);
        }
      } catch (err) {
        console.warn(`  x Error uploading ad video ${filename}:`, err.response?.data?.message || err.message);
      }
    }
  }
}

// Continuous Platform Ad Uploader (called every 30-40s)
async function uploadSinglePlatformAd() {
  const adminToken = getAdminToken();
  const pickVideo = Math.random() > 0.5 && allAdVideoFiles.length > 0;

  if ((pickVideo && allAdVideoFiles.length > 0) || allAdImageFiles.length === 0) {
    if (allAdVideoFiles.length === 0) return;
    const vidPath = allAdVideoFiles[Math.floor(Math.random() * allAdVideoFiles.length)];
    const filename = path.basename(vidPath);
    try {
      const stream = fs.createReadStream(vidPath);
      const res = await axios.post(`${API_BASE}/admin/platform-ads/upload?filename=${encodeURIComponent(filename)}&adType=platform`, stream, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Authorization': `Bearer ${adminToken}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      if (res.data?.success) {
        state.adVideosUploaded++;
        state.transcodeJobsQueued++;
        state.lastAdUpload = `Video: ${filename.slice(0, 24)} (BullMQ Queued)`;
      }
    } catch (err) {
      // Suppress network/concurrency blips during continuous runs
    }
  } else if (allAdImageFiles.length > 0) {
    const imgPath = allAdImageFiles[Math.floor(Math.random() * allAdImageFiles.length)];
    const filename = path.basename(imgPath);
    try {
      const stream = fs.createReadStream(imgPath);
      const res = await axios.post(`${API_BASE}/admin/platform-ads/upload?filename=${encodeURIComponent(filename)}&adType=platform`, stream, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Authorization': `Bearer ${adminToken}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      if (res.data?.success) {
        state.adImagesUploaded++;
        state.lastAdUpload = `Image: ${filename.slice(0, 24)} (Sharp WebP)`;
      }
    } catch (err) {
      // Suppress network/concurrency blips during continuous runs
    }
  }
}

// ============================================================================
// STAGE 3: Swarm Devices (Tablets + Screens)
// ============================================================================
function connectSwarmDevice(dev, index) {
  const wsUrl = `ws://127.0.0.1:${SERVER_HTTP_PORT}/ws/device?token=${dev.token}`;
  const ws = new WebSocket(wsUrl);
  dev.ws = ws;

  ws.on('open', () => {
    dev.isOnline = true;
    state.activeSockets++;
    if (dev.deviceType === 'tablet') {
      state.activeTabletSockets++;
    } else {
      state.activeScreenSockets++;
    }
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.event === 'ping') {
        state.totalHeartbeats++;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
        }
      }
    } catch (_) {}
  });

  ws.on('ping', () => {
    state.totalHeartbeats++;
    if (ws.readyState === WebSocket.OPEN) ws.pong();
  });

  ws.on('close', () => {
    if (dev.isOnline) {
      dev.isOnline = false;
      state.activeSockets = Math.max(0, state.activeSockets - 1);
      if (dev.deviceType === 'tablet') {
        state.activeTabletSockets = Math.max(0, state.activeTabletSockets - 1);
      } else {
        state.activeScreenSockets = Math.max(0, state.activeScreenSockets - 1);
      }
    }
    if (state.running) {
      setTimeout(() => connectSwarmDevice(dev, index), 3000 + (index * 40));
    }
  });

  ws.on('error', () => {});
}

function launchSwarmConnections() {
  console.log(`\n--- STAGE 3: Connecting ${state.devices.length} Devices (${state.tablets.length} Tablets + ${state.screens.length} Screens) ---`);
  state.devices.forEach((dev, index) => {
    setTimeout(() => {
      connectSwarmDevice(dev, index);
    }, index * 25);
  });
}

// ============================================================================
// STAGE 4 & 5: Multi-Venue Tabletop Order Rush & Kitchen Progression
// ============================================================================
async function placeOrdersAcrossAllVenues() {
  if (!grpcOrderService || state.tablets.length === 0) return;

  const onlineTablets = state.tablets.filter(d => d.isOnline);
  if (onlineTablets.length === 0) return;

  for (const venue of state.venues) {
    const venueId = venue._id.toString();
    const venueTablets = onlineTablets.filter(d => d.hostApplicationId === venueId);
    if (venueTablets.length === 0) continue;

    const dev = venueTablets[Math.floor(Math.random() * venueTablets.length)];
    const menuItems = state.venuesMenu.get(venueId) || [];
    if (menuItems.length === 0) continue;

    const selectedItem = menuItems[Math.floor(Math.random() * menuItems.length)];
    const tableNum = `T-${Math.floor(1 + Math.random() * 20)}`;
    const qty = Math.random() > 0.65 ? 2 : 1;
    const isPacked = Math.random() > 0.7;

    const itemPricePaise = Math.round((selectedItem.price || 150) * 100);
    const totalAmountPaise = itemPricePaise * qty;

    const meta = new grpc.Metadata();
    meta.add('authorization', `Bearer ${dev.token}`);

    const orderReq = {
      deviceId: dev.deviceId,
      merchantId: state.venuesMerchant.get(venueId),
      tableNumber: tableNum,
      items: [{
        itemId: selectedItem.itemId || selectedItem._id?.toString() || 'ITEM_1',
        name: selectedItem.name,
        quantity: qty,
        price: itemPricePaise,
        isPacked: isPacked,
        customization: ''
      }],
      totalAmount: totalAmountPaise
    };

    grpcOrderService.CreateOrder(orderReq, meta, (err, res) => {
      if (!err && res?.success) {
        state.ordersPlaced++;
        state.activeOrders.push({
          orderId: res.orderId,
          merchantId: state.venuesMerchant.get(venueId),
          hostApplicationId: venueId,
          status: 'placed',
          stepTime: Date.now(),
          amount: totalAmountPaise
        });
      }
    });
  }
}

function makePostRequest(endpoint, token, payload) {
  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: '127.0.0.1',
    port: SERVER_HTTP_PORT,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    res.resume();
  });
  req.on('error', () => {});
  req.write(data);
  req.end();
}

// Progress active orders through kitchen states
function advanceKitchenCycle() {
  const now = Date.now();
  const toRemove = [];

  for (const order of state.activeOrders) {
    const elapsed = now - order.stepTime;
    const merchantToken = getMerchantToken(order.merchantId);

    // 1. Placed -> Cooking after 6s
    if (order.status === 'placed' && elapsed >= 6000) {
      order.status = 'cooking';
      order.stepTime = now;
      state.ordersCooking++;
      makePostRequest(`/api/v1/host/orders/update-status`, merchantToken, {
        orderId: order.orderId, orderStatus: 'cooking'
      });
    }
    // 2. Cooking -> Served after 8s
    else if (order.status === 'cooking' && elapsed >= 8000) {
      order.status = 'served';
      order.stepTime = now;
      state.ordersServed++;
      makePostRequest(`/api/v1/host/orders/update-status`, merchantToken, {
        orderId: order.orderId, orderStatus: 'served'
      });
    }
    // 3. Served -> Completed & Paid after 8s
    else if (order.status === 'served' && elapsed >= 8000) {
      order.status = 'completed';
      state.ordersPaid++;
      state.revenuePaidPaise += order.amount;
      toRemove.push(order.orderId);
      makePostRequest(`/api/v1/host/orders/payment-received`, merchantToken, {
        orderId: order.orderId, paymentType: 'UPI'
      });
    }
  }

  if (toRemove.length > 0) {
    state.activeOrders = state.activeOrders.filter(o => !toRemove.includes(o.orderId));
  }
}

// Dispatch periodic gRPC ad impressions from tablets & screens
function startImpressionLoop() {
  setInterval(() => {
    if (!state.running || state.devices.length === 0 || !grpcDeviceService) return;

    for (let i = 0; i < 10; i++) {
      const dev = state.devices[Math.floor(Math.random() * state.devices.length)];
      if (!dev || !dev.isOnline) continue;

      const meta = new grpc.Metadata();
      meta.add('authorization', `Bearer ${dev.token}`);

      const req = {
        deviceId: dev.deviceId,
        bookingId: 'PLATFORM_AD_AUTOPILOT',
        durationSeconds: Math.floor(10 + Math.random() * 15),
        interactiveClicks: dev.deviceType === 'tablet' && Math.random() > 0.8 ? 1 : 0
      };

      grpcDeviceService.TrackAdImpression(req, meta, (err) => {
        if (!err) {
          state.totalImpressions++;
        }
      });
    }
  }, 2000);
}

// Live ASCII Telemetry Dashboard
function renderDashboard() {
  const latencyStr = state.healthLatencyMs >= 0 ? `${state.healthLatencyMs} ms` : 'ERR';
  const color = state.healthLatencyMs < 60 ? '\x1b[32m' : (state.healthLatencyMs < 180 ? '\x1b[33m' : '\x1b[31m');
  const revenueRupees = (state.revenuePaidPaise / 100).toFixed(2);

  // Memory metrics
  const mem = process.memoryUsage();
  const procHeapUsedMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const procHeapTotalMb = (mem.heapTotal / 1024 / 1024).toFixed(1);
  const procRssMb = (mem.rss / 1024 / 1024).toFixed(1);

  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;
  const usedMemGb = (usedMemBytes / 1024 / 1024 / 1024).toFixed(2);
  const totalMemGb = (totalMemBytes / 1024 / 1024 / 1024).toFixed(2);
  const memUtilPct = ((usedMemBytes / totalMemBytes) * 100).toFixed(1);

  const cpuColor = state.systemCpuPct < 60 ? '\x1b[32m' : (state.systemCpuPct < 85 ? '\x1b[33m' : '\x1b[31m');
  const loopColor = state.eventLoopLagMs < 20 ? '\x1b[32m' : '\x1b[31m';

  const banner = `
================================================================================
       DIGIADS MASSIVE AUTONOMOUS SIMULATION (${state.devices.length} DEVICES / ${state.venues.length} VENUES)
================================================================================
 Active Venues:     ${state.venues.length} Approved Venues          | Total Devices:      ${state.devices.length} Fleet
 Connected Tablets: ${state.activeTabletSockets} / ${state.tablets.length} Online          | Connected Screens:  ${state.activeScreenSockets} / ${state.screens.length} Online
 Total Sockets:     ${state.activeSockets} / ${state.devices.length} Active        | Heartbeats:         ${state.totalHeartbeats} (15s pings)
 Server / Health:   ${color}${latencyStr}\x1b[0m                       | gRPC Impressions:   ${state.totalImpressions} Ad Plays
--------------------------------------------------------------------------------
 [SYSTEM HARDWARE & RUNTIME METRICS]
 Host RAM Used:     ${usedMemGb} GB / ${totalMemGb} GB (${memUtilPct}% utilized)
 Process Memory:    Heap: ${procHeapUsedMb} MB / ${procHeapTotalMb} MB | RSS: ${procRssMb} MB
 Processor Load:    System CPU: ${cpuColor}${state.systemCpuPct}%\x1b[0m | Process CPU: ${state.processCpuPct}% | Cores: ${os.cpus().length}
 Event Loop Lag:    ${loopColor}${state.eventLoopLagMs} ms\x1b[0m (Health Probe: ${color}${latencyStr}\x1b[0m)
--------------------------------------------------------------------------------
 [CONTINUOUS MEDIA & AD ENGINE (New Ad Uploaded every 30-40s)]
 Food Menu Photos:  ${state.menuImagesUploaded} uploaded (Sharp)    | Menus Updated:      ${state.menusUpdated} / ${state.venues.length} Venues
 Platform Ad Imgs:  ${state.adImagesUploaded} uploaded (Sharp)    | Platform Ad Videos: ${state.adVideosUploaded} uploaded (BullMQ)
 Last Uploaded Ad:  ${state.lastAdUpload || 'Initial bootstrap ads loaded'}
--------------------------------------------------------------------------------
 [CONTINUOUS TABLETOP FOOD ORDER RUSH (All Venues every 15s)]
 Placed:            ${state.ordersPlaced} orders               | In Kitchen Cooking: ${state.ordersCooking} orders
 Served:            ${state.ordersServed} orders               | Settled & Paid:     ${state.ordersPaid} orders
 Live Revenue:      ₹${revenueRupees}                | In-Flight Tables:   ${state.activeOrders.length} active
================================================================================
 Status: LIVE CONTINUOUS EXECUTION (Press [Ctrl+C] to stop and view final report)`;

  process.stdout.write(`\r\x1b[2J\x1b[0;0H${banner}\n`);
}

// Main Orchestrator
async function main() {
  console.log('Target Database URI:', TARGET_MONGO_URI ? TARGET_MONGO_URI.replace(/:[^:@]+@/, ':****@') : 'Not set');
  console.log('Connecting to MongoDB...');
  await mongoose.connect(TARGET_MONGO_URI);
  console.log('MongoDB connected successfully.');

  initGrpc();

  // 1. Fetch all approved venues
  state.venues = await HostApplication.find({ status: 'approved' });
  console.log(`Found ${state.venues.length} approved venues in database.`);

  for (const v of state.venues) {
    const menu = await Menu.findOne({ hostApplicationId: v._id }).lean();
    state.venuesMenu.set(v._id.toString(), menu?.items || []);
    state.venuesMerchant.set(v._id.toString(), v.userId.toString());
  }

  // 2. Fetch all candidate devices (excluding physical TAB_FANJI)
  const allDevices = await Device.find({
    deviceId: { $ne: 'TAB_FANJI' },
    hostApplicationId: { $in: state.venues.map(v => v._id) }
  });

  console.log(`Discovered ${allDevices.length} candidate devices in database.`);

  if (allDevices.length === 0) {
    console.warn('No candidate devices found. Please ensure devices exist in this database.');
  }

  // Activate all simulated devices
  const deviceIds = allDevices.map(d => d._id);
  if (deviceIds.length > 0) {
    await Device.updateMany({ _id: { $in: deviceIds } }, { $set: { isActivated: true, status: 'online' } });
    console.log(`Activated ${allDevices.length} devices in MongoDB.`);
  }

  allDevices.forEach((d) => {
    const hostAppId = d.hostApplicationId.toString();
    const token = jwt.sign(
      {
        deviceId: d.deviceId,
        deviceType: d.deviceType || 'tablet',
        hostApplicationId: hostAppId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const devObj = {
      _id: d._id,
      deviceId: d.deviceId,
      deviceType: d.deviceType || 'tablet',
      hostApplicationId: hostAppId,
      token,
      ws: null,
      isOnline: false
    };

    state.devices.push(devObj);
    if (devObj.deviceType === 'tablet') {
      state.tablets.push(devObj);
    } else {
      state.screens.push(devObj);
    }
  });

  console.log(`Fleet Partitioned: ${state.tablets.length} Tablets, ${state.screens.length} Screens.`);

  // Stage 1: Upload food menu images & update menus
  await ingestMenusWithPhotos();

  // Stage 2: Upload platform ads (images & videos)
  await ingestPlatformAds();

  // Stage 3: Launch WebSocket swarm
  launchSwarmConnections();

  // Stage 4: Start background loops
  startImpressionLoop();

  // Continuous Food Ordering: 1 order placed across all venues every 15 seconds
  setInterval(() => {
    if (state.running) placeOrdersAcrossAllVenues();
  }, 15000);
  // Initial burst 2 seconds after startup
  setTimeout(() => {
    if (state.running) placeOrdersAcrossAllVenues();
  }, 2000);

  // Continuous Ad Uploads: 1 image/video uploaded every 30-40 seconds
  function scheduleNextAdUpload() {
    if (!state.running) return;
    const delayMs = Math.floor(30000 + Math.random() * 10000); // 30-40 secs
    setTimeout(async () => {
      if (state.running) {
        await uploadSinglePlatformAd();
        scheduleNextAdUpload();
      }
    }, delayMs);
  }
  scheduleNextAdUpload();

  // Kitchen cycle loop
  setInterval(() => {
    if (state.running) advanceKitchenCycle();
  }, 2000);

  // Hardware sampler loop
  setInterval(updateHardwareMetrics, 1000);

  // Health probe loop
  setInterval(probeHealth, 2000);

  // Render Dashboard loop
  setInterval(renderDashboard, 1000);

  // Parse command line arguments for optional duration
  const args = process.argv.slice(2);
  const durationArg = args.find(a => a.startsWith('--duration='));
  const parsedDuration = durationArg ? parseInt(durationArg.split('=')[1], 10) : 0;

  const finishTest = async () => {
    state.running = false;
    renderDashboard();
    console.log(`\n================================================================================`);
    console.log(`                 MASSIVE FLEET LOAD TEST COMPLETED SUCCESSFULLY                 `);
    console.log(`================================================================================`);
    console.log(` * Target Venues:               ${state.venues.length} Approved Venues`);
    console.log(` * Connected Swarm Devices:     ${state.activeSockets} / ${state.devices.length} Active (${state.activeTabletSockets} Tablets + ${state.activeScreenSockets} Screens)`);
    console.log(` * WebSocket Heartbeats:        ${state.totalHeartbeats} (15s interval)`);
    console.log(` * gRPC Ad Impressions Tracked: ${state.totalImpressions} plays`);
    console.log(` * Food Menu Photos Uploaded:   ${state.menuImagesUploaded} (Sharp 800x800 WebP)`);
    console.log(` * Venue Menus Injected:        ${state.menusUpdated} / ${state.venues.length} Venues`);
    console.log(` * Platform Ad Images:          ${state.adImagesUploaded} (Sharp 1080p WebP)`);
    console.log(` * Platform Ad Videos:          ${state.adVideosUploaded} (BullMQ Transcoding)`);
    console.log(` * Food Orders Placed:          ${state.ordersPlaced}`);
    console.log(` * Orders in Kitchen Cooking:   ${state.ordersCooking}`);
    console.log(` * Orders Served:               ${state.ordersServed}`);
    console.log(` * Orders Settled & Paid:       ${state.ordersPaid}`);
    console.log(` * Total Settled Revenue:       ₹${(state.revenuePaidPaise / 100).toFixed(2)}`);
    console.log(` * Peak System CPU Load:        ${state.systemCpuPct}%`);
    console.log(` * Server API / Health Latency: ${state.healthLatencyMs} ms`);
    console.log(`================================================================================\n`);

    state.devices.forEach(d => {
      if (d.ws && d.ws.readyState === WebSocket.OPEN) {
        d.ws.close();
      }
    });
    await mongoose.disconnect();
    process.exit(0);
  };

  let autoFinishTimer = null;
  if (parsedDuration > 0) {
    console.log(`Running in timed mode: will automatically conclude in ${parsedDuration}s.`);
    autoFinishTimer = setTimeout(finishTest, parsedDuration * 1000);
  } else {
    console.log(`Running in continuous manual mode. Press [Ctrl+C] when you wish to stop.`);
  }

  process.on('SIGINT', async () => {
    if (autoFinishTimer) clearTimeout(autoFinishTimer);
    await finishTest();
  });
}

main().catch(err => {
  console.error('Fatal simulator error:', err);
  process.exit(1);
});
