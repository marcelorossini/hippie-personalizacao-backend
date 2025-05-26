import fs from 'fs';
import { Readable } from 'stream';
import FormData from 'form-data';

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
    const imageStream = fs.createReadStream(imagePath);
    
    formData.append('image', imageStream);

    const response = await fetch('https://api.deepai.org/api/background-remover', {
      method: 'POST',
      headers: {
        'api-key': process.env.DEEPAI_API_KEY || '11f5d927-e7be-4a43-ad18-a3fce4560bff'
      },
      body: formData as unknown as BodyInit
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json() as BackgroundRemovalResponse;
    return data.output_url;
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
} 