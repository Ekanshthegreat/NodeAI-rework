import React, { useState, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Upload, Save, RotateCcw, MapPin, Ruler } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { useSceneStore } from '../../store/useSceneStore';
import { upsertSite, uploadMapImage } from '../../lib/supabase';
import { calculateScale, validateCalibration } from '../../utils/coordinates';
import MapCalibrationCanvas from './MapCalibrationCanvas';

interface MapSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MapSettingsPanel: React.FC<MapSettingsPanelProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mapPreview, setMapPreview] = useState<string | null>(null);
  const [realWorldDistance, setRealWorldDistance] = useState<string>('');
  
  const { currentSite, sites, setSites } = useAppStore();
  const {
    calibrationPoints,
    calibrationDistance,
    origin,
    isCalibrating,
    setCalibrationDistance,
    setOrigin,
    setIsCalibrating,
    resetCalibration,
  } = useSceneStore();

  const currentSiteData = sites.find(site => site.id === currentSite);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentSite) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setMapPreview(previewUrl);
      
      // Upload to Supabase storage
      const publicUrl = await uploadMapImage(file, currentSite);
      
      // Update site with new map URL
      const updatedSite = await upsertSite({
        id: currentSite,
        name: currentSiteData?.name || currentSite,
        map_url: publicUrl,
        origin: currentSiteData?.origin,
        scale_m_per_px: currentSiteData?.scale_m_per_px,
      });

      // Update local state
      setSites(sites.map(site => 
        site.id === currentSite ? updatedSite : site
      ));

      toast.success('Map uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload map');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartCalibration = () => {
    resetCalibration();
    setIsCalibrating(true);
  };

  const handleCalibrationComplete = () => {
    const distance = parseFloat(realWorldDistance);
    if (isNaN(distance) || distance <= 0) {
      toast.error('Please enter a valid distance');
      return;
    }

    const validation = validateCalibration(calibrationPoints, distance);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid calibration');
      return;
    }

    try {
      const scale = calculateScale(calibrationPoints[0], calibrationPoints[1], distance);
      setCalibrationDistance(distance);
      setIsCalibrating(false);
      toast.success(`Scale calculated: ${scale.toFixed(6)} m/px`);
    } catch (error) {
      toast.error('Failed to calculate scale');
    }
  };

  const handleSave = async () => {
    if (!currentSite || !currentSiteData) return;

    const validation = validateCalibration(calibrationPoints, calibrationDistance);
    if (!validation.valid) {
      toast.error('Please complete calibration first');
      return;
    }

    if (!origin) {
      toast.error('Please set the origin point');
      return;
    }

    setIsSaving(true);
    try {
      const scale = calculateScale(calibrationPoints[0], calibrationPoints[1], calibrationDistance!);
      
      const updatedSite = await upsertSite({
        id: currentSite,
        name: currentSiteData.name,
        map_url: currentSiteData.map_url,
        origin: { x: origin[0], y: origin[1] },
        scale_m_per_px: scale,
      });

      setSites(sites.map(site => 
        site.id === currentSite ? updatedSite : site
      ));

      resetCalibration();
      toast.success('Map settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save map settings');
    } finally {
      setIsSaving(false);
    }
  };

  const computedScale = calibrationPoints.length >= 2 && calibrationDistance
    ? calculateScale(calibrationPoints[0], calibrationPoints[1], calibrationDistance)
    : null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-slate-900 rounded-lg border border-slate-700 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">
              Map Settings - {currentSiteData?.name}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Controls */}
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Upload Floor Plan</h3>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-400 mb-4">Upload PNG or SVG floor plan</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white rounded-lg transition-colors"
                  >
                    {isUploading ? 'Uploading...' : 'Select File'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Calibration Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Scale Calibration</h3>
                
                {!isCalibrating ? (
                  <button
                    onClick={handleStartCalibration}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    <Ruler className="w-4 h-4" />
                    <span>Start Calibration</span>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-slate-300 text-sm">
                      Click two points on the map, then enter the real-world distance between them.
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 text-sm">Points:</span>
                      <span className="text-white font-mono">
                        {calibrationPoints.length}/2
                      </span>
                    </div>

                    {calibrationPoints.length >= 2 && (
                      <div className="space-y-2">
                        <label className="block text-sm text-slate-300">
                          Distance (meters):
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={realWorldDistance}
                            onChange={(e) => setRealWorldDistance(e.target.value)}
                            placeholder="10.0"
                            step="0.1"
                            min="0.1"
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                          />
                          <button
                            onClick={handleCalibrationComplete}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {computedScale && (
                  <div className="p-3 bg-slate-800 rounded border border-slate-600">
                    <div className="text-sm text-slate-300">Computed Scale:</div>
                    <div className="text-white font-mono">{computedScale.toFixed(6)} m/px</div>
                  </div>
                )}
              </div>

              {/* Origin Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Set Origin</h3>
                <p className="text-slate-400 text-sm">
                  Click on the map to set the coordinate system origin (0,0).
                </p>
                {origin && (
                  <div className="p-3 bg-slate-800 rounded border border-slate-600">
                    <div className="text-sm text-slate-300">Origin:</div>
                    <div className="text-white font-mono">
                      ({origin[0].toFixed(1)}, {origin[1].toFixed(1)})
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={resetCalibration}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !computedScale || !origin}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-500 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            {/* Right Panel - Map Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Map Preview</h3>
              <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800">
                <MapCalibrationCanvas
                  imageUrl={mapPreview || currentSiteData?.map_url}
                  isCalibrating={isCalibrating}
                  calibrationPoints={calibrationPoints}
                  origin={origin}
                />
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default MapSettingsPanel;