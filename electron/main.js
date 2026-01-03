const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Configuration file path
let userDataPath;
let configPath;

// Initialize paths after app is ready
function initPaths() {
  userDataPath = app.getPath("userData");
  configPath = path.join(userDataPath, "config.json");
}

// Default configuration
const defaultConfig = {
  dashscopeApiKey: "",
  defaultModel: "qwen-image-edit-plus",
};

// Read configuration
function readConfig() {
  try {
    if (configPath && fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading config:", err);
  }
  return defaultConfig;
}

// Write configuration
function writeConfig(config) {
  try {
    if (configPath) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      return true;
    }
  } catch (err) {
    console.error("Error writing config:", err);
  }
  return false;
}

// Keep a global reference to prevent garbage collection
let mainWindow = null;
let serverStarted = false;

// Development mode detection
const isDev = !app.isPackaged;

// Find an available port
async function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Wait for server to be ready
async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          resolve(res);
        });
        req.on("error", reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error("Timeout"));
        });
      });
      return true;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

// Start Next.js server
async function startServer(port) {
  if (serverStarted) return;

  const config = readConfig();

  // Determine paths
  let serverPath, serverDir;

  if (app.isPackaged) {
    // In packaged app
    serverDir = path.join(process.resourcesPath, "standalone");
    serverPath = path.join(serverDir, "server.js");
  } else {
    // In development
    serverDir = path.join(__dirname, "..", ".next", "standalone");
    serverPath = path.join(serverDir, "server.js");
  }

  const nodeModulesPath = path.join(serverDir, "node_modules");

  console.log("Server dir:", serverDir);
  console.log("Server path:", serverPath);
  console.log("Node modules path:", nodeModulesPath);
  console.log("Server exists:", fs.existsSync(serverPath));
  console.log("Node modules exists:", fs.existsSync(nodeModulesPath));

  if (!fs.existsSync(serverPath)) {
    throw new Error(`Server not found at: ${serverPath}`);
  }

  // Set environment variables BEFORE changing directory
  process.env.PORT = port.toString();
  process.env.HOSTNAME = "localhost";
  process.env.NODE_ENV = "production";

  // Set NODE_PATH to help module resolution find 'next' module
  process.env.NODE_PATH = nodeModulesPath;
  require("module").Module._initPaths();

  if (config.dashscopeApiKey) {
    process.env.DASHSCOPE_API_KEY = config.dashscopeApiKey;
  }

  // Change working directory to server directory
  process.chdir(serverDir);

  // Load and run the server
  try {
    require(serverPath);
    serverStarted = true;
    console.log("Server module loaded");
  } catch (err) {
    console.error("Failed to load server:", err);
    console.error("NODE_PATH:", process.env.NODE_PATH);
    console.error("Current dir:", process.cwd());
    throw err;
  }
}

async function createWindow() {
  const port = await findAvailablePort(3000);
  console.log("Using port:", port);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "神机营 - 图片编辑器",
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    backgroundColor: "#18181b",
  });

  // Disable menu bar in production
  if (!isDev) {
    mainWindow.setMenuBarVisibility(false);
  }

  const serverUrl = `http://localhost:${port}`;

  if (isDev) {
    // In development, connect to existing dev server
    mainWindow.loadURL(serverUrl);
    mainWindow.webContents.openDevTools();
    mainWindow.show();
  } else {
    // In production, start the Next.js server
    try {
      await startServer(port);

      // Wait for server to be ready
      console.log("Waiting for server to be ready...");
      const ready = await waitForServer(serverUrl);

      if (ready) {
        console.log("Server is ready, loading URL");
        await mainWindow.loadURL(serverUrl);
        mainWindow.show();
      } else {
        throw new Error("Server did not start in time");
      }
    } catch (err) {
      console.error("Failed to start server:", err);
      dialog.showErrorBox("启动失败", `无法启动服务器: ${err.message}`);
      app.quit();
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle("get-config", () => readConfig());
ipcMain.handle("set-config", (event, config) => writeConfig(config));

// App lifecycle
app.whenReady().then(async () => {
  initPaths();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
