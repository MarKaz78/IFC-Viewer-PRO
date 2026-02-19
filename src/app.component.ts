
import { Component, signal, viewChild, ElementRef, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewerComponent } from './components/viewer.component';
import { AiAssistantComponent } from './components/ai-assistant.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ViewerComponent, AiAssistantComponent],
  templateUrl: './app.component.html',
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; position: relative; }
  `]
})
export class AppComponent {
  selectedFile = signal<File | null>(null);
  isLoading = signal(false);
  sidebarOpen = signal(true);
  modelMetadata = signal<any>(null);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onModelLoaded(metadata: any) {
    this.modelMetadata.set(metadata);
    this.isLoading.set(false);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }
}
