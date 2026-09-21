export type DigiDeskService = {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  description: string;
  route: string;
  requiresFileUpload: boolean;
  supportedFileTypes?: string[];
  workflowSteps: string[];
  processingDescription: string;
  resultDescription: string;
  downloadDescription: string;
  relatedTools: string[];
};

export type ResolvedIntent = {
  serviceId: string;
  service: DigiDeskService;
  matchText: string;
  confidence: number;
};
