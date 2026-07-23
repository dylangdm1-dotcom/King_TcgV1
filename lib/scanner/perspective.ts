"use client";

export type Point = {
  x: number;
  y: number;
};

export function orderCorners(points: Point[]): Point[] {
  if (points.length !== 4) {
    return points;
  }

  const sum = points.map(p => p.x + p.y);
  const diff = points.map(p => p.x - p.y);

  const topLeft = points[sum.indexOf(Math.min(...sum))];
  const bottomRight = points[sum.indexOf(Math.max(...sum))];

  const topRight = points[diff.indexOf(Math.max(...diff))];
  const bottomLeft = points[diff.indexOf(Math.min(...diff))];

  return [topLeft, topRight, bottomRight, bottomLeft];
}