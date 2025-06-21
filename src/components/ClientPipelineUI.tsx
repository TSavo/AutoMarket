/**
 * Clieexport default function ClientPipelineUI({ pipelineId }: ClientPipelineUIProps) {tPipelineUI - Placeholder Component
 * 
 * Temporary placeholder component for the media pipeline UI.
 */

import React from 'react';

interface ClientPipelineUIProps {
  pipelineId: string;
}

export default function ClientPipelineUI({ pipelineId }: ClientPipelineUIProps) {
  return (
    <div style={{ 
      border: '2px dashed #ccc', 
      padding: '20px', 
      textAlign: 'center',
      margin: '20px 0',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>Media Pipeline UI</h2>
      <p>Pipeline ID: {pipelineId}</p>
      <p><em>This is a placeholder component. The actual UI will be implemented later.</em></p>
    </div>
  );
}
