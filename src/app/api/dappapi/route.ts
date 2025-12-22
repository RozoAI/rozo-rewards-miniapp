import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "dapp.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const dappData = JSON.parse(fileContents);

    return NextResponse.json(dappData);
  } catch (error) {
    console.error("Error reading dapp data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dapp data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
