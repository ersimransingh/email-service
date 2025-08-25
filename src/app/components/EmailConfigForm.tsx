"use client";

import { useState } from "react";

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

interface EmailConfigFormProps {
    onComplete: () => void;
}

export default function EmailConfigForm({ onComplete }: EmailConfigFormProps) {
    const [config, setConfig] = useState<EmailConfig>({
        startTime: "09:00",
        endTime: "17:00",
        interval: 15,
        intervalUnit: 'minutes',
        dbRequestTimeout: 30000,
        dbConnectionTimeout: 30000,
        username: "",
        password: "",
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string>("");

    const handleInputChange = (field: keyof EmailConfig, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setError("");
    };

    const validateForm = () => {
        if (!config.username.trim()) {
            setError("Username is required");
            return false;
        }
        if (!config.password.trim()) {
            setError("Password is required");
            return false;
        }
        if (config.interval <= 0) {
            setError("Interval must be greater than 0");
            return false;
        }
        if (config.startTime >= config.endTime) {
            setError("End time must be after start time");
            return false;
        }
        return true;
    };

    const saveConfiguration = async () => {
        if (!validateForm()) return;

        setSaving(true);
        setError("");

        try {
            const response = await fetch('/api/save-email-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            if (response.ok) {
                setSaved(true);
                setTimeout(() => {
                    onComplete();
                }, 2000);
            } else {
                const result = await response.json();
                setError(result.error || 'Failed to save configuration');
            }
        } catch {
            setError('Failed to save configuration. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const isFormValid = config.username && config.password && config.interval > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                <div className="mb-6">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Email Service Configuration
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                Configure scheduling and authentication settings
                            </p>
                        </div>
                    </div>
                </div>

                <form className="space-y-6">
                    {/* Scheduling Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Scheduling Settings
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Start Time *
                                </label>
                                <input
                                    type="time"
                                    id="startTime"
                                    value={config.startTime}
                                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    End Time *
                                </label>
                                <input
                                    type="time"
                                    id="endTime"
                                    value={config.endTime}
                                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Interval *
                                </label>
                                <input
                                    type="number"
                                    id="interval"
                                    min="1"
                                    value={config.interval}
                                    onChange={(e) => handleInputChange('interval', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="intervalUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Interval Unit
                                </label>
                                <select
                                    id="intervalUnit"
                                    value={config.intervalUnit}
                                    onChange={(e) => handleInputChange('intervalUnit', e.target.value as 'minutes' | 'hours')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="minutes">Minutes</option>
                                    <option value="hours">Hours</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Database Timeout Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            Database Timeout Settings
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="dbRequestTimeout" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    DB Request Timeout (ms)
                                </label>
                                <input
                                    type="number"
                                    id="dbRequestTimeout"
                                    min="1000"
                                    step="1000"
                                    value={config.dbRequestTimeout}
                                    onChange={(e) => handleInputChange('dbRequestTimeout', parseInt(e.target.value) || 30000)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default: 30000ms (30 seconds)</p>
                            </div>

                            <div>
                                <label htmlFor="dbConnectionTimeout" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    DB Connection Timeout (ms)
                                </label>
                                <input
                                    type="number"
                                    id="dbConnectionTimeout"
                                    min="1000"
                                    step="1000"
                                    value={config.dbConnectionTimeout}
                                    onChange={(e) => handleInputChange('dbConnectionTimeout', parseInt(e.target.value) || 30000)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default: 30000ms (30 seconds)</p>
                            </div>
                        </div>
                    </div>

                    {/* Authentication Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Authentication Settings
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Username *
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={config.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="Email service username"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                                    placeholder="Email service password"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                            </div>
                        </div>
                    )}

                    {saved && (
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="text-sm text-green-800 dark:text-green-200">
                                    Email service configuration saved successfully! Redirecting to login...
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={saveConfiguration}
                        disabled={!isFormValid || saving || saved}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving Configuration...
                            </>
                        ) : saved ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Configuration Saved!
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save Configuration & Continue
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Configuration Summary:</h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Email service will run from {config.startTime} to {config.endTime}</li>
                        <li>• Processing interval: every {config.interval} {config.intervalUnit}</li>
                        <li>• Database timeouts: {config.dbConnectionTimeout}ms connection, {config.dbRequestTimeout}ms request</li>
                        <li>• Authentication will be required to access the service</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
