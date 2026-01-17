import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Five African Minerals color gradients for OG images
const GRADIENTS = {
  malachite: "linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)",
  amethyst: "linear-gradient(135deg, #4B0082 0%, #7B1FA2 50%, #B388FF 100%)",
  amber: "linear-gradient(135deg, #5D4037 0%, #8B4513 50%, #FFD740 100%)",
  mixed: "linear-gradient(135deg, #004D40 0%, #4B0082 35%, #5D4037 70%, #00796B 100%)",
  sunset: "linear-gradient(135deg, #FF6B6B 0%, #FFD740 50%, #64FFDA 100%)",
};

// Sanitize text input to prevent XSS and injection attacks
function sanitizeText(input: string | null, maxLength: number = 200): string {
  if (!input) return "";

  // Remove any HTML tags and dangerous characters
  const sanitized = input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>'"&]/g, "") // Remove potentially dangerous chars
    .trim()
    .slice(0, maxLength); // Limit length

  return sanitized;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get and sanitize parameters
    const title = sanitizeText(searchParams.get("title"), 100) || "nhimbe";
    const subtitle = sanitizeText(searchParams.get("subtitle"), 200) || "Together we gather, together we grow";
    const date = sanitizeText(searchParams.get("date"), 50);
    const location = sanitizeText(searchParams.get("location"), 100);
    const category = sanitizeText(searchParams.get("category"), 50);
    const gradientParam = sanitizeText(searchParams.get("gradient"), 20);
    const gradient = (Object.keys(GRADIENTS).includes(gradientParam) ? gradientParam : "mixed") as keyof typeof GRADIENTS;
    const type = sanitizeText(searchParams.get("type"), 20) || "event"; // event, default

    const gradientStyle = GRADIENTS[gradient] || GRADIENTS.mixed;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: "60px",
            background: gradientStyle,
            position: "relative",
          }}
        >
          {/* Overlay for better text readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
            }}
          />

          {/* Logo/Brand */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 60,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* nhimbe icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#64FFDA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A" }}>n</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 600, color: "#FFFFFF" }}>nhimbe</span>
          </div>

          {/* Category badge */}
          {category && (
            <div
              style={{
                position: "absolute",
                top: 40,
                right: 60,
                background: "#B388FF",
                color: "#0A0A0A",
                padding: "8px 16px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {category}
            </div>
          )}

          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              zIndex: 10,
              maxWidth: "80%",
            }}
          >
            {/* Date and Location */}
            {(date || location) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  marginBottom: 16,
                }}
              >
                {date && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#64FFDA",
                      fontSize: 20,
                    }}
                  >
                    <span>📅</span>
                    <span>{date}</span>
                  </div>
                )}
                {location && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#FFFFFF",
                      opacity: 0.9,
                      fontSize: 20,
                    }}
                  >
                    <span>📍</span>
                    <span>{location}</span>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <h1
              style={{
                fontSize: type === "default" ? 72 : 56,
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.1,
                margin: 0,
                marginBottom: 16,
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p
                style={{
                  fontSize: 24,
                  color: "rgba(255,255,255,0.8)",
                  margin: 0,
                  fontStyle: type === "default" ? "italic" : "normal",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Decorative elements */}
          <div
            style={{
              position: "absolute",
              top: 80,
              right: 100,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(100,255,218,0.3) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 150,
              right: 200,
              width: 150,
              height: 150,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(179,136,255,0.3) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
