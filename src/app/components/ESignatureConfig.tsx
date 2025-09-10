'use client';

import { useState, useEffect } from 'react';

interface ESignatureConfig {
    enabled: boolean;
    certificate: {
        serialNumber: string;
        pinCode: string;
        type: 'usb';
    };
}

interface ESignatureStatus {
    available: boolean;
    info?: {
        type?: string;
        serialNumber?: string;
        hasPinCode?: boolean;
    };
    error?: string;
}

export default function ESignatureConfig() {
    const [config, setConfig] = useState<ESignatureConfig>({
        enabled: false,
        certificate: {
            serialNumber: '',
            pinCode: '',
            type: 'usb'
        }
    });

    const [status, setStatus] = useState<ESignatureStatus>({ available: false });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Load current configuration on component mount
    useEffect(() => {
        loadCurrentConfig();
    }, []);

    const loadCurrentConfig = async () => {
        try {
            const response = await fetch('/api/configure-esignature');
            const data = await response.json();

            if (data.success) {
                setStatus(data.eSignature);
            }
        } catch (error) {
            console.error('Error loading eSignature config:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/configure-esignature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'eSignature configured successfully!' });
                setStatus({ available: true, info: data.config });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to configure eSignature' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error configuring eSignature' });
        } finally {
            setLoading(false);
        }
    };

    const testESignature = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/test-esignature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'eSignature test completed successfully!' });
                console.log('Test results:', data.tests);
            } else {
                setMessage({ type: 'error', text: data.error || 'eSignature test failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error testing eSignature' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">eSignature Configuration</h2>

            {/* Status Display */}
            <div className="mb-6 p-4 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Current Status</h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${status.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm">
                        {status.available ? 'eSignature Available' : 'eSignature Not Configured'}
                    </span>
                </div>
                {status.info && (
                    <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Type:</strong> {status.info.type}</p>
                        <p><strong>Serial Number:</strong> {status.info.serialNumber}</p>
                    </div>
                )}
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="enabled"
                        checked={config.enabled}
                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                        className="rounded"
                    />
                    <label htmlFor="enabled" className="text-sm font-medium">
                        Enable eSignature with USB Certificate
                    </label>
                </div>

                <div>
                    <label htmlFor="certType" className="block text-sm font-medium text-gray-700 mb-1">
                        Certificate Type
                    </label>
                    <select
                        id="certType"
                        value={config.certificate.type}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                    >
                        <option value="usb">USB Certificate (Native Implementation)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Native Node.js implementation - no external applications required
                    </p>
                </div>


                <div>
                    <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Certificate Serial Number
                    </label>
                    <input
                        type="text"
                        id="serialNumber"
                        value={config.certificate.serialNumber}
                        onChange={(e) => setConfig({
                            ...config,
                            certificate: { ...config.certificate, serialNumber: e.target.value }
                        })}
                        placeholder="489EEE98E426DACC"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Serial number of the USB certificate (run check-usb-certificates.bat to find it)
                    </p>
                </div>

                <div>
                    <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                        PIN Code
                    </label>
                    <input
                        type="password"
                        id="pinCode"
                        value={config.certificate.pinCode}
                        onChange={(e) => setConfig({
                            ...config,
                            certificate: { ...config.certificate, pinCode: e.target.value }
                        })}
                        placeholder="1234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        PIN code for the USB token/smart card
                    </p>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' :
                        message.type === 'error' ? 'bg-red-50 text-red-800' :
                            'bg-blue-50 text-blue-800'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Configuring...' : 'Configure eSignature'}
                    </button>

                    <button
                        type="button"
                        onClick={testESignature}
                        disabled={loading || !config.certificate.serialNumber}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Testing...' : 'Test eSignature'}
                    </button>
                </div>
            </form>

            {/* Help Section */}
            <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-yellow-800">Setup Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
                    <li>Run <code className="bg-yellow-200 px-1 rounded">check-usb-certificates.bat</code> to find available certificates</li>
                    <li>Use the serial number (without spaces) from the certificate checker</li>
                    <li>Enter the PIN code for your USB token/smart card</li>
                    <li>Test the configuration before enabling</li>
                    <li>No external applications required - native Node.js implementation</li>
                </ol>
            </div>
        </div>
    );
}
