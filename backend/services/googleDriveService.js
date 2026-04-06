const { google } = require('googleapis');
const { Readable } = require('stream');

const FOLDER_NAME = 'Matrimony_Backups';

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.folderId = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      const credentials = this.getCredentials();
      
      if (!credentials) {
        console.log('[Backup] Google Drive credentials not configured');
        return false;
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      this.drive = google.drive({ version: 'v3', auth });
      
      await this.ensureFolderExists();
      
      this.isInitialized = true;
      console.log('[Backup] Google Drive service initialized');
      return true;
    } catch (error) {
      console.error('[Backup] Failed to initialize Google Drive:', error.message);
      return false;
    }
  }

  getCredentials() {
    const credStr = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credStr) return null;
    
    try {
      return JSON.parse(credStr);
    } catch {
      return null;
    }
  }

  async ensureFolderExists() {
    try {
      const response = await this.drive.files.list({
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      });

      if (response.data.files.length > 0) {
        this.folderId = response.data.files[0].id;
        console.log(`[Backup] Found existing folder: ${this.folderId}`);
      } else {
        const folder = await this.drive.files.create({
          resource: {
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
          },
          fields: 'id, name'
        });
        this.folderId = folder.data.id;
        console.log(`[Backup] Created new folder: ${this.folderId}`);
      }
    } catch (error) {
      console.error('[Backup] Error ensuring folder exists:', error.message);
      throw error;
    }
  }

  async uploadFile(fileName, content) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.drive || !this.folderId) {
      throw new Error('Google Drive not initialized');
    }

    const fileMetadata = {
      name: fileName,
      parents: [this.folderId]
    };

    const media = {
      mimeType: 'application/octet-stream',
      body: content instanceof Buffer ? Readable.from(content) : content
    };

    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, createdTime, size'
      });

      console.log(`[Backup] Uploaded: ${fileName} (ID: ${response.data.id})`);
      return {
        id: response.data.id,
        name: response.data.name,
        createdTime: response.data.createdTime,
        size: response.data.size
      };
    } catch (error) {
      console.error('[Backup] Upload failed:', error.message);
      throw error;
    }
  }

  async listFiles() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.drive || !this.folderId) {
      return [];
    }

    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and trashed=false`,
        fields: 'files(id, name, createdTime, size, mimeType)',
        orderBy: 'createdTime desc'
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        size: parseInt(file.size || 0),
        mimeType: file.mimeType
      }));
    } catch (error) {
      console.error('[Backup] List files failed:', error.message);
      return [];
    }
  }

  async deleteFile(fileId) {
    if (!this.drive) {
      throw new Error('Google Drive not initialized');
    }

    try {
      await this.drive.files.delete({ fileId });
      console.log(`[Backup] Deleted file: ${fileId}`);
      return true;
    } catch (error) {
      console.error('[Backup] Delete failed:', error.message);
      throw error;
    }
  }

  async downloadFile(fileId) {
    if (!this.drive) {
      throw new Error('Google Drive not initialized');
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      const chunks = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('[Backup] Download failed:', error.message);
      throw error;
    }
  }

  getDownloadUrl(fileId) {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }
}

module.exports = new GoogleDriveService();
