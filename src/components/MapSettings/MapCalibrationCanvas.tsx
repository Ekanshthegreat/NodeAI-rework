import React, { useRef, useEffect, useState } from 'react';

interface MapCalibrationCanvasProps {
  imageUrl?: string;
  isCalibrating: boolean;
  calibrationPoints: Array<[number, number]>;
  origin: [number, number] | null;
  onAddCalibrationPoint: (point: [number, number]) => void;
  onSetOrigin: (point: [number, number]) => void;
}

const MapCalibrationCanvas: React.FC<MapCalibrationCanvasProps> = ({
  imageUrl,
  isCalibrating,
  calibrationPoints,
  origin,
  onAddCalibrationPoint,
  onSetOrigin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image
  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImage(null);
      setImageLoaded(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (image && imageLoaded) {
      // Calculate scaling to fit canvas while maintaining aspect ratio
      const canvasAspect = canvas.width / canvas.height;
      const imageAspect = image.width / image.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imageAspect > canvasAspect) {
        // Image is wider than canvas
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // Image is taller than canvas
        drawWidth = canvas.height * imageAspect;
        drawHeight = canvas.height;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      // Draw image
      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      // Store scaling info for coordinate conversion
      canvas.dataset.scaleX = String(drawWidth / image.width);
      canvas.dataset.scaleY = String(drawHeight / image.height);
      canvas.dataset.offsetX = String(offsetX);
      canvas.dataset.offsetY = String(offsetY);

      // Draw calibration points
      calibrationPoints.forEach((point, index) => {
        const x = offsetX + (point[0] * drawWidth) / image.width;
        const y = offsetY + (point[1] * drawHeight) / image.height;

        ctx.fillStyle = index === 0 ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`P${index + 1}`, x + 12, y - 8);
      });

      // Draw line between calibration points
      if (calibrationPoints.length >= 2) {
        const p1 = calibrationPoints[0];
        const p2 = calibrationPoints[1];

        const x1 = offsetX + (p1[0] * drawWidth) / image.width;
        const y1 = offsetY + (p1[1] * drawHeight) / image.height;
        const x2 = offsetX + (p2[0] * drawWidth) / image.width;
        const y2 = offsetY + (p2[1] * drawHeight) / image.height;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw origin
      if (origin) {
        const x = offsetX + (origin[0] * drawWidth) / image.width;
        const y = offsetY + (origin[1] * drawHeight) / image.height;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        // Draw label
        ctx.fillStyle = '#f59e0b';
        ctx.font = '12px monospace';
        ctx.fillText('Origin', x + 12, y - 8);
      }
    } else {
      // Draw placeholder
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No map image', canvas.width / 2, canvas.height / 2);
    }
  }, [image, imageLoaded, calibrationPoints, origin]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !imageLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert canvas coordinates to image coordinates
    const scaleX = parseFloat(canvas.dataset.scaleX || '1');
    const scaleY = parseFloat(canvas.dataset.scaleY || '1');
    const offsetX = parseFloat(canvas.dataset.offsetX || '0');
    const offsetY = parseFloat(canvas.dataset.offsetY || '0');

    const imageX = (x - offsetX) / scaleX;
    const imageY = (y - offsetY) / scaleY;

    // Check if click is within image bounds
    if (imageX < 0 || imageX > image.width || imageY < 0 || imageY > image.height) {
      return;
    }

    if (isCalibrating && calibrationPoints.length < 2) {
      // Add calibration point
      onAddCalibrationPoint([imageX, imageY]);
    } else if (!isCalibrating) {
      // Set origin
      onSetOrigin([imageX, imageY]);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        onClick={handleCanvasClick}
        className={`w-full h-auto border border-slate-600 rounded ${
          (isCalibrating && calibrationPoints.length < 2) || !isCalibrating
            ? 'cursor-crosshair'
            : 'cursor-default'
        }`}
        style={{ maxHeight: '400px' }}
      />

      {isCalibrating && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          {calibrationPoints.length < 2
            ? `Click point ${calibrationPoints.length + 1} for calibration`
            : 'Enter distance and calculate scale'}
        </div>
      )}

      {!isCalibrating && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          Click to set origin point
        </div>
      )}
    </div>
  );
};

export default MapCalibrationCanvas;
