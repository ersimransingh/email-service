"use client";

import { useState } from "react";

interface DatabaseConfig {
    server: string;
    port: string;
    user: string;
    password: string;
    database: string;
}

interface DatabaseSetupFormProps {
    onBack: () => void;
    onComplete: () => void;
}

export default function DatabaseSetupForm({ onBack, onComplete }: DatabaseSetupFormProps) {
    const [config, setConfig] = useState<DatabaseConfig>({
        server: "",
        port: "1433", // Default SQL Server port
        user: "",
        password: "",
        database: "",
    });

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleInputChange = (field: keyof DatabaseConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setTestResult(null); // Clear test result when config changes
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            const result = await response.json();

            if (response.ok) {
                setTestResult({
                    success: true,
                    message: result.message || 'Connection successful!',
                });
            } else {
                setTestResult({
                    success: false,
                    message: result.error || 'Connection failed',
                });
            }
        } catch {
            setTestResult({
                success: false,
                message: 'Failed to test connection. Please check your network.',
            });
        } finally {
            setTesting(false);
        }
    };

    const saveConfiguration = async () => {
        setSaving(true);

        try {
            const response = await fetch('/api/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            if (response.ok) {
                setSaved(true);
                setTimeout(() => {
                    onComplete(); // Move to email configuration after successful save
                }, 2000);
            } else {
                throw new Error('Failed to save configuration');
            }
        } catch {
            alert('Failed to save configuration. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const isFormValid = config.server && config.port && config.user && config.password && config.database;
    const canSave = isFormValid && testResult?.success;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                <div className="flex items-center mb-6">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Database Configuration
                    </h1>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Configure your Microsoft SQL Server database connection settings
                </p>

                <form className="space-y-4">
                    <div>
                        <label htmlFor="server" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Database Server (IP Address) *
                        </label>
                        <input
                            type="text"
                            id="server"
                            value={config.server}
                            onChange={(e) => handleInputChange('server', e.target.value)}
                            placeholder="192.168.1.100 or server.domain.com"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Port *
                        </label>
                        <input
                            type="number"
                            id="port"
                            value={config.port}
                            onChange={(e) => handleInputChange('port', e.target.value)}
                            placeholder="1433"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username *
                        </label>
                        <input
                            type="text"
                            id="user"
                            value={config.user}
                            onChange={(e) => handleInputChange('user', e.target.value)}
                            placeholder="Database username"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password *
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={config.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="Database password"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="database" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Database Name *
                        </label>
                        <input
                            type="text"
                            id="database"
                            value={config.database}
                            onChange={(e) => handleInputChange('database', e.target.value)}
                            placeholder="Database name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    {testResult && (
                        <div
                            className={`p-4 rounded-lg ${testResult.success
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                }`}
                        >
                            <div className="flex items-center">
                                {testResult.success ? (
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                                <p className={`text-sm ${testResult.success
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-red-800 dark:text-red-200'
                                    }`}>
                                    {testResult.message}
                                </p>
                            </div>
                        </div>
                    )}

                    {saved && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    Configuration saved successfully! Redirecting...
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={testConnection}
                            disabled={!isFormValid || testing}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            {testing ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
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
                            type="button"
                            onClick={saveConfiguration}
                            disabled={!canSave || saving || saved}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : saved ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Important Notes:</h3>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Ensure your SQL Server is configured to accept remote connections</li>
                        <li>• The default port for SQL Server is 1433</li>
                        <li>• Test the connection before saving to verify settings</li>
                        <li>• Configuration will be stored locally and encrypted</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
