// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  downloadFile: (dataUrl: string) => ipcRenderer.invoke('dialog:downloadFile', dataUrl),

  startNewUnsavedFile: () => ipcRenderer.invoke('dialog:createNewUnsavedFile'),
  startNewSaveFile: () => ipcRenderer.invoke('dialog:createNewSaveFile'),
  loadSaveFile: () => ipcRenderer.invoke('dialog:loadSaveFile'),
  loadLastSaveIfAny: () => ipcRenderer.invoke('dialog:loadLastSaveFile'),
  saveToFile: (jsonObject: Object) => ipcRenderer.invoke('dialog:saveFile', jsonObject),

  onLocalCopy: (callback: Function) => ipcRenderer.on('system:local-copy', (_event, value) => callback(value)),
  onRequestSaveCanvas: (callback: Function) => ipcRenderer.on('system:save-canvas', (_event, value) => callback(value)),
  onRequestLoadCanvas: (callback: Function) => ipcRenderer.on('system:load-canvas', (_event, value) => callback(value)),
  onLocalUndo: (callback: Function) => ipcRenderer.on('system:local-undo', (_event, value) => callback(value)),
  onLocalRedo: (callback: Function) => ipcRenderer.on('system:local-redo', (_event, value) => callback(value)),

  onLocalZoomIn: (callback: Function) => ipcRenderer.on('system:local-zoom-in', (_event, value) => callback(value)),
  onLocalZoomOut: (callback: Function) => ipcRenderer.on('system:local-zoom-out', (_event, value) => callback(value)),
  onLocalZoomFit: (callback: Function) => ipcRenderer.on('system:local-zoom-fit', (_event, value) => callback(value)),
})

