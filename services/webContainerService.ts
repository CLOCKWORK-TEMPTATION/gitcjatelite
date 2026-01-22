
import { WebContainer } from '@webcontainer/api';

class WebContainerService {
  private webContainerInstance: WebContainer | null = null;
  private isBooting = false;

  async init() {
    if (this.webContainerInstance) return;
    if (this.isBooting) {
        // Wait until booted
        while(this.isBooting) {
            await new Promise(r => setTimeout(r, 100));
        }
        return;
    }

    this.isBooting = true;
    try {
        this.webContainerInstance = await WebContainer.boot();
    } catch (error) {
        console.error("WebContainer Boot Error:", error);
        throw new Error("فشل تشغيل بيئة العمل (WebContainer). تأكد من أن المتصفح يدعم SharedArrayBuffer.");
    } finally {
        this.isBooting = false;
    }
  }

  async writeFile(filename: string, content: string) {
    if (!this.webContainerInstance) await this.init();
    await this.webContainerInstance!.fs.writeFile(filename, content);
  }

  async runNode(
      filename: string, 
      onOutput: (data: string) => void
    ): Promise<number> {
    if (!this.webContainerInstance) await this.init();

    const process = await this.webContainerInstance!.spawn('node', [filename]);

    process.output.pipeTo(new WritableStream({
      write(data) {
        onOutput(data);
      }
    }));

    return process.exit;
  }
}

export const webContainerService = new WebContainerService();
