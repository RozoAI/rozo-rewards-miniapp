"use client";

import { RestaurantsContent } from "@/components/restaurants/restaurants-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FabActions } from "../fab-actions";
import { WalletComponents } from "../wallet-connect-button";

export default function SimpleHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rozo Rewards</h1>
              <p className="text-sm text-gray-600">Discover restaurants and earn rewards</p>
            </div>
            <WalletComponents />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Welcome Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🏪</span>
                  <span>Featured Restaurants</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800">☕ NS Cafe</h3>
                    <p className="text-sm text-green-600">Premium coffee • 10% cashback</p>
                    <p className="text-xs text-green-500 mt-2">
                      📍 Downtown • Open 7AM - 10PM
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-800">🍝 Pasta Palace</h3>
                    <p className="text-sm text-gray-600">Italian cuisine • 8% cashback</p>
                    <p className="text-xs text-gray-500 mt-2">
                      📍 Little Italy • Open 11AM - 11PM
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-800">🍕 Pizza Corner</h3>
                    <p className="text-sm text-gray-600">Fast food • 5% cashback</p>
                    <p className="text-xs text-gray-500 mt-2">
                      📍 Food Court • Open 10AM - 12AM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Restaurant List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>All Restaurants</CardTitle>
                <p className="text-sm text-gray-600">
                  Browse all available restaurants in your area
                </p>
              </CardHeader>
              <CardContent>
                <RestaurantsContent />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">178</div>
                <div className="text-sm text-gray-600">Restaurants</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">10%</div>
                <div className="text-sm text-gray-600">Max Cashback</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">ROZO</div>
                <div className="text-sm text-gray-600">Reward Token</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FabActions />
    </div>
  );
}
