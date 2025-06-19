import dynamic from 'next/dynamic';

const PipelineUIComponent = dynamic(() => import('../src/components/ClientPipelineUI'), {
  ssr: false,
});

export default function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>AutoMarket - Media Pipeline & Asset Management</h1>
      <p>Asset management and video composition pipeline extracted from Horizon City Stories</p>
      <PipelineUIComponent pipelineId="default" />
    </div>
  );
}
