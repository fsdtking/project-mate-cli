export interface Config {
  'git-remote-address': string;
  'local-project-root-directory': string;
  'gitlab-token': string;
  'gitlab-api-url': string;
}

export interface SearchMatch {
  line: number;
  content: string;
  file: string;
}

export interface GitRepository {
  id: number;
  name: string;
  description: string;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
}