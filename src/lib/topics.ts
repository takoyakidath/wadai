export type TopicDTO = {
  id: string;
  body: string;
  categoryKey: string | null;
  depth: number;
  hasDeeper: boolean;
  hasRelated: boolean;
};
