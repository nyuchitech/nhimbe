"use client";

import { useEffect, useRef } from "react";

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  className?: string;
}

/**
 * QR Code component using canvas-based generation
 * Generates QR codes client-side without external dependencies
 */
export function QRCode({
  value,
  size = 128,
  bgColor = "#FFFFFF",
  fgColor = "#000000",
  className = "",
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate QR code matrix using simple encoding
    const qr = generateQRMatrix(value);
    const cellSize = size / qr.length;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Draw QR code
    ctx.fillStyle = fgColor;
    for (let row = 0; row < qr.length; row++) {
      for (let col = 0; col < qr[row].length; col++) {
        if (qr[row][col]) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [value, size, bgColor, fgColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  );
}

/**
 * Simple QR code matrix generator
 * This is a simplified version - for production, use a proper QR library
 */
function generateQRMatrix(data: string): boolean[][] {
  const size = 25; // QR Version 2
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns (corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add alignment pattern
  addAlignmentPattern(matrix, size - 9, size - 9);

  // Encode data in remaining cells (simplified)
  let dataIndex = 0;
  const dataBytes = stringToBytes(data);

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip timing column

    for (let row = 0; row < size; row++) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = row;

        if (!isReserved(x, y, size)) {
          const byteIndex = Math.floor(dataIndex / 8);
          const bitIndex = 7 - (dataIndex % 8);

          if (byteIndex < dataBytes.length) {
            matrix[y][x] = ((dataBytes[byteIndex] >> bitIndex) & 1) === 1;
          } else {
            // Fill remaining with pattern
            matrix[y][x] = (x + y) % 2 === 0;
          }
          dataIndex++;
        }
      }
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startX: number, startY: number): void {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
      const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
      matrix[startY + y][startX + x] = isOuter || isInner;
    }
  }

  // Add separator
  for (let i = 0; i < 8; i++) {
    if (startX + 7 < matrix.length) matrix[startY + Math.min(i, 7)][startX + 7] = false;
    if (startY + 7 < matrix.length) matrix[startY + 7][startX + Math.min(i, 7)] = false;
  }
}

function addAlignmentPattern(matrix: boolean[][], centerX: number, centerY: number): void {
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      const isOuter = Math.abs(x) === 2 || Math.abs(y) === 2;
      const isCenter = x === 0 && y === 0;
      matrix[centerY + y][centerX + x] = isOuter || isCenter;
    }
  }
}

function isReserved(x: number, y: number, size: number): boolean {
  // Finder patterns + separators
  if ((x < 9 && y < 9) || (x < 9 && y >= size - 8) || (x >= size - 8 && y < 9)) {
    return true;
  }
  // Timing patterns
  if (x === 6 || y === 6) return true;
  // Alignment pattern area
  if (x >= size - 11 && x <= size - 7 && y >= size - 11 && y <= size - 7) {
    return true;
  }
  return false;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

/**
 * Generate a QR code URL for external services (fallback)
 */
export function getQRCodeURL(value: string, size = 200): string {
  const encoded = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=0A0A0A&color=64FFDA`;
}
