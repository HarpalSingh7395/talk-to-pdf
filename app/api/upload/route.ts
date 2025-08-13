// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { extractTextFromPDF } from "@/lib/pdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    // ✅ pdf-parse works directly with Buffer
    const text = await extractTextFromPDF(buffer)

    return NextResponse.json({ text: text }, { status: 200 })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
