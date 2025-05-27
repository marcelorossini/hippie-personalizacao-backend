import fs from 'fs';
import { Readable } from 'stream';
import FormData from 'form-data';
import axios from 'axios';

interface BackgroundRemovalResponse {
  output_url: string;
  id: string;
}

/**
 * Removes the background from an image using the DeepAI API
 * @param imagePath - Path to the image file
 * @returns Promise with the processed image URL
 */
export async function removeBackground(imagePath: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('preserve_orientation', 'true');

    const response = await axios.post<BackgroundRemovalResponse>(
      'https://api.deepai.org/api/background-remover',
      formData,
      {
        headers: {
          'api-key': process.env.DEEPAI_API_KEY,
          ...formData.getHeaders(),
        },
      }
    );

    return response.data.output_url;
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
} 