import { envs } from '@config/index';

export function blogAssetPublicUrl(id: string): string {
  return `${envs.apiPublicUrl}/blog/assets/${id}`;
}
