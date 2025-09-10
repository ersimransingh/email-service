"use client";

import { useState, useEffect } from "react";
import DatabaseSetupForm from "./components/DatabaseSetupForm";
import EmailConfigForm from "./components/EmailConfigForm";
import ESignatureConfig from "./components/ESignatureConfig";
import LoginPage from "./components/LoginPage";

type PageState = 'welcome' | 'database-setup' | 'email-config' | 'esignature-config' | 'login';

export default function Home() {
  const [pageState, setPageState] = useState<PageState>('welcome');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConfigurationStatus();
  }, []);

  const checkConfigurationStatus = async () => {
    try {
      // Check if database config exists
      const dbResponse = await fetch('/api/check-db-config');
      const dbExists = dbResponse.ok;

      if (!dbExists) {
        setPageState('welcome');
      } else {
        // Check if email config exists
        const emailResponse = await fetch('/api/check-email-config');
        const emailExists = emailResponse.ok;

        if (!emailExists) {
          setPageState('email-config');
        } else {
          // Check if eSignature is configured
          const eSignatureResponse = await fetch('/api/configure-esignature');
          const eSignatureData = await eSignatureResponse.json();

          if (!eSignatureData.eSignature?.available) {
            setPageState('esignature-config');
          } else {
            setPageState('login');
          }
        }
      }
    } catch (error) {
      console.error('Error checking configuration:', error);
      setPageState('welcome');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'database-setup') {
    return <DatabaseSetupForm onBack={() => setPageState('welcome')} onComplete={() => setPageState('email-config')} />;
  }

  if (pageState === 'email-config') {
    return <EmailConfigForm onComplete={() => setPageState('esignature-config')} />;
  }

  if (pageState === 'esignature-config') {
    return <ESignatureConfig />;
  }

  if (pageState === 'login') {
    return <LoginPage onConfigChange={() => setPageState('email-config')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Email Service
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Professional email sending service with Microsoft SQL database integration
          </p>
        </div>

        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Welcome to Email Service
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Configure your Microsoft SQL database connection to get started with sending emails
          </p>
        </div>

        <button
          onClick={() => setPageState('database-setup')}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Start Setup
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure your database connection to begin sending emails through our service
          </p>
        </div>
      </div>
    </div>
  );
}
