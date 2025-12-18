import { ChromaClient } from 'chromadb';
import { config } from './index';

class ChromaService {
  private client: ChromaClient | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = new ChromaClient({
        path: `http://${config.chroma.host}:${config.chroma.port}`,
      });

      // Test connection
      await this.client.heartbeat();
      this.isConnected = true;
      console.log('Chroma Client Connected');
    } catch (error) {
      console.error('Chroma Client Connection Error:', error);
      throw error;
    }
  }

  getClient(): ChromaClient {
    if (!this.client || !this.isConnected) {
      throw new Error('Chroma client not connected. Call connect() first.');
    }
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async initializeCollections(): Promise<void> {
    if (!this.client) {
      throw new Error('Chroma client not initialized');
    }

    try {
      // Create or get collections for different data types
      await this.client.getOrCreateCollection({
        name: 'project_knowledge',
        metadata: { description: 'Project documents and knowledge base' },
      });

      await this.client.getOrCreateCollection({
        name: 'historical_data',
        metadata: { description: 'Historical project data for ML' },
      });

      await this.client.getOrCreateCollection({
        name: 'best_practices',
        metadata: { description: 'Best practices and lessons learned' },
      });

      await this.client.getOrCreateCollection({
        name: 'vendor_intelligence',
        metadata: { description: 'Vendor and subcontractor performance' },
      });

      console.log('Chroma collections initialized');
    } catch (error) {
      console.error('Error initializing Chroma collections:', error);
      throw error;
    }
  }
}

export const chromaService = new ChromaService();
