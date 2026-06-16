import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read the merchant data from the JSON file
    const filePath = path.join(process.cwd(), 'public', 'coffee_mapdata.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const merchantData = JSON.parse(fileContents);

    // Extract query parameters for filtering/pagination if needed
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const radius = searchParams.get('radius');

    let merchants = merchantData.locations || [];

    // Filter by search term if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      merchants = merchants.filter((merchant: any) =>
        merchant.name.toLowerCase().includes(searchTerm) ||
        merchant.address_line1?.toLowerCase().includes(searchTerm) ||
        merchant.address_line2?.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by location radius if coordinates provided
    if (lat && lon && radius) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const maxRadius = parseFloat(radius);

      merchants = merchants.filter((merchant: any) => {
        const distance = calculateDistance(userLat, userLon, merchant.lat, merchant.lon);
        return distance <= maxRadius;
      });

      // Sort by distance
      merchants = merchants.map((merchant: any) => ({
        ...merchant,
        distance: calculateDistance(userLat, userLon, merchant.lat, merchant.lon)
      })).sort((a: any, b: any) => a.distance - b.distance);
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit);
      merchants = merchants.slice(0, limitNum);
    }

    return NextResponse.json({
      success: true,
      data: merchants,
      total: merchants.length,
      filters: {
        search: search || null,
        location: lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null,
        radius: radius ? parseFloat(radius) : null,
        limit: limit ? parseInt(limit) : null
      }
    });

  } catch (error) {
    console.error('Error reading merchant data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch merchant data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in miles
  return distance;
}
