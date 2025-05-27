import { TShirtOrderFile } from '../types';

type FileObject = {
  key?: string;
  path?: string;
  url: string;
};

export const createFileObject = (
  file: FileObject,
  thumbnail?: FileObject | null
): TShirtOrderFile => {
  return {
    path: file.key || file.path || '',
    url: file.url,
    thumbnail: thumbnail ? {
      path: thumbnail.key || thumbnail.path || '',
      url: thumbnail.url
    } : undefined
  };
};

export const createOrderPrefix = (id: string): string => {
  return `custom-tshirt/${id}`;
}; 