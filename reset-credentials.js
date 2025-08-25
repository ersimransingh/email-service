#!/usr/bin/env node

/**
 * Emergency Credential Reset Script
 * 
 * This script forcefully updates the email service username and password to "admin"/"admin"
 * Use this when you forget your login credentials.
 * 
 * Usage: node reset-credentials.js
 */

const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');

// Configuration
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'email-service-default-key-2024';
const CONFIG_DIR = path.join(__dirname, 'config');
const EMAIL_CONFIG_FILE = path.join(CONFIG_DIR, 'email.config');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader() {
    console.log('\n' + '='.repeat(60));
    log('bright', '🔧 EMAIL SERVICE - EMERGENCY CREDENTIAL RESET');
    console.log('='.repeat(60));
    log('yellow', '⚠️  WARNING: This will reset your login credentials!');
    log('cyan', '📝 New credentials will be:');
    log('white', '   Username: admin');
    log('white', '   Password: admin');
    console.log('='.repeat(60) + '\n');
}

function ensureConfigDirectory() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
            log('green', `✅ Created config directory: ${CONFIG_DIR}`);
        }
        return true;
    } catch (error) {
        log('red', `❌ Error creating config directory: ${error.message}`);
        return false;
    }
}

function loadExistingConfig() {
    try {
        if (!fs.existsSync(EMAIL_CONFIG_FILE)) {
            log('yellow', '⚠️  Email config file does not exist. Will create new one.');
            return null;
        }

        const configContent = fs.readFileSync(EMAIL_CONFIG_FILE, 'utf8');
        const configData = JSON.parse(configContent);

        if (!configData.encrypted || !configData.data) {
            log('yellow', '⚠️  Invalid config format. Will create new one.');
            return null;
        }

        // Decrypt existing config
        const decryptedBytes = CryptoJS.AES.decrypt(configData.data, ENCRYPTION_KEY);
        const existingConfig = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

        log('green', '✅ Found existing email configuration');
        return existingConfig;

    } catch (error) {
        log('yellow', `⚠️  Could not load existing config: ${error.message}`);
        log('cyan', '📝 Will create new configuration with default values');
        return null;
    }
}

function createResetConfig(existingConfig) {
    // Default configuration with reset credentials
    const defaultConfig = {
        startTime: '08:00',
        endTime: '17:00',
        interval: 1,
        intervalUnit: 'minutes',
        dbRequestTimeout: 30000,
        dbConnectionTimeout: 30000,
        username: 'admin',        // 🔧 RESET TO ADMIN
        password: 'admin'         // 🔧 RESET TO ADMIN
    };

    // If existing config exists, preserve other settings but reset credentials
    if (existingConfig) {
        return {
            startTime: existingConfig.startTime || defaultConfig.startTime,
            endTime: existingConfig.endTime || defaultConfig.endTime,
            interval: existingConfig.interval || defaultConfig.interval,
            intervalUnit: existingConfig.intervalUnit || defaultConfig.intervalUnit,
            dbRequestTimeout: existingConfig.dbRequestTimeout || defaultConfig.dbRequestTimeout,
            dbConnectionTimeout: existingConfig.dbConnectionTimeout || defaultConfig.dbConnectionTimeout,
            username: 'admin',        // 🔧 FORCE RESET TO ADMIN
            password: 'admin'         // 🔧 FORCE RESET TO ADMIN
        };
    }

    return defaultConfig;
}

function saveResetConfig(config) {
    try {
        // Encrypt the configuration
        const encryptedConfig = CryptoJS.AES.encrypt(JSON.stringify(config), ENCRYPTION_KEY).toString();

        // Prepare file data
        const configData = {
            encrypted: true,
            timestamp: new Date().toISOString(),
            version: '1.0',
            type: 'email_service',
            data: encryptedConfig,
        };

        // Save to file
        fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf8');

        log('green', `✅ Configuration saved to: ${EMAIL_CONFIG_FILE}`);
        return true;

    } catch (error) {
        log('red', `❌ Error saving configuration: ${error.message}`);
        return false;
    }
}

function showSummary(config) {
    console.log('\n' + '-'.repeat(50));
    log('bright', '📋 CONFIGURATION SUMMARY');
    console.log('-'.repeat(50));
    log('cyan', `🕐 Schedule: ${config.startTime} - ${config.endTime}`);
    log('cyan', `⏱️  Interval: ${config.interval} ${config.intervalUnit}`);
    log('cyan', `⏰ DB Timeout: ${config.dbRequestTimeout}ms`);
    log('green', `👤 Username: ${config.username}`);
    log('green', `🔑 Password: ${config.password}`);
    console.log('-'.repeat(50));
    log('bright', '✅ CREDENTIALS SUCCESSFULLY RESET!');
    console.log('-'.repeat(50));
    log('yellow', '\n📝 Next Steps:');
    log('white', '1. Restart your email service if it\'s running');
    log('white', '2. Access the dashboard at http://localhost:3000');
    log('white', '3. Login with username: admin, password: admin');
    log('white', '4. Change your password from the Settings page');
    console.log('');
}

function promptUserConfirmation() {
    return new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        log('yellow', '🤔 Are you sure you want to reset credentials to admin/admin?');
        rl.question(`${colors.cyan}Type 'yes' to confirm: ${colors.reset}`, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
}

async function main() {
    try {
        logHeader();

        // Ask for confirmation
        const confirmed = await promptUserConfirmation();
        if (!confirmed) {
            log('yellow', '\n🚫 Operation cancelled by user.');
            log('white', 'No changes were made to your configuration.');
            process.exit(0);
        }

        console.log(''); // Add spacing

        // Step 1: Ensure config directory exists
        log('blue', '🔧 Step 1: Checking config directory...');
        if (!ensureConfigDirectory()) {
            process.exit(1);
        }

        // Step 2: Load existing configuration
        log('blue', '🔧 Step 2: Loading existing configuration...');
        const existingConfig = loadExistingConfig();

        // Step 3: Create reset configuration
        log('blue', '🔧 Step 3: Creating reset configuration...');
        const resetConfig = createResetConfig(existingConfig);
        log('green', '✅ Reset configuration prepared');

        // Step 4: Save reset configuration
        log('blue', '🔧 Step 4: Saving reset configuration...');
        if (!saveResetConfig(resetConfig)) {
            process.exit(1);
        }

        // Step 5: Show summary
        showSummary(resetConfig);

        log('green', '🎉 Credential reset completed successfully!');

    } catch (error) {
        log('red', `\n💥 Unexpected error: ${error.message}`);
        log('red', `Stack trace: ${error.stack}`);
        process.exit(1);
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    log('yellow', '\n\n🚫 Operation cancelled by user (Ctrl+C)');
    log('white', 'No changes were made to your configuration.');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('red', `\n💥 Fatal error: ${error.message}`);
    process.exit(1);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    main,
    loadExistingConfig,
    createResetConfig,
    saveResetConfig
};
