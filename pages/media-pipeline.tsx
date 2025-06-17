import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import PipelineUI from '../src/components/PipelineUI';

export default function MediaPipeline() {
  return (
    <ChakraProvider>
      <div style={{ padding: '20px' }}>
        <h1>AutoMarket Media Pipeline</h1>
        <p>Asset management and video composition pipeline from Horizon City Stories</p>
        <PipelineUI />
      </div>
    </ChakraProvider>
  );
}
