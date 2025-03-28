import React from 'react';
import { X } from 'lucide-react';
import { AgentHandoff } from '../types';

interface HandoffModalProps {
  handoff: AgentHandoff;
  onClose: () => void;
}

export const HandoffModal: React.FC<HandoffModalProps> = ({ handoff, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Transferring to Human Agent</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700">Customer Information</h3>
            <p className="text-sm text-gray-600">ID: {handoff.customerId}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Problem Summary</h3>
            <p className="text-sm text-gray-600">{handoff.problemSummary}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Attempted Solutions</h3>
            <ul className="list-disc ml-5 text-sm text-gray-600">
              {handoff.attemptedSolutions.map((solution, index) => (
                <li key={index}>{solution}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Next Steps</h3>
            <ul className="list-disc ml-5 text-sm text-gray-600">
              {handoff.nextSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 