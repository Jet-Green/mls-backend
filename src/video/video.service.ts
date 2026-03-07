import { Injectable } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as ffmpeg from "fluent-ffmpeg"
import * as path from "path";
import * as fs from "node:fs";


@Injectable()
export class VideoService {
  // Your business logic around video processing can go here
  async handleFileUpload(file: Express.Multer.File) {
    return
    let customFilename = Date.now() + '_' + file.originalname;
    const filePath = join(__dirname, '..', '..', 'public', 'lesson-videos', customFilename);
    await writeFile(filePath, file.buffer);
    return {
      message: 'Folder uploaded successfully!',
      filename: customFilename
    };
  }
  async createHLS(videoFilePath: string, lessonId: string) {
    return
    const outputDir = `public/lesson-videos/playlists/lesson-${lessonId}`; // Directory to output HLS files
    const segmentLength = '30'; // Length of each HLS segment in seconds

    fs.mkdirSync(outputDir, { recursive: true })

    return ffmpeg(videoFilePath)
      .outputOptions([
        '-hls_time', segmentLength, // Segment length
        '-hls_list_size', '0', // Include all segments in the playlist
        '-f', 'hls', // HLS format  
        '-hls_flags', 'delete_segments' // Optional: delete segments(video from lesson-videos) after they are not needed
      ])
      .output(path.join(outputDir, 'playlist.m3u8')) // Master playlist output file
      .on('end', () => {
        fs.unlinkSync(videoFilePath);
        return { status: 'success', message: 'Успешно' }
      })
      .on('error', (err) => {
        return { status: 'error', message: 'Ошибка: ' + err }
      })
      .run();
  }

}