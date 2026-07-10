import { FileText, type LucideIcon } from 'lucide-react';

export type ToolStatus = 'ready' | 'planned';

export interface ToolDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  route: string;
  status: ToolStatus;
  category: string;
  actions: string[];
  Icon: LucideIcon;
}

export const tools: ToolDefinition[] = [
  {
    id: 'youtube-transcript-extractor',
    name: 'YouTube Links and Transcript Extractor',
    shortName: 'YouTube extractor',
    description:
      'Extract captions, export transcripts, and download playlist video tables from one workspace.',
    route: '/tools/youtube-transcript-extractor',
    status: 'ready',
    category: 'Video',
    actions: ['Transcripts', 'Playlist links', 'Batch export'],
    Icon: FileText,
  },
];

export const activeTools = tools.filter((tool) => tool.status === 'ready');
