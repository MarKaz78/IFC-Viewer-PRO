
import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, output, effect, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from 'web-ifc-three';

@Component({
  selector: 'app-viewer',
  standalone: true,
  template: `<div #canvasContainer class="w-full h-full"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ViewerComponent implements OnChanges, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) container!: ElementRef;
  @Input() file: File | null = null;
  
  onLoaded = output<any>();
  onLoading = output<void>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader!: IFCLoader;
  private currentModel?: THREE.Object3D;
  private animationId?: number;

  constructor() {
    effect(() => {
      if (this.container) {
        this.initThree();
      }
    });
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['file'] && this.file) {
      await this.loadIFC(this.file);
    }
  }

  private initThree() {
    if (this.scene) return;

    const width = this.container.nativeElement.offsetWidth || window.innerWidth;
    const height = this.container.nativeElement.offsetHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(20, 20, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.container.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // Grid
    const grid = new THREE.GridHelper(100, 100, 0x334155, 0x1e293b);
    this.scene.add(grid);

    // Loader Setup
    this.loader = new IFCLoader();
    // Używamy stabilnej wersji WASM dopasowanej do web-ifc-three
    this.loader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.36/', true);

    this.animate();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private async loadIFC(file: File) {
    if (!this.loader) return;
    
    this.onLoading.emit();

    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = undefined;
    }

    const url = URL.createObjectURL(file);
    
    try {
      this.loader.load(url, (ifcModel) => {
        this.currentModel = ifcModel;
        this.scene.add(ifcModel);
        
        // Autocentrowanie kamery
        const box = new THREE.Box3().setFromObject(ifcModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.0; 

        this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();

        this.onLoaded.emit({
          name: file.name,
          elementCount: ifcModel.children.length,
          nodeCount: this.countNodes(ifcModel)
        });

        URL.revokeObjectURL(url);
      }, undefined, (err) => {
        console.error("Error loading IFC:", err);
        this.onLoaded.emit({ error: "Failed to parse IFC file." });
      });
    } catch (e) {
      console.error(e);
      this.onLoaded.emit({ error: "An error occurred." });
    }
  }

  private countNodes(obj: THREE.Object3D): number {
    let count = 1;
    for (const child of obj.children) {
      count += this.countNodes(child);
    }
    return count;
  }

  private onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.nativeElement.offsetWidth;
    const height = this.container.nativeElement.offsetHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.renderer?.dispose();
  }
}
