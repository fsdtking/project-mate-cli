export interface Config {
  'git-remote-address': string;
  'local-project-root-directory': string;
  'gitlab-token': string;
  'gitlab-api-url': string;
}

export interface SearchMatch {
  path: string;
  type: 'file' | 'directory';
  line?: number;
  content?: string;
}

export interface GitRepository {
  id: number;
  name: string;
  description: string;
  web_url: string;
  http_url_to_repo: string;
}

export type ProjectType = 'client' | 'server' | 'unknown';

export interface PackageJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  projectType?: ProjectType;
}