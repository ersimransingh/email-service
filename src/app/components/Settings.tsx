"use client";

import { useState, useEffect } from "react";

interface DatabaseConfig {
    server: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

interface EmailConfig {
    startTime: string;
    endTime: string;
    interval: number;
    intervalUnit: 'minutes' | 'hours';
    dbRequestTimeout: number;
    dbConnectionTimeout: number;
    username: string;
    password: string;
}

interface SettingsProps {
    onBack: () => void;
    onSave: () => void;
}

export default function Settings({ onBack, onSave }: SettingsProps) {
    const [activeTab, setActiveTab] = useState<'database' | 'email'>('email');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testConnectionSuccess, setTestConnectionSuccess] = useState(false);
    const [originalDatabaseConfig, setOriginalDatabaseConfig] = useState<DatabaseConfig | null>(null);
    const [databaseConfigChanged, setDatabaseConfigChanged] = useState(false);

    const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({
        server: '',
        port: 1433,
        user: '',
        password: '',
        database: ''
    });

    const [emailConfig, setEmailConfig] = useState<EmailConfig>({
        startTime: '09:00',
        endTime: '18:00',
        interval: 15,
        intervalUnit: 'minutes',
        dbRequestTimeout: 30000,
        dbConnectionTimeout: 30000,
        username: '',
        password: ''
    });

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadCurrentConfig();
    }, []);

    // Check if database configuration has changed
    const checkDatabaseConfigChanged = () => {
        if (!originalDatabaseConfig) return false;

        return (
            databaseConfig.server !== originalDatabaseConfig.server ||
            databaseConfig.port !== originalDatabaseConfig.port ||
            databaseConfig.user !== originalDatabaseConfig.user ||
            databaseConfig.password !== originalDatabaseConfig.password ||
            databaseConfig.database !== originalDatabaseConfig.database
        );
    };

    // Update database config change detection
    useEffect(() => {
        const hasChanged = checkDatabaseConfigChanged();
        setDatabaseConfigChanged(hasChanged);
        if (hasChanged) {
            setTestConnectionSuccess(false); // Reset test success when config changes
        }
    }, [databaseConfig, originalDatabaseConfig]);

    const loadCurrentConfig = async () => {
        try {
            const response = await fetch('/api/get-current-config');
            if (response.ok) {
                const data = await response.json();
                setDatabaseConfig(data.config.database);
                setOriginalDatabaseConfig(data.config.database);
                setEmailConfig(data.config.email);
            } else {
                throw new Error('Failed to load current configuration');
            }
        } catch {
            console.error('Error loading config:', error);
            setError('Failed to load current configuration');
        } finally {
            setLoading(false);
        }
    };

    const testDatabaseConnection = async () => {
        setTesting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(databaseConfig),
            });

            const result = await response.json();

            if (response.ok) {
                setSuccess(`✅ Connection successful! Response time: ${result.responseTime || 'N/A'}ms`);
                setTestConnectionSuccess(true);
            } else {
                setError(`❌ Connection failed: ${result.error}`);
            }
        } catch {
            setError('❌ Network error occurred while testing connection');
        } finally {
            setTesting(false);
        }
    };

    const saveDatabaseConfig = async () => {
        // Check if database config has changed and require test connection
        if (databaseConfigChanged && !testConnectionSuccess) {
            setError('❌ Please test the new database connection before saving changes.');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(databaseConfig),
            });

            if (response.ok) {
                setSuccess('✅ Database configuration saved successfully!');
                // Update original config to reflect saved state
                setOriginalDatabaseConfig({ ...databaseConfig });
                setDatabaseConfigChanged(false);
                setTestConnectionSuccess(false);
            } else {
                const result = await response.json();
                setError(`❌ Failed to save: ${result.error}`);
            }
        } catch {
            setError('❌ Network error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const saveEmailConfig = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/save-email-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailConfig),
            });

            if (response.ok) {
                setSuccess('✅ Email configuration saved successfully!');
                // After successful save, return to dashboard
                setTimeout(() => {
                    onSave();
                }, 1500);
            } else {
                const result = await response.json();
                setError(`❌ Failed to save: ${result.error}`);
            }
        } catch {
            setError('❌ Network error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading current configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
                            <p className="text-gray-600 dark:text-gray-300">Update your email service configuration</p>
                        </div>
                        <button
                            onClick={onBack}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab('database')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'database'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Database Configuration
                            </button>
                            <button
                                onClick={() => setActiveTab('email')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'email'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Email Service Configuration
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Status Messages */}
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
                            </div>
                        )}

                        {/* Database Configuration Tab */}
                        {activeTab === 'database' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Microsoft SQL Database Settings</h3>

                                {/* Warning Message for Database Changes */}
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                                Important: Server Restart Required
                                            </h4>
                                            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                                Changes to database configuration require you to restart the application server from the terminal.
                                                Please run <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">npm run dev</code> after saving changes.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Server IP Address
                                        </label>
                                        <input
                                            type="text"
                                            value={databaseConfig.server}
                                            onChange={(e) => setDatabaseConfig({ ...databaseConfig, server: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="192.168.1.100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Port
                                        </label>
                                        <input
                                            type="number"
                                            value={databaseConfig.port}
                                            onChange={(e) => setDatabaseConfig({ ...databaseConfig, port: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={databaseConfig.user}
                                            onChange={(e) => setDatabaseConfig({ ...databaseConfig, user: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={databaseConfig.password}
                                            onChange={(e) => setDatabaseConfig({ ...databaseConfig, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="Enter new password or leave masked"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Database Name
                                        </label>
                                        <input
                                            type="text"
                                            value={databaseConfig.database}
                                            onChange={(e) => setDatabaseConfig({ ...databaseConfig, database: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Connection Status Indicator */}
                                {databaseConfigChanged && (
                                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                        <div className="flex items-center">
                                            <svg className="h-4 w-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                Database configuration has been modified. Please test the connection before saving.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={testDatabaseConnection}
                                        disabled={testing}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2"
                                    >
                                        {testing ? (
                                            <>
                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Test Connection
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={saveDatabaseConfig}
                                        disabled={saving || (databaseConfigChanged && !testConnectionSuccess)}
                                        className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-white ${saving || (databaseConfigChanged && !testConnectionSuccess)
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                        title={databaseConfigChanged && !testConnectionSuccess ? 'Please test the new connection before saving' : ''}
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                </svg>
                                                Save Database Config
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Email Configuration Tab */}
                        {activeTab === 'email' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Service Settings</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={emailConfig.startTime}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, startTime: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={emailConfig.endTime}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, endTime: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Processing Interval
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={emailConfig.interval}
                                                onChange={(e) => setEmailConfig({ ...emailConfig, interval: parseInt(e.target.value) })}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                                min="1"
                                            />
                                            <select
                                                value={emailConfig.intervalUnit}
                                                onChange={(e) => setEmailConfig({ ...emailConfig, intervalUnit: e.target.value as 'minutes' | 'hours' })}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="minutes">Minutes</option>
                                                <option value="hours">Hours</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            DB Request Timeout (ms)
                                        </label>
                                        <input
                                            type="number"
                                            value={emailConfig.dbRequestTimeout}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, dbRequestTimeout: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            DB Connection Timeout (ms)
                                        </label>
                                        <input
                                            type="number"
                                            value={emailConfig.dbConnectionTimeout}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, dbConnectionTimeout: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={emailConfig.username}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={emailConfig.password}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="Enter new password or leave masked"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={saveEmailConfig}
                                        disabled={saving}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                </svg>
                                                Save Email Config
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
