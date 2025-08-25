"use client";

import { useState, useEffect } from "react";
import Settings from "./Settings";

interface DashboardData {
    database: {
        connected: boolean;
        server: string;
        database: string;
        lastChecked: string;
        responseTime?: number;
    };
    schedule: {
        startTime: string;
        endTime: string;
        interval: number;
        intervalUnit: string;
        isActive: boolean;
    };
    service: {
        status: 'running' | 'stopped' | 'error';
        lastRun?: string;
        nextRun?: string;
        startedAt?: string;
        stoppedAt?: string;
        startedBy?: string;
        totalRunTime?: number;
        serviceFileStatus?: 'running' | 'stopped';
        emailStats?: {
            totalProcessed: number;
            totalSent: number;
            totalFailed: number;
            lastRun?: string;
            nextRun?: string;
        };
    };
}

interface DashboardProps {
    onConfigChange: () => void;
    onLogout: () => void;
}

export default function Dashboard({ onConfigChange, onLogout }: DashboardProps) {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [serviceAction, setServiceAction] = useState<'starting' | 'stopping' | null>(null);
    const [testingEmail, setTestingEmail] = useState(false);
    const [processingEmails, setProcessingEmails] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard');
            if (response.ok) {
                const data = await response.json();
                setDashboardData(data);
            } else {
                console.error('Failed to fetch dashboard data');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const refreshDashboard = async () => {
        setRefreshing(true);
        await fetchDashboardData();
    };

    const testDatabaseConnection = async () => {
        try {
            const response = await fetch('/api/test-db-status', { method: 'POST' });
            if (response.ok) {
                await fetchDashboardData();
            }
        } catch (error) {
            console.error('Error testing database connection:', error);
        }
    };

    const controlService = async (action: 'start' | 'stop') => {
        setServiceAction(action === 'start' ? 'starting' : 'stopping');

        try {
            const response = await fetch('/api/service-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    user: 'dashboard-user' // You could get this from authentication context
                }),
            });

            if (response.ok) {
                await fetchDashboardData();
            } else {
                const error = await response.json();
                console.error('Service control error:', error);
            }
        } catch (error) {
            console.error('Error controlling service:', error);
        } finally {
            setServiceAction(null);
        }
    };

    const sendTestEmail = async () => {
        const email = prompt('Enter email address for test:');
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        setTestingEmail(true);

        try {
            const response = await fetch('/api/email-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Test email sent successfully to ${email}!\nMessage ID: ${result.messageId}`);
            } else {
                alert(`Failed to send test email: ${result.error}`);
            }
        } catch {
            alert('Error sending test email. Please try again.');
        } finally {
            setTestingEmail(false);
        }
    };

    const forceProcessEmails = async () => {
        setProcessingEmails(true);

        try {
            const response = await fetch('/api/email-force-process', {
                method: 'POST',
            });

            const result = await response.json();

            if (response.ok) {
                alert('Email processing completed successfully!');
                await fetchDashboardData(); // Refresh dashboard
            } else {
                alert(`Failed to process emails: ${result.error}`);
            }
        } catch {
            alert('Error processing emails. Please try again.');
        } finally {
            setProcessingEmails(false);
        }
    };

    const handleSettingsBack = () => {
        setShowSettings(false);
        // Refresh dashboard data when returning from settings
        fetchDashboardData();
    };

    const handleSettingsSave = () => {
        setShowSettings(false);
        // Refresh dashboard data after saving settings
        fetchDashboardData();
    };

    useEffect(() => {
        fetchDashboardData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Show settings page if requested
    if (showSettings) {
        return (
            <Settings
                onBack={handleSettingsBack}
                onSave={handleSettingsSave}
            />
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Service Dashboard</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor and manage your email service</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={refreshDashboard}
                                disabled={refreshing}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="Refresh Dashboard"
                            >
                                <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            <button
                                onClick={() => setShowSettings(true)}
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Settings
                            </button>

                            <button
                                onClick={onLogout}
                                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {dashboardData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Database Status Widget */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                    Database
                                </h3>
                                <button
                                    onClick={testDatabaseConnection}
                                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    title="Test Connection"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-3 ${dashboardData.database.connected
                                        ? 'bg-green-500 animate-pulse'
                                        : 'bg-red-500'
                                        }`}></div>
                                    <span className={`font-medium ${dashboardData.database.connected
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-red-700 dark:text-red-400'
                                        }`}>
                                        {dashboardData.database.connected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    <div><span className="font-medium">Server:</span> {dashboardData.database.server}</div>
                                    <div><span className="font-medium">Database:</span> {dashboardData.database.database}</div>
                                    {dashboardData.database.responseTime && (
                                        <div><span className="font-medium">Response:</span> {dashboardData.database.responseTime}ms</div>
                                    )}
                                    <div><span className="font-medium">Last Check:</span> {new Date(dashboardData.database.lastChecked).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule Widget */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Schedule
                                </h3>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${dashboardData.schedule.isActive
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                    }`}>
                                    {dashboardData.schedule.isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Start Time</div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {dashboardData.schedule.startTime}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">End Time</div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {dashboardData.schedule.endTime}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <div><span className="font-medium">Interval:</span> Every {dashboardData.schedule.interval} {dashboardData.schedule.intervalUnit}</div>
                                </div>
                            </div>
                        </div>

                        {/* Service Control Widget */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Service Control
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-3 ${dashboardData.service.status === 'running'
                                            ? 'bg-green-500 animate-pulse'
                                            : dashboardData.service.status === 'error'
                                                ? 'bg-red-500'
                                                : 'bg-gray-500'
                                            }`}></div>
                                        <span className={`font-medium capitalize ${dashboardData.service.status === 'running'
                                            ? 'text-green-700 dark:text-green-400'
                                            : dashboardData.service.status === 'error'
                                                ? 'text-red-700 dark:text-red-400'
                                                : 'text-gray-700 dark:text-gray-400'
                                            }`}>
                                            {dashboardData.service.status}
                                        </span>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => controlService('start')}
                                            disabled={serviceAction !== null || dashboardData.service.serviceFileStatus === 'running'}
                                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
                                        >
                                            {serviceAction === 'starting' ? (
                                                <div className="flex items-center">
                                                    <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Starting...
                                                </div>
                                            ) : 'Start'}
                                        </button>

                                        <button
                                            onClick={() => controlService('stop')}
                                            disabled={serviceAction !== null || dashboardData.service.serviceFileStatus === 'stopped'}
                                            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
                                        >
                                            {serviceAction === 'stopping' ? (
                                                <div className="flex items-center">
                                                    <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Stopping...
                                                </div>
                                            ) : 'Stop'}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    {dashboardData.service.startedAt && dashboardData.service.serviceFileStatus === 'running' && (
                                        <div><span className="font-medium">Started:</span> {new Date(dashboardData.service.startedAt).toLocaleString()}</div>
                                    )}
                                    {dashboardData.service.stoppedAt && dashboardData.service.serviceFileStatus === 'stopped' && (
                                        <div><span className="font-medium">Stopped:</span> {new Date(dashboardData.service.stoppedAt).toLocaleString()}</div>
                                    )}
                                    {dashboardData.service.startedBy && (
                                        <div><span className="font-medium">Started By:</span> {dashboardData.service.startedBy}</div>
                                    )}
                                    {dashboardData.service.nextRun && dashboardData.service.status === 'running' && (
                                        <div><span className="font-medium">Next Run:</span> {new Date(dashboardData.service.nextRun).toLocaleString()}</div>
                                    )}
                                    {dashboardData.service.totalRunTime && (
                                        <div><span className="font-medium">Total Runtime:</span> {Math.round(dashboardData.service.totalRunTime / (1000 * 60))} minutes</div>
                                    )}
                                </div>

                                <div className={`text-xs p-2 rounded ${dashboardData.service.serviceFileStatus === 'running'
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}>
                                    File Status: {dashboardData.service.serviceFileStatus || 'stopped'}
                                </div>
                            </div>
                        </div>

                        {/* Email Statistics Widget */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email Statistics
                                </h3>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {dashboardData.service.emailStats?.totalProcessed || 0}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Processed</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {dashboardData.service.emailStats?.totalSent || 0}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Sent</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {dashboardData.service.emailStats?.totalFailed || 0}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {dashboardData.service.emailStats?.lastRun && (
                                    <div><span className="font-medium">Last Email Run:</span> {new Date(dashboardData.service.emailStats.lastRun).toLocaleString()}</div>
                                )}
                                <div>
                                    <span className="font-medium">Success Rate:</span> {
                                        dashboardData.service.emailStats?.totalProcessed && dashboardData.service.emailStats.totalProcessed > 0
                                            ? Math.round((dashboardData.service.emailStats.totalSent / dashboardData.service.emailStats.totalProcessed) * 100)
                                            : 0
                                    }%
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Widget */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 md:col-span-2 lg:col-span-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Quick Actions
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <button
                                    onClick={testDatabaseConnection}
                                    className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors group"
                                >
                                    <div className="text-purple-600 dark:text-purple-400 mb-2">
                                        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                        </svg>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Test Database</div>
                                </button>

                                <button
                                    onClick={refreshDashboard}
                                    className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
                                >
                                    <div className="text-blue-600 dark:text-blue-400 mb-2">
                                        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Refresh Status</div>
                                </button>

                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors group"
                                >
                                    <div className="text-green-600 dark:text-green-400 mb-2">
                                        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Settings</div>
                                </button>

                                <button
                                    onClick={sendTestEmail}
                                    disabled={testingEmail}
                                    className="p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
                                >
                                    <div className="text-orange-600 dark:text-orange-400 mb-2">
                                        {testingEmail ? (
                                            <svg className="w-6 h-6 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {testingEmail ? 'Sending...' : 'Test Email'}
                                    </div>
                                </button>

                                <button
                                    onClick={forceProcessEmails}
                                    disabled={processingEmails || dashboardData.service.serviceFileStatus !== 'running'}
                                    className="p-4 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
                                >
                                    <div className="text-yellow-600 dark:text-yellow-400 mb-2">
                                        {processingEmails ? (
                                            <svg className="w-6 h-6 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {processingEmails ? 'Processing...' : 'Process Emails'}
                                    </div>
                                </button>

                                <button
                                    onClick={onLogout}
                                    className="p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                                >
                                    <div className="text-red-600 dark:text-red-400 mb-2">
                                        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Logout</div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
