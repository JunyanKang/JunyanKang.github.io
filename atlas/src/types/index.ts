export interface MediaAsset {
  id: number;
  fileName: string;
  mimeType: string;
  url: string | null;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  displayName?: string | null;
  role: 'admin' | 'manager' | 'member' | 'guest';
  bio?: string | null;
  position?: string | null;
  phone?: string | null;
  organization?: string | null;
  researchSummary?: string | null;
  avatar?: MediaAsset | null;
  showEmail: boolean;
  showPhone: boolean;
  createdAt: string;
  updatedAt: string;
  teamMember?: TeamMember | null;
}

export interface AdminAccountEntry {
  id: string;
  entryType: 'account' | 'no_member' | 'no_account';
  account: UserProfile | null;
  member: TeamMember | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchDirectionLite {
  id: number;
  title: string;
  summary: string;
  backgroundImage?: MediaAsset | null;
}

export interface ResearchDirection extends ResearchDirectionLite {
  description?: string | null;
  keywords?: string | null;
  teamMembers: Array<Pick<TeamMember, 'id' | 'name' | 'displayName' | 'position' | 'avatar' | 'joinDate' | 'researchDirections'>>;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchResultLite {
  id: number;
  title: string;
  abstract: string;
  publishDate?: string | null;
  status: 'published' | 'draft';
  direction: ResearchDirectionLite | null;
  coverImage: MediaAsset | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchResult extends ResearchResultLite {
  content: string;
  doi?: string | null;
  author: UserProfile | null;
  teamMembers: Array<Pick<TeamMember, 'id' | 'name' | 'displayName' | 'position' | 'avatar' | 'joinDate' | 'researchDirections'>>;
  attachments: ResultAttachment[];
}

export interface ResultAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  url: string;
  fileSize?: number | null;
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  publishDate?: string | null;
  category: 'announcement' | 'event' | 'award' | 'other';
  author: UserProfile | null;
  coverImage: MediaAsset | null;
  submissionId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  name: string;
  displayName?: string | null;
  position?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  organization?: string | null;
  joinDate?: string | null;
  avatar?: MediaAsset | null;
  researchSummary?: string | null;
  showEmail: boolean;
  showPhone: boolean;
  researchDirections: ResearchDirectionLite[];
  researchResults?: ResearchResultLite[];
  account?: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareToolResource {
  id: number;
  title: string;
  description?: string | null;
  resourceType: 'software_tool';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  softwareTool: SoftwareTool;
  onlineTool: null;
  experimentalSkill: null;
  domainExpert: null;
  submitter: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareTool {
  id: number;
  name: string;
  description: string;
  version?: string | null;
  downloadUrl?: string | null;
  documentationUrl?: string | null;
  category?: string | null;
  coverImage?: MediaAsset | null;
  platforms?: string[] | null;
  packageFile?: MediaAsset | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineToolResource {
  id: number;
  title: string;
  description?: string | null;
  resourceType: 'online_tool';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  onlineTool: OnlineTool;
  softwareTool: null;
  experimentalSkill: null;
  domainExpert: null;
  submitter: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineTool {
  id: number;
  name: string;
  description: string;
  url: string;
  category?: string | null;
  coverImage?: MediaAsset | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentalSkillResource {
  id: number;
  title: string;
  description?: string | null;
  resourceType: 'experimental_skill';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  experimentalSkill: ExperimentalSkill;
  onlineTool: null;
  softwareTool: null;
  domainExpert: null;
  submitter: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentalSkill {
  id: number;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  coverImage?: MediaAsset | null;
  packageFile?: MediaAsset | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainExpertResource {
  id: number;
  title: string;
  description?: string | null;
  resourceType: 'domain_expert';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  domainExpert: DomainExpert;
  submitter: UserProfile | null;
  softwareTool: null;
  onlineTool: null;
  experimentalSkill: null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainExpert {
  id: number;
  name: string;
  affiliation: string;
  title?: string | null;
  biography?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: MediaAsset | null;
  coverImage?: MediaAsset | null;
  researchFields: string[];
  createdAt: string;
  updatedAt: string;
}

export type InternalResource =
  | SoftwareToolResource
  | OnlineToolResource
  | ExperimentalSkillResource
  | DomainExpertResource;

export interface ExpressionAtlasDatasetSummary {
  key: string;
  title: string;
  species: string;
  modality: string;
  unit?: string | null;
  description?: string | null;
  citation?: string | null;
  sampleNames: string[];
  sampleCount: number;
  geneCount: number;
}

export interface ExpressionAtlasOrtholog {
  id: number;
  humanSymbol?: string | null;
  mouseSymbol?: string | null;
  entrezId?: string | null;
  mgi?: string | null;
  uniprot?: string | null;
  alias?: string | null;
  preferred: boolean;
}

export interface ExpressionAtlasDatasetResult extends ExpressionAtlasDatasetSummary {
  hasMatch: boolean;
  matchedGene: string | null;
  samples: Array<{
    name: string;
    value: number | null;
  }>;
}

export interface ExpressionAtlasSummary {
  datasets: ExpressionAtlasDatasetSummary[];
  orthologCount: number;
}

export interface ExpressionAtlasQueryResult {
  query: string;
  normalizedQuery: string;
  candidateGenes: string[];
  orthologs: ExpressionAtlasOrtholog[];
  datasets: ExpressionAtlasDatasetResult[];
}

export interface SubmissionAttachmentMeta {
  id: number;
  fileName: string;
  mimeType: string;
  url: string;
  fileSize?: number | null;
  createdAt: string;
}

export interface SubmissionItem {
  id: number;
  title: string;
  abstract?: string | null;
  content?: string | null;
  submissionType: 'research_result' | 'news';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  coverImage?: MediaAsset | null;
  submitter: UserProfile;
  reviewer: UserProfile | null;
  reviewComment?: string | null;
  reviewDate?: string | null;
  attachments: SubmissionAttachmentMeta[];
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}

export interface DashboardStats {
  directionCount: number;
  resultCount: number;
  resultPublishedCount?: number;
  newsCount: number;
  newsPublishedCount?: number;
  newsPendingCount?: number;
  memberCount: number;
  accountCount?: number;
  resourceCount: number;
  resourcePublishedCount?: number;
  resourcePendingCount?: number;
  pendingSubmissions: number;
}
