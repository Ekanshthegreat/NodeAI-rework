import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { useSceneStore } from '../../store/useSceneStore';
import { usePolicyStore } from '../../store/usePolicyStore';
import { generateMissionId } from '../../utils/generators';
import { compileNLToPlan } from '../../lib/planner';
import { compileMissionPath } from '../../lib/planner_path';
import { saveMissionPlan } from '../../lib/db';
import { supabase } from '../../lib/supabase';

interface MissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MissionDialog: React.FC<MissionDialogProps> = ({ isOpen, onClose }) => {
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentSite, missions, setMissions, robots, addEvent } = useAppStore();
  const { setMissionPath } = useSceneStore();
  const { setMissionPlan } = usePolicyStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalLanguage.trim() || !currentSite) return;

    setIsSubmitting(true);

    try {
      const missionId = generateMissionId();

      // Compile NL to mission plan
      const siteRobots = robots.filter((r) => r.site_id === currentSite);
      const plan = compileNLToPlan(naturalLanguage.trim(), currentSite, siteRobots, {
        defaultMinBattery: 0.2,
        defaultPolicy: { reassign_on_blocked_s: 10, retry_limit: 1 },
      });

      // Save to database
      const { error: missionError } = await supabase
        .from('missions')
        .insert({
          id: missionId,
          site_id: currentSite,
          nl: naturalLanguage.trim(),
          status: 'planning',
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Save mission plan
      await saveMissionPlan(missionId, plan);

      // Store in policy store
      setMissionPlan(missionId, plan);

      // Compile and store mission path
      const assignedRobot = siteRobots.find((r) => r.id === plan.robot_selection.include[0]);
      if (assignedRobot) {
        const missionPath = compileMissionPath(
          { id: missionId, nl: naturalLanguage.trim() },
          plan,
          assignedRobot.pose
        );
        setMissionPath(missionId, missionPath);
      }

      // Update local state
      const newMission = {
        id: missionId,
        site_id: currentSite,
        nl: naturalLanguage.trim(),
        status: 'planning' as const,
        created_at: new Date().toISOString(),
      };

      setMissions([...missions, newMission]);

      // Add event
      addEvent({
        id: `event-${Date.now()}`,
        mission_id: missionId,
        robot_id: plan.robot_selection.include[0] || undefined,
        type: 'mission_event',
        payload: { action: 'created', priority },
        ts: new Date().toISOString(),
      });

      toast.success('Mission created successfully!');

      setNaturalLanguage('');
      onClose();
    } catch (error) {
      console.error('Mission creation failed:', error);
      toast.error('Failed to create mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-white">New Mission</Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe your mission in natural language:
              </label>
              <textarea
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., Pick up package from dock A and deliver it to zone 3, then return to charging station"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!naturalLanguage.trim() || isSubmitting}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-500 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating...' : 'Create Mission'}</span>
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default MissionDialog;
