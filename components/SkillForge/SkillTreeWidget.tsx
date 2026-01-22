
import React from 'react';
import { UserProfile } from '../../types';

interface SkillTreeWidgetProps {
  profile: UserProfile;
}

const SkillTreeWidget: React.FC<SkillTreeWidgetProps> = ({ profile }) => {
  const nextLevelXp = profile.level * 500;
  const progressPercent = Math.min((profile.totalXp / nextLevelXp) * 100, 100);

  return (
    <div className="fixed bottom-4 left-4 z-40 hidden lg:block animate-slide-right">
      <div className="bg-elevated-2/90 backdrop-blur-md border border-border-subtle rounded-2xl p-4 shadow-2xl w-64">
        
        {/* User Stats */}
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-lg border border-tertiary/30">
                {profile.level}
            </div>
            <div className="flex-1">
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span className="font-bold text-white">Level {profile.level}</span>
                    <span className="text-slate-500">{profile.totalXp} XP</span>
                </div>
                <div className="w-full bg-base rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-secondary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Skill Ontology</h4>
            {profile.badges.length === 0 ? (
                <div className="text-xs text-text-secondary text-center py-2">No badges yet. Ignite a challenge!</div>
            ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {profile.badges.map(badge => (
                        <div key={badge.id} className="group relative">
                            <div className="px-2 py-1 bg-base border border-border-subtle rounded-md text-[10px] text-text-secondary hover:border-primary/50 transition-colors cursor-help">
                                {badge.name} <span className="text-tertiary">Lv.{badge.level}</span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                Progress: {badge.progress}%
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SkillTreeWidget;
