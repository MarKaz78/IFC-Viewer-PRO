
import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleGenAI } from '@google/genai';

@Component({
  selector: 'app-ai-assistant',
  imports: [CommonModule],
  template: `
    <div class="p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/30">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
        <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">BIM AI Assistant</h3>
      </div>
      
      @if (analysis()) {
        <p class="text-xs text-slate-300 leading-relaxed italic mb-3">
          {{ analysis() }}
        </p>
      } @else {
        <p class="text-xs text-slate-400 mb-3">
          Need help understanding your IFC model? Ask the assistant.
        </p>
      }

      <button 
        (click)="analyzeModel()"
        [disabled]="isAnalyzing() || !metadata"
        class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
        {{ isAnalyzing() ? 'Analyzing...' : 'Analyze Model' }}
      </button>
    </div>
  `
})
export class AiAssistantComponent {
  @Input() metadata: any;
  analysis = signal<string | null>(null);
  isAnalyzing = signal(false);

  async analyzeModel() {
    if (!this.metadata) return;
    
    this.isAnalyzing.set(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this BIM model metadata and give a very brief professional insight (max 3 sentences): 
        File: ${this.metadata.name}, 
        Elements: ${this.metadata.elementCount}, 
        Complexity: ${this.metadata.nodeCount} nodes.`,
        config: {
            systemInstruction: "You are a professional BIM manager. Provide concise technical analysis of architectural models based on metadata."
        }
      });
      
      this.analysis.set(response.text);
    } catch (err) {
      console.error('Gemini Analysis Error:', err);
      this.analysis.set("Could not perform AI analysis at this time.");
    } finally {
      this.isAnalyzing.set(false);
    }
  }
}
