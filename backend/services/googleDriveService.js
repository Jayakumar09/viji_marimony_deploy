const { google } = require('googleapis');
const { Readable } = require('stream');

const FOLDER_NAME = 'Matrimony_Backups';

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.folderId = null;
    this.isInitialized = false;
    this.oauth2Client = null;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
      
      if (!clientId || !clientSecret || !refreshToken) {
        console.log('[Backup] Google Drive OAuth credentials not configured');
        console.log('[Backup] Required: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN');
        return false;
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'https://developers.google.com/oauthplayground'
      );

      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
        scope: ['https://www.googleapis.com/auth/drive']
      });

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      await this.ensureFolderExists();
      
      this.isInitialized = true;
      console.log('[Backup] Google Drive service initialized with OAuth');
      return true;
    } catch (error) {
      console.error('[Backup] Failed to initialize Google Drive:', error.message);
      return false;
    }
  }

  async ensureFolderExists() {
    try {
      const response = await this.drive.files.list({
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
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
          fields: 'id, name',
          spaces: 'drive',
          supportsAllDrives: true
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
        fields: 'id, name, createdTime, size',
        spaces: 'drive',
        supportsAllDrives: true
      });

      console.log(`[Backup] Uploaded: ${fileName} (ID: ${response.data.id})`);
      return {
        id: response.data.id,
        name: response.data.name,
        createdTime: response.data.createdTime,
        size: parseInt(response.data.size || 0)
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
        orderBy: 'createdTime desc',
        spaces: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
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
      await this.drive.files.delete({
        fileId,
        supportsAllDrives: true
      });
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
        alt: 'media',
        supportsAllDrives: true
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
