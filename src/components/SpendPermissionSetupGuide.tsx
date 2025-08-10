/**
 * Guide for setting up SpendPermissionManager on Coinbase Smart Wallets
 * Provides step-by-step instructions when automatic setup fails
 */

import React from 'react';

interface SpendPermissionSetupGuideProps {
  spendPermissionManagerAddress: string;
  onDismiss?: () => void;
}

export const SpendPermissionSetupGuide: React.FC<SpendPermissionSetupGuideProps> = ({
  spendPermissionManagerAddress,
  onDismiss
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Wallet Setup Required
            </h2>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">
                🚨 Why This Is Required
              </h3>
              <p className="text-yellow-700 text-sm">
                For Coinbase Spend Permissions to work, the SpendPermissionManager must be added 
                as an authorized owner of your Coinbase Smart Wallet. This enables secure, 
                one-tap payments without repeated signatures.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-3">
                📱 Option 1: Manual Setup (Recommended)
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-700 text-sm">
                <li>Open your Coinbase Wallet app</li>
                <li>Go to Settings → Smart Account or Advanced Settings</li>
                <li>Look for &quot;Authorized Owners&quot; or &quot;Account Permissions&quot;</li>
                <li>Add the following address as an owner:</li>
              </ol>
              
              <div className="mt-3 p-3 bg-gray-100 rounded border font-mono text-sm flex items-center justify-between">
                <span className="break-all">{spendPermissionManagerAddress}</span>
                <button
                  onClick={() => copyToClipboard(spendPermissionManagerAddress)}
                  className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-3">
                🆕 Option 2: Create New Wallet
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-green-700 text-sm">
                <li>Create a new Coinbase Smart Wallet</li>
                <li>During setup, enable &quot;Spend Permissions&quot; feature</li>
                <li>This automatically adds SpendPermissionManager as owner</li>
                <li>Transfer your funds to the new wallet</li>
              </ol>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">
                🔧 Technical Details
              </h3>
              <ul className="space-y-1 text-gray-700 text-sm">
                <li><strong>SpendPermissionManager:</strong> {spendPermissionManagerAddress}</li>
                <li><strong>Network:</strong> Base Mainnet (Chain ID: 8453)</li>
                <li><strong>Purpose:</strong> Enables pre-authorized spending without repeated signatures</li>
                <li><strong>Security:</strong> Only works within defined spending limits and time periods</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">
                📚 Official Documentation
              </h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <a 
                    href="https://docs.cdp.coinbase.com/wallet-api/v2/evm-features/spend-permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Coinbase CDP Spend Permissions Documentation
                  </a>
                </li>
                <li>
                  <a 
                    href="https://docs.base.org/identity/smart-wallet/guides/spend-permissions/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Base Smart Wallet Spend Permissions Guide
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Close Guide
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
