import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import ToolsHome from '@/pages/ToolsHome';
import YoutubeTranscriptTool from '@/pages/YoutubeTranscriptTool';

export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem('theme') ?? 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToolsHome />} />
        <Route path="/tools/youtube-transcript-extractor" element={<YoutubeTranscriptTool />} />
        <Route path="/tools" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
