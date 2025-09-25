import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Upload, Save, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { uploadMapImage, upsertSite } from '../../lib/supabase';
import MapCalibrationCanvas from './MapCalibrationCanvas';
import { calculateScale, validateCalibration } from '../../utils/coordinates';

interface MapSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MapSettingsPanel: React.FC<MapSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { sites, currentSite, setSites } = useAppStore();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<Array<[number, number]>>([]);
  const [calibrationDistance, setCalibrationDistance] = useState<number | null>(null);
  const [origin, setOrigin] = useState<[number, number] | null>(null);

  const currentSiteData = sites.find(site => site.id === currentSite);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check for supported image formats
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      toast.error('Please select a supported image format (PNG, JPEG, WebP, or GIF)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Reset calibration state
    setCalibrationPoints([]);
    setCalibrationDistance(null);
    setOrigin(null);
    setIsCalibrating(false);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !currentSite) return;

    setUploading(true);
    try {
      const mapUrl = await uploadMapImage(selectedFile, currentSite);
      toast.success('Map uploaded successfully!');
      
      // Update site with new map URL
      if (currentSiteData) {
        const updatedSite = await upsertSite({
          ...currentSiteData,
          map_url: mapUrl,
        });
        
        setSites(sites.map(site => 
          site.id === currentSite ? updatedSite : site
        ));
      }
      
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('mime type') && error.message.includes('not supported')) {
          toast.error('File format not supported. Please use PNG, JPEG, WebP, or GIF.');
        } else if (error.message.includes('row-level security policy')) {
          toast.error('Permission denied. Please check your authentication or contact support.');
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      } else {
        toast.error('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationPoints([]);
    setCalibrationDistance(null);
  };

  const resetCalibration = () => {
    setIsCalibrating(false);
    setCalibrationPoints([]);
    setCalibrationDistance(null);
    setOrigin(null);
  };

  const addCalibrationPoint = (point: [number, number]) => {
    if (calibrationPoints.length < 2) {
      setCalibrationPoints([...calibrationPoints, point]);
    }
  };

  const calculateAndSaveScale = async () => {
    if (!currentSiteData || calibrationPoints.length < 2 || !calibrationDistance) {
      toast.error('Please complete calibration first');
      return;
    }

    const validation = validateCalibration(calibrationPoints, calibrationDistance);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid calibration');
      return;
    }

    setSaving(true);
    try {
      const scale = calculateScale(calibrationPoints[0], calibrationPoints[1], calibrationDistance);
      
      const updatedSite = await upsertSite({
        ...currentSiteData,
        scale_m_per_px: scale,
        origin: origin ? { x: origin[0], y: origin[1] } : currentSiteData.origin,
      });
      
      setSites(sites.map(site => 
        site.id === currentSite ? updatedSite : site
      ));
      
      toast.success('Map calibration saved successfully!');
      resetCalibration();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save calibration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">
              Map Settings - {currentSiteData?.name}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* File Upload Section */}
            <div>
              <h3 className="text-lg font-medium text-slate-300 mb-4">Upload Map Image</h3>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Supported formats: PNG, JPEG, WebP, GIF (max 10MB)
                  </p>
                </div>
                
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-sm text-slate-300">{selectedFile.name}</span>
                    <button
                      onClick={handleFileUpload}
                      disabled={uploading}
                      className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded text-sm transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Map Calibration Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-300">Map Calibration</h3>
                <div className="flex items-center space-x-2">
                  {!isCalibrating ? (
                    <button
                      onClick={startCalibration}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
                    >
                      Start Calibration
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={resetCalibration}
                        className="flex items-center space-x-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                      <button
                        onClick={calculateAndSaveScale}
                        disabled={calibrationPoints.length < 2 || !calibrationDistance || saving}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-sm transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Calibration Canvas */}
              <MapCalibrationCanvas
                imageUrl={previewUrl || currentSiteData?.map_url || undefined}
                isCalibrating={isCalibrating}
                calibrationPoints={calibrationPoints}
                origin={origin}
              />

              {/* Calibration Controls */}
              {isCalibrating && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Calibration Points
                      </label>
                      <div className="text-sm text-slate-400">
                        {calibrationPoints.length === 0 && "Click first point on the map"}
                        {calibrationPoints.length === 1 && "Click second point on the map"}
                        {calibrationPoints.length === 2 && "Both points selected"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Real Distance (meters)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={calibrationDistance || ''}
                        onChange={(e) => setCalibrationDistance(parseFloat(e.target.value) || null)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        placeholder="e.g., 5.0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Current Settings Display */}
              {currentSiteData && (
                <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Current Settings</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                    <div>
                      <span className="font-medium">Scale:</span> {currentSiteData.scale_m_per_px.toFixed(4)} m/px
                    </div>
                    <div>
                      <span className="font-medium">Origin:</span> ({currentSiteData.origin.x}, {currentSiteData.origin.y})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default MapSettingsPanel;